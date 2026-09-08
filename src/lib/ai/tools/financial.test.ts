import { describe, it, expect } from "vitest";
import {
  calculateProfitTool,
  calculateShippingTool,
  calculateLandedCostTool,
  calculateMarginTool,
  calculateAdROITool,
  calculateOrderProfitTool,
  calculateAggregatedProfitTool,
} from "./financial";

const context = {
  uid: "test-user",
  executionId: "exec_test",
  trigger: "ai_chat" as const,
  mode: "ai_assist" as const,
};

describe("Financial Tools", () => {
  describe("calculateProfitTool", () => {
    it("calculates profit correctly", async () => {
      const result = await calculateProfitTool.execute({
        productCost: 10,
        sellingPrice: 25,
        shippingCost: 5,
        platformFeePercent: 10,
        adSpendPerUnit: 2,
        units: 1,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Profit");
      expect(result.summary).toContain("margin");
    });

    it("handles zero shipping cost", async () => {
      const result = await calculateProfitTool.execute({
        productCost: 10,
        sellingPrice: 25,
        shippingCost: 0,
        platformFeePercent: 0,
        adSpendPerUnit: 0,
        units: 1,
      }, context);

      expect(result.success).toBe(true);
    });

    it("handles multiple units", async () => {
      const result = await calculateProfitTool.execute({
        productCost: 10,
        sellingPrice: 25,
        shippingCost: 5,
        platformFeePercent: 10,
        adSpendPerUnit: 2,
        units: 10,
      }, context);

      expect(result.success).toBe(true);
      expect(result.summary).toContain("Profit");
    });
  });

  describe("calculateShippingTool", () => {
    it("calculates shipping costs", async () => {
      const result = await calculateShippingTool.execute({
        weight: 0.5,
        length: 20,
        width: 15,
        height: 10,
        originCountry: "CN",
        destinationCountry: "US",
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Estimated shipping");
    });
  });

  describe("calculateLandedCostTool", () => {
    it("calculates landed cost", async () => {
      const result = await calculateLandedCostTool.execute({
        productCost: 10,
        shippingCost: 5,
        tariffPercent: 10,
        customsDuty: 1,
        insuranceCost: 0.5,
        platformFeePercent: 10,
        otherFees: 0,
        quantity: 1,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Landed cost");
    });

    it("handles multiple quantities", async () => {
      const result = await calculateLandedCostTool.execute({
        productCost: 10,
        shippingCost: 5,
        tariffPercent: 10,
        customsDuty: 1,
        insuranceCost: 0.5,
        platformFeePercent: 10,
        otherFees: 0,
        quantity: 5,
      }, context);

      expect(result.success).toBe(true);
    });
  });

  describe("calculateMarginTool", () => {
    it("calculates margin and recommended price", async () => {
      const result = await calculateMarginTool.execute({
        costPrice: 10,
        desiredMarginPercent: 50,
        competitorPrices: [25, 30, 35],
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Recommended price");
    });

    it("handles no competitor prices", async () => {
      const result = await calculateMarginTool.execute({
        costPrice: 10,
        desiredMarginPercent: 50,
        competitorPrices: [],
      }, context);

      expect(result.success).toBe(true);
    });
  });

  describe("calculateAdROITool", () => {
    it("calculates ad ROI", async () => {
      const result = await calculateAdROITool.execute({
        productCost: 10,
        sellingPrice: 25,
        shippingCost: 5,
        platformFeePercent: 10,
        estimatedCTR: 2,
        estimatedCVR: 3,
        dailyBudget: 50,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("CAC");
    });
  });

  describe("calculateOrderProfitTool", () => {
    it("calculates order profit", async () => {
      const result = await calculateOrderProfitTool.execute({
        revenue: 50,
        cogs: 15,
        shippingCost: 5,
        platformFeePercent: 10,
        paymentProcessingPercent: 3,
        refunds: 0,
        adSpend: 5,
        otherCosts: 0,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Net profit");
    });

    it("handles refunds", async () => {
      const result = await calculateOrderProfitTool.execute({
        revenue: 50,
        cogs: 15,
        shippingCost: 5,
        platformFeePercent: 10,
        paymentProcessingPercent: 3,
        refunds: 5,
        adSpend: 5,
        otherCosts: 0,
      }, context);

      expect(result.success).toBe(true);
    });
  });

  describe("calculateAggregatedProfitTool", () => {
    it("calculates aggregated profit across orders", async () => {
      const result = await calculateAggregatedProfitTool.execute({
        orders: [
          { revenue: 50, cogs: 15, shippingCost: 5, platformFee: 5, paymentProcessing: 1.5, refunds: 0, adSpend: 5, otherCosts: 0, netProfit: 23.5 },
          { revenue: 60, cogs: 18, shippingCost: 6, platformFee: 6, paymentProcessing: 1.8, refunds: 0, adSpend: 6, otherCosts: 0, netProfit: 28.2 },
        ],
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("orders");
    });

    it("handles single order", async () => {
      const result = await calculateAggregatedProfitTool.execute({
        orders: [
          { revenue: 50, cogs: 15, shippingCost: 5, platformFee: 5, paymentProcessing: 1.5, refunds: 0, adSpend: 5, otherCosts: 0, netProfit: 23.5 },
        ],
      }, context);

      expect(result.success).toBe(true);
    });
  });
});
