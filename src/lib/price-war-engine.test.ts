import { describe, it, expect } from "vitest";
import { calculateMargin, calculateLandedPrice, evaluatePriceRule, shouldCheckRule, calculateFloorPrice, validatePriceRule, getMarginStatus, calculateDailyAdjustmentCount } from "./price-war-engine";
import type { PriceRule, CompetitorPrice, PriceAdjustmentLog } from "@/types/price-war";

const mockRule: PriceRule = {
  id: "rule-1",
  productTitle: "Wireless Earbuds",
  myPrice: 49.99,
  cost: 15.00,
  floorPrice: 20.00,
  minMargin: 20,
  strategy: "match_lowest",
  strategyConfig: {},
  platforms: ["amazon"],
  competitorUrls: ["https://example.com/comp1"],
  status: "active",
  createdAt: new Date().toISOString(),
};

const mockCompetitors: CompetitorPrice[] = [
  {
    id: "comp-1",
    ruleId: "rule-1",
    platform: "amazon",
    seller: "Seller A",
    price: 45.99,
    url: "https://example.com/comp1",
    shipping: 0,
    totalLanded: 45.99,
    inStock: true,
    lastSeen: new Date().toISOString(),
  },
  {
    id: "comp-2",
    ruleId: "rule-1",
    platform: "amazon",
    seller: "Seller B",
    price: 52.99,
    url: "https://example.com/comp2",
    shipping: 3.99,
    totalLanded: 56.98,
    inStock: true,
    lastSeen: new Date().toISOString(),
  },
];

