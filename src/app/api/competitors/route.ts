import { NextRequest, NextResponse } from "next/server";
import { searchAmazon, searchGoogleShopping, searchCJProducts, searchKeepaProducts, searchAliExpress, type SearchResult } from "@/lib/platform-search";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

// Types
interface CompetitorListing {
  id: string;
  title: string;
  price: number;
  source: string;
  seller: string;
  sellerRating: number;
  sellerProducts: number;
  link: string;
  shipping: string;
  condition: "New";
  daysAgo: number | null;
}

interface PlatformData {
  platform: string;
  icon: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  sellerCount: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  sparkline: number[];
  listings: CompetitorListing[];
}

interface MarketData {
  platforms: PlatformData[];
  avgPrice: number;
  priceRange: { min: number; max: number };
  totalListings: number;
  priceDistribution: { range: string; count: number; percent: number; isSweetSpot: boolean }[];
  topSellers: { name: string; platform: string; rating: number; totalProducts: number; price: number; threatLevel: "low" | "medium" | "high"; isDropshipper: null; otherProducts: { name: string; price: number }[]; responseTime: null; returnPolicy: null }[];
  opportunities: { type: "opportunity" | "gap" | "avoid"; title: string; description: string; count: number; potentialMargin?: number; actionLabel: string }[];
  pricingOptions: { label: string; icon: string; price: number; margin: number; competition: string; recommendation: string }[];
  insights: string[];
}


const platformConfig: Record<string, { icon: string }> = {
  amazon: { icon: "📦" },
  google_shopping: { icon: "🔍" },
  cj: { icon: "🏭" },
  keepa: { icon: "📈" },
  aliexpress: { icon: "🌐" },
};

function searchPlatform(
  key: string,
  searchFn: (q: string) => Promise<{ search_results: SearchResult[] }>,
  query: string
): Promise<PlatformData | null> {
  return searchFn(query)
    .then((data) => {
      const results = (data.search_results || []).map((r, i) => ({
        id: `${key}-${i}`,
        title: r.title || "Product",
        price: r.price || 0,
        source: key,
        seller: (typeof r.seller === "string" ? r.seller : null) || `${key} seller`,
        sellerRating: (typeof r.rating === "number" ? r.rating : null) || 4.0,
        sellerProducts: (typeof r.sellerProducts === "number" ? r.sellerProducts : null) || 0,
        link: r.link || "#",
        shipping: (typeof r.shipping === "string" ? r.shipping : null) ?? "Varies",
        condition: "New" as const,
        daysAgo: (typeof r.daysAgo === "number" ? r.daysAgo : null) ?? null,
      }));
      if (!results || results.length === 0) return null;

      const prices = results.map((r) => r.price).filter((p) => p > 0);
      if (prices.length === 0) return null;

      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      const recentPrices = prices.slice(0, Math.min(10, prices.length));
      const olderPrices = prices.slice(Math.min(10, prices.length));
      const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
      const olderAvg = olderPrices.length > 0
        ? olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length
        : recentAvg;

      let trend: "up" | "down" | "stable" = "stable";
      let trendPercent = 0;
      if (olderAvg > 0) {
        const diff = ((recentAvg - olderAvg) / olderAvg) * 100;
        trendPercent = Math.round(diff);
        if (diff > 2) trend = "up";
        else if (diff < -2) trend = "down";
      }

      const sparkline = Array.from({ length: 14 }, (_, i) => {
        const start = Math.floor((i / 14) * prices.length);
        const end = Math.floor(((i + 1) / 14) * prices.length);
        const slice = prices.slice(start, Math.max(end, start + 1));
        return Math.round((slice.reduce((a, b) => a + b, 0) / slice.length) * 100) / 100;
      });

      const sellers = new Set(results.map((r) => r.seller));

      const listings: CompetitorListing[] = results.filter((r) => r.price > 0).map((r) => ({
        id: r.id,
        title: r.title,
        price: r.price,
        source: r.source,
        seller: r.seller,
        sellerRating: r.sellerRating,
        sellerProducts: r.sellerProducts,
        link: r.link,
        shipping: r.shipping ?? "Varies",
        condition: "New" as const,
        daysAgo: r.daysAgo ?? null,
      }));

      const config = platformConfig[key] ?? { icon: "🛒" };

      return {
        platform: key,
        icon: config.icon,
        avgPrice: Math.round(avgPrice * 100) / 100,
        minPrice: Math.round(minPrice * 100) / 100,
        maxPrice: Math.round(maxPrice * 100) / 100,
        sellerCount: sellers.size,
        trend,
        trendPercent,
        sparkline,
        listings,
      };
    })
    .catch(() => null);
}

function buildPriceDistribution(prices: number[]): { range: string; count: number; percent: number; isSweetSpot: boolean }[] {
  const total = prices.length;
  const ranges = [
    { label: "$0 - $10", min: 0, max: 10, isSweetSpot: false },
    { label: "$10 - $25", min: 10, max: 25, isSweetSpot: true },
    { label: "$25 - $50", min: 25, max: 50, isSweetSpot: true },
    { label: "$50 - $100", min: 50, max: 100, isSweetSpot: false },
    { label: "$100+", min: 100, max: Infinity, isSweetSpot: false },
  ];

  return ranges.map((r) => {
    const count = prices.filter((p) => p >= r.min && p < r.max).length;
    return {
      range: r.label,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
      isSweetSpot: r.isSweetSpot,
    };
  });
}

