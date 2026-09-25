import type { AmazonProductData, DataSourceResult } from "./types";
import { getCached } from "./cache";
import type { TrendPlatform } from "@/types/trend-predictor";

const SOURCE: TrendPlatform = "amazon_movers";

export async function fetchAmazonData(
  keyword: string,
  timeframe: "7d" | "30d" | "90d" = "30d"
): Promise<DataSourceResult<AmazonProductData>> {
  const cacheKey = `amz:${keyword}:${timeframe}`;
  const cached = await getCached<AmazonProductData>("amazon", cacheKey);
  if (cached) {
    return { success: true, data: cached, source: SOURCE, fetchedAt: new Date().toISOString(), cached: true };
  }

  try {
    const hasLive = Boolean(process.env.AMAZON_PA_API_KEY || process.env.AMAZON_SP_API_KEY || process.env.RAPIDAPI_AMAZON_KEY);
    if (!hasLive) {
      return {
        success: false,
        data: null,
        error: "No live Amazon API key configured. Set AMAZON_PA_API_KEY / AMAZON_SP_API_KEY / RAPIDAPI_AMAZON_KEY.",
        source: SOURCE,
        fetchedAt: new Date().toISOString(),
        cached: false,
      };
    }

    return {
      success: false,
      data: null,
      error: "Amazon live adapter not implemented yet. Connect a provider to populate BSR history.",
      source: SOURCE,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Amazon data fetch failed",
      source: SOURCE,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
  }
}

export function convertAmazonToSignal(data: AmazonProductData, category: string): {
  volume: number;
  previousVolume: number;
  growthRate: number;
  velocity: number;
  acceleration: number;
  saturationLevel: number;
} {
  const bsrHistory = data.bsrHistory;
  if (bsrHistory.length < 2) {
    return { volume: 0, previousVolume: 0, growthRate: 0, velocity: 0, acceleration: 0, saturationLevel: 50 };
  }

  const recent = bsrHistory.slice(-7);
  const previous = bsrHistory.slice(-14, -7);

  const avgRecent = recent.reduce((sum, d) => sum + d.rank, 0) / recent.length;
  const avgPrevious = previous.length > 0
    ? previous.reduce((sum, d) => sum + d.rank, 0) / previous.length
    : avgRecent;

  const volume = Math.round(data.monthlySales * 10);
  const previousVolume = Math.round(avgPrevious > 0 ? (avgRecent / avgPrevious) * volume : volume);
  const growthRate = previousVolume > 0 ? ((volume - previousVolume) / previousVolume) * 100 : 0;

  const recentImprovement = avgPrevious > 0 ? ((avgPrevious - avgRecent) / avgPrevious) * 100 : 0;
  const velocity = Math.max(0, Math.min(100, recentImprovement * 2));

  const recentChanges = recent.map((d, i) => i > 0 ? d.rank - recent[i - 1].rank : 0).slice(1);
  const prevChanges = previous.map((d, i) => i > 0 ? d.rank - previous[i - 1].rank : 0).slice(1);
  const avgRecentChange = recentChanges.length > 0
    ? recentChanges.reduce((sum, v) => sum + v, 0) / recentChanges.length
    : 0;
  const avgPrevChange = prevChanges.length > 0
    ? prevChanges.reduce((sum, v) => sum + v, 0) / prevChanges.length
    : 0;
  const acceleration = avgPrevChange - avgRecentChange;

  const sellerSaturation = Math.min(100, (data.sellerCount / 50) * 100);
  const priceSaturation = data.price < 20 ? 70 : data.price < 50 ? 40 : 20;
  const saturationLevel = Math.round((sellerSaturation * 0.6 + priceSaturation * 0.4));

  return {
    volume,
    previousVolume,
    growthRate: Math.round(growthRate * 10) / 10,
    velocity: Math.round(Math.max(0, Math.min(100, velocity)) * 10) / 10,
    acceleration: Math.round(Math.max(-50, Math.min(50, acceleration)) * 10) / 10,
    saturationLevel: Math.max(0, Math.min(100, saturationLevel)),
  };
}
