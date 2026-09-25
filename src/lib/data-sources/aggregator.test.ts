import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GoogleTrendsData, DataSourceResult } from "./types";

vi.mock("./google-trends", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./google-trends")>();
  return { ...actual, fetchGoogleTrends: vi.fn() };
});

vi.mock("./amazon", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./amazon")>();
  return { ...actual, fetchAmazonData: vi.fn() };
});

vi.mock("./social", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./social")>();
  return { ...actual, fetchSocialSignals: vi.fn() };
});

import { fetchGoogleTrends } from "./google-trends";
import { fetchAmazonData } from "./amazon";
import { fetchSocialSignals } from "./social";
import { fetchRealSignals, getTrendingKeywords } from "./aggregator";

const now = () => new Date().toISOString();

function deadResult<T>(): DataSourceResult<T> {
  return { success: false, data: null, error: "no live adapter configured", source: "google_trends", fetchedAt: now(), cached: false };
}

function liveGoogleTrends(keyword: string): DataSourceResult<GoogleTrendsData> {
  return {
    success: true,
    data: {
      keyword,
      interestOverTime: Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (29 - i) * 86400000).toISOString().split("T")[0],
        value: 20 + i,
      })),
      relatedQueries: [],
      relatedTopics: [],
      interestByRegion: [],
      timeframe: "7d",
    },
    source: "google_trends",
    fetchedAt: now(),
    cached: false,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchGoogleTrends).mockResolvedValue(deadResult());
  vi.mocked(fetchAmazonData).mockResolvedValue(deadResult());
  vi.mocked(fetchSocialSignals).mockResolvedValue(deadResult());
});

describe("aggregator: no zero-filled rows from dead sources", () => {
  it("returns no signals when every adapter is dead", async () => {
    const signals = await fetchRealSignals("wireless earbuds", "general", ["google_trends", "tiktok"], "7d");
    expect(signals).toEqual([]);
  });

  it("returns an empty trending list when no keyword has a live source", async () => {
    const trending = await getTrendingKeywords();
    expect(trending).toEqual([]);
  });

  it("keeps only keywords that produced real signal volume", async () => {
    vi.mocked(fetchGoogleTrends).mockImplementation(async (keyword) =>
      keyword === "wireless earbuds" ? liveGoogleTrends(keyword) : deadResult()
    );

    const trending = await getTrendingKeywords();

    expect(trending).toHaveLength(1);
    expect(trending[0].keyword).toBe("wireless earbuds");
    expect(trending[0].volume).toBeGreaterThan(0);
    expect(trending.every((t) => t.volume > 0 || t.growth !== 0)).toBe(true);
  });
});
