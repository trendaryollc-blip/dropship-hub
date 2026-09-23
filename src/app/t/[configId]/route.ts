import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { generateTrackingHtml, TRACKING_STATUS_VALUES, isSafeHttpUrl } from "@/lib/tracking-page";
import { addTrackingPageView } from "@/lib/data/tracking-page";
import type { TrackingStatus, TrackingPageConfigDoc } from "@/types/tracking-page";

export const dynamic = "force-dynamic";

const str = (v: string | null, max = 120): string => (typeof v === "string" ? v.slice(0, max) : "");

function detectDevice(userAgent: string): string {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobi|iphone|android.*mobile|windows phone/.test(ua)) return "mobile";
  return "desktop";
}

function notFoundHtml(): NextResponse {
  return new NextResponse(
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Tracking Page Not Found</title></head><body style="font-family: sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; color: #334155;"><div style="text-align: center; padding: 24px;"><h1 style="font-size: 20px; margin-bottom: 8px;">Tracking page not found</h1><p style="font-size: 14px; color: #64748b;">This tracking page is unavailable. Please check your order confirmation email.</p></div></body></html>`,
    {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    }
  );
}

/**
 * Public, customer-facing branded tracking page.
 * Looked up by the config's `publicId` (never by uid/storeId directly),
 * rendered with per-request order overrides via query params, and records
 * a page view for the store's analytics.
 */
export async function GET(request: NextRequest, ctx: { params: Promise<{ configId: string }> }) {
  const { configId } = await ctx.params;
  try {
    const db = await getAdminDB();
    if (!db || !configId) return notFoundHtml();

    const snap = await db
      .collectionGroup("trackingPageConfigs")
      .where("publicId", "==", configId.slice(0, 200))
      .limit(1)
      .get();
    if (snap.empty) return notFoundHtml();

    const doc = snap.docs[0];
    const config = doc.data() as Partial<TrackingPageConfigDoc>;
    if (config.enabled === false) return notFoundHtml();

    const { searchParams } = new URL(request.url);
    const statusParam = searchParams.get("status");
    const currentStatus: TrackingStatus =
      statusParam && (TRACKING_STATUS_VALUES as string[]).includes(statusParam)
        ? (statusParam as TrackingStatus)
        : "shipped";

    const orderNumber = str(searchParams.get("order")) || "ORD-PENDING";
    const branding: Partial<TrackingPageConfigDoc["branding"]> = config.branding || {};
    const rawLogo = branding.logoUrl || "";
    const rawSupportUrl = branding.supportUrl || "";
    const events = [
      { status: "ordered", timestamp: "", location: "Online", description: "Order confirmed" },
      {
        status: currentStatus,
        timestamp: "",
        location: "",
        description: `Package status: ${currentStatus.replace(/_/g, " ")}`,
      },
    ];

    // Record the page view (fire-and-forget) so store analytics stay accurate.
    const ownerUid = doc.ref.parent.parent?.id;
    if (ownerUid) {
      void addTrackingPageView(ownerUid, {
        orderId: str(searchParams.get("orderId"), 200) || "guest",
        orderNumber,
        customerEmail: str(searchParams.get("email"), 200) || "guest@visit",
        viewedAt: new Date().toISOString(),
        device: detectDevice(request.headers.get("user-agent") || ""),
        country: request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || "unknown",
        duration: 0,
      });
    }

    const html = generateTrackingHtml({
      storeName: branding.businessName || config.storeName || "My Store",
      orderNumber,
      trackingNumber: str(searchParams.get("tracking")) || "Processing",
      carrier: str(searchParams.get("carrier")) || "CJ Dropshipping",
      currentStatus,
      estimatedDelivery: str(searchParams.get("edd")) || "Within 7-14 business days",
      events,
      branding: {
        primaryColor: branding.primaryColor || "#6366f1",
        secondaryColor: branding.secondaryColor || "#818cf8",
        logoUrl: isSafeHttpUrl(rawLogo) ? rawLogo : "",
        supportEmail: branding.supportEmail || "",
        supportUrl: isSafeHttpUrl(rawSupportUrl) ? rawSupportUrl : "",
      },
      template: config.template,
    });

    return new NextResponse(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    });
  } catch {
    return notFoundHtml();
  }
}
