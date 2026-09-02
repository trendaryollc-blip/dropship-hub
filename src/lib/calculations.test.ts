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
    expect(result.costBreakdown).toEqual([]);
  });

  it("returns zero for negative selling price", () => {
    const result = calculateProfit(10, -5, 5, 15, 2, 1);
    expect(result.netProfit).toBe(0);
  });

  it("calculates profit correctly for single unit", () => {
    const result = calculateProfit(10, 30, 5, 15, 2, 1);
    expect(result.revenue).toBe(30);
    expect(result.netProfit).toBeGreaterThan(0);
    expect(result.totalCost).toBeGreaterThan(0);
    expect(result.profitMargin).toBeGreaterThan(0);
    expect(result.roi).toBeGreaterThan(0);
    expect(result.costBreakdown).toHaveLength(4);
  });

  it("handles multiple units", () => {
    const result = calculateProfit(10, 30, 5, 15, 2, 5);
    expect(result.revenue).toBe(150);
    expect(result.totalCost).toBe(5 * (10 + (30 * 15 / 100) + 5 + 2));
  });

  it("handles zero units", () => {
    const result = calculateProfit(10, 30, 5, 15, 2, 0);
    expect(result.revenue).toBe(0);
  });

  it("defaults units to 1", () => {
    const result = calculateProfit(10, 30, 5, 15, 2);
    expect(result.revenue).toBe(30);
  });

  it("calculates cost breakdown percentages correctly", () => {
    const result = calculateProfit(10, 30, 5, 15, 2, 1);
    const totalPct = result.costBreakdown.reduce((sum, item) => sum + item.pct, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it("handles zero platform fee", () => {
    const result = calculateProfit(10, 30, 5, 0, 2, 1);
    expect(result.netProfit).toBeGreaterThan(0);
  });

  it("handles high platform fees resulting in loss", () => {
    const result = calculateProfit(20, 25, 5, 50, 2, 1);
    expect(result.netProfit).toBeLessThan(0);
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

  it("returns 4 carriers", () => {
    const result = calculateShipping(1, 10, 10, 10, "CN", "US");
    expect(result.carriers).toHaveLength(4);
  });

  it("Express is most expensive", () => {
    const result = calculateShipping(1, 10, 10, 10, "CN", "US");
    const express = result.carriers.find((c) => c.name === "Express")!;
    const economy = result.carriers.find((c) => c.name === "Economy Sea")!;
    expect(express.cost).toBeGreaterThan(economy.cost);
  });

  it("deliveryDays min < max", () => {
    const result = calculateShipping(1, 10, 10, 10, "CN", "US");
    expect(result.deliveryDays.min).toBeLessThan(result.deliveryDays.max);
  });

  it("uses volumetric weight when larger", () => {
    const light = calculateShipping(0.1, 100, 100, 100, "CN", "US");
    const heavy = calculateShipping(50, 10, 10, 10, "CN", "US");
    expect(light.estimatedCost).toBeGreaterThan(heavy.estimatedCost);
  });

  it("costPerUnit equals estimatedCost", () => {
    const result = calculateShipping(1, 10, 10, 10, "CN", "US");
    expect(result.costPerUnit).toBe(result.estimatedCost);
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

  it("calculates suggested retail at 2.5x landed cost", () => {
    const result = calculateLandedCost(10, 5, 0, 0, 0, 0, 0, 1);
    expect(result.suggestedRetail).toBeCloseTo(result.landedCost * 2.5, 1);
  });

  it("breakdown has 6 items", () => {
    const result = calculateLandedCost(10, 5, 15, 20, 10, 15, 5, 1);
    expect(result.breakdown).toHaveLength(6);
  });

  it("handles multiple quantity", () => {
    const single = calculateLandedCost(10, 5, 10, 0, 0, 0, 0, 1);
    const multi = calculateLandedCost(10, 5, 10, 0, 0, 0, 0, 5);
    expect(multi.landedCost).toBeCloseTo(single.landedCost * 5, 1);
  });

  it("profitAtSuggested is positive", () => {
    const result = calculateLandedCost(10, 5, 10, 5, 2, 10, 3, 1);
    expect(result.profitAtSuggested).toBeGreaterThan(0);
  });
});

describe("calculateMargin", () => {
  it("calculates recommended price", () => {
    const result = calculateMargin(10, 50);
    expect(result.recommendedPrice).toBe(20);
  });

  it("marginAtPrice equals desired margin", () => {
    const result = calculateMargin(10, 40);
    expect(result.marginAtPrice).toBe(40);
  });

  it("priceBreakpoints has 5 entries", () => {
    const result = calculateMargin(10, 40);
    expect(result.priceBreakpoints).toHaveLength(5);
  });

  it("uses competitor prices when provided", () => {
    const result = calculateMargin(10, 40, [15, 20, 25]);
    expect(result.competitiveRange.min).toBeGreaterThan(0);
    expect(result.competitiveRange.max).toBeGreaterThan(result.competitiveRange.min);
  });

  it("higher margin means higher price", () => {
    const low = calculateMargin(10, 30);
    const high = calculateMargin(10, 60);
    expect(high.recommendedPrice).toBeGreaterThan(low.recommendedPrice);
  });
});

describe("calculateAdROI", () => {
  it("returns zero for invalid daily budget", () => {
    const result = calculateAdROI(10, 30, 5, 15, 2, 1, 0);
    expect(result.monthlyRevenue).toBe(0);
    expect(result.scenarios).toHaveLength(0);
  });

  it("clamps negative CTR/CVR", () => {
    const result = calculateAdROI(10, 30, 5, 15, -1, -1, 50);
    expect(result.monthlyRevenue).toBeGreaterThanOrEqual(0);
  });

  it("calculates scenarios", () => {
    const result = calculateAdROI(10, 30, 5, 15, 2, 1, 50);
    expect(result.scenarios).toHaveLength(3);
    expect(result.scenarios[0].name).toBe("Conservative");
    expect(result.scenarios[1].name).toBe("Expected");
    expect(result.scenarios[2].name).toBe("Aggressive");
  });

  it("breakEvenROAS is positive for profitable product", () => {
    const result = calculateAdROI(5, 30, 5, 10, 2, 2, 100);
    expect(result.breakEvenROAS).toBeGreaterThan(0);
  });
});

describe("calculateOrderProfit", () => {
  it("returns zero for invalid revenue", () => {
    const result = calculateOrderProfit(0, 10, 5, 15, 3, 0, 0, 0);
    expect(result.netProfit).toBe(0);
    expect(result.breakdown).toEqual([]);
  });

  it("returns zero for negative revenue", () => {
    const result = calculateOrderProfit(-100, 10, 5, 15, 3, 0, 0, 0);
    expect(result.netProfit).toBe(0);
  });

  it("calculates profit correctly", () => {
    const result = calculateOrderProfit(100, 30, 10, 15, 3, 0, 5, 2);
    expect(result.netProfit).toBeGreaterThan(0);
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.profitMargin).toBeGreaterThan(0);
    expect(result.totalCosts).toBeGreaterThan(0);
  });

  it("handles refunds reducing profit", () => {
    const noRefund = calculateOrderProfit(100, 30, 10, 15, 3, 0, 5, 2);
    const withRefund = calculateOrderProfit(100, 30, 10, 15, 3, 20, 5, 2);
    expect(withRefund.netProfit).toBeLessThan(noRefund.netProfit);
  });

  it("filters zero-value breakdown items", () => {
    const result = calculateOrderProfit(100, 30, 0, 0, 0, 0, 0, 0);
    const names = result.breakdown.map((b) => b.name);
    expect(names).not.toContain("Shipping");
    expect(names).not.toContain("Refunds");
  });
});

describe("calculateAggregatedProfit", () => {
  it("returns zero for empty orders", () => {
    const result = calculateAggregatedProfit([]);
    expect(result.totalOrders).toBe(0);
    expect(result.totalRevenue).toBe(0);
    expect(result.totalProfit).toBe(0);
    expect(result.avgOrderProfit).toBe(0);
    expect(result.avgOrderValue).toBe(0);
  });

  it("aggregates correctly", () => {
    const orders = [
      { revenue: 100, cogs: 30, shippingCost: 10, platformFee: 15, paymentProcessing: 3, refunds: 0, adSpend: 5, otherCosts: 2, netProfit: 35 },
      { revenue: 200, cogs: 60, shippingCost: 20, platformFee: 30, paymentProcessing: 6, refunds: 0, adSpend: 10, otherCosts: 4, netProfit: 70 },
    ];
    const result = calculateAggregatedProfit(orders);
    expect(result.totalRevenue).toBe(300);
    expect(result.totalOrders).toBe(2);
    expect(result.totalProfit).toBe(105);
    expect(result.avgOrderProfit).toBe(52.5);
    expect(result.avgOrderValue).toBe(150);
  });

  it("calculates profit margin correctly", () => {
    const orders = [
      { revenue: 100, cogs: 25, shippingCost: 5, platformFee: 10, paymentProcessing: 2, refunds: 0, adSpend: 3, otherCosts: 0, netProfit: 55 },
    ];
    const result = calculateAggregatedProfit(orders);
    expect(result.profitMargin).toBeCloseTo(55, 0);
  });
});
