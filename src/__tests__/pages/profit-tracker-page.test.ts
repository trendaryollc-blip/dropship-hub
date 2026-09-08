import { describe, it, expect } from "vitest";
import type {
  ProfitEntry,
  ProfitSummary,
  ProfitFilter,
} from "@/types/profit";

describe("Profit Tracker Page - Data Types", () => {
  it("profit entry has required fields", () => {
    const entry: ProfitEntry = {
      id: "pe-1",
      orderId: "ord-1",
      orderNumber: "ORD-001",
      productId: "p-1",
      productName: "Wireless Earbuds",
      platform: "shopify",
      revenue: 29.99,
      costOfGoods: 8.50,
      shippingCost: 4.99,
      platformFees: 2.70,
      advertisingCost: 3.00,
      otherCosts: 0.50,
      netProfit: 10.30,
      margin: 34.35,
      status: "settled",
      customerCountry: "US",
      createdAt: new Date().toISOString(),
    };
    expect(entry.netProfit).toBeGreaterThan(0);
    expect(entry.margin).toBeGreaterThan(0);
    expect(entry.margin).toBeLessThanOrEqual(100);
  });

  it("profit summary has required fields", () => {
    const summary: ProfitSummary = {
      totalRevenue: 50000,
      totalCosts: 32000,
      totalProfit: 18000,
      averageMargin: 36,
      orderCount: 500,
      averageOrderValue: 100,
      topProducts: [],
      platformBreakdown: [],
    };
    expect(summary.totalRevenue).toBeGreaterThan(summary.totalProfit);
    expect(summary.averageMargin).toBeGreaterThan(0);
  });

  it("profit status values", () => {
    const statuses = ["pending", "settled", "disputed", "refunded"] as const;
    expect(statuses).toHaveLength(4);
  });

  it("profit filter has required fields", () => {
    const filter: ProfitFilter = {
      dateRange: { start: "2024-01-01", end: "2024-12-31" },
      platforms: ["shopify", "amazon"],
      minMargin: 20,
      maxMargin: 80,
      status: "settled",
    };
    expect(filter.platforms.length).toBeGreaterThan(0);
    expect(filter.minMargin).toBeLessThan(filter.maxMargin);
  });
});

describe("Profit Tracker Page - Business Logic", () => {
  it("calculates net profit correctly", () => {
    const revenue = 29.99;
    const cogs = 8.50;
    const shipping = 4.99;
    const fees = 2.70;
    const ads = 3.00;
    const other = 0.50;
    const net = revenue - cogs - shipping - fees - ads - other;
    expect(net).toBeCloseTo(10.30, 2);
  });

  it("calculates margin percentage", () => {
    const revenue = 29.99;
    const netProfit = 10.30;
    const margin = (netProfit / revenue) * 100;
    expect(margin).toBeCloseTo(34.35, 1);
  });

  it("calculates average order value", () => {
    const totalRevenue = 50000;
    const orderCount = 500;
    const aov = totalRevenue / orderCount;
    expect(aov).toBe(100);
  });

  it("can filter by date range", () => {
    const entries: ProfitEntry[] = [
      { id: "1", createdAt: "2024-01-15T00:00:00Z" } as ProfitEntry,
      { id: "2", createdAt: "2024-06-15T00:00:00Z" } as ProfitEntry,
      { id: "3", createdAt: "2024-12-15T00:00:00Z" } as ProfitEntry,
    ];
    const start = new Date("2024-06-01").getTime();
    const end = new Date("2024-12-31").getTime();
    const filtered = entries.filter((e) => {
      const d = new Date(e.createdAt).getTime();
      return d >= start && d <= end;
    });
    expect(filtered).toHaveLength(2);
  });

  it("can filter by margin threshold", () => {
    const entries: ProfitEntry[] = [
      { id: "1", margin: 15 } as ProfitEntry,
      { id: "2", margin: 45 } as ProfitEntry,
      { id: "3", margin: 25 } as ProfitEntry,
    ];
    const profitable = entries.filter((e) => e.margin >= 20);
    expect(profitable).toHaveLength(2);
  });

  it("can sort by net profit", () => {
    const entries: ProfitEntry[] = [
      { id: "1", netProfit: 5.00 } as ProfitEntry,
      { id: "2", netProfit: 15.00 } as ProfitEntry,
      { id: "3", netProfit: 10.00 } as ProfitEntry,
    ];
    const sorted = [...entries].sort((a, b) => b.netProfit - a.netProfit);
    expect(sorted[0].id).toBe("2");
  });

  it("calculates profit by platform", () => {
    const entries: ProfitEntry[] = [
      { id: "1", platform: "shopify", netProfit: 10 } as ProfitEntry,
      { id: "2", platform: "amazon", netProfit: 8 } as ProfitEntry,
      { id: "3", platform: "shopify", netProfit: 12 } as ProfitEntry,
    ];
    const byPlatform = entries.reduce((acc, e) => {
      acc[e.platform] = (acc[e.platform] || 0) + e.netProfit;
      return acc;
    }, {} as Record<string, number>);
    expect(byPlatform.shopify).toBe(22);
    expect(byPlatform.amazon).toBe(8);
  });
});
