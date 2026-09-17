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
  };
}): string {
  const stepIndex = STATUS_STEPS.findIndex((s) => s.status === config.currentStatus);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Track Your Order - ${config.storeName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #f8fafc; color: #1e293b; }
    .container { max-width: 600px; margin: 0 auto; padding: 24px; }
    .header { text-align: center; padding: 32px 0; }
    .logo { max-height: 48px; margin-bottom: 16px; }
    .order-info { background: white; border-radius: 16px; padding: 24px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .progress { display: flex; justify-content: space-between; margin: 24px 0; position: relative; }
    .progress::before { content: ''; position: absolute; top: 18px; left: 40px; right: 40px; height: 2px; background: #e2e8f0; }
    .step { text-align: center; flex: 1; position: relative; z-index: 1; }
    .step-dot { width: 36px; height: 36px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; margin: 0 auto 8px; font-size: 14px; }
    .step.active .step-dot { background: ${config.branding.primaryColor}; color: white; }
    .step.completed .step-dot { background: #10b981; color: white; }
    .step-label { font-size: 11px; color: #64748b; font-weight: 500; }
    .step.active .step-label { color: ${config.branding.primaryColor}; font-weight: 600; }
    .timeline { margin-top: 24px; }
    .event { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f1f5f9; }
    .event-dot { width: 8px; height: 8px; border-radius: 50%; background: ${config.branding.primaryColor}; margin-top: 6px; flex-shrink: 0; }
    .event-text { font-size: 14px; color: #334155; }
    .event-time { font-size: 12px; color: #94a3b8; margin-top: 2px; }
    .footer { text-align: center; padding: 24px 0; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${config.branding.logoUrl ? `<img src="${config.branding.logoUrl}" alt="${config.storeName}" class="logo">` : ""}
      <h1 style="font-size: 24px; font-weight: 700; color: #1e293b;">Track Your Order</h1>
    </div>
    <div class="order-info">
      <p style="font-size: 13px; color: #64748b;">Order #${config.orderNumber}</p>
      <p style="font-size: 14px; color: #334155; margin-top: 4px;">Tracking: ${config.trackingNumber}</p>
      <p style="font-size: 14px; color: #334155;">Carrier: ${config.carrier}</p>
      <p style="font-size: 14px; color: #334155; margin-top: 8px;"><strong>Estimated Delivery: ${config.estimatedDelivery}</strong></p>
    </div>
    <div class="progress">
      ${STATUS_STEPS.map((step, i) => `
        <div class="step ${i < stepIndex ? "completed" : ""} ${i === stepIndex ? "active" : ""}">
          <div class="step-dot">${step.icon}</div>
          <div class="step-label">${step.label}</div>
        </div>
      `).join("")}
    </div>
    <div class="order-info">
      <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Tracking Updates</h3>
      <div class="timeline">
        ${config.events.map((e) => `
          <div class="event">
            <div class="event-dot"></div>
            <div>
              <div class="event-text">${e.description}</div>
              <div class="event-time">${e.location} • ${e.timestamp}</div>
            </div>
          </div>
        `).join("")}
      </div>
    </div>
    <div class="footer">
      <p>Questions? Contact us at ${config.branding.supportEmail}</p>
      <p style="margin-top: 8px;">Powered by DropShipHub</p>
    </div>
  </div>
</body>
</html>`;
}
