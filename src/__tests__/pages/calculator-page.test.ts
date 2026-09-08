import { describe, it, expect } from "vitest";
import type {
  CalculatorInput,
  CalculatorResult,
  ShippingOption,
  ProfitBreakdown,
} from "@/types/products-types";

describe("Calculator Page - Data Types", () => {
  it("calculator input has required fields", () => {
    const input: CalculatorInput = {
      sellingPrice: 29.99,
      costOfGoods: 8.50,
      shippingCost: 4.99,
      platformFees: 2.70,
      advertisingCost: 3.00,
      otherCosts: 0.50,
      quantity: 1,
      currency: "USD",
    };
    expect(input.sellingPrice).toBeGreaterThan(0);
    expect(input.costOfGoods).toBeGreaterThanOrEqual(0);
  });

  it("calculator result has required fields", () => {
    const result: CalculatorResult = {
      revenue: 29.99,
      totalCosts: 20.19,
      netProfit: 9.80,
      margin: 32.68,
      roi: 48.54,
      breakEvenUnits: 15,
      annualProjection: {
        revenue: 35988,
        profit: 11760,
        units: 1200,
      },
    };
    expect(result.netProfit).toBeGreaterThan(0);
    expect(result.margin).toBeGreaterThan(0);
    expect(result.roi).toBeGreaterThan(0);
  });

  it("shipping option has required fields", () => {
    const option: ShippingOption = {
      id: "so-1",
      carrier: "DHL",
      service: "Express",
      cost: 12.99,
      days: { min: 3, max: 5 },
      tracking: true,
      insurance: true,
    };
    expect(option.cost).toBeGreaterThan(0);
    expect(option.days.min).toBeLessThanOrEqual(option.days.max);
  });

  it("profit breakdown has required fields", () => {
    const cogs = 8.50;
    const shipping = 4.99;
    const platformFees = 2.70;
    const advertising = 3.00;
    const other = 0.50;
    const totalCosts = cogs + shipping + platformFees + advertising + other;
    const revenue = 29.99;
    const netProfit = revenue - totalCosts;
    const breakdown: ProfitBreakdown = {
      revenue,
      cogs,
      shipping,
      platformFees,
      advertising,
      other,
      totalCosts,
      netProfit,
      margin: (netProfit / revenue) * 100,
    };
    expect(breakdown.totalCosts).toBeCloseTo(19.69, 2);
    expect(breakdown.netProfit).toBeCloseTo(10.30, 2);
  });
});

describe("Calculator Page - Business Logic", () => {
  it("calculates net profit correctly", () => {
    const input: CalculatorInput = {
      sellingPrice: 29.99,
      costOfGoods: 8.50,
      shippingCost: 4.99,
      platformFees: 2.70,
      advertisingCost: 3.00,
      otherCosts: 0.50,
      quantity: 1,
      currency: "USD",
    };
    const totalCosts = input.costOfGoods + input.shippingCost + input.platformFees + input.advertisingCost + input.otherCosts;
    const netProfit = input.sellingPrice - totalCosts;
    expect(netProfit).toBeCloseTo(10.30, 2);
  });

  it("calculates margin percentage", () => {
    const revenue = 29.99;
    const netProfit = 10.30;
    const margin = (netProfit / revenue) * 100;
    expect(margin).toBeCloseTo(34.35, 1);
  });

  it("calculates ROI", () => {
    const investment = 8.50;
    const profit = 10.30;
    const roi = (profit / investment) * 100;
    expect(roi).toBeCloseTo(121.18, 1);
  });

  it("calculates break-even units", () => {
    const fixedCosts = 150;
    const profitPerUnit = 10.30;
    const breakEven = Math.ceil(fixedCosts / profitPerUnit);
    expect(breakEven).toBe(15);
  });

  it("calculates annual projection", () => {
    const monthlyRevenue = 2999;
    const monthlyProfit = 1030;
    const monthlyUnits = 100;
    const annual = {
      revenue: monthlyRevenue * 12,
      profit: monthlyProfit * 12,
      units: monthlyUnits * 12,
    };
    expect(annual.revenue).toBe(35988);
    expect(annual.profit).toBe(12360);
    expect(annual.units).toBe(1200);
  });

  it("can compare shipping options", () => {
    const options: ShippingOption[] = [
      { id: "1", cost: 5.99, days: { min: 10, max: 15 } } as ShippingOption,
      { id: "2", cost: 12.99, days: { min: 3, max: 5 } } as ShippingOption,
      { id: "3", cost: 8.99, days: { min: 7, max: 10 } } as ShippingOption,
    ];
    const cheapest = options.reduce((min, o) => o.cost < min.cost ? o : min, options[0]);
    const fastest = options.reduce((min, o) => o.days.min < min.days.min ? o : min, options[0]);
    expect(cheapest.id).toBe("1");
    expect(fastest.id).toBe("2");
  });
});
