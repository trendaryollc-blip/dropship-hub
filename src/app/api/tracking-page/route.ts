import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { TRACKING_TEMPLATES, generateTrackingHtml } from "@/lib/tracking-page";
import { saveTrackingPageConfig, getTrackingPageConfigs, getTrackingPageStats, deleteTrackingPageConfig } from "@/lib/data/tracking-page";
import { safeErrorMessage } from "@/lib/api-errors";

export const GET = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "list";

    if (type === "stats") {
      const stats = await getTrackingPageStats(uid);
      return NextResponse.json({ stats });
    }
    if (type === "templates") {
      return NextResponse.json({ templates: TRACKING_TEMPLATES });
    }

    const configs = await getTrackingPageConfigs(uid);
    return NextResponse.json({ configs });
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed") }, { status: 500 });
  }
});

export const POST = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === "save") {
      const { storeId, storeName, template, branding, upsells, notifications, enabled } = body;
      if (!storeId || !template || !branding) {
        return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
      }
      const id = await saveTrackingPageConfig(uid, {
        storeId, storeName: storeName || "", template, branding,
        upsells: upsells || [], notifications: notifications || {
          orderConfirmed: true, shipped: true, inTransit: true,
          outForDelivery: true, delivered: true,
          emailNotifications: true, smsNotifications: false,
          pushNotifications: false, delayMinutes: 0,
        },
        enabled: enabled !== false,
      });
      return NextResponse.json({ success: true, id });
    }

    if (action === "preview") {
      const html = generateTrackingHtml({
        storeName: body.storeName || "My Store",
        orderNumber: body.orderNumber || "ORD-12345",
        trackingNumber: body.trackingNumber || "TRACK-67890",
        carrier: body.carrier || "CJ Dropshipping",
        currentStatus: body.currentStatus || "shipped",
        estimatedDelivery: body.estimatedDelivery || "Sep 25, 2026",
        events: body.events || [
          { status: "ordered", timestamp: "Sep 15, 2026", location: "Online", description: "Order placed" },
          { status: "shipped", timestamp: "Sep 16, 2026", location: "China", description: "Package shipped" },
        ],
        branding: body.branding || { primaryColor: "#6366f1", secondaryColor: "#818cf8", logoUrl: "", supportEmail: "support@store.com" },
      });
      return NextResponse.json({ html });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed") }, { status: 500 });
  }
});

export const DELETE = withAuth(async (req: NextRequest, uid: string) => {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    await deleteTrackingPageConfig(uid, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed") }, { status: 500 });
  }
});
