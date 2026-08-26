import { NextRequest, NextResponse } from "next/server";
import { searchAmazon, searchGoogleShopping, searchCJProducts } from "@/lib/platform-search";

interface SimilarProduct {
  title: string;
  price: number;
  image: string | null;
  platform: string;
  link: string;
  rating?: number;
  reviews?: number;
}

async function searchSimilarProducts(query: string, category: string): Promise<SimilarProduct[]> {
  const searchQueries = [
    `${category} ${query.split(" ").slice(0, 3).join(" ")}`.trim(),
    category,
    query.split(" ").slice(0, 2).join(" "),
  ];

  const results: SimilarProduct[] = [];

  for (const q of searchQueries) {
    if (results.length >= 8) break;

    const searchTasks = [
      { fn: searchAmazon, platform: "amazon" },
      { fn: searchGoogleShopping, platform: "google_shopping" },
      { fn: searchCJProducts, platform: "cj" },
    ].map(async ({ fn, platform }) => {
      try {
        const data = await fn(q);
        return (data.search_results || []).slice(0, 3).map((item) => ({
          title: item.title,
          price: item.price || 0,
          image: item.image || null,
          platform,
          link: item.link,
          rating: item.rating,
          reviews: item.reviews,
        }));
      } catch {
        return [];
      }
    });

    const settled = await Promise.allSettled(searchTasks);
    for (const r of settled) {
      if (r.status === "fulfilled") {
        for (const item of r.value) {
          if (item.price > 0 && results.length < 8 && !results.some((existing) => existing.title === item.title)) {
            results.push(item);
          }
        }
      }
    }
  }

  return results;
}

export async function POST(request: NextRequest) {
  try {
    const { title, category, currentPrice: _currentPrice } = await request.json();

    if (!title && !category) {
      return NextResponse.json({ error: "Title or category is required" }, { status: 400 });
    }

    const query = (title || category).slice(0, 80);
    const cat = category || "General";

    const [similar, boughtTogether] = await Promise.allSettled([
      searchSimilarProducts(query, cat),
      searchSimilarProducts(`${cat} accessories`, cat),
    ]);

    const similarProducts = similar.status === "fulfilled" ? similar.value : [];
    const boughtTogetherProducts = boughtTogether.status === "fulfilled" ? boughtTogether.value.slice(0, 3) : [];

    return NextResponse.json({
      similar: similarProducts.slice(0, 4),
      boughtTogether: boughtTogetherProducts,
    });
  } catch {
    return NextResponse.json({ error: "Failed to find similar products" }, { status: 500 });
  }
}
