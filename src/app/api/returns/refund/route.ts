import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const returnRequestId = req.nextUrl.searchParams.get("returnRequestId");

    const db = await getAdminDB();
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
      .collection("users").doc(uid).collection("refundCalculations")
      .orderBy("createdAt", "desc");

    if (returnRequestId) {
      query = query.where("returnRequestId", "==", returnRequestId);
    }

    const snap = await query.limit(50).get();
    const refunds = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ refunds });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch refunds", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.RETURNS);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action, ...data } = body;
    const db = await getAdminDB();

    if (action === "calculate") {
      const { returnRequestId, refundMethod } = data;
      if (!returnRequestId) {
        return NextResponse.json({ error: "returnRequestId required" }, { status: 400 });
      }

      const returnDoc = await db
        .collection("users").doc(uid).collection("returnRequests").doc(returnRequestId).get();
      if (!returnDoc.exists) {
        return NextResponse.json({ error: "Return request not found" }, { status: 404 });
      }

      const returnData = returnDoc.data()!;
      const items = returnData.items || [];
      const subtotal = items.reduce((sum: number, item: { unitPrice: number; quantity: number }) => sum + item.unitPrice * item.quantity, 0);
      const shippingCost = 0;
      const platformFees = 0;

      const policyType = "full_refund" as string;
      const restockingFeePercent = 0;
      const returnShippingPaidBy = "seller";

      let supplierRefundAmount = 0;
      switch (policyType) {
        case "full_refund": supplierRefundAmount = subtotal; break;
        case "partial_refund": supplierRefundAmount = subtotal * (1 - restockingFeePercent / 100); break;
        case "store_credit_only": supplierRefundAmount = subtotal; break;
        case "no_refund": supplierRefundAmount = 0; break;
        default: supplierRefundAmount = subtotal;
      }

      const shippingRefund = returnShippingPaidBy === "seller" ? shippingCost : 0;
      const totalRefund = Math.max(0, supplierRefundAmount + shippingRefund - platformFees);

      const refundDoc = {
        returnRequestId,
        orderId: returnData.orderId,
        subtotal: Math.round(subtotal * 100) / 100,
        shippingCost: Math.round(shippingCost * 100) / 100,
        platformFees: Math.round(platformFees * 100) / 100,
        supplierRefundAmount: Math.round(supplierRefundAmount * 100) / 100,
        totalRefund: Math.round(totalRefund * 100) / 100,
        refundMethod: refundMethod || "original",
        supplierPolicy: { type: policyType, restockingFeePercent, refundWindowDays: 30, returnShippingPaidBy },
        processed: false,
        processedAt: null,
        createdAt: new Date().toISOString(),
      };

      const ref = db.collection("users").doc(uid).collection("refundCalculations").doc();
      await ref.set(refundDoc);

      return NextResponse.json({ id: ref.id, ...refundDoc, success: true });
    }

    if (action === "process") {
      const { refundId } = data;
      if (!refundId) {
        return NextResponse.json({ error: "refundId required" }, { status: 400 });
      }

      const refundRef = db.collection("users").doc(uid).collection("refundCalculations").doc(refundId);
      const refundDoc = await refundRef.get();
      if (!refundDoc.exists) {
        return NextResponse.json({ error: "Refund not found" }, { status: 404 });
      }

      await refundRef.update({
        processed: true,
        processedAt: new Date().toISOString(),
      });

      const refundData = refundDoc.data()!;
      const returnRef = db.collection("users").doc(uid).collection("returnRequests").doc(refundData.returnRequestId);
      const returnDoc = await returnRef.get();
      if (returnDoc.exists) {
        await returnRef.update({
          status: "refunded",
          refundAmount: refundData.totalRefund,
          updatedAt: new Date().toISOString(),
        });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process refund", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.RETURNS);
