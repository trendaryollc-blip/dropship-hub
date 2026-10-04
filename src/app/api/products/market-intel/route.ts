import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { withKeyPool } from "@/lib/api-keys/pool";
import {
  envelopeFromError,
  type DataStatus,
  type EnvelopeMeta,
  type SetupInfo,
} from "@/lib/api-keys/envelope";

interface MarketIntel {
  searchVolume: "high" | "medium" | "low";
  interestIndex: number;
  trendDirection: "rising" | "stable" | "declining";
  trendSparkline: number[];
  seasonality: string;
  bestTimeToSell: string;
  competitionLevel: "low" | "medium" | "high" | "very-high";
  estimatedSellers: number;
  avgSellerRating: number | null;
  priceWarRisk: "low" | "medium" | "high";
  canCompete: string;
  riskScore: number;
  riskFactors: { label: string; level: "safe" | "caution" | "avoid" }[];
}

interface TrendSeries {
  interestIndex: number;
  avg: number;
  direction: "rising" | "stable" | "declining";
  sparkline: number[];
}

/** Function words that carry no search meaning. */
const TREND_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "of", "in", "on", "for", "with", "to", "by", "from", "at", "is", "are", "vs",
]);

/**
 * Marketing/adjective filler — dropped when building the shorter fallback
 * queries ("Wholesale Retro Genuine Leather Belt Women" → "leather belt women").
 */
const TREND_FILLER = new Set([
  "wholesale", "retro", "genuine", "vintage", "classic", "modern", "designer", "luxury", "premium", "high",
  "quality", "cheap", "discount", "hot", "new", "best", "top", "cute", "stylish", "fashion", "fashionable",
  "original", "professional", "super", "ultra", "free", "shipping", "pack", "set", "pcs", "pc", "small",
  "large", "big", "mini", "heavy", "duty",
]);

const TRENDS_BUDGET_MS = 30000;
const TRENDS_PER_QUERY_MS = 15000;
/** Below this interest index the result is noise — keep trying shorter queries. */
const TRENDS_MIN_SIGNAL = 10;

/**
 * Google Trends returns "no results" for long product titles, so build a
 * short keyword chain from the filler-stripped core, specific → generic
 * ("Wholesale Retro Genuine Leather Belt Women's..." → "leather belt women").
 */
function buildTrendQueries(title: string): string[] {
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !TREND_STOPWORDS.has(w) && !/^\d+$/.test(w));

  const core = words.filter((w) => !TREND_FILLER.has(w));
  const pool = core.length >= 2 ? core : words;
  const candidates = [4, 3, 2]
    .map((n) => pool.slice(0, n).join(" "))
    .filter((q, i, all) => q.length > 0 && all.indexOf(q) === i);

  return candidates.length > 0 ? candidates : [title.slice(0, 40)];
}

