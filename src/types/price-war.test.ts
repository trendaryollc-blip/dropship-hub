import { describe, it, expect } from "vitest";
import type { PriceRule, CompetitorPrice, PriceAdjustmentLog, PriceWarDashboard, CompetitorAlert, PriceWarSettings, PriceWarStats } from "./price-war";

describe("price-war types", () => {
  it("PriceRule has required fields", () => {
    const rule: PriceRule = {
      id: "1",
      productTitle: "Test",
      myPrice: 49.99,
      cost: 15,
      floorPrice: 20,
      minMargin: 20,
      strategy: "match_lowest",
      strategyConfig: {},
      platforms: ["amazon"],
      competitorUrls: [],
      status: "active",
      createdAt: new Date().toISOString(),
    };
    expect(rule.strategy).toBe("match_lowest");
  });

  it("CompetitorPrice tracks landed cost", () => {
    const comp: CompetitorPrice = {
      id: "1",
      ruleId: "r1",
      platform: "amazon",
      seller: "Seller",
      price: 45.99,
      url: "https://example.com",
      shipping: 4.99,
      totalLanded: 50.98,
      inStock: true,
      lastSeen: new Date().toISOString(),
    };
    expect(comp.totalLanded).toBe(50.98);
  });

  it("PriceAdjustmentLog tracks changes", () => {
    const log: PriceAdjustmentLog = {
      id: "1",
      ruleId: "r1",
      productTitle: "Test",
      previousPrice: 49.99,
      newPrice: 45.99,
      reason: "Matching lowest",
      strategy: "match_lowest",
      marginBefore: 70,
      marginAfter: 67,
      autoApplied: true,
      createdAt: new Date().toISOString(),
    };
    expect(log.autoApplied).toBe(true);
  });

  it("PriceWarSettings has config fields", () => {
    const settings: PriceWarSettings = {
      enabled: true,
      checkIntervalMinutes: 30,
      autoApply: false,
      maxDailyAdjustments: 50,
      notifyOnAdjustment: true,
      notifyOnFloorBreach: true,
    };
    expect(settings.checkIntervalMinutes).toBe(30);
  });

  it("PriceWarStats tracks metrics", () => {
    const stats: PriceWarStats = {
      totalRules: 10,
      activeRules: 8,
      pausedRules: 2,
      triggeredToday: 5,
      totalAdjustments: 100,
      avgMarginMaintained: 35,
      totalSavingsFromAdjustments: 500,
    };
    expect(stats.activeRules).toBe(8);
  });
});
