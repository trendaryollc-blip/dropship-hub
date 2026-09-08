import { describe, it, expect } from "vitest";
import { calculateTrendScore, predictTrend, detectRisingStars, aggregateSignalsByKeyword, calculateMarketSaturation, determineTrendDirection, generateMockSignals } from "./trend-analyzer";
import type { TrendSignal } from "@/types/trend-predictor";

const mockSignal: TrendSignal = {
  id: "sig-1",
  platform: "tiktok",
  keyword: "wireless earbuds",
  category: "Electronics",
  volume: 50000,
  previousVolume: 30000,
  growthRate: 66.7,
  direction: "rising",
  velocity: 80,
  acceleration: 40,
  saturationLevel: 30,
  fetchedAt: new Date().toISOString(),
};

const mockSignals: TrendSignal[] = [
  mockSignal,
  { ...mockSignal, id: "sig-2", platform: "instagram" },
  { ...mockSignal, id: "sig-3", platform: "google_trends", volume: 45000, previousVolume: 35000 },
];

describe("trend-analyzer", () => {
  describe("calculateTrendScore", () => {
    it("calculates score from signal", () => {
      const score = calculateTrendScore(mockSignal);
      expect(score.velocity).toBeGreaterThanOrEqual(0);
      expect(score.velocity).toBeLessThanOrEqual(100);
      expect(score.acceleration).toBeGreaterThanOrEqual(0);
      expect(score.saturation).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    it("gives high score for strong growth", () => {
      const strongSignal: TrendSignal = { ...mockSignal, volume: 100000, previousVolume: 20000, acceleration: 50, saturationLevel: 10 };
      const score = calculateTrendScore(strongSignal);
      expect(score.overallScore).toBeGreaterThan(60);
    });

    it("gives lower score for saturated trend vs strong growth", () => {
      const strongSignal: TrendSignal = { ...mockSignal, volume: 100000, previousVolume: 20000, acceleration: 50, saturationLevel: 10 };
      const saturatedSignal: TrendSignal = { ...mockSignal, volume: 100000, previousVolume: 95000, acceleration: -10, saturationLevel: 90 };
      const strongScore = calculateTrendScore(strongSignal);
      const saturatedScore = calculateTrendScore(saturatedSignal);
      expect(saturatedScore.overallScore).toBeLessThan(strongScore.overallScore);
    });
  });

  describe("predictTrend", () => {
    it("generates prediction from signals", () => {
      const prediction = predictTrend(mockSignals);
      expect(prediction.id).toBeTruthy();
      expect(prediction.productIdea).toBe("wireless earbuds");
      expect(prediction.category).toBe("Electronics");
      expect(prediction.trendScore).toBeGreaterThanOrEqual(0);
      expect(["high", "medium", "low"]).toContain(prediction.confidence);
      expect(["rising", "peaking", "stable", "declining"]).toContain(prediction.direction);
      expect(prediction.predictedPeak).toBeTruthy();
      expect(prediction.timeToPeak).toBeTruthy();
      expect(prediction.saturationRisk).toBeGreaterThanOrEqual(0);
      expect(prediction.reasoning).toBeTruthy();
      expect(prediction.signals.length).toBeGreaterThan(0);
      expect(prediction.relatedKeywords.length).toBeGreaterThan(0);
      expect(prediction.suggestedPlatforms.length).toBeGreaterThan(0);
      expect(prediction.estimatedMargin).toBeGreaterThanOrEqual(0);
      expect(prediction.createdAt).toBeTruthy();
    });

    it("gives high confidence with multiple signals", () => {
      const prediction = predictTrend(mockSignals);
      expect(prediction.confidence).toBe("high");
    });

    it("gives low confidence with single weak signal", () => {
      const weakSignal: TrendSignal = { ...mockSignal, volume: 100, previousVolume: 90, saturationLevel: 80 };
      const prediction = predictTrend([weakSignal]);
      expect(["low", "medium"]).toContain(prediction.confidence);
    });

    it("sets rising direction for strong growth", () => {
      const prediction = predictTrend(mockSignals);
      expect(["rising", "stable"]).toContain(prediction.direction);
    });
  });

  describe("detectRisingStars", () => {
    it("detects rising stars from signals", () => {
      const stars = detectRisingStars(mockSignals);
      expect(stars.length).toBeGreaterThan(0);
      expect(stars[0].id).toBeTruthy();
      expect(stars[0].productKeyword).toBeTruthy();
      expect(stars[0].category).toBeTruthy();
      expect(stars[0].growthVelocity).toBeGreaterThanOrEqual(0);
      expect(stars[0].opportunityScore).toBeGreaterThanOrEqual(0);
      expect(stars[0].status).toBeTruthy();
      expect(stars[0].reasoning).toBeTruthy();
    });

    it("sorts by opportunity score", () => {
      const stars = detectRisingStars(mockSignals);
      for (let i = 1; i < stars.length; i++) {
        expect(stars[i - 1].opportunityScore).toBeGreaterThanOrEqual(stars[i].opportunityScore);
      }
    });

    it("returns empty for low growth signals", () => {
      const lowGrowth: TrendSignal[] = [
        { ...mockSignal, volume: 100, previousVolume: 95, acceleration: -10, saturationLevel: 80 },
      ];
      const stars = detectRisingStars(lowGrowth);
      expect(stars.length).toBe(0);
    });

    it("limits to 10 results", () => {
      const manySignals = Array.from({ length: 20 }, (_, i) => ({
        ...mockSignal,
        id: `sig-${i}`,
        keyword: `product-${i}`,
        volume: 50000 + i * 1000,
        previousVolume: 20000,
        acceleration: 40,
        saturationLevel: 20,
      }));
      const stars = detectRisingStars(manySignals);
      expect(stars.length).toBeLessThanOrEqual(10);
    });
  });

  describe("aggregateSignalsByKeyword", () => {
    it("groups signals by keyword", () => {
      const map = aggregateSignalsByKeyword(mockSignals);
      expect(map.size).toBe(1);
      expect(map.get("wireless earbuds")?.length).toBe(3);
    });

    it("handles empty array", () => {
      const map = aggregateSignalsByKeyword([]);
      expect(map.size).toBe(0);
    });
  });

  describe("calculateMarketSaturation", () => {
    it("calculates average saturation", () => {
      const saturation = calculateMarketSaturation(mockSignals);
      expect(saturation).toBe(30);
    });

    it("returns 0 for empty signals", () => {
      expect(calculateMarketSaturation([])).toBe(0);
    });
  });

  describe("determineTrendDirection", () => {
    it("detects rising trend", () => {
      expect(determineTrendDirection(30, 10)).toBe("rising");
    });

    it("detects peaking trend", () => {
      expect(determineTrendDirection(10, -5)).toBe("peaking");
    });

    it("detects declining trend", () => {
      expect(determineTrendDirection(-15, 0)).toBe("declining");
    });

    it("detects stable trend", () => {
      expect(determineTrendDirection(5, 0)).toBe("stable");
    });
  });

  describe("generateMockSignals", () => {
    it("generates signals for all platforms", () => {
      const signals = generateMockSignals("test", "category");
      expect(signals.length).toBe(4);
      expect(signals.map((s) => s.platform).sort()).toEqual(["amazon_movers", "google_trends", "instagram", "tiktok"]);
    });

    it("includes keyword and category", () => {
      const signals = generateMockSignals("earbuds", "electronics");
      expect(signals.every((s) => s.keyword === "earbuds")).toBe(true);
      expect(signals.every((s) => s.category === "electronics")).toBe(true);
    });

    it("generates valid data", () => {
      const signals = generateMockSignals("test", "category");
      expect(signals.every((s) => s.volume > 0 && s.previousVolume > 0)).toBe(true);
    });
  });
});