async function fetchGoogleTrends(query: string, timeoutMs: number): Promise<TrendSeries | null> {
  return withKeyPool("serpapi", async (apiKey) => {
    const params = new URLSearchParams({
      engine: "google_trends",
      q: query,
      api_key: apiKey,
      data_type: "TIMESERIES",
      date: "today 3-m",
    });

    const res = await fetch(`https://serpapi.com/search?${params}`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`SerpAPI ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    // SerpAPI answers 200 with `{error}` when Trends has no data for the query.
    if (data.error) return null;

    const timelineData = data.interest_over_time?.timeline_data || [];
    if (timelineData.length === 0) return null;

    const values = timelineData.map((d: { values: { extracted_value: number }[] }) => d.values?.[0]?.extracted_value || 0);
    const avg = values.reduce((a: number, b: number) => a + b, 0) / values.length;
    const recent = values.slice(-4);
    const recentAvg = recent.reduce((a: number, b: number) => a + b, 0) / recent.length;

    let direction: "rising" | "stable" | "declining" = "stable";
    if (recentAvg > avg * 1.15) direction = "rising";
    else if (recentAvg < avg * 0.85) direction = "declining";

    const sparkline = values.slice(-14).map((v: number) => Math.round(v));

    return { interestIndex: Math.round(avg), avg, direction, sparkline };
  });
}

/**
 * Walk the query chain (specific → generic) within a time budget and keep the
 * strongest series, so the charts get real points instead of an empty feed.
 */
async function fetchGoogleTrendsForTitle(title: string): Promise<TrendSeries | null> {
  const deadline = Date.now() + TRENDS_BUDGET_MS;
  let best: TrendSeries | null = null;
  let lastError: unknown = null;

  for (const query of buildTrendQueries(title)) {
    const remaining = deadline - Date.now();
    if (remaining < 2000) break;
    try {
      const series = await fetchGoogleTrends(query, Math.min(TRENDS_PER_QUERY_MS, remaining));
      if (series && (!best || series.avg > best.avg)) best = series;
      if (best && best.avg >= TRENDS_MIN_SIGNAL) break;
    } catch (e) {
      lastError = e;
    }
  }

  if (!best && lastError) throw lastError;
  return best;
}

async function fetchSerpShoppingData(
  query: string
): Promise<{ sellerCount: number; avgRating: number; priceRange: { min: number; max: number } } | null> {
  return withKeyPool("serpapi", async (apiKey) => {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: query,
      api_key: apiKey,
      num: "20",
    });

    const res = await fetch(`https://serpapi.com/search?${params}`, {
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`SerpAPI ${res.status}: ${body.slice(0, 200)}`);
    }

    const data = await res.json();
    const results = data.shopping_results || [];

    if (results.length === 0) return null;

    const prices = results
      .map((r: { extracted_price?: number; price?: number }) => r.extracted_price || (typeof r.price === "number" ? r.price : 0))
      .filter((p: number) => p > 0);

    const ratings = results
      .map((r: { rating?: number }) => r.rating)
      .filter((r: unknown): r is number => typeof r === "number");

    return {
      sellerCount: results.length,
      avgRating: ratings.length > 0 ? +(ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1) : 0,
      priceRange: {
        min: prices.length > 0 ? Math.min(...prices) : 0,
        max: prices.length > 0 ? Math.max(...prices) : 0,
      },
    };
  });
}

/**
 * Build provenance meta from the two SerpAPI legs. Worst status wins:
 * config_missing / quota_exhausted are reported with full setup info so the
 * UI can render DataUnavailable/QuotaExhausted instead of guessing.
 */
function buildMeta(
  results: PromiseSettledResult<unknown>[],
  source: string
): EnvelopeMeta {
  let status: DataStatus = "live";
  let setup: SetupInfo | undefined;
  let quota: EnvelopeMeta["quota"];
  let message: string | undefined;
  let anyFulfilled = false;

  for (const result of results) {
    if (result.status === "fulfilled") {
      anyFulfilled = true;
      continue;
    }
    const env = envelopeFromError(result.reason, source);
    if (env.meta.status === "config_missing" || env.meta.status === "quota_exhausted") {
      status = env.meta.status;
      setup = env.meta.setup;
      quota = env.meta.quota;
      message = env.meta.message;
    } else if (status === "live") {
      status = "provider_error";
      message = env.meta.message;
    }
  }

  if (!anyFulfilled && status === "live") status = "provider_error";

  return {
    status,
    source: status === "live" ? source : undefined,
    fetchedAt: status === "live" ? new Date().toISOString() : undefined,
    setup,
    quota,
    message,
  };
}