function buildTopSellers(platforms: PlatformData[]): { name: string; platform: string; rating: number; totalProducts: number; price: number; threatLevel: "low" | "medium" | "high"; isDropshipper: null; otherProducts: { name: string; price: number }[]; responseTime: null; returnPolicy: null }[] {
  const sellerMap = new Map<string, { platform: string; rating: number; totalProducts: number; price: number; otherProducts: { name: string; price: number }[] }>();

  for (const p of platforms) {
    for (const listing of p.listings) {
      const key = `${listing.seller}__${p.platform}`;
      if (sellerMap.has(key)) continue;

      const otherListings = p.listings.filter((l) => l.seller === listing.seller && l.id !== listing.id);
      sellerMap.set(key, {
        platform: p.platform,
        rating: listing.sellerRating,
        totalProducts: listing.sellerProducts,
        price: listing.price,
        otherProducts: otherListings.slice(0, 3).map((l) => ({ name: l.title, price: l.price })),
      });
    }
  }

  const sellers = Array.from(sellerMap.entries()).map(([name, data]) => {
    let threatLevel: "low" | "medium" | "high" = "low";
    if (data.totalProducts > 200 && data.rating > 4.5) threatLevel = "high";
    else if (data.totalProducts > 50 || data.rating > 4.0) threatLevel = "medium";

    return {
      name,
      platform: data.platform,
      rating: data.rating,
      totalProducts: data.totalProducts,
      price: data.price,
      threatLevel,
      isDropshipper: null,
      otherProducts: data.otherProducts,
      responseTime: null,
      returnPolicy: null,
    };
  });

  sellers.sort((a, b) => b.totalProducts - a.totalProducts);
  return sellers.slice(0, 5);
}

function buildOpportunities(platforms: PlatformData[]): { type: "opportunity" | "gap" | "avoid"; title: string; description: string; count: number; potentialMargin?: number; actionLabel: string }[] {
  const opportunities: { type: "opportunity" | "gap" | "avoid"; title: string; description: string; count: number; potentialMargin?: number; actionLabel: string }[] = [];
  const allPrices = platforms.flatMap((p) => p.listings.map((l) => l.price));
  if (allPrices.length === 0) return opportunities;

  const globalAvg = allPrices.reduce((a, b) => a + b, 0) / allPrices.length;

  for (const platform of platforms) {
    const platformPrices = platform.listings.map((l) => l.price);
    if (platformPrices.length === 0) continue;

    const _platformAvg = platformPrices.reduce((a, b) => a + b, 0) / platformPrices.length;
    const cheapListings = platform.listings.filter((l) => l.price < globalAvg * 0.7);

    if (cheapListings.length > 0) {
      const lowestPrice = Math.min(...cheapListings.map((l) => l.price));
      opportunities.push({
        type: "opportunity",
        title: `Low-price supplier found on ${platform.platform}`,
        description: `${cheapListings.length} listings on ${platform.platform} priced ${Math.round(((globalAvg - lowestPrice) / globalAvg) * 100)}% below market average.`,
        count: cheapListings.length,
        potentialMargin: Math.round((globalAvg - lowestPrice) * 100) / 100,
        actionLabel: `View ${platform.platform} suppliers`,
      });
    }
  }

  const sortedPlatforms = [...platforms].sort((a, b) => a.avgPrice - b.avgPrice);
  if (sortedPlatforms.length >= 2) {
    const cheapest = sortedPlatforms[0];
    const mostExpensive = sortedPlatforms[sortedPlatforms.length - 1];
    const priceGap = mostExpensive.avgPrice - cheapest.avgPrice;

    if (priceGap > globalAvg * 0.2) {
      opportunities.push({
        type: "gap",
        title: `Price gap between ${cheapest.platform} and ${mostExpensive.platform}`,
        description: `Potential arbitrage: buy from ${cheapest.platform} at $${cheapest.avgPrice.toFixed(2)} and sell where the average is $${mostExpensive.avgPrice.toFixed(2)}.`,
        count: cheapest.listings.length + mostExpensive.listings.length,
        potentialMargin: Math.round(priceGap * 100) / 100,
        actionLabel: "Explore arbitrage",
      });
    }
  }

  const highCompetitionPlatforms = platforms.filter((p) => p.sellerCount > 10);
  for (const platform of highCompetitionPlatforms) {
    opportunities.push({
      type: "avoid",
      title: `High competition on ${platform.platform}`,
      description: `${platform.sellerCount} sellers competing on ${platform.platform}. Profit margins may be thin.`,
      count: platform.sellerCount,
      actionLabel: `Analyze ${platform.platform} competition`,
    });
  }

  return opportunities;
}

