import { describe, it, expect } from "vitest";
import {
  calculateProfit,
  calculateShipping,
  calculateLandedCost,
  calculateMargin,
  calculateAdROI,
  calculateOrderProfit,
  calculateAggregatedProfit,
} from "./calculations";

describe("calculateProfit", () => {
  it("returns zero for invalid selling price", () => {
    const result = calculateProfit(10, 0, 5, 15, 2, 1);
    expect(result.netProfit).toBe(0);
    expect(result.revenue).toBe(0);
  });

  it("calculates profit correctly", () => {
    const result = calculateProfit(10, 30, 5, 15, 2, 1);
    expect(result.revenue).toBe(30);
    expect(result.netProfit).toBeGreaterThan(0);
  });

  it("handles multiple units", () => {
    const result = calculateProfit(10, 30, 5, 15, 2, 5);
    expect(result.revenue).toBe(150);
  });
});

describe("calculateShipping", () => {
  it("clamps negative weight to 0", () => {
    const result = calculateShipping(-5, 10, 10, 10, "CN", "US");
    expect(result.estimatedCost).toBeGreaterThanOrEqual(0);
  });

  it("clamps negative dimensions to 0", () => {
    const result = calculateShipping(1, -10, -10, -10, "CN", "US");
    expect(result.estimatedCost).toBeGreaterThanOrEqual(0);
  });

  it("returns higher cost for international shipping", () => {
    const intl = calculateShipping(1, 10, 10, 10, "CN", "US");
    const domestic = calculateShipping(1, 10, 10, 10, "US", "US");
    expect(intl.estimatedCost).toBeGreaterThan(domestic.estimatedCost);
  });
});

describe("calculateLandedCost", () => {
  it("clamps negative inputs to 0", () => {
    const result = calculateLandedCost(-10, -5, -15, -20, -10, -15, -5, 1);
    expect(result.landedCost).toBeGreaterThanOrEqual(0);
  });

  it("defaults quantity to 1 if invalid", () => {
    const result = calculateLandedCost(10, 5, 15, 20, 10, 15, 5, 0);
    expect(result.landedCost).toBeGreaterThan(0);
  });
});

describe("calculateAdROI", () => {
  it("returns zero for invalid daily budget", () => {
    const result = calculateAdROI(10, 30, 5, 15, 2, 1, 0);
    expect(result.monthlyRevenue).toBe(0);
  });

  it("clamps negative CTR/CVR", () => {
    const result = calculateAdROI(10, 30, 5, 15, -1, -1, 50);
    expect(result.monthlyRevenue).toBeGreaterThanOrEqual(0);
  });
});

describe("calculateOrderProfit", () => {
  it("returns zero for invalid revenue", () => {
    const result = calculateOrderProfit(0, 10, 5, 15, 3, 0, 0, 0);
    expect(result.netProfit).toBe(0);
  });

  it("calculates profit correctly", () => {
    const result = calculateOrderProfit(100, 30, 10, 15, 3, 5, 10, 5);
    expect(result.netProfit).toBeGreaterThan(0);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });
});

describe("calculateAggregatedProfit", () => {
  it("returns zero for empty orders", () => {
    const result = calculateAggregatedProfit([]);
    expect(result.totalOrders).toBe(0);
    expect(result.totalRevenue).toBe(0);
  });

  it("aggregates correctly", () => {
    const orders = [
      { revenue: 100, cogs: 30, shippingCost: 10, platformFee: 15, paymentProcessing: 3, refunds: 0, adSpend: 5, otherCosts: 2, netProfit: 35 },
      { revenue: 200, cogs: 60, shippingCost: 20, platformFee: 30, paymentProcessing: 6, refunds: 0, adSpend: 10, otherCosts: 4, netProfit: 70 },
    ];
    const result = calculateAggregatedProfit(orders);
    expect(result.totalRevenue).toBe(300);
    expect(result.totalOrders).toBe(2);
  });
});
