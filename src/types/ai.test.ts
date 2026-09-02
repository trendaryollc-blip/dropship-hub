import { describe, it, expect } from "vitest";

describe("types/ai", () => {
  it("ProductRecommendation type can be constructed", () => {
    const rec: import("./ai").ProductRecommendation = {
      id: "1",
      title: "Widget",
      category: "Electronics",
      sourcePrice: 10,
      suggestedSellPrice: 25,
      estimatedMargin: 15,
      confidence: 0.85,
      reason: "High demand",
      matchType: "keyword",
      riskLevel: "low",
      competitionLevel: "medium",
      matchScore: 80,
      reasoning: "Good product",
      tags: ["trending"],
    };
    expect(rec.id).toBe("1");
    expect(rec.confidence).toBeGreaterThan(0);
  });

  it("RevenueForecast type can be constructed", () => {
    const forecast: import("./ai").RevenueForecast = {
      forecast: [
        {
          date: "2026-01-01",
          actual: 100,
          predicted: 110,
          lowerBound: 90,
          upperBound: 130,
        },
      ],
      summary: {
        currentTrend: "growing",
        projectedWeeklyRevenue: 700,
        projectedMonthlyRevenue: 3000,
        confidenceLevel: "high",
        avgDailyRevenue: 100,
        bestDay: "Monday",
        worstDay: "Sunday",
        growthRate: 0.1,
      },
      insights: ["Revenue is growing"],
    };
    expect(forecast.forecast).toHaveLength(1);
    expect(forecast.summary.currentTrend).toBe("growing");
  });

  it("BusinessReport type can be constructed", () => {
    const report: import("./ai").BusinessReport = {
      period: "weekly",
      dateRange: { start: "2026-01-01", end: "2026-01-07" },
      generatedAt: "2026-01-08T00:00:00Z",
      summary: "Good week",
      sections: [],
      healthScore: 85,
      highlights: ["Revenue up"],
      concerns: [],
      recommendations: [],
    };
    expect(report.healthScore).toBe(85);
  });

  it("CompetitorChange type can be constructed", () => {
    const change: import("./ai").CompetitorChange = {
      id: "1",
      competitorName: "RivalCo",
      changeType: "price_drop",
      severity: "high",
      product: "Widget Pro",
      oldValue: "$50",
      newValue: "$35",
      impact: "High",
      recommendation: "Lower price",
      detectedAt: "2026-01-01T00:00:00Z",
    };
    expect(change.changeType).toBe("price_drop");
  });

  it("CompetitorSummary type can be constructed", () => {
    const summary: import("./ai").CompetitorSummary = {
      totalChanges: 10,
      critical: 2,
      warnings: 3,
      opportunities: 5,
    };
    expect(summary.totalChanges).toBe(10);
  });
});