function buildPricingOptions(platforms: PlatformData[]): { label: string; icon: string; price: number; margin: number; competition: string; recommendation: string }[] {
  const allPrices = platforms.flatMap((p) => p.listings.map((l) => l.price));
  if (allPrices.length === 0) return [];

  const sorted = [...allPrices].sort((a, b) => a - b);
  const min = sorted[0];
  const avg = sorted.reduce((a, b) => a + b, 0) / sorted.length;
  const _max = sorted[sorted.length - 1];
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];

  const options = [
    {
      label: "Aggressive",
      icon: "⚡",
      price: Math.round(min * 1.05 * 100) / 100,
      margin: Math.round(((min * 1.05 - min) / (min * 1.05)) * 100),
      competition: `Low — ${sorted.filter((p) => p < q1).length} listings below`,
      recommendation: "Sacrifice margin for volume. Wins buy-box quickly.",
    },
    {
      label: "Competitive",
      icon: "🎯",
      price: Math.round(avg * 100) / 100,
      margin: Math.round(((avg - min) / avg) * 100),
      competition: `Medium — ${sorted.filter((p) => p >= q1 && p <= q3).length} listings in range`,
      recommendation: "Balanced approach. Matches market expectation.",
    },
    {
      label: "Premium",
      icon: "👑",
      price: Math.round(q3 * 1.1 * 100) / 100,
      margin: Math.round(((q3 * 1.1 - min) / (q3 * 1.1)) * 100),
      competition: `Low — only ${sorted.filter((p) => p > q3).length} listings above`,
      recommendation: "Higher margin, lower volume. Needs strong brand/trust.",
    },
  ];

  return options;
}

function buildInsights(platforms: PlatformData[], avgPrice: number, priceRange: { min: number; max: number }, totalListings: number, opportunities: { type: string; potentialMargin?: number }[]): string[] {
  const insights: string[] = [];

  insights.push(`Average price across ${platforms.length} platform${platforms.length !== 1 ? "s" : ""}: $${avgPrice.toFixed(2)}`);

  const cheapest = [...platforms].sort((a, b) => a.minPrice - b.minPrice)[0];
  if (cheapest) {
    insights.push(`Best sourcing price: $${cheapest.minPrice.toFixed(2)} on ${cheapest.platform}`);
  }

  insights.push(`Total active listings: ${totalListings} across all platforms`);

  const marginOpps = opportunities.filter((o) => o.type === "opportunity" && o.potentialMargin);
  if (marginOpps.length > 0) {
    const bestMargin = marginOpps.reduce((best, o) => (o.potentialMargin ?? 0) > (best.potentialMargin ?? 0) ? o : best);
    insights.push(`Best margin opportunity: $${bestMargin.potentialMargin?.toFixed(2)} per unit`);
  }

  const priceSpread = priceRange.max - priceRange.min;
  if (priceSpread > avgPrice * 0.5) {
    insights.push(`Wide price spread ($${priceSpread.toFixed(2)}) indicates room for arbitrage`);
  }

  return insights;
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { query } = body as { query?: string };

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Missing required field: query" }, { status: 400 });
    }

    const trimmedQuery = query.trim();

    const platformResults = await Promise.allSettled([
      searchPlatform("amazon", searchAmazon, trimmedQuery),
      searchPlatform("google_shopping", searchGoogleShopping, trimmedQuery),
      searchPlatform("cj", searchCJProducts, trimmedQuery),
      searchPlatform("keepa", searchKeepaProducts, trimmedQuery),
      searchPlatform("aliexpress", searchAliExpress, trimmedQuery),
    ]);

    const platforms: PlatformData[] = platformResults
      .filter((r): r is PromiseFulfilledResult<PlatformData | null> => r.status === "fulfilled")
      .map((r) => r.value)
      .filter((p): p is PlatformData => p !== null);

    if (platforms.length === 0) {
      return NextResponse.json({ error: "No results found across any platform" }, { status: 404 });
    }

    const allListings = platforms.flatMap((p) => p.listings);
    const allPrices = allListings.map((l) => l.price).filter((p) => p > 0);

    const avgPrice = allPrices.length > 0
      ? Math.round((allPrices.reduce((a, b) => a + b, 0) / allPrices.length) * 100) / 100
      : 0;

    const priceRange = {
      min: allPrices.length > 0 ? Math.round(Math.min(...allPrices) * 100) / 100 : 0,
      max: allPrices.length > 0 ? Math.round(Math.max(...allPrices) * 100) / 100 : 0,
    };

    const totalListings = allListings.length;

    const priceDistribution = buildPriceDistribution(allPrices);
    const topSellers = buildTopSellers(platforms);
    const opportunities = buildOpportunities(platforms);
    const pricingOptions = buildPricingOptions(platforms);
    const insights = buildInsights(platforms, avgPrice, priceRange, totalListings, opportunities);

    const data: MarketData = {
      platforms,
      avgPrice,
      priceRange,
      totalListings,
      priceDistribution,
      topSellers,
      opportunities,
      pricingOptions,
      insights,
    };

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}, LIMITS.DEFAULT);
