import { describe, it, expect } from "vitest";

describe("types/order", () => {
  it("RoutingDecision type can be constructed", () => {
    const decision: import("./order").RoutingDecision = {
      id: "1",
      orderId: "ORD-001",
      orderDate: "2026-01-01",
      customerName: "Test",
      customerLocation: "US",
      productTitle: "Widget",
      productImage: "img.png",
      quantity: 1,
      totalPrice: 25,
      selectedSupplier: {
        supplierId: "S1",
        supplierName: "Supplier A",
        inStock: true,
        stockLevel: 100,
        shippingDays: 5,
        shippingCost: 3,
        unitCost: 10,
        totalCost: 10,
        qualityScore: 90,
        location: "CN",
        reliabilityScore: 95,
        totalScore: 88,
        selected: true,
      },
      alternativeSuppliers: [],
      reasoning: "Best price",
      status: "routed",
      routedAt: "2026-01-01T00:00:00Z",
      estimatedDelivery: "2026-01-06",
      shippingCost: 3,
      totalCost: 13,
    };
    expect(decision.status).toBe("routed");
    expect(decision.selectedSupplier.totalScore).toBe(88);
  });

  it("SupplierOption type can be constructed", () => {
    const option: import("./order").SupplierOption = {
      supplierId: "S1",
      supplierName: "Test Supplier",
      inStock: true,
      stockLevel: 50,
      shippingDays: 7,
      shippingCost: 5,
      unitCost: 15,
      totalCost: 15,
      qualityScore: 85,
      location: "US",
      reliabilityScore: 90,
      totalScore: 82,
      selected: false,
      rejectionReason: "Too slow",
    };
    expect(option.rejectionReason).toBe("Too slow");
  });

  it("RoutingPreferences type can be constructed", () => {
    const prefs: import("./order").RoutingPreferences = {
      optimization: "cost",
      maxShippingDays: 14,
      minQualityScore: 80,
      preferLocalWarehouse: true,
      autoFallback: true,
      maxFallbackAttempts: 3,
    };
    expect(prefs.optimization).toBe("cost");
  });

  it("RoutingAnalytics type can be constructed", () => {
    const analytics: import("./order").RoutingAnalytics = {
      totalRouted: 100,
      avgShippingDays: 5.5,
      avgCost: 12.5,
      supplierDistribution: [{ name: "Supplier A", count: 60, color: "#000" }],
      optimizationBreakdown: [{ type: "cost", count: 40 }],
      costSavings: 500,
      timeSavings: 200,
    };
    expect(analytics.totalRouted).toBe(100);
  });

  it("RoutingHistory type can be constructed", () => {
    const hist: import("./order").RoutingHistory = {
      id: "1",
      orderId: "ORD-001",
      productTitle: "Widget",
      customerLocation: "US",
      selectedSupplier: "Supplier A",
      shippingDays: 5,
      shippingCost: 3,
      reason: "Best price",
      routedAt: "2026-01-01T00:00:00Z",
    };
    expect(hist.reason).toBe("Best price");
  });
});
