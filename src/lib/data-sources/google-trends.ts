import type { GoogleTrendsData, DataSourceResult, TimeframeOption } from "./types";
import { getCached } from "./cache";
import type { TrendPlatform } from "@/types/trend-predictor";

const SOURCE: TrendPlatform = "google_trends";

export async function fetchGoogleTrends(
  keyword: string,
  timeframe: TimeframeOption = "30d",
  geo: string = "worldwide"
): Promise<DataSourceResult<GoogleTrendsData>> {
  const cacheKey = `gt:${keyword}:${timeframe}:${geo}`;
  const cached = await getCached<GoogleTrendsData>("google_trends", cacheKey);
  if (cached) {
    return { success: true, data: cached, source: SOURCE, fetchedAt: new Date().toISOString(), cached: true };
  }

  try {
    const hasLive = Boolean(process.env.GOOGLE_TRENDS_API_KEY || process.env.RAPIDAPI_GOOGLE_TRENDS_KEY);
    if (!hasLive) {
      return {
        success: false,
        data: null,
        error: "No live Google Trends API key configured. Set GOOGLE_TRENDS_API_KEY or RAPIDAPI_GOOGLE_TRENDS_KEY.",
        source: SOURCE,
        fetchedAt: new Date().toISOString(),
        cached: false,
      };
    }

    return {
      success: false,
      data: null,
      error: "Google Trends live adapter not implemented yet. Connect a provider to populate interestOverTime.",
      source: SOURCE,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Google Trends fetch failed",
      source: SOURCE,
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
  }
}

export function convertGoogleTrendsToSignal(data: GoogleTrendsData, category: string): {
  volume: number;
  previousVolume: number;
  growthRate: number;
  velocity: number;
  acceleration: number;
  saturationLevel: number;
} {
  const timeSeries = data.interestOverTime;
  if (timeSeries.length < 2) {
    return { volume: 0, previousVolume: 0, growthRate: 0, velocity: 0, acceleration: 0, saturationLevel: 50 };
  }

  const recent = timeSeries.slice(-7);
  const previous = timeSeries.slice(-14, -7);

  const avgRecent = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
  const avgPrevious = previous.length > 0
    ? previous.reduce((sum, d) => sum + d.value, 0) / previous.length
    : avgRecent;

  const volume = Math.round(avgRecent * 1000);
  const previousVolume = Math.round(avgPrevious * 1000);
  const growthRate = previousVolume > 0 ? ((volume - previousVolume) / previousVolume) * 100 : 0;

  const recentTrend = recent.map((d, i) => i > 0 ? d.value - recent[i - 1].value : 0).slice(1);
  const velocity = recentTrend.length > 0
    ? recentTrend.reduce((sum, v) => sum + v, 0) / recentTrend.length
    : 0;

  const prevTrend = previous.map((d, i) => i > 0 ? d.value - previous[i - 1].value : 0).slice(1);
  const prevVelocity = prevTrend.length > 0
    ? prevTrend.reduce((sum, v) => sum + v, 0) / prevTrend.length
    : 0;

  const acceleration = velocity - prevVelocity;
  const maxVolume = Math.max(...timeSeries.map((d) => d.value));
  const saturationLevel = maxVolume > 0 ? Math.round((1 - avgRecent / 100) * 100) : 50;

  return {
    volume,
    previousVolume,
    growthRate: Math.round(growthRate * 10) / 10,
    velocity: Math.round(velocity * 10) / 10,
    acceleration: Math.round(acceleration * 10) / 10,
    saturationLevel: Math.max(0, Math.min(100, saturationLevel)),
  };
}