function deriveMarketIntel(
  title: string,
  price: number,
  rating: number,
  reviews: number,
  trendData: { interestIndex: number; direction: "rising" | "stable" | "declining"; sparkline: number[] } | null,
  shoppingData: { sellerCount: number; avgRating: number; priceRange: { min: number; max: number } } | null
): MarketIntel {
  const sellerCount = shoppingData?.sellerCount ?? 0;
  const avgRating = shoppingData?.avgRating || rating || null;
  const priceMin = shoppingData?.priceRange.min || 0;
  const priceMax = shoppingData?.priceRange.max || 0;
  const priceSpread = priceMax - priceMin;

  const interestIndex = trendData?.interestIndex ?? 0;
  let volumeLevel: "high" | "medium" | "low" = "medium";
  if (!trendData) volumeLevel = "low";
  else if (interestIndex > 50) volumeLevel = "high";
  else if (interestIndex < 10) volumeLevel = "low";

  const trendDirection = trendData?.direction || "stable";
  const trendSparkline = trendData?.sparkline || [];

  let competitionLevel: "low" | "medium" | "high" | "very-high" = "medium";
  if (shoppingData) {
    if (sellerCount > 15) competitionLevel = "very-high";
    else if (sellerCount > 8) competitionLevel = "high";
    else if (sellerCount < 4) competitionLevel = "low";
  }

  const priceWarRisk: "low" | "medium" | "high" =
    shoppingData && priceSpread > 0
      ? priceSpread < price * 0.2 ? "high" : priceSpread < price * 0.4 ? "medium" : "low"
      : "medium";

  const canCompete = !shoppingData
    ? "Not run — needs live shopping results (SerpAPI)"
    : priceSpread > price * 0.3
      ? "Yes — good price spread allows competitive margins"
      : "Challenging — tight margins across platforms";

  const riskScore = Math.min(95, Math.round(
    (competitionLevel === "very-high" ? 30 : competitionLevel === "high" ? 20 : competitionLevel === "medium" ? 10 : 5) +
    (priceWarRisk === "high" ? 25 : priceWarRisk === "medium" ? 15 : 5) +
    (shoppingData && sellerCount > 10 ? 15 : 5) +
    (trendDirection === "declining" ? 15 : 5)
  ));

  const riskFactors = [
    ...(shoppingData ? [{ label: "Competition intensity", level: competitionLevel === "very-high" ? "avoid" as const : competitionLevel === "high" ? "caution" as const : "safe" as const }] : []),
    ...(shoppingData ? [{ label: "Price war likelihood", level: priceWarRisk === "high" ? "avoid" as const : priceWarRisk === "medium" ? "caution" as const : "safe" as const }] : []),
    { label: "Brand/trademark risk", level: title.toLowerCase().includes("brand") || title.toLowerCase().includes("official") ? "caution" as const : "safe" as const },
    ...(shoppingData ? [{ label: "Market saturation", level: sellerCount > 12 ? "avoid" as const : sellerCount > 6 ? "caution" as const : "safe" as const }] : []),
    { label: "Trend stability", level: trendDirection === "declining" ? "caution" as const : "safe" as const },
    ...(trendData ? [] : [{ label: "Search trend", level: "caution" as const }]),
  ];

  const month = new Date().getMonth();
  let seasonality = "Year-round demand";
  let bestTimeToSell = "Now is a good time to start";
  if (month >= 9 && month <= 11) {
    seasonality = "Q4 holiday season — peak demand period";
    bestTimeToSell = "Holiday season (Oct-Dec) — capitalize on gift shopping";
  } else if (month >= 0 && month <= 1) {
    seasonality = "Post-holiday — focus on New Year resolutions";
    bestTimeToSell = "New Year (Jan-Feb) — target resolution-related buyers";
  } else if (month >= 4 && month <= 5) {
    seasonality = "Spring demand — outdoor and lifestyle products trending";
    bestTimeToSell = "Spring (May-Jun) — outdoor and lifestyle products peak";
  } else if (month >= 6 && month <= 7) {
    seasonality = "Summer season — outdoor and travel products in demand";
    bestTimeToSell = "Summer (Jul-Aug) — back-to-school prep starting";
  }

  return {
    searchVolume: volumeLevel,
    interestIndex,
    trendDirection,
    trendSparkline,
    seasonality,
    bestTimeToSell,
    competitionLevel,
    estimatedSellers: sellerCount,
    avgSellerRating: avgRating,
    priceWarRisk,
    canCompete,
    riskScore,
    riskFactors,
  };
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { title, price, rating, reviews } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Product title is required" }, { status: 400 });
    }

    const query = title.slice(0, 80);
    const priceNum = typeof price === "number" ? price : 0;
    const ratingNum = typeof rating === "number" ? rating : 4.0;
    const reviewsNum = typeof reviews === "number" ? reviews : 100;

    const [trendSettled, shoppingSettled] = await Promise.allSettled([
      fetchGoogleTrendsForTitle(title),
      fetchSerpShoppingData(query),
    ]);

    const trend = trendSettled.status === "fulfilled" ? trendSettled.value : null;
    const shopping = shoppingSettled.status === "fulfilled" ? shoppingSettled.value : null;

    const meta = buildMeta([trendSettled, shoppingSettled], "serpapi");

    const marketIntel = deriveMarketIntel(title, priceNum, ratingNum, reviewsNum, trend, shopping);

    // `meta` carries provenance (status/source/setup). Legacy top-level fields
    // remain until the product-validation page rebuild reads `meta` and swaps
    // heuristic fields for DataUnavailable/QuotaExhausted components.
    return NextResponse.json(
      { ...marketIntel, meta },
      { headers: { "X-Data-Status": meta.status } }
    );
  } catch {
    return NextResponse.json({ error: "Failed to analyze market" }, { status: 500 });
  }
});
