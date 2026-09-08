import { describe, it, expect } from "vitest";
import type {
  TrendingProduct,
  TrendDirection,
  TrendAlert,
} from "@/types/trend-predictor";

describe("Trends Page - Data Types", () => {
  it("trending product has required fields", () => {
    const product: TrendingProduct = {
      id: "tp-1",
      name: "Smart Water Bottle",
      category: "Kitchen",
      platforms: ["amazon", "shopify"],
      trendScore: 88,
      searchVolume: 15000,
      searchGrowth: 25,
      competitionLevel: "medium",
      priceRange: { min: 15, max: 45 },
      marginEstimate: 40,
      confidence: 0.85,
      signals: [
        { type: "search_volume", strength: "strong", description: "Searches up 25% MoM" },
        { type: "social_buzz", strength: "moderate", description: "Trending on TikTok" },
      ],
      predictedPeak: "2024-Q3",
      timeSensitive: false,
      createdAt: new Date().toISOString(),
    };
    expect(product.trendScore).toBeGreaterThanOrEqual(0);
    expect(product.trendScore).toBeLessThanOrEqual(100);
    expect(product.confidence).toBeGreaterThan(0);
  });

  it("trend direction values", () => {
    const directions: TrendDirection[] = ["rising", "stable", "declining", "volatile"];
    expect(directions).toHaveLength(4);
  });

  it("trend alert has required fields", () => {
    const alert: TrendAlert = {
      id: "ta-1",
      type: "trending_up",
      severity: "high",
      title: "Smart Water Bottle trending",
      message: "Search volume increased 25% in last 7 days",
      productId: "tp-1",
      read: false,
      createdAt: new Date().toISOString(),
    };
    expect(alert.type).toBe("trending_up");
    expect(alert.read).toBe(false);
  });

  it("competition level values", () => {
    const levels = ["low", "medium", "high"] as const;
    expect(levels).toHaveLength(3);
  });
});

describe("Trends Page - Business Logic", () => {
  it("calculates trend score from signals", () => {
    const signals = [
      { strength: "strong", weight: 0.4 },
      { strength: "moderate", weight: 0.3 },
      { strength: "weak", weight: 0.2 },
    ];
    const strengthScore: Record<string, number> = { strong: 100, moderate: 60, weak: 20 };
    const score = signals.reduce((sum, s) => sum + (strengthScore[s.strength] || 0) * s.weight, 0);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("can filter trending products by score", () => {
    const products: TrendingProduct[] = [
      { id: "1", trendScore: 90 } as TrendingProduct,
      { id: "2", trendScore: 60 } as TrendingProduct,
      { id: "3", trendScore: 85 } as TrendingProduct,
    ];
    const hot = products.filter((p) => p.trendScore >= 80);
    expect(hot).toHaveLength(2);
  });

  it("can filter by competition level", () => {
    const products: TrendingProduct[] = [
      { id: "1", competitionLevel: "low" } as TrendingProduct,
      { id: "2", competitionLevel: "high" } as TrendingProduct,
      { id: "3", competitionLevel: "low" } as TrendingProduct,
    ];
    const lowComp = products.filter((p) => p.competitionLevel === "low");
    expect(lowComp).toHaveLength(2);
  });

  it("calculates average margin", () => {
    const products: TrendingProduct[] = [
      { id: "1", marginEstimate: 40 } as TrendingProduct,
      { id: "2", marginEstimate: 25 } as TrendingProduct,
      { id: "3", marginEstimate: 35 } as TrendingProduct,
    ];
    const avg = products.reduce((sum, p) => sum + p.marginEstimate, 0) / products.length;
    expect(avg).toBeCloseTo(33.33, 1);
  });

  it("can sort by search growth", () => {
    const products: TrendingProduct[] = [
      { id: "1", searchGrowth: 10 } as TrendingProduct,
      { id: "2", searchGrowth: 50 } as TrendingProduct,
      { id: "3", searchGrowth: 25 } as TrendingProduct,
    ];
    const sorted = [...products].sort((a, b) => b.searchGrowth - a.searchGrowth);
    expect(sorted[0].id).toBe("2");
  });

  it("can detect time-sensitive products", () => {
    const products: TrendingProduct[] = [
      { id: "1", timeSensitive: true } as TrendingProduct,
      { id: "2", timeSensitive: false } as TrendingProduct,
    ];
    const urgent = products.filter((p) => p.timeSensitive);
    expect(urgent).toHaveLength(1);
  });
});