describe("price-war-engine", () => {
  describe("calculateMargin", () => {
    it("calculates margin correctly", () => {
      expect(calculateMargin(100, 60)).toBe(40);
      expect(calculateMargin(50, 25)).toBe(50);
      expect(calculateMargin(49.99, 15)).toBeCloseTo(70, 0);
    });

    it("returns 0 for zero price", () => {
      expect(calculateMargin(0, 10)).toBe(0);
    });

    it("handles negative margin", () => {
      expect(calculateMargin(10, 20)).toBeLessThan(0);
    });
  });

  describe("calculateLandedPrice", () => {
    it("adds shipping to price", () => {
      expect(calculateLandedPrice(49.99, 5.99)).toBe(55.98);
    });

    it("handles zero shipping", () => {
      expect(calculateLandedPrice(49.99, 0)).toBe(49.99);
    });
  });

  describe("evaluatePriceRule", () => {
    it("match_lowest strategy matches lowest competitor", () => {
      const result = evaluatePriceRule(mockRule, mockCompetitors);
      expect(result.shouldAdjust).toBe(true);
      expect(result.suggestedPrice).toBe(45.99);
      expect(result.strategy).toBe("match_lowest");
    });

    it("match_lowest respects floor price", () => {
      const expensiveCompetitors: CompetitorPrice[] = [{
        ...mockCompetitors[0],
        price: 10.00,
        totalLanded: 10.00,
      }];
      const result = evaluatePriceRule(mockRule, expensiveCompetitors);
      expect(result.suggestedPrice).toBeGreaterThanOrEqual(mockRule.floorPrice);
    });

    it("stay_below strategy stays below competitor", () => {
      const rule: PriceRule = { ...mockRule, strategy: "stay_below", strategyConfig: { belowPercent: 5 } };
      const result = evaluatePriceRule(rule, mockCompetitors);
      expect(result.shouldAdjust).toBe(true);
      expect(result.suggestedPrice).toBeLessThan(45.99);
    });

    it("maintain_margin strategy maintains minimum margin", () => {
      const rule: PriceRule = { ...mockRule, strategy: "maintain_margin", strategyConfig: { targetMargin: 30 } };
      const result = evaluatePriceRule(rule, mockCompetitors);
      const margin = ((result.suggestedPrice - mockRule.cost) / result.suggestedPrice) * 100;
      expect(margin).toBeGreaterThanOrEqual(25);
    });

    it("undercut_percent strategy undercuts by percentage", () => {
      const rule: PriceRule = { ...mockRule, strategy: "undercut_percent", strategyConfig: { undercutPercent: 10 } };
      const result = evaluatePriceRule(rule, mockCompetitors);
      expect(result.shouldAdjust).toBe(true);
      expect(result.suggestedPrice).toBeLessThan(45.99);
    });

    it("fixed strategy never adjusts", () => {
      const rule: PriceRule = { ...mockRule, strategy: "fixed" };
      const result = evaluatePriceRule(rule, mockCompetitors);
      expect(result.shouldAdjust).toBe(false);
    });

    it("generates alerts for price drops", () => {
      const competitorsWithHistory: CompetitorPrice[] = [{
        ...mockCompetitors[0],
        previousPrice: 55.00,
      }];
      const result = evaluatePriceRule(mockRule, competitorsWithHistory);
      expect(result.alerts.length).toBeGreaterThan(0);
      expect(result.alerts[0].type).toBe("price_drop");
    });

    it("returns no adjustment when no competitors", () => {
      const result = evaluatePriceRule(mockRule, []);
      expect(result.shouldAdjust).toBe(false);
    });

    it("calculates margin before and after", () => {
      const result = evaluatePriceRule(mockRule, mockCompetitors);
      expect(result.marginBefore).toBeGreaterThanOrEqual(0);
      expect(result.marginAfter).toBeGreaterThanOrEqual(0);
    });
  });

  describe("shouldCheckRule", () => {
    it("returns true for active rule never checked", () => {
      const rule: PriceRule = { ...mockRule, lastChecked: undefined };
      expect(shouldCheckRule(rule)).toBe(true);
    });

    it("returns false for paused rule", () => {
      const rule: PriceRule = { ...mockRule, status: "paused" };
      expect(shouldCheckRule(rule)).toBe(false);
    });

    it("returns false for error rule", () => {
      const rule: PriceRule = { ...mockRule, status: "error" };
      expect(shouldCheckRule(rule)).toBe(false);
    });

    it("returns true when enough time has passed", () => {
      const rule: PriceRule = { ...mockRule, lastChecked: new Date(Date.now() - 61 * 60 * 1000).toISOString() };
      expect(shouldCheckRule(rule)).toBe(true);
    });

    it("returns false when checked recently", () => {
      const rule: PriceRule = { ...mockRule, lastChecked: new Date().toISOString() };
      expect(shouldCheckRule(rule)).toBe(false);
    });
  });

  describe("calculateFloorPrice", () => {
    it("calculates floor price from cost and margin", () => {
      const floor = calculateFloorPrice(15, 20);
      expect(floor).toBeCloseTo(18.75, 1);
    });

    it("returns Infinity for 100% margin", () => {
      expect(calculateFloorPrice(15, 100)).toBe(Infinity);
    });
  });

  describe("validatePriceRule", () => {
    it("returns no errors for valid rule", () => {
      const errors = validatePriceRule(mockRule);
      expect(errors.length).toBe(0);
    });

    it("requires product title", () => {
      const errors = validatePriceRule({ ...mockRule, productTitle: "" });
      expect(errors.some((e) => e.includes("title"))).toBe(true);
    });

    it("requires valid price", () => {
      const errors = validatePriceRule({ ...mockRule, myPrice: -1 });
      expect(errors.some((e) => e.includes("price"))).toBe(true);
    });

    it("warns when floor is below cost", () => {
      const errors = validatePriceRule({ ...mockRule, floorPrice: 5, cost: 15 });
      expect(errors.some((e) => e.includes("below cost"))).toBe(true);
    });
  });

  describe("getMarginStatus", () => {
    it("returns critical for low margin", () => {
      expect(getMarginStatus(3)).toBe("critical");
    });

    it("returns warning for medium margin", () => {
      expect(getMarginStatus(10)).toBe("warning");
    });

    it("returns healthy for good margin", () => {
      expect(getMarginStatus(25)).toBe("healthy");
    });

    it("returns excellent for high margin", () => {
      expect(getMarginStatus(50)).toBe("excellent");
    });
  });

  describe("calculateDailyAdjustmentCount", () => {
    it("counts adjustments for a given date", () => {
      const logs: PriceAdjustmentLog[] = [
        { id: "1", ruleId: "r1", productTitle: "P1", previousPrice: 10, newPrice: 9, reason: "test", strategy: "match_lowest", marginBefore: 30, marginAfter: 35, autoApplied: true, createdAt: "2026-09-02T10:00:00Z" } as any,
        { id: "2", ruleId: "r1", productTitle: "P1", previousPrice: 10, newPrice: 9, reason: "test", strategy: "match_lowest", marginBefore: 30, marginAfter: 35, autoApplied: true, createdAt: "2026-09-02T11:00:00Z" } as any,
        { id: "3", ruleId: "r1", productTitle: "P1", previousPrice: 10, newPrice: 9, reason: "test", strategy: "match_lowest", marginBefore: 30, marginAfter: 35, autoApplied: true, createdAt: "2026-09-01T10:00:00Z" } as any,
      ];
      expect(calculateDailyAdjustmentCount(logs, "2026-09-02")).toBe(2);
    });
  });
});
