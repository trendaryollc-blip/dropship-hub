import { describe, it, expect } from "vitest";
import { calculateProfit, calculateShipping, calculateLandedCost, calculateMargin, calculateAdROI, calculateOrderProfit, calculateAggregatedProfit } from "@/lib/calculations";

describe("Calculator Pipeline Integration", () => {
  const sampleProduct = {
    productCost: 10,
    sellingPrice: 35,
    shippingCost: 5,
    platformFeePercent: 15,
    adSpendPerUnit: 3,
    units: 1,
  };

  it("full profit calculation pipeline", () => {
    const profit = calculateProfit(
      sampleProduct.productCost,
      sampleProduct.sellingPrice,
      sampleProduct.shippingCost,
      sampleProduct.platformFeePercent,
      sampleProduct.adSpendPerUnit,
      sampleProduct.units
    );
    expect(profit.netProfit).toBeGreaterThan(0);
    expect(profit.revenue).toBe(35);
    expect(profit.profitMargin).toBeGreaterThan(0);
    expect(profit.roi).toBeGreaterThan(0);
    expect(profit.costBreakdown).toHaveLength(4);
    const totalPct = profit.costBreakdown.reduce((s, i) => s + i.pct, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it("shipping calculation for international order", () => {
    const shipping = calculateShipping(2, 30, 20, 15, "CN", "US");
    expect(shipping.estimatedCost).toBeGreaterThan(0);
    expect(shipping.carriers.length).toBe(4);
    expect(shipping.deliveryDays.min).toBeLessThan(shipping.deliveryDays.max);
    expect(shipping.costPerUnit).toBe(shipping.estimatedCost);
  });

  it("landed cost calculation pipeline", () => {
    const landed = calculateLandedCost(10, 5, 10, 2, 1, 15, 3, 2);
    expect(landed.landedCost).toBeGreaterThan(0);
    expect(landed.totalDuties).toBeGreaterThan(0);
    expect(landed.totalShipping).toBeGreaterThan(0);
    expect(landed.breakdown).toHaveLength(6);
    expect(landed.suggestedRetail).toBeGreaterThan(landed.landedCost / 2);
    expect(landed.profitAtSuggested).toBeGreaterThan(0);
  });

  it("margin calculation with competitor analysis", () => {
    const margin = calculateMargin(10, 40, [18, 22, 25, 30]);
    expect(margin.recommendedPrice).toBeCloseTo(16.67, 0);
    expect(margin.marginAtPrice).toBe(40);
    expect(margin.competitiveRange.min).toBeGreaterThan(0);
    expect(margin.competitiveRange.max).toBeGreaterThan(margin.competitiveRange.min);
    expect(margin.priceBreakpoints).toHaveLength(5);
  });

  it("ad ROI calculation with scenarios", () => {
    const adROI = calculateAdROI(10, 30, 5, 15, 2, 1.5, 100);
    expect(adROI.monthlyRevenue).toBeGreaterThanOrEqual(0);
    expect(adROI.breakEvenROAS).toBeGreaterThan(0);
    expect(adROI.scenarios).toHaveLength(3);
    expect(adROI.scenarios[0].spend).toBeLessThan(adROI.scenarios[1].spend);
    expect(adROI.scenarios[1].spend).toBeLessThan(adROI.scenarios[2].spend);
  });

  it("order profit breakdown", () => {
    const orderProfit = calculateOrderProfit(100, 25, 8, 15, 3, 5, 10, 2);
    expect(orderProfit.netProfit).toBeGreaterThan(0);
    expect(orderProfit.totalCosts).toBeGreaterThan(0);
    expect(orderProfit.profitMargin).toBeGreaterThan(0);
    expect(orderProfit.breakdown.length).toBeGreaterThan(0);
  });

  it("aggregated profit across multiple orders", () => {
    const orders = [
      { revenue: 100, cogs: 25, shippingCost: 8, platformFee: 15, paymentProcessing: 3, refunds: 0, adSpend: 10, otherCosts: 2, netProfit: 37 },
      { revenue: 200, cogs: 50, shippingCost: 16, platformFee: 30, paymentProcessing: 6, refunds: 5, adSpend: 20, otherCosts: 4, netProfit: 69 },
      { revenue: 150, cogs: 35, shippingCost: 12, platformFee: 22, paymentProcessing: 4, refunds: 0, adSpend: 15, otherCosts: 3, netProfit: 59 },
    ];
    const agg = calculateAggregatedProfit(orders);
    expect(agg.totalOrders).toBe(3);
    expect(agg.totalRevenue).toBe(450);
    expect(agg.totalProfit).toBe(165);
    expect(agg.profitMargin).toBeCloseTo(36.7, 0);
    expect(agg.avgOrderProfit).toBeCloseTo(55, 0);
    expect(agg.avgOrderValue).toBe(150);
  });

  it("edge case: zero selling price returns zero profit", () => {
    const profit = calculateProfit(10, 0, 5, 15, 2, 1);
    expect(profit.netProfit).toBe(0);
    expect(profit.revenue).toBe(0);
  });

  it("edge case: large quantity scales correctly", () => {
    const single = calculateProfit(10, 30, 5, 15, 2, 1);
    const bulk = calculateProfit(10, 30, 5, 15, 2, 100);
    expect(bulk.revenue).toBeCloseTo(single.revenue * 100, 0);
    expect(bulk.totalCost).toBeCloseTo(single.totalCost * 100, 0);
  });
});
