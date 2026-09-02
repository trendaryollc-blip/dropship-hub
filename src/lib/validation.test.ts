import { describe, it, expect } from "vitest";
import {
  RoutingDecisionSchema,
  ProfitEntrySchema,
  SupplierPerformanceSchema,
  StoreConnectionSchema,
  ProductLifecycleSchema,
  MonitoredProductSchema,
  validateBody,
  AIChatSchema,
  ScraperSchema,
  StorePushInputSchema,
  PlatformSearchSchema,
} from "./validation";

describe("RoutingDecisionSchema", () => {
  it("accepts empty object", () => {
    expect(RoutingDecisionSchema.parse({})).toBeDefined();
  });

  it("accepts valid data", () => {
    const data = {
      orderId: "ORD-001",
      customerLocation: "US",
      productTitle: "Widget",
      selectedSupplier: "CJ",
      shippingDays: 5,
      shippingCost: 10,
      totalCost: 50,
      reasoning: "Best price",
      status: "routed" as const,
    };
    expect(RoutingDecisionSchema.parse(data)).toBeDefined();
  });

  it("rejects invalid status", () => {
    expect(() => RoutingDecisionSchema.parse({ status: "invalid" })).toThrow();
  });

  it("rejects negative shipping days", () => {
    expect(() => RoutingDecisionSchema.parse({ shippingDays: -1 })).toThrow();
  });

  it("rejects shipping days > 365", () => {
    expect(() => RoutingDecisionSchema.parse({ shippingDays: 366 })).toThrow();
  });
});

describe("ProfitEntrySchema", () => {
  it("rejects invalid date format", () => {
    expect(() => ProfitEntrySchema.parse({
      date: "2024/01/01",
      productTitle: "Test",
      revenue: 100,
      cogs: 30,
      shippingCost: 10,
      platformFee: 15,
      paymentProcessing: 3,
      refunds: 0,
      adSpend: 5,
      netProfit: 37,
      profitMargin: 37,
    })).toThrow();
  });

  it("accepts valid date format", () => {
    expect(ProfitEntrySchema.parse({
      date: "2024-01-15",
      productTitle: "Test Product",
      revenue: 100,
      cogs: 30,
      shippingCost: 10,
      platformFee: 15,
      paymentProcessing: 3,
      refunds: 0,
      adSpend: 5,
      netProfit: 37,
      profitMargin: 37,
    })).toBeDefined();
  });

  it("defaults platform to unknown", () => {
    const result = ProfitEntrySchema.parse({
      date: "2024-01-15",
      productTitle: "Test",
      revenue: 100,
      cogs: 30,
      shippingCost: 10,
      platformFee: 15,
      paymentProcessing: 3,
      refunds: 0,
      adSpend: 5,
      netProfit: 37,
      profitMargin: 37,
    });
    expect(result.platform).toBe("unknown");
  });

  it("rejects empty productTitle", () => {
    expect(() => ProfitEntrySchema.parse({
      date: "2024-01-15",
      productTitle: "",
      revenue: 100,
      cogs: 30,
      shippingCost: 10,
      platformFee: 15,
      paymentProcessing: 3,
      refunds: 0,
      adSpend: 5,
      netProfit: 37,
      profitMargin: 37,
    })).toThrow();
  });

  it("defaults status to completed", () => {
    const result = ProfitEntrySchema.parse({
      date: "2024-01-15",
      productTitle: "Test",
      revenue: 100,
      cogs: 30,
      shippingCost: 10,
      platformFee: 15,
      paymentProcessing: 3,
      refunds: 0,
      adSpend: 5,
      netProfit: 37,
      profitMargin: 37,
    });
    expect(result.status).toBe("completed");
  });
});

