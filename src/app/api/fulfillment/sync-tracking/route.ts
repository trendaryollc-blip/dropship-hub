import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { pushTrackingToStore } from "@/lib/fulfillment/store-adapters";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { fulfillmentOrderId, trackingNumber, carrier } = body;
    if (!fulfillmentOrderId || !trackingNumber) {
      return NextResponse.json({ error: "fulfillmentOrderId and trackingNumber required" }, { status: 400 });
    }

    const db = await getAdminDB();
    const orderDoc = await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(fulfillmentOrderId).get();
    if (!orderDoc.exists) return NextResponse.json({ error: "Order not found" }, { status: 404 });

    const order = orderDoc.data() ?? {};
    const storePlatform = order.storePlatform;
    const storeOrderId = order.storeOrderId;

    const storeSnap = await db.collection("users").doc(uid).collection("storeConnections").where("platform", "==", storePlatform).where("status", "==", "connected").limit(1).get();
    if (storeSnap.empty) return NextResponse.json({ error: "No connected store found for this platform" }, { status: 404 });

    const store = storeSnap.docs[0].data();
    const config = {
      platform: store.platform,
      url: store.url || store.backendUrl || "",
      apiKey: store.apiKey || "",
      apiSecret: store.apiSecret || "",
      accessToken: store.accessToken || "",
    };

    const synced = await pushTrackingToStore(config, storeOrderId, trackingNumber, carrier || "Other");

    if (synced) {
      const platformOrders = (order.platformOrders || []).map((po: Record<string, unknown>) => ({
        ...po,
        trackingNumber,
        carrier: carrier || "Other",
        status: "shipped",
        shippedAt: new Date().toISOString(),
      }));

      if (platformOrders.length === 0) {
        platformOrders.push({
          platform: storePlatform,
          platformOrderId: storeOrderId,
          trackingNumber,
          carrier: carrier || "Other",
          status: "shipped",
          shippedAt: new Date().toISOString(),
        });
      }

      await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(fulfillmentOrderId).update({
        status: "shipped",
        platformOrders,
        updatedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ success: synced, platform: storePlatform });
  } catch (error) {
    return NextResponse.json({ error: "Failed to sync tracking", details: error instanceof Error ? error.message : "Unknown" }, { status: 500 });
  }
}, LIMITS.FULFILLMENT);
