import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { getStoreAdapter } from "@/lib/fulfillment/store-adapters";
import { LIMITS } from "@/lib/rate-limit";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action, orderId, trackingNumber, carrier } = body as {
      action: "fulfill" | "cancel" | "add_tracking";
      orderId: string;
      trackingNumber?: string;
      carrier?: string;
    };

    if (!action || !orderId) {
      return NextResponse.json({ error: "action and orderId are required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const orderDoc = await db.collection("users").doc(uid).collection("webhookOrders").doc(orderId).get();

    if (!orderDoc.exists) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const order = orderDoc.data()!;
    const connDoc = await db.collection("users").doc(uid).collection("storeConnections").doc(order.storeId).get();

    if (!connDoc.exists) {
      return NextResponse.json({ error: "Store connection not found" }, { status: 404 });
    }

    const conn = connDoc.data()!;
    const adapter = getStoreAdapter(conn.platform);

    if (!adapter) {
      return NextResponse.json({ error: `Platform "${conn.platform}" not supported` }, { status: 400 });
    }

    const storeConfig = {
      platform: conn.platform,
      url: conn.url || conn.backendUrl || "",
      apiKey: conn.apiKey,
      apiSecret: conn.apiSecret,
      accessToken: conn.accessToken,
      consumerKey: conn.consumerKey,
      consumerSecret: conn.consumerSecret,
    };

    let success = false;

    switch (action) {
      case "fulfill":
        if (trackingNumber) {
          success = await adapter.pushTracking(storeConfig, order.orderId, trackingNumber, carrier || "Other");
        }
        await orderDoc.ref.update({
          fulfillmentStatus: "fulfilled",
          status: "shipped",
          trackingNumber: trackingNumber || order.trackingNumber,
          carrier: carrier || order.carrier,
          updatedAt: new Date().toISOString(),
        });
        success = true;
        break;

      case "cancel":
        await orderDoc.ref.update({
          status: "cancelled",
          updatedAt: new Date().toISOString(),
        });
        success = true;
        break;

      case "add_tracking":
        if (!trackingNumber) {
          return NextResponse.json({ error: "trackingNumber is required" }, { status: 400 });
        }
        success = await adapter.pushTracking(storeConfig, order.orderId, trackingNumber, carrier || "Other");
        if (success) {
          await orderDoc.ref.update({
            trackingNumber,
            carrier: carrier || "Other",
            updatedAt: new Date().toISOString(),
          });
        }
        break;
    }

    if (!success && action !== "cancel") {
      return NextResponse.json({ error: "Failed to update order on store" }, { status: 500 });
    }

    const updatedDoc = await orderDoc.ref.get();
    return NextResponse.json({ success: true, order: { id: updatedDoc.id, ...updatedDoc.data() } });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process order action", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.DEFAULT);