describe("SupplierPerformanceSchema", () => {
  it("accepts valid data", () => {
    expect(SupplierPerformanceSchema.parse({
      supplierId: "cj",
      supplierName: "CJ Dropshipping",
      reliabilityScore: 95,
      refundRate: 2,
      avgShippingDays: 12,
      complaintRate: 1,
      stockReliability: 90,
    })).toBeDefined();
  });

  it("rejects scores > 100", () => {
    expect(() => SupplierPerformanceSchema.parse({
      supplierId: "cj",
      supplierName: "CJ",
      reliabilityScore: 101,
      refundRate: 2,
      avgShippingDays: 12,
      complaintRate: 1,
      stockReliability: 90,
    })).toThrow();
  });
});

describe("StoreConnectionSchema", () => {
  it("accepts valid Shopify connection", () => {
    expect(StoreConnectionSchema.parse({
      platform: "shopify",
      name: "My Store",
      url: "https://my-store.myshopify.com",
    })).toBeDefined();
  });

  it("rejects invalid platform", () => {
    expect(() => StoreConnectionSchema.parse({
      platform: "invalid",
      name: "Store",
      url: "https://example.com",
    })).toThrow();
  });

  it("rejects invalid URL", () => {
    expect(() => StoreConnectionSchema.parse({
      platform: "shopify",
      name: "Store",
      url: "not-a-url",
    })).toThrow();
  });

  it("status is optional", () => {
    const result = StoreConnectionSchema.parse({
      platform: "shopify",
      name: "Store",
      url: "https://store.myshopify.com",
    });
    expect(result.status).toBeUndefined();
  });
});

describe("ProductLifecycleSchema", () => {
  it("accepts valid data", () => {
    expect(ProductLifecycleSchema.parse({
      productId: "p1",
      productTitle: "Widget",
      currentStage: "winning",
      stageEnteredAt: "2024-01-01",
      totalDaysTracked: 30,
    })).toBeDefined();
  });

  it("rejects invalid stage", () => {
    expect(() => ProductLifecycleSchema.parse({
      productId: "p1",
      productTitle: "Widget",
      currentStage: "invalid",
      stageEnteredAt: "2024-01-01",
      totalDaysTracked: 30,
    })).toThrow();
  });
});

describe("AIChatSchema", () => {
  it("accepts valid chat", () => {
    expect(AIChatSchema.parse({
      messages: [{ role: "user", content: "Hello" }],
    })).toBeDefined();
  });

  it("rejects empty messages", () => {
    expect(() => AIChatSchema.parse({ messages: [] })).toThrow();
  });

  it("rejects empty message content", () => {
    expect(() => AIChatSchema.parse({
      messages: [{ role: "user", content: "" }],
    })).toThrow();
  });
});

describe("ScraperSchema", () => {
  it("accepts valid input", () => {
    expect(ScraperSchema.parse({ query: "phone", platform: "aliexpress" })).toBeDefined();
  });

  it("rejects empty query", () => {
    expect(() => ScraperSchema.parse({ query: "", platform: "aliexpress" })).toThrow();
  });
});

describe("StorePushInputSchema", () => {
  it("accepts valid input", () => {
    expect(StorePushInputSchema.parse({
      storeId: "s1",
      productTitle: "Widget",
      productPrice: 29.99,
    })).toBeDefined();
  });

  it("rejects negative price", () => {
    expect(() => StorePushInputSchema.parse({
      storeId: "s1",
      productTitle: "Widget",
      productPrice: -1,
    })).toThrow();
  });
});

describe("PlatformSearchSchema", () => {
  it("accepts valid input", () => {
    expect(PlatformSearchSchema.parse({ query: "phone case" })).toBeDefined();
  });

  it("rejects empty query", () => {
    expect(() => PlatformSearchSchema.parse({ query: "" })).toThrow();
  });

  it("platform is optional", () => {
    const result = PlatformSearchSchema.parse({ query: "test" });
    expect(result.platform).toBeUndefined();
  });
});

describe("validateBody", () => {
  it("returns success for valid data", () => {
    const schema = PlatformSearchSchema;
    const result = validateBody(schema, { query: "test" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query).toBe("test");
    }
  });

  it("returns failure for invalid data", () => {
    const schema = PlatformSearchSchema;
    const result = validateBody(schema, { query: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response).toBeDefined();
    }
  });
});
