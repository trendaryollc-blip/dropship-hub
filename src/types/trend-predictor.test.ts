import { describe, it, expect } from "vitest";
import type { TrendSignal, TrendPrediction, RisingStar, TrendAlert, TrendDashboard, TrendWatchlistEntry } from "./trend-predictor";

describe("trend-predictor types", () => {
  it("TrendSignal has all fields", () => {
    const signal: TrendSignal = {
      id: "1",
      platform: "tiktok",
      keyword: "earbuds",
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
    expect(signal.direction).toBe("rising");
  });

  it("TrendPrediction has confidence and direction", () => {
    const prediction: TrendPrediction = {
      id: "1",
      productIdea: "Wireless Earbuds",
      category: "Electronics",
      trendScore: 80,
      confidence: "high",
      direction: "rising",
      predictedPeak: "2026-10-01",
      timeToPeak: "30 days",
      saturationRisk: 30,
      competitionLevel: "low",
      reasoning: "Strong growth",
      signals: [],
      relatedKeywords: ["wireless"],
      suggestedPlatforms: ["amazon"],
      estimatedMargin: 45,
      createdAt: new Date().toISOString(),
    };
    expect(prediction.confidence).toBe("high");
  });

  it("RisingStar tracks opportunity", () => {
    const star: RisingStar = {
      id: "1",
      productKeyword: "earbuds",
      category: "Electronics",
      growthVelocity: 80,
      competitionScore: 20,
      opportunityScore: 85,
      currentVolume: 50000,
      platforms: ["tiktok"],
      firstSeen: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      status: "rising",
      reasoning: "Growing fast",
    };
    expect(star.opportunityScore).toBe(85);
  });

  it("TrendAlert has severity levels", () => {
    const alert: TrendAlert = {
      id: "1",
      type: "rising_star",
      title: "Rising Star",
      message: "Product trending",
      severity: "info",
      read: false,
      createdAt: new Date().toISOString(),
    };
    expect(alert.severity).toBe("info");
  });

  it("TrendDashboard aggregates data", () => {
    const dashboard: TrendDashboard = {
      activeTrends: 10,
      risingStars: 5,
      predictionsToday: 3,
      alertsUnread: 2,
      topCategories: [],
      recentPredictions: [],
      recentRisingStars: [],
      alerts: [],
    };
    expect(dashboard.activeTrends).toBe(10);
  });

  it("TrendWatchlistEntry has alert flags", () => {
    const entry: TrendWatchlistEntry = {
      id: "1",
      keyword: "earbuds",
      category: "Electronics",
      addedAt: new Date().toISOString(),
      alertOnRising: true,
      alertOnPeak: true,
      alertOnSaturation: false,
    };
    expect(entry.alertOnRising).toBe(true);
  });
});
