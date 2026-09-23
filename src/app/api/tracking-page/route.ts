import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { TRACKING_TEMPLATES, generateTrackingHtml, TRACKING_STATUS_VALUES, isSafeHttpUrl } from "@/lib/tracking-page";
import { saveTrackingPageConfig, getTrackingPageConfigs, getTrackingPageStats, deleteTrackingPageConfig } from "@/lib/data/tracking-page";
import type { TrackingPageTemplate, UpsellSlot, NotificationConfig, TrackingStatus } from "@/types/tracking-page";
import { safeErrorMessage } from "@/lib/api-errors";

const TEMPLATE_IDS = TRACKING_TEMPLATES.map((t) => t.id);
const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const UPSELL_POSITIONS: UpsellSlot["position"][] = ["header", "progress_bar", "delivery_info", "footer"];

const str = (v: unknown, max = 200): string => (typeof v === "string" ? v.slice(0, max) : "");
const hex = (v: unknown, fallback: string): string =>
  typeof v === "string" && HEX_COLOR_RE.test(v) ? v : fallback;
const url = (v: unknown): string => (typeof v === "string" && isSafeHttpUrl(v) ? v : "");

function sanitizeBranding(raw: unknown) {
  const b = (raw || {}) as Record<string, unknown>;
  const social = (b.socialLinks || {}) as Record<string, unknown>;
  return {
    logoUrl: url(b.logoUrl),
    primaryColor: hex(b.primaryColor, "#6366f1"),
    secondaryColor: hex(b.secondaryColor, "#818cf8"),
    backgroundColor: hex(b.backgroundColor, "#f8fafc"),
    fontFamily: str(b.fontFamily, 100),
    businessName: str(b.businessName, 100),
    supportEmail: str(b.supportEmail, 200),
    supportUrl: url(b.supportUrl),
    socialLinks: {
      instagram: url(social.instagram),
      tiktok: url(social.tiktok),
      facebook: url(social.facebook),
      twitter: url(social.twitter),
    },
  };
}

function sanitizeUpsells(raw: unknown): UpsellSlot[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, UPSELL_POSITIONS.length).map((slot, i) => {
    const s = (slot || {}) as Record<string, unknown>;
    const position = UPSELL_POSITIONS.includes(s.position as UpsellSlot["position"])
      ? (s.position as UpsellSlot["position"])
      : UPSELL_POSITIONS[i % UPSELL_POSITIONS.length];
    return {
      id: str(s.id, 100) || `slot-${position}-${i}`,
      enabled: s.enabled === true,
      position,
      productTitle: str(s.productTitle, 200),
      productImage: url(s.productImage),
      productUrl: url(s.productUrl),
      discount: Math.max(0, Math.min(100, Number(s.discount) || 0)),
      ctaText: str(s.ctaText, 100) || "Shop now",
    };
  });
}

function sanitizeNotifications(raw: unknown): NotificationConfig {
  const n = (raw || {}) as Record<string, unknown>;
  const bool = (v: unknown, dflt: boolean) => (typeof v === "boolean" ? v : dflt);
  return {
    orderConfirmed: bool(n.orderConfirmed, true),
    shipped: bool(n.shipped, true),
    inTransit: bool(n.inTransit, true),
    outForDelivery: bool(n.outForDelivery, true),
    delivered: bool(n.delivered, true),
    emailNotifications: bool(n.emailNotifications, true),
    smsNotifications: bool(n.smsNotifications, false),
    pushNotifications: bool(n.pushNotifications, false),
    delayMinutes: Math.max(0, Math.min(1440, Number(n.delayMinutes) || 0)),
  };
}

const validStatus = (v: unknown): TrackingStatus =>
  TRACKING_STATUS_VALUES.includes(v as TrackingStatus) ? (v as TrackingStatus) : "shipped";

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
      if (!storeId || typeof storeId !== "string") {
        return NextResponse.json({ error: "storeId is required" }, { status: 400 });
      }
      if (!TEMPLATE_IDS.includes(template as TrackingPageTemplate)) {
        return NextResponse.json({ error: "A valid template is required" }, { status: 400 });
      }
      const cleanBranding = sanitizeBranding(branding);
      if (!cleanBranding.businessName) {
        return NextResponse.json({ error: "Business name is required" }, { status: 400 });
      }
      const id = await saveTrackingPageConfig(uid, {
        storeId: storeId.slice(0, 200),
        storeName: str(storeName) || cleanBranding.businessName,
        template: template as TrackingPageTemplate,
        branding: cleanBranding,
        upsells: sanitizeUpsells(upsells),
        notifications: sanitizeNotifications(notifications),
        enabled: enabled !== false,
      });
      return NextResponse.json({ success: !!id, id });
    }

    if (action === "preview") {
      const rawEvents = Array.isArray(body.events) ? body.events.slice(0, 20) : [];
      const events = rawEvents.map((e: unknown) => {
        const ev = (e || {}) as Record<string, unknown>;
        return {
          status: validStatus(ev.status) as string,
          timestamp: str(ev.timestamp, 60),
          location: str(ev.location, 120),
          description: str(ev.description, 300),
        };
      });
      const html = generateTrackingHtml({
        storeName: str(body.storeName, 100) || "My Store",
        orderNumber: str(body.orderNumber, 60) || "ORD-12345",
        trackingNumber: str(body.trackingNumber, 60) || "TRACK-67890",
        carrier: str(body.carrier, 100) || "CJ Dropshipping",
        currentStatus: validStatus(body.currentStatus),
        estimatedDelivery: str(body.estimatedDelivery, 60) || "Sep 25, 2026",
        events:
          events.length > 0
            ? events
            : [
                { status: "ordered", timestamp: "Sep 15, 2026", location: "Online", description: "Order placed" },
                { status: "shipped", timestamp: "Sep 16, 2026", location: "China", description: "Package shipped" },
              ],
        branding: sanitizeBranding(body.branding),
        template: TEMPLATE_IDS.includes(body.template as TrackingPageTemplate)
          ? (body.template as TrackingPageTemplate)
          : "modern",
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
    const deleted = await deleteTrackingPageConfig(uid, id);
    if (!deleted) {
      return NextResponse.json({ error: "Failed to delete tracking page" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: safeErrorMessage(error, "Failed") }, { status: 500 });
  }
});
