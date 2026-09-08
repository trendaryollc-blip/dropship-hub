import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const limitParam = parseInt(req.nextUrl.searchParams.get("limit") || "50", 10);

    const db = await getAdminDB();
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
      .collection("users").doc(uid).collection("returnRequests")
      .orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    const snap = await query.limit(limitParam).get();
    const returns = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ returns });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch returns", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.RETURNS);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action, ...data } = body;

    const db = await getAdminDB();

    if (action === "create") {
      const ref = db.collection("users").doc(uid).collection("returnRequests").doc();
      await ref.set({
        ...data,
        status: "pending",
        returnLabel: null,
        refundAmount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ id: ref.id, success: true });
    }

    if (action === "updateStatus") {
      const { returnId, status: newStatus } = data;
      if (!returnId || !newStatus) {
        return NextResponse.json({ error: "returnId and status required" }, { status: 400 });
      }
      const ref = db.collection("users").doc(uid).collection("returnRequests").doc(returnId);
      const doc = await ref.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Return not found" }, { status: 404 });
      }
      await ref.update({
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    if (action === "generateLabel") {
      const { returnId } = data;
      if (!returnId) {
        return NextResponse.json({ error: "returnId required" }, { status: 400 });
      }
      const ref = db.collection("users").doc(uid).collection("returnRequests").doc(returnId);
      const doc = await ref.get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Return not found" }, { status: 404 });
      }

      const returnData = doc.data()!;
      const trackingNumber = `RT${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const carriers = ["USPS", "UPS", "FedEx", "DHL"];
      const carrier = carriers[Math.floor(Math.random() * carriers.length)];

      const returnLabel = {
        trackingNumber,
        carrier,
        returnAddress: `Returns Center\n${returnData.supplierName || "Supplier"}\n123 Return Lane\nLos Angeles, CA 90001`,
        instructions: `1. Print this return label and attach it to the package.\n2. Pack the item(s) securely in original packaging if possible.\n3. Drop off at any ${carrier} location.\n4. Keep your tracking number: ${trackingNumber}\n5. Refund will be processed within 3-5 business days of receipt.`,
        labelUrl: null,
        generatedAt: new Date().toISOString(),
      };

      await ref.update({
        returnLabel,
        status: "label_generated",
        updatedAt: new Date().toISOString(),
      });

      return NextResponse.json({ success: true, returnLabel });
    }

    if (action === "detect") {
      const cancelledOrders = await db
        .collection("users").doc(uid).collection("fulfillmentOrders")
        .where("status", "in", ["cancelled", "refunded"])
        .limit(50)
        .get();

      const existingReturns = await db
        .collection("users").doc(uid).collection("returnRequests")
        .get();
      const existingOrderIds = new Set(existingReturns.docs.map((d) => d.data().orderId));

      const candidates = cancelledOrders.docs
        .filter((d) => !existingOrderIds.has(d.id))
        .map((d) => {
          const order = d.data();
          return {
            orderId: d.id,
            orderNumber: order.orderNumber || d.id,
            customerName: order.customerName || "Unknown",
            customerEmail: order.customerEmail || "",
            items: (order.items || []).map((item: Record<string, unknown>) => ({
              productId: (item.productId as string) || "",
              productName: (item.name as string) || "Unknown Product",
              quantity: (item.quantity as number) || 1,
              unitPrice: (item.unitPrice as number) || 0,
              imageUrl: (item.imageUrl as string) || "",
            })),
            supplierId: order.assignedSupplier || "unknown",
            supplierName: order.supplierName || "Unknown Supplier",
            platform: order.platformOrders?.[0]?.platform || "unknown",
            storePlatform: order.storePlatform || "custom",
          };
        });

      return NextResponse.json({ candidates, count: candidates.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to process return", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.RETURNS);

export const PATCH = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { returnId, ...updates } = body;
    if (!returnId) {
      return NextResponse.json({ error: "returnId required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("returnRequests").doc(returnId);
    const doc = await ref.get();
    if (!doc.exists) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    await ref.update({ ...updates, updatedAt: new Date().toISOString() });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update return", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.RETURNS);
