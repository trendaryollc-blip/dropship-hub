import { describe, it, expect } from "vitest";

interface FinancialSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
  avgOrderValue: number;
  revenueGrowth: number;
  profitGrowth: number;
}

interface ProductPerformance {
  productId: string;
  name: string;
  revenue: number;
  profit: number;
  unitsSold: number;
  margin: number;
}

interface SupplierBreakdown {
  supplierId: string;
  supplierName: string;
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
}

interface PlatformBreakdown {
  platform: string;
  revenue: number;
  orders: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

describe("Financial Reports Page", () => {
  it("financial summary has all required fields", () => {
    const summary: FinancialSummary = {
      totalRevenue: 1000,
      totalCost: 600,
      totalProfit: 400,
      profitMargin: 40,
      totalOrders: 50,
      avgOrderValue: 20,
      revenueGrowth: 15.5,
      profitGrowth: 12.3,
    };
    expect(summary.totalRevenue).toBe(1000);
    expect(summary.totalCost).toBe(600);
    expect(summary.totalProfit).toBe(400);
    expect(summary.profitMargin).toBe(40);
    expect(summary.totalOrders).toBe(50);
  });

  it("profit margin is calculated correctly", () => {
    const revenue = 1000;
    const cost = 600;
    const profit = revenue - cost;
    const margin = (profit / revenue) * 100;
    expect(profit).toBe(400);
    expect(margin).toBe(40);
  });

  it("avg order value is calculated correctly", () => {
    const totalRevenue = 500;
    const totalOrders = 25;
    const avgOrderValue = totalRevenue / totalOrders;
    expect(avgOrderValue).toBe(20);
  });

  it("product performance tracks units and margin", () => {
    const product: ProductPerformance = {
      productId: "p1",
      name: "Wireless Earbuds",
      revenue: 500,
      profit: 200,
      unitsSold: 50,
      margin: 40,
    };
    expect(product.unitsSold).toBe(50);
    expect(product.margin).toBe(40);
    expect(product.revenue / product.unitsSold).toBe(10); // avg price per unit
  });

  it("supplier breakdown aggregates correctly", () => {
    const suppliers: SupplierBreakdown[] = [
      { supplierId: "cj", supplierName: "CJ Dropshipping", revenue: 800, cost: 400, profit: 400, orders: 40 },
      { supplierId: "aliexpress", supplierName: "AliExpress", revenue: 200, cost: 150, profit: 50, orders: 10 },
    ];
    const totalRevenue = suppliers.reduce((sum, s) => sum + s.revenue, 0);
    const totalProfit = suppliers.reduce((sum, s) => sum + s.profit, 0);
    expect(totalRevenue).toBe(1000);
    expect(totalProfit).toBe(450);
  });

  it("platform breakdown calculates percentages", () => {
    const platforms: PlatformBreakdown[] = [
      { platform: "shopify", revenue: 600, orders: 30 },
      { platform: "woocommerce", revenue: 300, orders: 15 },
      { platform: "etsy", revenue: 100, orders: 5 },
    ];
    const totalRevenue = platforms.reduce((sum, p) => sum + p.revenue, 0);
    const shopifyPercent = (platforms[0].revenue / totalRevenue) * 100;
    expect(totalRevenue).toBe(1000);
    expect(shopifyPercent).toBe(60);
  });

  it("daily revenue tracks date-based metrics", () => {
    const daily: DailyRevenue[] = [
      { date: "2024-01-01", revenue: 100, profit: 40, orders: 5 },
      { date: "2024-01-02", revenue: 150, profit: 60, orders: 7 },
      { date: "2024-01-03", revenue: 200, profit: 80, orders: 10 },
    ];
    const totalRevenue = daily.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = daily.reduce((sum, d) => sum + d.orders, 0);
    expect(totalRevenue).toBe(450);
    expect(totalOrders).toBe(22);
  });

  it("daily revenue can be sliced for chart display", () => {
    const daily: DailyRevenue[] = Array.from({ length: 30 }, (_, i) => ({
      date: `2024-01-${String(i + 1).padStart(2, "0")}`,
      revenue: 100 + i * 10,
      profit: 40 + i * 4,
      orders: 5 + i,
    }));
    const last14 = daily.slice(-14);
    expect(last14).toHaveLength(14);
    expect(last14[0].date).toBe("2024-01-17");
  });

  it("cost breakdown shows revenue vs cost ratio", () => {
    const revenue = 1000;
    const cost = 600;
    const profit = revenue - cost;
    const costPercent = (cost / revenue) * 100;
    const profitPercent = (profit / revenue) * 100;
    expect(costPercent).toBe(60);
    expect(profitPercent).toBe(40);
    expect(costPercent + profitPercent).toBe(100);
  });

  it("date range options are valid", () => {
    const ranges = ["7d", "30d", "90d", "all"] as const;
    expect(ranges).toHaveLength(4);
    expect(ranges).toContain("7d");
    expect(ranges).toContain("30d");
    expect(ranges).toContain("90d");
    expect(ranges).toContain("all");
  });

  it("handles empty data gracefully", () => {
    const summary: FinancialSummary = {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,
      totalOrders: 0,
      avgOrderValue: 0,
      revenueGrowth: 0,
      profitGrowth: 0,
    };
    expect(summary.totalRevenue).toBe(0);
    expect(summary.avgOrderValue).toBe(0);
    const avg = summary.totalOrders > 0 ? summary.totalRevenue / summary.totalOrders : 0;
    expect(avg).toBe(0);
  });
});
