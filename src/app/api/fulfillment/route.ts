import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const startDate = req.nextUrl.searchParams.get("startDate");
    const endDate = req.nextUrl.searchParams.get("endDate");
    const page = parseInt(req.nextUrl.searchParams.get("page") || "1");
    const pageSize = parseInt(req.nextUrl.searchParams.get("pageSize") || "100");

    const db = await getAdminDB();
    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
      .collection("users").doc(uid).collection("fulfillmentOrders")
      .orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    if (startDate) {
      query = query.where("createdAt", ">=", startDate);
    }

    if (endDate) {
      query = query.where("createdAt", "<=", endDate + "T23:59:59");
    }

    // For pagination with Firestore, we need to fetch and count
    const snap = await query.limit(1000).get();
    const allOrders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Apply pagination
    const offset = (page - 1) * pageSize;
    const orders = allOrders.slice(offset, offset + pageSize);
    const totalCount = allOrders.length;

    return NextResponse.json({ orders, totalCount, page, pageSize });
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
