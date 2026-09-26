import type { AmazonProductData, DataSourceResult } from "./types";
import { getCached, setCache, CACHE_TTL } from "./cache";
import { withKeyPool, ConfigMissingError } from "@/lib/api-keys/pool";
import { PublicError } from "@/lib/api-errors";
import type { TrendPlatform } from "@/types/trend-predictor";

const SOURCE: TrendPlatform = "amazon_movers";

interface KeepaProduct {
  asin?: unknown;
  title?: unknown;
  rating?: unknown;
  ratingsTotal?: unknown;
  stats?: { current?: unknown };
  salesRanks?: unknown;
  salesRankHistory?: unknown;
}

/** Keepa csv arrays: [startTsMs, dailyValue, dailyValue, ...] with -1 = no data; ts > 1e11 = new segment. */
function parseSalesRankHistory(raw: unknown): { date: string; rank: number }[] {
  let csv: unknown[] | null = null;
  if (Array.isArray(raw)) {
    csv = raw;
  } else if (raw && typeof raw === "object") {
    const first = Object.values(raw as Record<string, unknown>)[0];
    if (Array.isArray(first)) csv = first;
  }
  if (!csv || csv.length < 2) return [];

  const history: { date: string; rank: number }[] = [];
  let ts: number | null = null;
  for (const value of csv) {
    if (typeof value !== "number" || Number.isNaN(value)) continue;
    if (value > 1e11) {
      ts = value;
      continue;
    }
    if (ts === null) continue;
    if (value > 0) {
      history.push({ date: new Date(ts).toISOString().slice(0, 10), rank: Math.round(value) });
    }
    ts += 86_400_000;
  }
  return history.slice(-90);
}

/**
 * Live Amazon BSR data via the Keepa key pool (KEEPA_API_KEYS).
 *
 * One product search (`stats=1&history=1&rating=1`) returns real title, price,
 * rating, review count and sales-rank history for the top match. Keepa's free
 * search does not publish sales estimates or offer counts, so monthlySales /
 * sellerCount stay 0 — convertAmazonToSignal derives volume from the real BSR
 * instead of inventing sales numbers.
 */
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
    const data = await withKeyPool("keepa", async (key) => {
      const params = new URLSearchParams({
        key,
        domain: "1",
        type: "product",
        term: keyword,
        stats: "1",
        history: "1",
        rating: "1",
      });
      const res = await fetch(`https://api.keepa.com/search?${params}`, {
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        // Status in the message so withKeyPool can rotate on 429/401.
        const body = await res.text().catch(() => "");
        throw new Error(`Keepa ${res.status}: ${body.slice(0, 200)}`);
      }

      const payload = (await res.json()) as { products?: KeepaProduct[] };
      const product = payload.products?.[0];
      if (!product) {
        throw new PublicError(`Keepa found no Amazon products for "${keyword}".`);
      }

      const current = Array.isArray((product.stats as { current?: unknown } | undefined)?.current)
        ? ((product.stats as { current: unknown[] }).current as (number | null)[])
        : [];
      const numAt = (index: number): number => {
        const value = current[index];
        return typeof value === "number" && Number.isFinite(value) ? value : 0;
      };

      const bsrHistory = parseSalesRankHistory(product.salesRanks ?? product.salesRankHistory);
      const bsrFromHistory = bsrHistory.length > 0 ? bsrHistory[bsrHistory.length - 1].rank : 0;
      const bsrCurrent = numAt(3); // csv index 3 = sales rank
      const priceCents = numAt(1) > 0 ? numAt(1) : numAt(0); // NEW price, else AMAZON price

      return {
        keyword,
        asin: String(product.asin ?? ""),
        title: String(product.title ?? ""),
        price: priceCents > 0 ? priceCents / 100 : 0,
        reviewCount:
          typeof product.ratingsTotal === "number" && product.ratingsTotal >= 0
            ? Math.round(product.ratingsTotal)
            : 0,
        rating:
          typeof product.rating === "number" && product.rating > 0
            ? Math.round(product.rating * 10) / 10
            : 0,
        bsr: bsrCurrent > 0 ? Math.round(bsrCurrent) : bsrFromHistory,
        bsrHistory,
        // Keepa search does not expose offer counts or sales estimates — left at
        // 0 rather than guessed; the converter uses real BSR for volume.
        sellerCount: 0,
        monthlySales: 0,
      };
    });

    await setCache("amazon", data, CACHE_TTL.AMAZON_BSR, cacheKey);
    return { success: true, data, source: SOURCE, fetchedAt: new Date().toISOString(), cached: false };
  } catch (error) {
    const message =
      error instanceof ConfigMissingError || error instanceof PublicError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Amazon data fetch failed";
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

  // Keepa's free search doesn't publish sales estimates (monthlySales is 0), so
  // volume is derived from the real recent BSR with a standard inverse-rank
  // curve — a labeled heuristic (same class as Google Trends' index × 1000),
  // never an invented sales figure.
  const recentRank = avgRecent > 0 ? avgRecent : data.bsr;
  const volume =
    data.monthlySales > 0
      ? Math.round(data.monthlySales * 10)
      : recentRank > 0
        ? Math.max(1, Math.round(30000 / recentRank))
        : 0;
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
