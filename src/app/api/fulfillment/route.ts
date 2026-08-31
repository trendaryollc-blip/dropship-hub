import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const status = req.nextUrl.searchParams.get("status");

    const db = await getAdminDB();
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
      .collection("users").doc(uid).collection("fulfillmentOrders")
      .orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    const snap = await query.limit(100).get();
    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch orders", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.FULFILLMENT);

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { orderId, action, ...updates } = body;
    if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

    const db = await getAdminDB();
    const ref = db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId);

    if (action === "approve") {
      await ref.update({
        status: "in_progress",
        updatedAt: new Date().toISOString(),
        ...updates,
      });
      return NextResponse.json({ success: true });
    }

    if (action === "updateTracking") {
      const { platform, trackingNumber, carrier, estimatedDelivery } = updates;
      const doc = await ref.get();
      if (!doc.exists) return NextResponse.json({ error: "Order not found" }, { status: 404 });

      const order = doc.data() ?? {};
      const platformOrders = (order.platformOrders || []).map((po: Record<string, unknown>) => {
        if (po.platform === platform) {
          return {
            ...po,
            trackingNumber,
            carrier: carrier || po.carrier,
            status: "shipped",
            shippedAt: new Date().toISOString(),
            estimatedDelivery: estimatedDelivery || po.estimatedDelivery,
          };
        }
        return po;
      });

      await ref.update({
        status: "shipped",
        platformOrders,
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    if (action === "markDelivered") {
      await ref.update({
        status: "delivered",
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    if (action === "cancel") {
      await ref.update({
        status: "cancelled",
        updatedAt: new Date().toISOString(),
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update order", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.FULFILLMENT);
