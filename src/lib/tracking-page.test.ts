import { describe, it, expect } from "vitest";
import { generateTrackingHtml, escapeHtml, isSafeHttpUrl, TRACKING_STATUS_VALUES } from "./tracking-page";

const baseConfig = {
  storeName: "My Store",
  orderNumber: "ORD-1",
  trackingNumber: "TRK-1",
  carrier: "CJ",
  currentStatus: "shipped" as const,
  estimatedDelivery: "Sep 25, 2026",
  events: [{ status: "ordered", timestamp: "Sep 15", location: "Online", description: "Order placed" }],
  branding: {
    primaryColor: "#6366f1",
    secondaryColor: "#818cf8",
    logoUrl: "",
    supportEmail: "support@store.com",
  },
};

describe("escapeHtml", () => {
  it("escapes HTML special characters", () => {
    expect(escapeHtml(`<script>alert("x")</script>`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(escapeHtml("Tom & Jerry's")).toBe("Tom &amp; Jerry&#39;s");
  });

  it("handles non-strings and nullish values", () => {
    expect(escapeHtml(null)).toBe("");
    expect(escapeHtml(undefined)).toBe("");
    expect(escapeHtml(42)).toBe("42");
  });
});

describe("isSafeHttpUrl", () => {
  it("accepts http(s) URLs", () => {
    expect(isSafeHttpUrl("https://example.com/logo.png")).toBe(true);
    expect(isSafeHttpUrl("http://example.com")).toBe(true);
  });

  it("rejects dangerous or malformed URLs", () => {
    expect(isSafeHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeHttpUrl("data:text/html,<script>")).toBe(false);
    expect(isSafeHttpUrl("not a url")).toBe(false);
    expect(isSafeHttpUrl("")).toBe(false);
    expect(isSafeHttpUrl(null)).toBe(false);
  });
});

describe("TRACKING_STATUS_VALUES", () => {
  it("covers every tracking status", () => {
    expect(TRACKING_STATUS_VALUES).toContain("shipped");
    expect(TRACKING_STATUS_VALUES).toContain("exception");
    expect(TRACKING_STATUS_VALUES).toHaveLength(7);
  });
});

describe("generateTrackingHtml", () => {
  it("escapes user-controlled values (XSS regression)", () => {
    const html = generateTrackingHtml({
      ...baseConfig,
      storeName: `<script>alert("x")</script>`,
      orderNumber: `<img src=x onerror=alert(1)>`,
      events: [{ status: "shipped", timestamp: "<b>now</b>", location: "<i>US</i>", description: `<svg onload=alert(2)>` }],
      branding: { ...baseConfig.branding, supportEmail: `evil"><script>alert(3)</script>` },
    });
    expect(html).not.toContain(`<script>alert("x")</script>`);
    expect(html).not.toContain(`<img src=x onerror=alert(1)>`);
    expect(html).not.toContain(`<svg onload=alert(2)>`);
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;svg onload=alert(2)&gt;");
  });

  it("rejects non-http logo URLs (javascript: URI regression)", () => {
    const html = generateTrackingHtml({
      ...baseConfig,
      branding: { ...baseConfig.branding, logoUrl: `javascript:alert(1)` },
    });
    expect(html).not.toContain(`javascript:`);
    expect(html).not.toContain(`<img`);
  });

  it("keeps safe http(s) logo URLs", () => {
    const html = generateTrackingHtml({
      ...baseConfig,
      branding: { ...baseConfig.branding, logoUrl: "https://cdn.example.com/logo.png" },
    });
    expect(html).toContain(`<img src="https://cdn.example.com/logo.png"`);
  });

  it("falls back to default colors for invalid hex values", () => {
    const html = generateTrackingHtml({
      ...baseConfig,
      branding: { ...baseConfig.branding, primaryColor: "not-a-color" },
    });
    expect(html).toContain("#6366f1");
    expect(html).not.toContain("not-a-color");
  });

  it("sanitizes font family input against CSS breakout", () => {
    const html = generateTrackingHtml({
      ...baseConfig,
      branding: { ...baseConfig.branding, fontFamily: `Inter} body { display: none } .x {` },
    });
    expect(html).not.toContain("display: none");
  });

  it("renders supportUrl as a link when provided", () => {
    const html = generateTrackingHtml({
      ...baseConfig,
      branding: { ...baseConfig.branding, supportUrl: "https://store.com/support" },
    });
    expect(html).toContain(`href="https://store.com/support"`);
    expect(html).not.toContain("mailto:");
  });

  it("renders a mailto link when only supportEmail is provided", () => {
    const html = generateTrackingHtml({ ...baseConfig });
    expect(html).toContain(`href="mailto:support@store.com"`);
  });

  it("applies template-specific styles", () => {
    const modern = generateTrackingHtml({ ...baseConfig, template: "modern" });
    const bold = generateTrackingHtml({ ...baseConfig, template: "bold" });
    const elegant = generateTrackingHtml({ ...baseConfig, template: "elegant" });
    expect(bold).toContain("uppercase");
    expect(bold).toContain("30px");
    expect(modern).not.toContain("text-transform: uppercase");
    expect(elegant).toContain("Georgia");
  });

  it("marks delivered orders", () => {
    const html = generateTrackingHtml({ ...baseConfig, currentStatus: "delivered" });
    expect(html).toContain('class="delivered"');
  });

  it("is valid HTML document structure", () => {
    const html = generateTrackingHtml({ ...baseConfig });
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toContain("</html>");
    expect(html).toContain("Track Your Order - My Store");
  });

  it("omits unknown order/tracking/carrier/estimate instead of inventing them", () => {
    const html = generateTrackingHtml({
      ...baseConfig,
      orderNumber: "",
      trackingNumber: "",
      carrier: "",
      estimatedDelivery: "",
    });
    expect(html).not.toContain("Order #");
    expect(html).not.toContain("Tracking:");
    expect(html).not.toContain("Carrier:");
    expect(html).not.toContain("Estimated Delivery:");
    expect(html).toContain("Tracking details will appear here when available.");
  });

  it("still renders tracking details when provided", () => {
    const html = generateTrackingHtml({ ...baseConfig });
    expect(html).toContain("Tracking: TRK-1");
    expect(html).toContain("Carrier: CJ");
    expect(html).toContain("Estimated Delivery: Sep 25, 2026");
    expect(html).toContain("Order #ORD-1");
  });
});
