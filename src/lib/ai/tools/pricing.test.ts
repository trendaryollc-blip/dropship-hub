import { describe, it, expect } from "vitest";
import { optimizePricingTool, evaluatePriceRuleTool, calculateFloorPriceTool } from "./pricing";

const context = {
  uid: "test-user",
  executionId: "exec_test",
  trigger: "ai_chat" as const,
  mode: "ai_assist" as const,
};

describe("Pricing Tools", () => {
  describe("optimizePricingTool", () => {
    it("optimizes pricing based on cost and competitors", async () => {
      const result = await optimizePricingTool.execute({
        productTitle: "Wireless Earbuds",
        myPrice: 29.99,
        cost: 10,
        floorPrice: 12,
        minMargin: 20,
        strategy: "maintain_margin",
        strategyConfig: { targetMargin: 40 },
        competitorPrices: [
          { seller: "Seller A", price: 25.99, totalLanded: 28, inStock: true },
          { seller: "Seller B", price: 27.99, totalLanded: 30, inStock: true },
          { seller: "Seller C", price: 32.99, totalLanded: 35, inStock: true },
        ],
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it("handles minimum competitor prices", async () => {
      const result = await optimizePricingTool.execute({
        productTitle: "Test Product",
        myPrice: 29.99,
        cost: 10,
        floorPrice: 12,
        minMargin: 20,
        strategy: "fixed",
        competitorPrices: [
          { seller: "Seller A", price: 25.99, totalLanded: 28, inStock: true },
        ],
      }, context);

      expect(result.success).toBe(true);
    });
  });

  describe("evaluatePriceRuleTool", () => {
    it("evaluates a price rule", async () => {
      const result = await evaluatePriceRuleTool.execute({
        ruleId: "rule_1",
        productId: "prod_1",
        currentPrice: 29.99,
        competitorPrice: 27.99,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });
  });

  describe("calculateFloorPriceTool", () => {
    it("calculates floor price", async () => {
      const result = await calculateFloorPriceTool.execute({
        cost: 10,
        minMargin: 20,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Floor price");
    });

    it("handles zero target margin", async () => {
      const result = await calculateFloorPriceTool.execute({
        cost: 10,
        minMargin: 0,
      }, context);

      expect(result.success).toBe(true);
    });
  });
});
