import type { SocialSignalData, DataSourceResult } from "./types";
import { getCached } from "./cache";
import type { TrendPlatform } from "@/types/trend-predictor";

export async function fetchSocialSignals(
  keyword: string,
  platforms: TrendPlatform[] = ["tiktok", "instagram", "twitter", "reddit"]
): Promise<DataSourceResult<SocialSignalData[]>> {
  const cacheKey = `social:${keyword}:${platforms.sort().join(",")}`;
  const cached = await getCached<SocialSignalData[]>("social", cacheKey);
  if (cached) {
    return { success: true, data: cached, source: "tiktok", fetchedAt: new Date().toISOString(), cached: true };
  }

  try {
    const hasLive = Boolean(
      process.env.TIKTOK_API_KEY ||
      process.env.INSTAGRAM_GRAPH_TOKEN ||
      process.env.REDDIT_CLIENT_ID ||
      process.env.SOCIAL_API_KEY
    );
    if (!hasLive) {
      return {
        success: false,
        data: null,
        error: "No social API credentials configured (TikTok/Instagram/Reddit/SOCIAL_API_KEY).",
        source: "tiktok",
        fetchedAt: new Date().toISOString(),
        cached: false,
      };
    }

    void keyword;
    void platforms;
    return {
      success: false,
      data: null,
      error: "Social live adapter not implemented yet. Connect a provider to populate engagement signals.",
      source: "tiktok",
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Social signals fetch failed",
      source: "tiktok",
      fetchedAt: new Date().toISOString(),
      cached: false,
    };
  }
}

export function convertSocialToSignal(
  data: SocialSignalData,
  category: string
): {
  volume: number;
  previousVolume: number;
  growthRate: number;
  velocity: number;
  acceleration: number;
  saturationLevel: number;
} {
  const volume = data.volume;
  const previousVolume = Math.round(volume / (1 + data.growthRate / 100));
  const growthRate = data.growthRate;
  const velocity = Math.max(0, Math.min(100, (growthRate + 50) / 2));
  const acceleration = Math.max(-50, Math.min(50, data.engagementRate - 5));
  const saturationLevel = Math.max(0, Math.min(100, 100 - data.engagementRate * 5));

  return {
    volume,
    previousVolume,
    growthRate: Math.round(growthRate * 10) / 10,
    velocity: Math.round(velocity * 10) / 10,
    acceleration: Math.round(acceleration * 10) / 10,
    saturationLevel: Math.round(Math.max(0, Math.min(100, saturationLevel))),
  };
}
