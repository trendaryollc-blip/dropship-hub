import type { TrackingPageTemplate, TrackingPageTemplateOption, TrackingStatus } from "@/types/tracking-page";

export const TRACKING_TEMPLATES: TrackingPageTemplateOption[] = [
  {
    id: "modern",
    name: "Modern",
    preview: "Clean gradient background with smooth animations",
    description: "Sleek, modern design with gradient backgrounds and smooth step animations. Perfect for tech and lifestyle brands.",
    features: ["Gradient backgrounds", "Animated progress steps", "Dark/light mode", "Upsell carousel"],
  },
  {
    id: "minimal",
    name: "Minimal",
    preview: "Simple white layout with subtle borders",
    description: "Clean, minimal design focused on clarity. White space and typography-driven. Great for premium brands.",
    features: ["Clean typography", "Subtle animations", "Mobile-first", "Minimal distractions"],
  },
  {
    id: "bold",
    name: "Bold",
    preview: "High contrast with large typography",
    description: "High-energy design with bold colors and large type. Ideal for streetwear and youth brands.",
    features: ["High contrast", "Large typography", "Color animations", "Social proof badges"],
  },
  {
    id: "elegant",
    name: "Elegant",
    preview: "Gold accents with serif fonts",
    description: "Luxurious feel with gold accents and serif typography. Perfect for jewelry, fashion, and high-end products.",
    features: ["Gold accents", "Serif fonts", "Subtle shadows", "Premium feel"],
  },
  {
    id: "playful",
    name: "Playful",
    preview: "Fun colors with rounded elements",
    description: "Fun, friendly design with rounded corners and bright colors. Great for pet products, kids items, and casual brands.",
    features: ["Rounded corners", "Bright colors", "Fun animations", "Emoji support"],
  },
];

export const STATUS_STEPS: { status: TrackingStatus; label: string; icon: string; description: string }[] = [
  { status: "ordered", label: "Order Placed", icon: "✓", description: "Your order has been confirmed" },
  { status: "processing", label: "Processing", icon: "⚙️", description: "We're preparing your order" },
  { status: "shipped", label: "Shipped", icon: "📦", description: "Your order is on its way" },
  { status: "in_transit", label: "In Transit", icon: "🚚", description: "Your package is moving" },
  { status: "out_for_delivery", label: "Out for Delivery", icon: "🏍️", description: "Almost there!" },
  { status: "delivered", label: "Delivered", icon: "🎉", description: "Package delivered successfully" },
];

// ── HTML helpers (XSS hardening) ─────────────────────────────────────────────

