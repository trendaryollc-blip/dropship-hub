import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import type { CompetitorIntelligence, CompetitorListing, MarketInsights } from "@/types/listing-intelligence";

function calculateMarketInsights(competitors: CompetitorListing[]): MarketInsights {
  const prices = competitors.map((c) => c.price).filter((p) => p > 0);
  const ratings = competitors.map((c) => c.rating).filter((r) => r > 0);
  const reviews = competitors.map((c) => c.reviewCount).filter((r) => r > 0);

  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const medianPrice = sortedPrices.length > 0 ? sortedPrices[Math.floor(sortedPrices.length / 2)] : 0;
  const minPrice = sortedPrices.length > 0 ? sortedPrices[0] : 0;
  const maxPrice = sortedPrices.length > 0 ? sortedPrices[sortedPrices.length - 1] : 0;

  const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;
  const avgReviewCount = reviews.length > 0 ? reviews.reduce((a, b) => a + b, 0) / reviews.length : 0;

  const allKeywords = competitors.flatMap((c) => c.keywords);
  const keywordFreq = new Map<string, number>();
  for (const kw of allKeywords) {
    const lower = kw.toLowerCase();
    keywordFreq.set(lower, (keywordFreq.get(lower) || 0) + 1);
  }
  const topKeywords = Array.from(keywordFreq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([keyword, frequency]) => ({ keyword, frequency }));

  const reviewThreshold = 1000;
  const highReviewCount = competitors.filter((c) => c.reviewCount > reviewThreshold).length;
  const saturationScore = Math.min(100, Math.round((highReviewCount / Math.max(competitors.length, 1)) * 100));

  let competitionLevel: MarketInsights["competitionLevel"] = "low";
  if (saturationScore > 75) competitionLevel = "very-high";
  else if (saturationScore > 50) competitionLevel = "high";
  else if (saturationScore > 25) competitionLevel = "medium";

  const recommendedPrice = minPrice > 0 ? Math.round((minPrice * 0.9 + medianPrice * 0.1) * 100) / 100 : medianPrice;

  const ranges = [
    { min: 0, max: 25, label: "$0-25" },
    { min: 25, max: 50, label: "$25-50" },
    { min: 50, max: 100, label: "$50-100" },
    { min: 100, max: 250, label: "$100-250" },
    { min: 250, max: Infinity, label: "$250+" },
  ];
  const priceDistribution = ranges.map((r) => {
    const count = prices.filter((p) => p >= r.min && p < r.max).length;
    return {
      range: r.label,
      count,
      percentage: prices.length > 0 ? Math.round((count / prices.length) * 100) : 0,
    };
  });

  const opportunityScore = Math.max(0, Math.min(100,
    50
    + (competitionLevel === "low" ? 25 : competitionLevel === "medium" ? 10 : -15)
    + (avgRating < 4.2 ? 15 : avgRating < 4.5 ? 5 : -5)
    + (avgReviewCount < 500 ? 10 : avgReviewCount < 2000 ? 0 : -10)
  ));

  const insights: string[] = [];
  if (competitionLevel === "very-high") {
    insights.push("Highly saturated market. Consider differentiating with unique features or bundling.");
  } else if (competitionLevel === "low") {
    insights.push("Low competition — good opportunity to enter the market.");
  }
  if (recommendedPrice < avgPrice * 0.8) {
    insights.push(`Undercutting recommended at $${recommendedPrice.toFixed(2)} vs avg $${avgPrice.toFixed(2)}.`);
  }
  if (avgRating < 4.0) {
    insights.push("Average ratings are below 4.0 — focus on quality to stand out.");
  }
  if (avgReviewCount > 2000) {
    insights.push("High review counts indicate established sellers. Budget for PPC to compete.");
  }
  if (topKeywords.length > 0) {
    insights.push(`Top keyword: "${topKeywords[0].keyword}" appears in ${topKeywords[0].frequency} listings.`);
  }

  return {
    avgPrice: Math.round(avgPrice * 100) / 100,
    priceRange: { min: minPrice, max: maxPrice },
    medianPrice: Math.round(medianPrice * 100) / 100,
    avgRating: Math.round(avgRating * 10) / 10,
    avgReviewCount: Math.round(avgReviewCount),
    topKeywords,
    competitionLevel,
    saturationScore,
    recommendedPrice: Math.round(recommendedPrice * 100) / 100,
    priceDistribution,
    opportunityScore,
    insights,
  };
}

