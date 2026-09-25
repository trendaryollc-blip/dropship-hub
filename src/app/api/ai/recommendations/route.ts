import { NextRequest, NextResponse } from "next/server";
import { getAdminDB } from "@/lib/firebase-admin";
import { withAuth } from "@/lib/auth";
import { LIMITS } from "@/lib/rate-limit";
import { DocumentData } from "firebase-admin/firestore";
import { safeStr } from "@/lib/utils-helpers";
import { safeErrorMessage } from "@/lib/api-errors";

interface ProductRecommendation {
  id: string;
  title: string;
  category: string;
  sourcePrice: number | null;
  reason: string;
  matchType: "saved" | "lifecycle" | "recent-search";
  query: string;
  tags: string[];
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const k = key(item);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

async function buildRecommendations(uid: string): Promise<Response> {
  try {
    const db = await getAdminDB();
    const userRef = db.collection("users").doc(uid);

    const [lifecycleSnap, searchSnap, favoritesSnap] = await Promise.all([
      userRef.collection("productLifecycle").limit(20).get(),
      userRef.collection("searchHistory").orderBy("createdAt", "desc").limit(20).get(),
      userRef.collection("favorites").limit(20).get(),
    ]);

    const lifecycle = lifecycleSnap.docs.map((d) => d.data() as DocumentData);
    const searches = searchSnap.docs.map((d) => d.data() as DocumentData);
    const favorites = favoritesSnap.docs.map((d) => d.data() as DocumentData);

    const fromFavorites: ProductRecommendation[] = favorites.map((f) => {
      const title = safeStr(f.title || f.productTitle || f.name);
      return {
        id: `fav-${safeStr(f.id || f.productId || title)}`,
        title,
        category: safeStr(f.category, "Saved"),
        sourcePrice: typeof f.price === "number" ? f.price : null,
        reason: "You saved this product",
        matchType: "saved" as const,
        query: title,
        tags: [],
      };
    });

    const fromLifecycle: ProductRecommendation[] = lifecycle.map((p) => {
      const title = safeStr(p.productTitle || p.title || p.name);
      return {
        id: `life-${safeStr(p.id || title)}`,
        title,
        category: safeStr(p.category, "Your catalog"),
        sourcePrice: typeof p.sourcePrice === "number" ? p.sourcePrice : typeof p.currentPrice === "number" ? p.currentPrice : null,
        reason: "In your product lifecycle",
        matchType: "lifecycle" as const,
        query: title,
        tags: [],
      };
    });

    const fromSearches: ProductRecommendation[] = searches
      .map((s, i) => {
        const query = safeStr(s.query);
        return {
          id: `search-${i}-${query}`,
          title: query,
          category: "Recent search",
          sourcePrice: null,
          reason: "Run this search again",
          matchType: "recent-search" as const,
          query,
          tags: [],
        };
      })
      .filter((r) => r.query.length > 0);

    const recommendations = uniqueBy(
      [...fromFavorites, ...fromLifecycle, ...fromSearches],
      (r) => `${r.matchType}:${r.query.toLowerCase()}`
    )
      .filter((r) => r.title)
      .slice(0, 8);

    const userNiches = [
      ...new Set(searches.map((s) => safeStr(s.query).toLowerCase().split(" ")[0])),
    ].filter(Boolean);

    return NextResponse.json({
      recommendations,
      userProfile: {
        niches: userNiches.slice(0, 5),
        productCount: lifecycle.length,
        favoriteCount: favorites.length,
        searchCount: searches.length,
      },
      source: "firestore",
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to load recommendations", details: safeErrorMessage(error, "Unknown error") },
      { status: 500 }
    );
  }
}

export const GET = withAuth(async (_request: NextRequest, uid: string) => {
  return buildRecommendations(uid);
}, LIMITS.AI_CHAT);

export const POST = withAuth(async (_request: NextRequest, uid: string) => {
  return buildRecommendations(uid);
}, LIMITS.AI_CHAT);
