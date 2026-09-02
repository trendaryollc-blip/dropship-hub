import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { getShipmentStatus, syncTrackingToStore, pollAllShipments } from "@/lib/fulfillment/shipment-tracker";

export const GET = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "status";
    const cjOrderNumber = searchParams.get("cjOrderNumber");

    if (action === "status") {
      if (!cjOrderNumber) {
        return NextResponse.json({ error: "cjOrderNumber is required" }, { status: 400 });
      }

      const status = await getShipmentStatus(cjOrderNumber);
      return NextResponse.json({ success: true, status });
    }

    if (action === "poll_all") {
      const ordersParam = searchParams.get("orders");
      if (!ordersParam) {
        return NextResponse.json({ error: "orders parameter is required" }, { status: 400 });
      }

      const orders = JSON.parse(ordersParam);
      const updates = await pollAllShipments(orders);
      return NextResponse.json({ success: true, updates, count: updates.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tracking info", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});

export const POST = withAuth(async (request: NextRequest, uid: string) => {
  try {
    const body = await request.json();
    const { action, storeId, storePlatform, platformOrderId, trackingNumber, carrier, estimatedDelivery } = body;

    if (action === "sync_to_store") {
      if (!storeId || !storePlatform || !platformOrderId || !trackingNumber || !carrier) {
        return NextResponse.json(
          { error: "storeId, storePlatform, platformOrderId, trackingNumber, and carrier are required" },
          { status: 400 }
        );
      }

      const result = await syncTrackingToStore(storeId, storePlatform, platformOrderId, trackingNumber, carrier, estimatedDelivery);
      return NextResponse.json({ success: true, result });
    }

    if (action === "poll_bulk") {
      const { orders } = body;
      if (!orders || !Array.isArray(orders)) {
        return NextResponse.json({ error: "orders array is required" }, { status: 400 });
      }

      const updates = await pollAllShipments(orders);
      return NextResponse.json({ success: true, updates, count: updates.length });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to process tracking request", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
});
