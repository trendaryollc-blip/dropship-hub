import { describe, it, expect } from "vitest";
import { validateBody, RoutingDecisionSchema, ProfitEntrySchema, PlatformSearchSchema, StoreConnectionSchema } from "@/lib/validation";

describe("Data Pipeline Integration", () => {
  it("validates and processes routing decision", () => {
    const input = {
      orderId: "ORD-001",
      customerLocation: "New York, US",
      productTitle: "Wireless Earbuds",
      selectedSupplier: "CJ Dropshipping",
      shippingDays: 7,
      shippingCost: 5.50,
      totalCost: 25.50,
      reasoning: "Best combination of price and shipping time",
      status: "routed" as const,
    };
    const result = validateBody(RoutingDecisionSchema, input);
    expect(result.success).toBe(true);
  });

  it("validates profit entry with all fields", () => {
    const input = {
      date: "2024-01-15",
      productTitle: "Wireless Earbuds Pro",
      platform: "shopify",
      revenue: 150,
      cogs: 35,
      shippingCost: 8,
      platformFee: 22.5,
      paymentProcessing: 4.5,
      refunds: 5,
      adSpend: 15,
      otherCosts: 2,
      netProfit: 58,
      profitMargin: 38.7,
      status: "completed" as const,
    };
    const result = validateBody(ProfitEntrySchema, input);
    expect(result.success).toBe(true);
  });

  it("rejects invalid profit entry", () => {
    const input = {
      date: "not-a-date",
      productTitle: "",
      revenue: -100,
    };
    const result = validateBody(ProfitEntrySchema, input);
    expect(result.success).toBe(false);
  });

  it("validates platform search request", () => {
    const result = validateBody(PlatformSearchSchema, { query: "wireless earbuds" });
    expect(result.success).toBe(true);
  });

  it("validates store connection with supported platforms", () => {
    const platforms = ["shopify", "woocommerce", "bigcommerce", "wix", "trendaryo", "etsy", "custom"] as const;
    for (const platform of platforms) {
      const result = validateBody(StoreConnectionSchema, {
        platform,
        name: `Test ${platform}`,
        url: `https://test-${platform}.example.com`,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid store URL", () => {
    const result = validateBody(StoreConnectionSchema, {
      platform: "shopify",
      name: "Test",
      url: "not-a-url",
    });
    expect(result.success).toBe(false);
  });
});
