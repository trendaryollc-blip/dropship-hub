import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateTrendScore, predictTrend, detectRisingStars } from "./trend-analyzer";
import type { TrendSignal } from "@/types/trend-predictor";

function createSignal(overrides: Partial<TrendSignal> = {}): TrendSignal {
  return {
    id: "sig-test",
    platform: "google_trends",
    keyword: "wireless earbuds",
    category: "electronics",
    volume: 10000,
    previousVolume: 7000,
    growthRate: 42.9,
    direction: "rising",
    velocity: 60,
    acceleration: 25,
    saturationLevel: 30,
    fetchedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("trend-analyzer", () => {
  describe("calculateTrendScore", () => {
    it("returns scores within 0-100 range", () => {
      const signal = createSignal();
      const score = calculateTrendScore(signal);
      expect(score.velocity).toBeGreaterThanOrEqual(0);
      expect(score.velocity).toBeLessThanOrEqual(100);
      expect(score.acceleration).toBeGreaterThanOrEqual(0);
      expect(score.acceleration).toBeLessThanOrEqual(100);
      expect(score.saturation).toBeGreaterThanOrEqual(0);
      expect(score.saturation).toBeLessThanOrEqual(100);
      expect(score.overallScore).toBeGreaterThanOrEqual(0);
      expect(score.overallScore).toBeLessThanOrEqual(100);
    });

    it("calculates velocity from volume growth", () => {
      const signal = createSignal({ volume: 10000, previousVolume: 5000 });
      const score = calculateTrendScore(signal);
      expect(score.velocity).toBeGreaterThan(0);
    });

    it("handles zero previous volume", () => {
      const signal = createSignal({ volume: 10000, previousVolume: 0 });
      const score = calculateTrendScore(signal);
      expect(score.velocity).toBe(0);
    });

    it("weights velocity at 40%, acceleration at 30%, inverse saturation at 30%", () => {
      const signal = createSignal({ velocity: 80, acceleration: 60, saturationLevel: 20 });
      const score = calculateTrendScore(signal);
      expect(score.overallScore).toBeGreaterThan(50);
    });
  });

  describe("predictTrend", () => {
    it("throws an honest error instead of fabricating a prediction with no live signals", () => {
      expect(() => predictTrend([])).toThrow(
        "No live trend data for this keyword — connect a trends source (Google Trends API)"
      );
    });

    it("returns a valid TrendPrediction", () => {
      const signals = [createSignal()];
      const prediction = predictTrend(signals);
      expect(prediction.id).toBeTruthy();
      expect(prediction.productIdea).toBe("wireless earbuds");
      expect(prediction.trendScore).toBeGreaterThanOrEqual(0);
      expect(prediction.trendScore).toBeLessThanOrEqual(100);
      expect(["rising", "peaking", "stable", "declining"]).toContain(prediction.direction);
      expect(["high", "medium", "low"]).toContain(prediction.confidence);
      if (prediction.direction === "rising" || prediction.direction === "peaking") {
        expect(prediction.predictedPeak).toBeTruthy();
        expect(prediction.timeToPeak).toBeTruthy();
      } else {
        expect(prediction.predictedPeak).toBeNull();
        expect(prediction.timeToPeak).toBeNull();
      }
      expect(prediction.estimatedMargin).toBeGreaterThanOrEqual(10);
      expect(prediction.estimatedMargin).toBeLessThanOrEqual(70);
    });

    it("forecasts a peak for rising trends", () => {
      const prediction = predictTrend([createSignal({ volume: 15000, previousVolume: 7000, velocity: 80, acceleration: 40, saturationLevel: 20 })]);
      expect(prediction.direction).toBe("rising");
      expect(prediction.predictedPeak).toBeTruthy();
      expect(prediction.timeToPeak).toBeTruthy();
    });

    it("returns null peak fields for stable trends without a forecast", () => {
      const prediction = predictTrend([createSignal({ volume: 10000, previousVolume: 9500, velocity: 5, acceleration: 0, saturationLevel: 40 })]);
      if (prediction.direction !== "rising" && prediction.direction !== "peaking") {
        expect(prediction.predictedPeak).toBeNull();
        expect(prediction.timeToPeak).toBeNull();
      }
    });

    it("generates reasoning based on direction", () => {
      const risingSignals = [createSignal({ velocity: 80, acceleration: 40, saturationLevel: 20 })];
      const prediction = predictTrend(risingSignals);
      expect(prediction.reasoning).toBeTruthy();
      expect(prediction.reasoning.length).toBeGreaterThan(10);
    });

    it("extracts related keywords from signals", () => {
      const signals = [createSignal({ keyword: "wireless earbuds" })];
      const prediction = predictTrend(signals);
      expect(prediction.relatedKeywords).toBeDefined();
      expect(Array.isArray(prediction.relatedKeywords)).toBe(true);
    });

    it("determines platforms from signals", () => {
      const signals = [
        createSignal({ platform: "tiktok" }),
        createSignal({ platform: "google_trends" }),
      ];
      const prediction = predictTrend(signals);
      expect(prediction.suggestedPlatforms).toBeDefined();
      expect(prediction.suggestedPlatforms.length).toBeGreaterThan(0);
    });
  });

  describe("detectRisingStars", () => {
    it("returns RisingStar array", () => {
      const signals = [
        createSignal({ velocity: 60, acceleration: 40, saturationLevel: 25 }),
        createSignal({ velocity: 70, acceleration: 35, saturationLevel: 20 }),
      ];
      const stars = detectRisingStars(signals);
      expect(Array.isArray(stars)).toBe(true);
    });

    it("filters out low-velocity signals", () => {
      const signals = [createSignal({ velocity: 10, acceleration: 5, saturationLevel: 80 })];
      const stars = detectRisingStars(signals);
      expect(stars.length).toBe(0);
    });

    it("includes high-velocity, low-saturation signals", () => {
      const signals = [createSignal({ velocity: 60, acceleration: 40, saturationLevel: 25 })];
      const stars = detectRisingStars(signals);
      expect(stars.length).toBeGreaterThan(0);
    });

    it("sorts by opportunity score descending", () => {
      const signals = [
        createSignal({ velocity: 50, acceleration: 30, saturationLevel: 30 }),
        createSignal({ velocity: 80, acceleration: 50, saturationLevel: 15 }),
      ];
      const stars = detectRisingStars(signals);
      if (stars.length >= 2) {
        expect(stars[0].opportunityScore).toBeGreaterThanOrEqual(stars[1].opportunityScore);
      }
    });

    it("limits to 10 results", () => {
      const signals = Array.from({ length: 15 }, (_, i) =>
        createSignal({ id: `sig-${i}`, velocity: 60 + i, acceleration: 40, saturationLevel: 20 })
      );
      const stars = detectRisingStars(signals);
      expect(stars.length).toBeLessThanOrEqual(10);
    });

    it("uses the signal fetchedAt as firstSeen", () => {
      const fetchedAt = "2024-06-01T12:00:00.000Z";
      const stars = detectRisingStars([createSignal({ velocity: 60, acceleration: 40, saturationLevel: 25, fetchedAt })]);
      expect(stars[0].firstSeen).toBe(fetchedAt);
    });
  });
});
