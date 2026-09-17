import type { SocialSignalData, DataSourceResult } from "./types";
import { getCached, setCache, CACHE_TTL } from "./cache";
import type { TrendPlatform } from "@/types/trend-predictor";

function generateSocialSignal(
  platform: TrendPlatform,
  keyword: string,
  seed: number
): SocialSignalData {
  const platformMultipliers: Record<string, { vol: number; eng: number }> = {
    tiktok: { vol: 1.5, eng: 2.0 },
    instagram: { vol: 1.0, eng: 1.5 },
    twitter: { vol: 0.8, eng: 0.5 },
    reddit: { vol: 0.6, eng: 1.2 },
  };
  const mult = platformMultipliers[platform] || { vol: 1, eng: 1 };
  const baseVolume = Math.round((1000 + (seed % 10000)) * mult.vol);
  const growthRate = Math.round((Math.random() * 200 - 50) * 10) / 10;

  const topPosts = Array.from({ length: 3 }, (_, i) => ({
    text: `${keyword} is ${growthRate > 0 ? "trending" : "popular"} on ${platform} #${i + 1}`,
    engagement: Math.round(100 + Math.random() * 5000),
    url: `https://${platform}.com/post/${seed}-${i}`,
  }));

  return {
    platform,
    keyword,
    volume: baseVolume,
    growthRate,
    engagementRate: Math.round((1 + Math.random() * 10) * mult.eng * 10) / 10,
    topPosts,
    fetchedAt: new Date().toISOString(),
  };
}

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
    const seed = keyword.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const signals = platforms.map((platform) => generateSocialSignal(platform, keyword, seed));

    await setCache("social", signals, CACHE_TTL.SOCIAL_SIGNALS, cacheKey);
    return { success: true, data: signals, source: "tiktok", fetchedAt: new Date().toISOString(), cached: false };
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
