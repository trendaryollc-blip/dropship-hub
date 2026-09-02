import { describe, it, expect } from "vitest";

describe("types/profit", () => {
  it("CostProfile type can be constructed", () => {
    const profile: import("./profit").CostProfile = {
      id: "1",
      productId: "P1",
      productTitle: "Widget",
      cogs: 10,
      shippingCost: 3,
      platformFeePercent: 15,
      paymentProcessingPercent: 2.9,
      packagingCost: 0.5,
      otherCosts: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    expect(profile.cogs).toBe(10);
  });

  it("ProfitEntry type can be constructed", () => {
    const entry: import("./profit").ProfitEntry = {
      id: "1",
      orderId: "ORD-001",
      date: "2026-01-01",
      productTitle: "Widget",
      productImage: "img.png",
      platform: "shopify",
      supplier: "CJ",
      revenue: 25,
      cogs: 10,
      shippingCost: 3,
      platformFee: 3.75,
      paymentProcessing: 0.73,
      refunds: 0,
      adSpend: 2,
      otherCosts: 0.5,
      netProfit: 5.02,
      profitMargin: 20.08,
      status: "completed",
    };
    expect(entry.status).toBe("completed");
    expect(entry.profitMargin).toBeCloseTo(20.08);
  });

  it("ProfitSummary type can be constructed", () => {
    const summary: import("./profit").ProfitSummary = {
      totalRevenue: 5000,
      totalProfit: 1000,
      totalCosts: 4000,
      profitMargin: 20,
      totalOrders: 100,
      avgOrderProfit: 10,
      avgOrderValue: 50,
      refundRate: 0.02,
      topProducts: [],
      dailyBreakdown: [],
      costBreakdown: [],
    };
    expect(summary.totalOrders).toBe(100);
  });

  it("ProductProfitability type can be constructed", () => {
    const prod: import("./profit").ProductProfitability = {
      productTitle: "Widget",
      productImage: "img.png",
      totalRevenue: 1000,
      totalProfit: 200,
      totalOrders: 20,
      profitMargin: 20,
      trend: 5.5,
      status: "profitable",
    };
    expect(prod.status).toBe("profitable");
  });

  it("DailyProfit type can be constructed", () => {
    const daily: import("./profit").DailyProfit = {
      date: "2026-01-01",
      revenue: 100,
      profit: 20,
      orders: 2,
      costs: 80,
    };
    expect(daily.orders).toBe(2);
  });

  it("CostBreakdownItem type can be constructed", () => {
    const item: import("./profit").CostBreakdownItem = {
      name: "COGS",
      value: 100,
      pct: 40,
      color: "#EF4444",
    };
    expect(item.pct).toBe(40);
  });

  it("CampaignProfit type can be constructed", () => {
    const camp: import("./profit").CampaignProfit = {
      campaignName: "Summer Sale",
      adSpend: 500,
      revenue: 2000,
      profit: 500,
      roas: 4,
      orders: 40,
    };
    expect(camp.roas).toBe(4);
  });

  it("ProfitFilters type can be constructed", () => {
    const filters: import("./profit").ProfitFilters = {
      timeframe: "30d",
      platform: "shopify",
      supplier: "CJ",
      product: "Widget",
    };
    expect(filters.timeframe).toBe("30d");
  });
});