function extractKeywords(text: string): string[] {
  const stopWords = new Set(["the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "from", "is", "it", "that", "this", "was", "are", "be", "has", "had", "have", "do", "does", "did", "will", "would", "could", "should", "may", "might", "can", "shall", "not", "no", "yes", "if", "then", "else", "when", "where", "how", "what", "which", "who", "whom", "new", "free", "shipping", "best", "top", "hot", "sale", "buy", "shop", "online", "quality", "product"]);
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !stopWords.has(w));
  const freq = new Map<string, number>();
  for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  return Array.from(freq.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w);
}

async function searchCompetitors(keyword: string, platform: string): Promise<CompetitorListing[]> {
  const apiKey = process.env.SERPAPI_KEY || process.env.SERPAPI_API_KEY;
  if (!apiKey) return generateMockCompetitors(keyword, platform);

  try {
    if (platform === "amazon") {
      const params = new URLSearchParams({
        engine: "amazon_search",
        k: keyword,
        api_key: apiKey,
        amazon_domain: "amazon.com",
        num: "10",
      });
      const res = await fetch(`https://serpapi.com/search?${params}`, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) return generateMockCompetitors(keyword, platform);
      const data = await res.json();
      return (data.search_results || []).slice(0, 10).map((item: Record<string, unknown>, i: number) => ({
        rank: i + 1,
        title: String(item.title || ""),
        price: typeof item.price === "object" && item.price !== null ? Number((item.price as Record<string, unknown>).raw || 0) : Number(item.price || 0),
        image: String(item.image || ""),
        rating: Number(item.rating || 0),
        reviewCount: Number(item.reviews || item.total_ratings || 0),
        platform: "amazon",
        url: String(item.link || ""),
        bulletPoints: [],
        keywords: extractKeywords(String(item.title || "")),
        salesEstimate: Number(item.reviews || 0) > 100 ? Math.floor(Number(item.reviews || 0) * 0.02) : undefined,
      }));
    }

    const params = new URLSearchParams({
      engine: "google_shopping",
      q: keyword,
      api_key: apiKey,
      num: "10",
    });
    const res = await fetch(`https://serpapi.com/search?${params}`, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return generateMockCompetitors(keyword, platform);
    const data = await res.json();
    return (data.shopping_results || []).slice(0, 10).map((item: Record<string, unknown>, i: number) => ({
      rank: i + 1,
      title: String(item.title || ""),
      price: Number(item.extracted_price || item.price || 0),
      image: String(item.thumbnail || ""),
      rating: Number(item.rating || 0),
      reviewCount: Number(item.reviews || 0),
      platform: String(item.source || "google_shopping"),
      url: String(item.link || item.product_link || ""),
      bulletPoints: [],
      keywords: extractKeywords(String(item.title || "")),
      salesEstimate: undefined,
    }));
  } catch {
    return generateMockCompetitors(keyword, platform);
  }
}

function generateMockCompetitors(keyword: string, platform: string): CompetitorListing[] {
  const words = keyword.split(" ");
  const brand = words[0]?.charAt(0).toUpperCase() + (words[0]?.slice(1) || "");
  const productType = words.slice(1).join(" ") || "Product";

  return [
    { rank: 1, title: `Premium ${brand} ${productType} - Best Seller`, price: 29.99, image: "", rating: 4.7, reviewCount: 12847, platform, url: "", bulletPoints: ["High quality material", "Fast shipping", "30-day guarantee"], keywords: extractKeywords(`premium ${brand} ${productType}`) },
    { rank: 2, title: `${brand} ${productType} Pro Version`, price: 24.99, image: "", rating: 4.5, reviewCount: 8234, platform, url: "", bulletPoints: ["Professional grade", "Lightweight design", "Easy to use"], keywords: extractKeywords(`${brand} ${productType} pro`) },
    { rank: 3, title: `Budget ${productType} - Great Value`, price: 15.99, image: "", rating: 4.3, reviewCount: 5621, platform, url: "", bulletPoints: ["Affordable price", "Good quality", "Free returns"], keywords: extractKeywords(`budget ${productType} value`) },
    { rank: 4, title: `${brand} Deluxe ${productType}`, price: 39.99, image: "", rating: 4.8, reviewCount: 3412, platform, url: "", bulletPoints: ["Deluxe edition", "Premium packaging", "Extended warranty"], keywords: extractKeywords(`${brand} deluxe ${productType}`) },
    { rank: 5, title: `Compact ${productType} - Portable`, price: 19.99, image: "", rating: 4.4, reviewCount: 2156, platform, url: "", bulletPoints: ["Compact size", "Portable design", "Travel-friendly"], keywords: extractKeywords(`compact ${productType} portable`) },
  ];
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { keyword, platform = "amazon", title } = body as { keyword?: string; platform?: string; title?: string };

    const searchQuery = keyword || title || "";
    if (!searchQuery.trim()) {
      return NextResponse.json({ error: "Keyword or title is required" }, { status: 400 });
    }

    const competitors = await searchCompetitors(searchQuery, platform);
    const marketInsights = calculateMarketInsights(competitors);

    const intelligence: CompetitorIntelligence = {
      keyword: searchQuery,
      platform,
      totalResults: competitors.length,
      competitors,
      marketInsights,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json({ intelligence });
  } catch (error) {
    console.error("[listings/competitors] Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Failed to fetch competitor data", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}, LIMITS.PRODUCT_ENRICH);