/** Escape a value for safe interpolation into HTML text/attribute positions. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Only http(s) URLs are safe to embed as img src / link href. */
export function isSafeHttpUrl(value: unknown): boolean {
  if (typeof value !== "string" || !value.trim()) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export const TRACKING_STATUS_VALUES: TrackingStatus[] = [
  "ordered",
  "processing",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "exception",
];

const HEX_COLOR_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

interface TemplateStyle {
  fontFamily: string;
  radius: string;
  cardBg: string;
  cardShadow: string;
  cardBorder: string;
  headingTransform: string;
  headingWeight: number;
  bg: string;
  text: string;
  muted: string;
  line: string;
}

/** Template-specific look & feel for the branded tracking page. */
const TEMPLATE_STYLES: Record<TrackingPageTemplate, TemplateStyle> = {
  modern: { fontFamily: "'Inter', -apple-system, sans-serif", radius: "16px", cardBg: "#ffffff", cardShadow: "0 1px 3px rgba(0,0,0,0.08)", cardBorder: "none", headingTransform: "none", headingWeight: 700, bg: "#f8fafc", text: "#1e293b", muted: "#64748b", line: "#e2e8f0" },
  minimal: { fontFamily: "'Inter', -apple-system, sans-serif", radius: "8px", cardBg: "#ffffff", cardShadow: "none", cardBorder: "1px solid #e2e8f0", headingTransform: "none", headingWeight: 600, bg: "#ffffff", text: "#1e293b", muted: "#64748b", line: "#f1f5f9" },
  bold: { fontFamily: "'Archivo Black', 'Inter', sans-serif", radius: "4px", cardBg: "#1e293b", cardShadow: "0 4px 12px rgba(0,0,0,0.25)", cardBorder: "none", headingTransform: "uppercase", headingWeight: 800, bg: "#0f172a", text: "#f8fafc", muted: "#94a3b8", line: "#334155" },
  elegant: { fontFamily: "Georgia, 'Times New Roman', serif", radius: "8px", cardBg: "#ffffff", cardShadow: "0 2px 8px rgba(0,0,0,0.06)", cardBorder: "none", headingTransform: "none", headingWeight: 600, bg: "#faf9f7", text: "#292524", muted: "#78716c", line: "#e7e5e4" },
  playful: { fontFamily: "'Poppins', 'Inter', sans-serif", radius: "24px", cardBg: "#ffffff", cardShadow: "0 2px 6px rgba(0,0,0,0.08)", cardBorder: "none", headingTransform: "none", headingWeight: 700, bg: "#fefce8", text: "#292524", muted: "#a16207", line: "#fef3c7" },
};

export function generateTrackingHtml(config: {
  storeName: string;
  orderNumber: string;
  trackingNumber: string;
  carrier: string;
  currentStatus: TrackingStatus;
  estimatedDelivery: string;
  events: { status: string; timestamp: string; location: string; description: string }[];
  branding: {
    primaryColor: string;
    secondaryColor: string;
    logoUrl: string;
    supportEmail: string;
    supportUrl?: string;
    backgroundColor?: string;
    fontFamily?: string;
  };
  template?: TrackingPageTemplate;
}): string {
  const template: TrackingPageTemplate = config.template && TEMPLATE_STYLES[config.template] ? config.template : "modern";
  const style = TEMPLATE_STYLES[template];

  const stepIndex = STATUS_STEPS.findIndex((s) => s.status === config.currentStatus);
  const primary = HEX_COLOR_RE.test(config.branding.primaryColor || "") ? config.branding.primaryColor : "#6366f1";
  const secondary = HEX_COLOR_RE.test(config.branding.secondaryColor || "") ? config.branding.secondaryColor : "#818cf8";
  const bg = HEX_COLOR_RE.test(config.branding.backgroundColor || "") ? (config.branding.backgroundColor as string) : style.bg;
  // Font family is interpolated into a CSS rule — strip anything that could
  // break out of the declaration (letters, digits, spaces, quotes, hyphens, commas only).
  const safeFont = (config.branding.fontFamily || "").replace(/[^a-zA-Z0-9 ,'-]/g, "").trim();
  const fontFamily = safeFont || style.fontFamily;
  const logoUrl = isSafeHttpUrl(config.branding.logoUrl) ? escapeHtml(config.branding.logoUrl) : "";
  const supportUrl = isSafeHttpUrl(config.branding.supportUrl) ? escapeHtml(config.branding.supportUrl) : "";
  const supportEmail = escapeHtml(config.branding.supportEmail || "");

  const storeName = escapeHtml(config.storeName || "My Store");
  const orderNumber = escapeHtml(config.orderNumber || "");
  const trackingNumber = escapeHtml(config.trackingNumber || "");
  const carrier = escapeHtml(config.carrier || "");
  const estimatedDelivery = escapeHtml(config.estimatedDelivery || "");
  const events = (config.events || []).slice(0, 20).map((e) => ({
    description: escapeHtml(e.description || ""),
    location: escapeHtml(e.location || ""),
    timestamp: escapeHtml(e.timestamp || ""),
  }));

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Track Your Order - ${storeName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: ${fontFamily}; background: ${bg}; color: ${style.text}; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; padding: 32px 0; }
    .logo { max-height: 48px; margin-bottom: 16px; }
    h1 { font-size: ${template === "bold" ? "30px" : "24px"}; font-weight: ${style.headingWeight}; text-transform: ${style.headingTransform}; letter-spacing: ${template === "bold" ? "0.05em" : "normal"}; color: ${style.text}; }
    .card { background: ${style.cardBg}; border-radius: ${style.radius}; padding: 24px; margin-bottom: 16px; box-shadow: ${style.cardShadow}; border: ${style.cardBorder}; }
    .card h3 { font-size: 16px; font-weight: ${style.headingWeight}; margin-bottom: 12px; }
    .muted { color: ${style.muted}; }
    .progress { display: flex; justify-content: space-between; margin: 24px 0; position: relative; }
    .progress::before { content: ''; position: absolute; top: 18px; left: 40px; right: 40px; height: 2px; background: ${style.line}; }
    .step { text-align: center; flex: 1; position: relative; z-index: 1; }
    .step-dot { width: 36px; height: 36px; border-radius: 50%; background: ${style.line}; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; font-size: 14px; }
    .step.active .step-dot { background: ${primary}; color: white; }
    .step.completed .step-dot { background: #10b981; color: white; }
    .step-label { font-size: 11px; color: ${style.muted}; font-weight: 500; }
    .step.active .step-label { color: ${primary}; font-weight: 600; }
    .timeline { margin-top: 8px; }
    .event { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid ${style.line}; }
    .event:last-child { border-bottom: none; }
    .event-dot { width: 8px; height: 8px; border-radius: 50%; background: ${secondary}; margin-top: 6px; flex-shrink: 0; }
    .event-text { font-size: 14px; color: ${style.text}; }
    .event-time { font-size: 12px; color: ${style.muted}; margin-top: 2px; }
    .footer { text-align: center; padding: 24px 0; font-size: 12px; color: ${style.muted}; }
    .footer a { color: ${primary}; }
    .delivered { color: #10b981; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${logoUrl ? `<img src="${logoUrl}" alt="${storeName}" class="logo">` : ""}
      <h1>Track Your Order</h1>
      <p class="muted" style="font-size: 13px; margin-top: 6px;">${storeName}</p>
    </div>
    <div class="card">
      <p class="muted" style="font-size: 13px;">Order #${orderNumber}</p>
      <p style="font-size: 14px; margin-top: 4px;">Tracking: ${trackingNumber}</p>
      <p style="font-size: 14px;">Carrier: ${carrier}</p>
      <p style="font-size: 14px; margin-top: 8px;"><strong class="${config.currentStatus === "delivered" ? "delivered" : ""}">Estimated Delivery: ${estimatedDelivery}</strong></p>
    </div>
    <div class="card">
      <div class="progress">
        ${STATUS_STEPS.map((step, i) => `
        <div class="step ${i < stepIndex ? "completed" : ""} ${i === stepIndex ? "active" : ""}">
          <div class="step-dot">${step.icon}</div>
          <div class="step-label">${step.label}</div>
        </div>`).join("")}
      </div>
    </div>
    <div class="card">
      <h3>Tracking Updates</h3>
      <div class="timeline">
        ${events.map((e) => `
        <div class="event">
          <div class="event-dot"></div>
          <div>
            <div class="event-text">${e.description}</div>
            <div class="event-time">${e.location}${e.location && e.timestamp ? " • " : ""}${e.timestamp}</div>
          </div>
        </div>`).join("")}
      </div>
    </div>
    <div class="footer">
      ${supportUrl ? `<p>Questions? <a href="${supportUrl}" rel="noopener noreferrer">Contact support</a></p>` : supportEmail ? `<p>Questions? Contact us at <a href="mailto:${supportEmail}">${supportEmail}</a></p>` : ""}
      <p style="margin-top: 8px;">Powered by DropShipHub</p>
    </div>
  </div>
</body>
</html>`;
}
