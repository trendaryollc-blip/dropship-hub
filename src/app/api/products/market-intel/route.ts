import { NextRequest, NextResponse } from "next/server";

const SERP_API_KEY = process.env.SERP_API_KEY;

interface MarketIntel {
  searchVolume: "high" | "medium" | "low";
  searchVolumeNumber: number;
  trendDirection: "rising" | "stable" | "declining";
  trendSparkline: number[];
  seasonality: string;
  bestTimeToSell: string;
  competitionLevel: "low" | "medium" | "high" | "very-high";
  estimatedSellers: number;
  avgSellerRating: number;
  priceWarRisk: "low" | "medium" | "high";
  canCompete: string;
  riskScore: number;
  riskFactors: { label: string; level: "safe" | "caution" | "avoid" }[];
}

async function fetchGoogleTrends(query: string): Promise<{ volume: number; direction: "rising" | "stable" | "declining"; sparkline: number[] } | null> {
  if (!SERP_API_KEY) return null;

  try {
    const params = new URLSearchParams({
      engine: "google_trends",
      q: query,
      api_key: SERP_API_KEY,
      data_type: "TIMESERIES",
      date: "today 3-m",
    });

    const res = await fetch(`https://serpapi.com/search?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

    const data = await res.json();
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

    return { volume: Math.round(avg * 1000), direction, sparkline };
  } catch {
    return null;
  }
}

async function fetchSerpShoppingData(query: string): Promise<{ sellerCount: number; avgRating: number; priceRange: { min: number; max: number } } | null> {
  if (!SERP_API_KEY) return null;

  try {
    const params = new URLSearchParams({
      engine: "google_shopping",
      q: query,
      api_key: SERP_API_KEY,
      num: "20",
    });

    const res = await fetch(`https://serpapi.com/search?${params}`, {
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;

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
  } catch {
    return null;
  }
}

function deriveMarketIntel(
  title: string,
  price: number,
  rating: number,
  reviews: number,
  trendData: { volume: number; direction: "rising" | "stable" | "declining"; sparkline: number[] } | null,
  shoppingData: { sellerCount: number; avgRating: number; priceRange: { min: number; max: number } } | null
): MarketIntel {
  const sellerCount = shoppingData?.sellerCount || Math.round(100 + (reviews || 100) / 10);
  const avgRating = shoppingData?.avgRating || rating || 4.0;
  const priceMin = shoppingData?.priceRange.min || price * 0.7;
  const priceMax = shoppingData?.priceRange.max || price * 1.5;
  const priceSpread = priceMax - priceMin;

  const searchVolume = trendData?.volume || (reviews > 1000 ? 80000 : reviews > 100 ? 20000 : 5000);
  let volumeLevel: "high" | "medium" | "low" = "medium";
  if (searchVolume > 50000) volumeLevel = "high";
  else if (searchVolume < 10000) volumeLevel = "low";

  const trendDirection = trendData?.direction || "stable";
  const trendSparkline = trendData?.sparkline || Array.from({ length: 14 }, (_, i) => Math.round(40 + Math.sin(i * 0.5) * 20));

  let competitionLevel: "low" | "medium" | "high" | "very-high" = "medium";
  if (sellerCount > 15) competitionLevel = "very-high";
  else if (sellerCount > 8) competitionLevel = "high";
  else if (sellerCount < 4) competitionLevel = "low";

  const priceWarRisk: "low" | "medium" | "high" = priceSpread < price * 0.2 ? "high" : priceSpread < price * 0.4 ? "medium" : "low";

  const canCompete = priceSpread > price * 0.3
    ? "Yes — good price spread allows competitive margins"
    : "Challenging — tight margins across platforms";

  const riskScore = Math.min(95, Math.round(
    (competitionLevel === "very-high" ? 30 : competitionLevel === "high" ? 20 : competitionLevel === "medium" ? 10 : 5) +
    (priceWarRisk === "high" ? 25 : priceWarRisk === "medium" ? 15 : 5) +
    (sellerCount > 10 ? 15 : 5) +
    (trendDirection === "declining" ? 15 : 5)
  ));

  const riskFactors = [
    { label: "Competition intensity", level: competitionLevel === "very-high" ? "avoid" as const : competitionLevel === "high" ? "caution" as const : "safe" as const },
    { label: "Price war likelihood", level: priceWarRisk === "high" ? "avoid" as const : priceWarRisk === "medium" ? "caution" as const : "safe" as const },
    { label: "Brand/trademark risk", level: title.toLowerCase().includes("brand") || title.toLowerCase().includes("official") ? "caution" as const : "safe" as const },
    { label: "Market saturation", level: sellerCount > 12 ? "avoid" as const : sellerCount > 6 ? "caution" as const : "safe" as const },
    { label: "Trend stability", level: trendDirection === "declining" ? "caution" as const : "safe" as const },
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
    searchVolumeNumber: searchVolume,
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

export async function POST(request: NextRequest) {
  try {
    const { title, price, rating, reviews } = await request.json();

    if (!title) {
      return NextResponse.json({ error: "Product title is required" }, { status: 400 });
    }

    const query = title.slice(0, 80);
    const priceNum = typeof price === "number" ? price : 0;
    const ratingNum = typeof rating === "number" ? rating : 4.0;
    const reviewsNum = typeof reviews === "number" ? reviews : 100;

    const [trendData, shoppingData] = await Promise.allSettled([
      fetchGoogleTrends(query),
      fetchSerpShoppingData(query),
    ]);

    const trend = trendData.status === "fulfilled" ? trendData.value : null;
    const shopping = shoppingData.status === "fulfilled" ? shoppingData.value : null;

    const marketIntel = deriveMarketIntel(title, priceNum, ratingNum, reviewsNum, trend, shopping);

    return NextResponse.json(marketIntel);
  } catch {
    return NextResponse.json({ error: "Failed to analyze market" }, { status: 500 });
  }
}
