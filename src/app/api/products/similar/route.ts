import { NextRequest, NextResponse } from "next/server";
import { searchAmazon, searchGoogleShopping, searchCJProducts } from "@/lib/platform-search";
import { normalizeTitle, titleSimilarity } from "@/lib/search/dedup";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";

interface SimilarProduct {
  title: string;
  price: number;
  image: string | null;
  platform: string;
  link: string;
  rating?: number;
  reviews?: number;
}

type SearchFn = (query: string) => Promise<{ search_results?: Array<{
  title?: string;
  price?: number | null;
  image?: string | null;
  link?: string;
  rating?: number;
  reviews?: number;
}> }>;

const PLATFORMS: Array<{ fn: SearchFn; platform: string }> = [
  { fn: searchAmazon, platform: "amazon" },
  { fn: searchGoogleShopping, platform: "google_shopping" },
  { fn: searchCJProducts, platform: "cj" },
];

// Categories too broad to be meaningful search queries on their own.
const GENERIC_CATEGORIES = new Set([
  "general", "misc", "other", "unknown", "all", "products", "items", "default",
]);

// Relevance thresholds: similar products must clearly overlap the source
// title; complementary (bought-together) items only share part of it.
const SIMILAR_MIN_SCORE = 0.25;
const BOUGHT_TOGETHER_MIN_SCORE = 0.15;

function titleKeywords(title: string): string[] {
  return normalizeTitle(title).split(" ").filter(Boolean);
}

function isGenericCategory(category?: string | null): boolean {
  if (!category) return true;
  return GENERIC_CATEGORIES.has(category.trim().toLowerCase());
}

// 0..1 score of how similar a candidate title is to the source product.
// Weighted blend of keyword containment (how much of the source product the
// candidate covers) and Jaccard word overlap.
function relevanceScore(sourceTitle: string, candidateTitle: string): number {
  const source = new Set(titleKeywords(sourceTitle));
  const candidate = new Set(titleKeywords(candidateTitle));
  if (source.size === 0 || candidate.size === 0) return 0;

  let shared = 0;
  for (const word of source) {
    if (candidate.has(word)) shared++;
  }

  const containment = shared / source.size;
  const jaccard = titleSimilarity(sourceTitle, candidateTitle);
  return containment * 0.7 + jaccard * 0.3;
}

function buildQueries(
  title: string | undefined,
  category: string | undefined,
  intent: "similar" | "bought-together"
): string[] {
  const keywords = titleKeywords(title || "").slice(0, 6);
  const hasCategory = !isGenericCategory(category);
  const queries: string[] = [];

  if (keywords.length > 0) {
    if (intent === "similar") {
      // Full title first — the most discriminative query.
      queries.push(keywords.join(" "));
      if (keywords.length > 4) queries.push(keywords.slice(0, 4).join(" "));
      if (hasCategory) queries.push(`${keywords.slice(0, 3).join(" ")} ${category}`);
    } else {
      queries.push(`${keywords.join(" ")} accessories`);
      if (hasCategory) queries.push(`${category} ${keywords.slice(0, 3).join(" ")} accessories`);
    }
  } else if (hasCategory && category) {
    // Only fall back to a category search when there is no title at all —
    // and never for generic categories like "General".
    queries.push(intent === "bought-together" ? `${category} accessories` : category);
  }

  return queries;
}

async function searchCandidates(queries: string[]): Promise<SimilarProduct[]> {
  const candidates: SimilarProduct[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    if (candidates.length >= 18) break;

    const settled = await Promise.allSettled(
      PLATFORMS.map(async ({ fn, platform }) => {
        try {
          const data = await fn(q);
          return (data.search_results || []).slice(0, 6).map((item) => ({
            title: item.title || "",
            price: item.price || 0,
            image: item.image || null,
            platform,
            link: item.link || "",
            rating: item.rating,
            reviews: item.reviews,
          }));
        } catch {
          return [];
        }
      })
    );

    for (const r of settled) {
      if (r.status !== "fulfilled") continue;
      for (const item of r.value) {
        const key = normalizeTitle(item.title);
        if (!key || seen.has(key)) continue;
        if (item.price <= 0 || !item.link) continue;
        seen.add(key);
        candidates.push(item);
      }
    }
  }

  return candidates;
}

async function searchSimilarProducts(
  queries: string[],
  sourceTitle: string,
  intent: "similar" | "bought-together",
  limit: number
): Promise<SimilarProduct[]> {
  if (queries.length === 0) return [];

  const candidates = await searchCandidates(queries);
  const sourceKey = normalizeTitle(sourceTitle);
  const minScore = intent === "similar" ? SIMILAR_MIN_SCORE : BOUGHT_TOGETHER_MIN_SCORE;
  const requiredShared = intent === "similar"
    ? Math.min(2, new Set(titleKeywords(sourceTitle)).size)
    : 1;

  const sourceWords = new Set(titleKeywords(sourceTitle));

  const scored: Array<{ item: SimilarProduct; score: number }> = [];
  for (const item of candidates) {
    const itemKey = normalizeTitle(item.title);
    if (itemKey === sourceKey) continue;

    const itemWords = new Set(titleKeywords(item.title));
    let shared = 0;
    for (const word of sourceWords) {
      if (itemWords.has(word)) shared++;
    }
    if (shared < requiredShared) continue;

    const score = relevanceScore(sourceTitle, item.title);
    if (score >= minScore) scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((s) => s.item);
}

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { title, category, currentPrice: _currentPrice } = await request.json();

    if (!title && !category) {
      return NextResponse.json({ error: "Title or category is required" }, { status: 400 });
    }

    const sourceTitle = (title || category || "").slice(0, 200);
    const similarQueries = buildQueries(title, category, "similar");
    const boughtTogetherQueries = buildQueries(title, category, "bought-together");

    const [similar, boughtTogether] = await Promise.allSettled([
      searchSimilarProducts(similarQueries, sourceTitle, "similar", 4),
      searchSimilarProducts(boughtTogetherQueries, sourceTitle, "bought-together", 3),
    ]);

    const similarProducts = similar.status === "fulfilled" ? similar.value : [];
    const boughtTogetherProducts = boughtTogether.status === "fulfilled" ? boughtTogether.value : [];

    return NextResponse.json({
      similar: similarProducts,
      boughtTogether: boughtTogetherProducts,
    });
  } catch {
    return NextResponse.json({ error: "Failed to find similar products" }, { status: 500 });
  }
}, LIMITS.DEFAULT);
