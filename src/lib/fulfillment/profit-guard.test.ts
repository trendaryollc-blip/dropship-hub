import { describe, it, expect } from "vitest";
import { checkProfitMargin, calculateOptimalPrice, getProfitGuardSummary } from "@/lib/fulfillment/profit-guard";
import { DEFAULT_PROFIT_GUARD_CONFIG } from "@/types/automation";

describe("Profit Guard", () => {
  describe("checkProfitMargin", () => {
    it("passes when margin is above threshold", () => {
      const result = checkProfitMargin({
        revenue: 59.98,
        unitCost: 8.5,
        shippingCost: 3.99,
        quantity: 2,
      });
      expect(result.passed).toBe(true);
      expect(result.profitMargin).toBeGreaterThan(15);
    });

    it("fails when margin below minimum percentage", () => {
      const result = checkProfitMargin({
        revenue: 15,
        unitCost: 10,
        shippingCost: 5,
        quantity: 1,
      });
      expect(result.passed).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it("fails when absolute profit below minimum", () => {
      const result = checkProfitMargin({
        revenue: 12,
        unitCost: 8.5,
        shippingCost: 3.99,
        quantity: 1,
      });
      expect(result.passed).toBe(false);
      expect(result.reason).toContain("profit");
    });

    it("passes when guard disabled", () => {
      const result = checkProfitMargin(
        { revenue: 1, unitCost: 100, shippingCost: 50, quantity: 1 },
        { ...DEFAULT_PROFIT_GUARD_CONFIG, enabled: false }
      );
      expect(result.passed).toBe(true);
    });

    it("calculates platform fees correctly", () => {
      const result = checkProfitMargin({
        revenue: 100,
        unitCost: 20,
        shippingCost: 5,
        quantity: 1,
        platformFeePercent: 15,
        paymentProcessingPercent: 2.9,
      });
      expect(result.details.platformFee).toBe(15);
      expect(result.details.paymentProcessing).toBeCloseTo(2.9, 1);
    });

    it("handles zero revenue", () => {
      const result = checkProfitMargin({
        revenue: 0,
        unitCost: 10,
        shippingCost: 5,
        quantity: 1,
      });
      expect(result.passed).toBe(false);
    });

    it("returns details with cost breakdown", () => {
      const result = checkProfitMargin({
        revenue: 59.98,
        unitCost: 8.5,
        shippingCost: 3.99,
        quantity: 2,
      });
      expect(result.details).toBeDefined();
      expect(result.details.revenue).toBe(59.98);
      expect(result.details.totalCost).toBeGreaterThan(0);
    });
  });

  describe("calculateOptimalPrice", () => {
    it("calculates price for target margin", () => {
      const price = calculateOptimalPrice(10, 5, 1, 30);
      expect(price).toBeGreaterThan(15);
    });

    it("accounts for platform fees", () => {
      const price = calculateOptimalPrice(10, 5, 1, 30, 15, 2.9);
      expect(price).toBeGreaterThan(20);
    });

    it("scales with quantity", () => {
      const price1 = calculateOptimalPrice(10, 5, 1, 30);
      const price2 = calculateOptimalPrice(10, 5, 2, 30);
      expect(price2).toBeGreaterThan(price1);
    });
  });

  describe("getProfitGuardSummary", () => {
    it("summarizes multiple orders", () => {
      const summary = getProfitGuardSummary([
        { revenue: 59.98, unitCost: 8.5, shippingCost: 3.99, quantity: 2 },
        { revenue: 100, unitCost: 15, shippingCost: 5, quantity: 1 },
      ]);
      expect(summary.totalOrders).toBe(2);
      expect(summary.passedOrders + summary.failedOrders).toBe(2);
    });

    it("handles empty input", () => {
      const summary = getProfitGuardSummary([]);
      expect(summary.totalOrders).toBe(0);
      expect(summary.avgMargin).toBe(0);
    });
  });
});
