import { NextResponse } from "next/server";
import {
  searchAmazon,
  searchGoogleShopping,
  searchCJProducts,
  searchAliExpress,
} from "@/lib/platform-search";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

interface TrendingProduct {
  id: string;
  name: string;
  fullName: string;
  category: string;
  price: number;
  sellPrice: number | null;
  profit: number | null;
  margin: number | null;
  platform: string;
  platformId: string;
  link: string;
  trend: number | null;
  sparkline: number[] | null;
  confidence: number | null;
  demandLevel: "low" | "medium" | "high" | null;
  competitionLevel: "low" | "medium" | "high" | null;
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

export const GET = withAuth(async () => {
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

        const itemLink = item.link || "";
        const isSearchUrl = itemLink.includes("/wholesale") || itemLink.includes("SearchText=");

        allProducts.push({
          id: `trending-${id++}`,
          name: item.title.length > 60 ? item.title.slice(0, 57) + "..." : item.title,
          fullName: item.title,
          category: platformConfig.query.split(" ").slice(0, 2).join(" "),
          price,
          sellPrice: null,
          profit: null,
          margin: null,
          platform: platformConfig.platform,
          platformId: platformConfig.platformId,
          link: isSearchUrl ? "" : itemLink,
          trend: null,
          sparkline: null,
          confidence: null,
          demandLevel: null,
          competitionLevel: null,
          image: item.image || "",
          tags: platformConfig.query.split(" ").slice(0, 3),
          rating: item.rating ?? null,
          reviews: item.reviews ?? null,
        });
      }
    }

    if (allProducts.length > 0) {
      const sorted = allProducts
        .sort((a, b) => a.price - b.price)
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
}, LIMITS.DEFAULT);
