import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { pollAllTrackedOrders, getPollingOrders, shouldContinuePolling } from "@/lib/fulfillment/auto-tracker";
import { getOrdersNeedingPoll, updateOrderPollingStatus } from "@/lib/fulfillment/cj-poller";
import { logAuditEvent } from "@/lib/fulfillment/audit-logger";
import { pushTrackingToStore } from "@/lib/fulfillment/store-adapters";

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { orderId } = body;

    const db = await getAdminDB();

    if (orderId) {
      const orderDoc = await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).get();
      if (!orderDoc.exists) {
        return NextResponse.json({ error: "Order not found" }, { status: 404 });
      }

      const order = orderDoc.data();
      const cjOrder = (order?.platformOrders || []).find((po: Record<string, unknown>) => po.platform === "cj");
      if (!cjOrder?.platformOrderId) {
        return NextResponse.json({ error: "No CJ order to poll" }, { status: 400 });
      }

      const results = await pollAllTrackedOrders();
      const relevant = results.find((r) => r.orderId === orderId);

      if (relevant?.trackingNumber) {
        const platformOrders = (order?.platformOrders || []).map((po: Record<string, unknown>) => {
          if (po.platform === "cj") {
            return {
              ...po,
              trackingNumber: relevant.trackingNumber,
              carrier: relevant.carrier,
              status: "shipped",
              shippedAt: new Date().toISOString(),
            };
          }
          return po;
        });

        await db.collection("users").doc(uid).collection("fulfillmentOrders").doc(orderId).update({
          status: "shipped",
          platformOrders,
          updatedAt: new Date().toISOString(),
        });

        if (order?.storePlatform && order?.storeOrderId) {
          const storeSnap = await db.collection("users").doc(uid).collection("storeConnections")
            .where("platform", "==", order.storePlatform)
            .where("status", "==", "connected")
            .limit(1)
            .get();

          if (!storeSnap.empty) {
            const store = storeSnap.docs[0].data();
            await pushTrackingToStore(
              {
                platform: store.platform,
                url: store.url || store.backendUrl || "",
                apiKey: store.apiKey || "",
                apiSecret: store.apiSecret || "",
                accessToken: store.accessToken || "",
              },
              order.storeOrderId,
              relevant.trackingNumber,
              relevant.carrier || "Other"
            );
          }
        }

        logAuditEvent(uid, {
          orderId,
          action: "tracking_detected",
          details: `Tracking number detected: ${relevant.trackingNumber} (${relevant.carrier})`,
          metadata: { trackingNumber: relevant.trackingNumber, carrier: relevant.carrier },
        });

        return NextResponse.json({ success: true, tracking: relevant });
      }

      return NextResponse.json({ success: true, tracking: null, message: "No tracking yet" });
    }

    const allOrders = getPollingOrders();
    const results = await pollAllTrackedOrders();
    let updated = 0;

    for (const result of results) {
      if (result.trackingNumber && result.orderId) {
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      polled: allOrders.length,
      updated,
      results: results.filter((r) => r.found),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Status polling failed", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const orders = getPollingOrders();
    return NextResponse.json({
      pollingOrders: orders,
      count: orders.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch polling status", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}, LIMITS.FULFILLMENT);
