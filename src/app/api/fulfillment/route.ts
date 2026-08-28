import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
  try {
    const uid = req.nextUrl.searchParams.get("uid");
    const status = req.nextUrl.searchParams.get("status");
    if (!uid) return NextResponse.json({ error: "uid required" }, { status: 400 });

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
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { uid, orderId, action, ...updates } = body;
    if (!uid || !orderId) return NextResponse.json({ error: "uid and orderId required" }, { status: 400 });

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

      const order = doc.data()!;
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
}
