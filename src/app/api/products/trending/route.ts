import { NextResponse } from "next/server";
import {
  searchAmazon,
  searchGoogleShopping,
  searchCJProducts,
  searchAliExpress,
} from "@/lib/platform-search";

interface TrendingProduct {
  id: string;
  name: string;
  fullName: string;
  category: string;
  price: number;
  sellPrice: number;
  profit: number;
  margin: number;
  platform: string;
  platformId: string;
  link: string;
  trend: number;
  sparkline: number[];
  confidence: number;
  demandLevel: "low" | "medium" | "high";
  competitionLevel: "low" | "medium" | "high";
  image: string;
  tags: string[];
  rating: number | null;
  reviews: number | null;
}

let cachedTrending: { products: TrendingProduct[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

const PLATFORM_QUERIES = [
  { query: "wireless earbuds", searchFn: searchAmazon, platform: "Amazon", platformId: "amazon" },
  { query: "phone accessories", searchFn: searchGoogleShopping, platform: "Google Shopping", platformId: "google_shopping" },
  { query: "led strip lights", searchFn: searchCJProducts, platform: "CJ Dropshipping", platformId: "cj" },
  { query: "pet tracker", searchFn: searchAliExpress, platform: "AliExpress", platformId: "aliexpress" },
  { query: "kitchen gadget", searchFn: searchAmazon, platform: "Amazon", platformId: "amazon" },
  { query: "yoga mat", searchFn: searchGoogleShopping, platform: "Google Shopping", platformId: "google_shopping" },
  { query: "posture corrector", searchFn: searchCJProducts, platform: "CJ Dropshipping", platformId: "cj" },
  { query: "car phone mount", searchFn: searchAliExpress, platform: "AliExpress", platformId: "aliexpress" },
];

function estimateDemand(orders: number): "low" | "medium" | "high" {
  if (orders > 300) return "high";
  if (orders > 100) return "medium";
  return "low";
}

function estimateCompetition(price: number): "low" | "medium" | "high" {
  if (price < 5) return "high";
  if (price < 15) return "medium";
  return "low";
}

function generateSparkline(price: number): number[] {
  const base = Math.min(price * 3, 60);
  return Array.from({ length: 7 }, (_, i) =>
    Math.round(base + Math.sin(i * 0.8) * 8 + (Math.random() * 4 - 2))
  );
}

export async function GET() {
  try {
    if (cachedTrending && cachedTrending.products.length > 0 && Date.now() - cachedTrending.timestamp < CACHE_TTL) {
      return NextResponse.json({ products: cachedTrending.products, cached: true });
    }

    const results = await Promise.allSettled(
      PLATFORM_QUERIES.map((p) => p.searchFn(p.query))
    );

    const allProducts: TrendingProduct[] = [];
    let id = 0;

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status !== "fulfilled") continue;

      const platformConfig = PLATFORM_QUERIES[i];
      const searchResults = r.value?.search_results;
      if (!Array.isArray(searchResults)) continue;

      const items = searchResults.filter(
        (p) => p.price !== null && p.price > 0
      );
      const top = items.slice(0, 2);

      for (const item of top) {
        const price = item.price!;
        const sellPrice = Math.round(price * 2.5 * 100) / 100;
        const profit = Math.round((sellPrice - price) * 100) / 100;
        const margin = sellPrice > 0 ? Math.round((profit / sellPrice) * 100) : 0;
        const growth = Math.round(Math.random() * 35 + 5);

        const itemLink = item.link || "";
        const isSearchUrl = itemLink.includes("/wholesale") || itemLink.includes("SearchText=");

        allProducts.push({
          id: `trending-${id++}`,
          name: item.title.length > 60 ? item.title.slice(0, 57) + "..." : item.title,
          fullName: item.title,
          category: platformConfig.query.split(" ").slice(0, 2).join(" "),
          price,
          sellPrice,
          profit,
          margin,
          platform: platformConfig.platform,
          platformId: platformConfig.platformId,
          link: isSearchUrl ? "" : itemLink,
          trend: growth,
          sparkline: generateSparkline(price),
          confidence: Math.min(
            95,
            Math.round(60 + margin * 0.4 + Math.random() * 10)
          ),
          demandLevel: estimateDemand(Math.round(100 + Math.random() * 400)),
          competitionLevel: estimateCompetition(price),
          image: item.image || "",
          tags: platformConfig.query.split(" ").slice(0, 3),
          rating: item.rating ?? Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
          reviews: item.reviews ?? Math.floor(50 + Math.random() * 2000),
        });
      }
    }

    if (allProducts.length > 0) {
      const sorted = allProducts
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 8);

      cachedTrending = { products: sorted, timestamp: Date.now() };
      return NextResponse.json({ products: sorted, count: sorted.length });
    }

    if (cachedTrending && cachedTrending.products.length > 0) {
      return NextResponse.json({ products: cachedTrending.products, cached: true });
    }

    return NextResponse.json({ products: [], count: 0 });
  } catch (error) {
    if (cachedTrending && cachedTrending.products.length > 0) {
      return NextResponse.json({ products: cachedTrending.products, cached: true, error: error instanceof Error ? error.message : "Unknown error" });
    }
    return NextResponse.json(
      {
        products: [],
        error: error instanceof Error ? error.message : "Unknown error",
      }
    );
  }
}
