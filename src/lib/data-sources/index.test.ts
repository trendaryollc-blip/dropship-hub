import { describe, it, expect } from "vitest";

// Test the data source functions directly (they don't need Redis to work)

describe("data-sources/google-trends", () => {
  it("exports fetchGoogleTrends function", async () => {
    const mod = await import("../data-sources/google-trends");
    expect(typeof mod.fetchGoogleTrends).toBe("function");
    expect(typeof mod.convertGoogleTrendsToSignal).toBe("function");
  });

  it("convertGoogleTrendsToSignal computes valid metrics", async () => {
    const { convertGoogleTrendsToSignal } = await import("../data-sources/google-trends");
    const data = {
      keyword: "test",
      interestOverTime: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0],
        value: 30 + Math.round(Math.sin(i / 5) * 15),
      })),
      relatedQueries: [],
      relatedTopics: [],
      interestByRegion: [],
      timeframe: "30d" as const,
    };
    const signal = convertGoogleTrendsToSignal(data, "general");
    expect(signal.volume).toBeGreaterThanOrEqual(0);
    expect(signal.previousVolume).toBeGreaterThanOrEqual(0);
    expect(typeof signal.growthRate).toBe("number");
    expect(typeof signal.velocity).toBe("number");
    expect(typeof signal.acceleration).toBe("number");
    expect(signal.saturationLevel).toBeGreaterThanOrEqual(0);
    expect(signal.saturationLevel).toBeLessThanOrEqual(100);
  });

  it("handles empty time series", async () => {
    const { convertGoogleTrendsToSignal } = await import("../data-sources/google-trends");
    const data = {
      keyword: "test",
      interestOverTime: [],
      relatedQueries: [],
      relatedTopics: [],
      interestByRegion: [],
      timeframe: "30d" as const,
    };
    const signal = convertGoogleTrendsToSignal(data, "general");
    expect(signal.volume).toBe(0);
  });
});

describe("data-sources/amazon", () => {
  it("exports fetchAmazonData function", async () => {
    const mod = await import("../data-sources/amazon");
    expect(typeof mod.fetchAmazonData).toBe("function");
    expect(typeof mod.convertAmazonToSignal).toBe("function");
  });

  it("convertAmazonToSignal computes valid metrics", async () => {
    const { convertAmazonToSignal } = await import("../data-sources/amazon");
    const data = {
      keyword: "test",
      asin: "B0000001",
      title: "Test Product",
      price: 29.99,
      reviewCount: 500,
      rating: 4.5,
      bsr: 1500,
      bsrHistory: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0],
        rank: 1500 + Math.round(Math.sin(i / 5) * 200),
      })),
      sellerCount: 15,
      monthlySales: 1200,
    };
    const signal = convertAmazonToSignal(data, "general");
    expect(signal.volume).toBeGreaterThanOrEqual(0);
    expect(typeof signal.growthRate).toBe("number");
    expect(signal.saturationLevel).toBeGreaterThanOrEqual(0);
    expect(signal.saturationLevel).toBeLessThanOrEqual(100);
  });
});

describe("data-sources/social", () => {
  it("exports fetchSocialSignals function", async () => {
    const mod = await import("../data-sources/social");
    expect(typeof mod.fetchSocialSignals).toBe("function");
    expect(typeof mod.convertSocialToSignal).toBe("function");
  });

  it("convertSocialToSignal computes valid metrics", async () => {
    const { convertSocialToSignal } = await import("../data-sources/social");
    const data = {
      platform: "tiktok" as const,
      keyword: "test",
      volume: 5000,
      growthRate: 35,
      engagementRate: 8,
      topPosts: [],
      fetchedAt: new Date().toISOString(),
    };
    const signal = convertSocialToSignal(data, "general");
    expect(signal.volume).toBe(5000);
    expect(typeof signal.growthRate).toBe("number");
    expect(signal.saturationLevel).toBeGreaterThanOrEqual(0);
    expect(signal.saturationLevel).toBeLessThanOrEqual(100);
  });
});

describe("data-sources/aggregator", () => {
  it("exports fetchRealSignals function", async () => {
    const mod = await import("../data-sources/aggregator");
    expect(typeof mod.fetchRealSignals).toBe("function");
    expect(typeof mod.analyzeKeyword).toBe("function");
    expect(typeof mod.getTrendingKeywords).toBe("function");
  });
});

describe("data-sources/cache", () => {
  it("exports cache functions", async () => {
    const mod = await import("../data-sources/cache");
    expect(typeof mod.getCached).toBe("function");
    expect(typeof mod.setCache).toBe("function");
    expect(typeof mod.deleteCached).toBe("function");
    expect(mod.CACHE_TTL).toBeDefined();
    expect(mod.CACHE_TTL.GOOGLE_TRENDS).toBe(3600);
  });
});
