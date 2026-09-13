import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { logAuditEvent } from "@/lib/fulfillment/audit-logger";
import type { ReturnRequest, ReturnItem, ReturnReason, ReturnStatus } from "@/types/fulfillment";

const COLLECTION = "returnRequests";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const search = req.nextUrl.searchParams.get("search");

    const db = await getAdminDB();
    let query: FirebaseFirestore.Query = db
      .collection("users").doc(uid).collection(COLLECTION)
      .orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    const snap = await query.limit(200).get();
    let returns = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as ReturnRequest[];

    if (search) {
      const q = search.toLowerCase();
      returns = returns.filter(
        (r) =>
          r.orderId.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.id.toLowerCase().includes(q)
      );
    }

    const counts = {
      requested: 0,
      approved: 0,
      denied: 0,
      return_in_transit: 0,
      return_received: 0,
      refund_processing: 0,
      refunded: 0,
      closed: 0,
    };
    for (const r of returns) {
      counts[r.status]++;
    }

    return NextResponse.json({ returns, counts, total: returns.length });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch returns", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.RETURNS);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { orderId, reason, reasonDescription, items } = body;

    if (!orderId || !reason || !reasonDescription || !items?.length) {
      return NextResponse.json(
        { error: "orderId, reason, reasonDescription, and items are required" },
        { status: 400 }
      );
    }

    const validReasons: ReturnReason[] = [
      "defective", "wrong_item", "not_as_described",
      "changed_mind", "damaged_in_transit", "other",
    ];
    if (!validReasons.includes(reason)) {
      return NextResponse.json({ error: "Invalid reason" }, { status: 400 });
    }

    const db = await getAdminDB();

    // Verify order exists and is delivered
    const orderDoc = await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    const order = orderDoc.data()!;
    if (order.status !== "delivered") {
      return NextResponse.json({ error: "Returns can only be requested for delivered orders" }, { status: 400 });
    }

    // Check for existing open return on this order
    const existingReturns = await db.collection("users").doc(uid).collection(COLLECTION)
      .where("orderId", "==", orderId)
      .where("status", "in", ["requested", "approved", "return_in_transit", "return_received", "refund_processing"])
      .get();
    if (!existingReturns.empty) {
      return NextResponse.json({ error: "An open return already exists for this order" }, { status: 400 });
    }

    // Validate items against order
    const orderItems = order.items || [];
    const validatedItems: ReturnItem[] = [];
    let refundAmount = 0;

    for (const item of items) {
      const orderItem = orderItems.find((oi: { productId: string }) => oi.productId === item.productId);
      if (!orderItem) {
        return NextResponse.json({ error: `Product ${item.productId} not found in order` }, { status: 400 });
      }
      const returnItem: ReturnItem = {
        orderItemId: item.productId,
        productId: item.productId,
        productName: orderItem.name,
        quantity: Math.min(item.quantity || 1, orderItem.quantity),
        unitPrice: orderItem.price,
        reason: item.reason || reasonDescription,
        condition: item.condition,
      };
      validatedItems.push(returnItem);
      refundAmount += returnItem.unitPrice * returnItem.quantity;
    }

    const now = new Date().toISOString();
    const returnId = `ret_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    const returnRequest: ReturnRequest = {
      id: returnId,
      orderId,
      uid,
      status: "requested",
      reason,
      reasonDescription,
      items: validatedItems,
      requestedAt: now,
      customerEmail: order.customerEmail,
      customerName: order.customerName,
      refundAmount,
      statusHistory: [
        { status: "requested", timestamp: now, note: reasonDescription },
      ],
      createdAt: now,
      updatedAt: now,
    };

    await db.collection("users").doc(uid).collection(COLLECTION).doc(returnId).set(returnRequest);

    logAuditEvent(uid, {
      orderId,
      action: "order_detected",
      details: `Return requested: ${reason} — $${refundAmount.toFixed(2)} refund`,
      metadata: { returnId, reason, refundAmount },
    });

    return NextResponse.json({ success: true, returnRequest });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create return request", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.RETURNS);
