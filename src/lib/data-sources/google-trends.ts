import type { GoogleTrendsData, DataSourceResult, TimeframeOption } from "./types";
import { getCached, setCache, CACHE_TTL } from "./cache";
import { withKeyPool, ConfigMissingError } from "@/lib/api-keys/pool";
import { PublicError } from "@/lib/api-errors";
import type { TrendPlatform } from "@/types/trend-predictor";

const SOURCE: TrendPlatform = "google_trends";

const DATE_FOR_TIMEFRAME: Record<TimeframeOption, string> = {
  "7d": "now 7-d",
  "30d": "today 1-m",
  "90d": "today 3-m",
};

interface SerpTrendsResponse {
  interest_over_time?: {
    timeline_data?: { date?: string; values?: { extracted_value?: number }[] }[];
  };
  interest_by_region?: { location?: string; extracted_value?: number }[];
}

async function serpTrendsRequest(
  apiKey: string,
  params: Record<string, string>
): Promise<SerpTrendsResponse> {
  const search = new URLSearchParams({ engine: "google_trends", api_key: apiKey, ...params });
  const res = await fetch(`https://serpapi.com/search?${search}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    // Status in the message so withKeyPool can rotate on 429/401.
    const body = await res.text().catch(() => "");
    throw new Error(`SerpAPI ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

/**
 * Live Google Trends via the SerpAPI key pool (SERPAPI_KEYS).
 *
 * Two legs: TIMESERIES (interest over time — the core signal) and GEO_MAP_0
 * (interest by region for the map; supplementary — its failure never fails the
 * fetch). Related queries/topics are left as empty arrays on purpose: no UI
 * consumes them yet, and each extra leg costs a SerpAPI credit from the free
 * 250/month tier. Missing keys surface ConfigMissingError's honest setup
 * message instead of a stub error.
 */
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
    const data = await withKeyPool("serpapi", async (key) => {
      const base: Record<string, string> = {
        q: keyword,
        data_type: "TIMESERIES",
        date: DATE_FOR_TIMEFRAME[timeframe] ?? DATE_FOR_TIMEFRAME["30d"],
      };
      // geo omitted for "worldwide" — that is SerpAPI's default.
      if (geo && geo !== "worldwide") base.geo = geo;

      const timeseries = await serpTrendsRequest(key, base);
      const timeline = timeseries.interest_over_time?.timeline_data ?? [];
      const interestOverTime = timeline
        .filter((point) => typeof point.date === "string" && point.date.length > 0)
        .map((point) => ({
          date: point.date as string,
          value: Math.round(point.values?.[0]?.extracted_value ?? 0),
        }));
      if (interestOverTime.length === 0) {
        throw new PublicError(
          `Google Trends returned no interest-over-time data for "${keyword}" (${geo}, ${timeframe}).`
        );
      }

      let interestByRegion: { region: string; value: number }[] = [];
      try {
        const regionParams: Record<string, string> = { q: keyword, data_type: "GEO_MAP_0" };
        if (base.geo) regionParams.geo = base.geo;
        const regionData = await serpTrendsRequest(key, regionParams);
        interestByRegion = (regionData.interest_by_region ?? [])
          .filter((r) => typeof r.location === "string" && r.location.length > 0)
          .map((r) => ({ region: r.location as string, value: Math.round(r.extracted_value ?? 0) }));
      } catch {
        // Region map is supplementary; the timeseries above already succeeded.
      }

      return {
        keyword,
        interestOverTime,
        // Not fetched (no UI consumer; saves SerpAPI credits) — empty, never invented.
        relatedQueries: [],
        relatedTopics: [],
        interestByRegion,
        timeframe,
      };
    });

    await setCache("google_trends", data, CACHE_TTL.GOOGLE_TRENDS, cacheKey);
    return { success: true, data, source: SOURCE, fetchedAt: new Date().toISOString(), cached: false };
  } catch (error) {
    const message =
      error instanceof ConfigMissingError || error instanceof PublicError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Google Trends fetch failed";
    return {
      success: false,
      data: null,
      error: message,
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
