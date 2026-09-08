import { NextRequest, NextResponse } from "next/server";

const CATEGORY_SUGGESTIONS: Record<string, string[]> = {
  electronics: ["bluetooth speaker", "usb hub", "wireless charger", "webcam", "mouse pad"],
  fashion: ["sunglasses", "watch", "crossbody bag", "sneakers", "hat"],
  home: ["coffee maker", "air purifier", "plant pot", "desk organizer", "LED lamp"],
  pet: ["dog harness", "cat toy", "pet bed", "fish tank", "bird cage"],
  fitness: ["yoga mat", "resistance bands", "dumbbells", "jump rope", "gym bag"],
  beauty: ["makeup brush set", "skincare", "hair dryer", "nail kit", "perfume"],
  automotive: ["dashboard camera", "seat cover", "phone holder", "tire gauge", "car vacuum"],
  baby: ["baby monitor", "stroller organizer", "pacifier", "diaper bag", "baby carrier"],
};

const cache = new Map<string, { data: unknown; expiry: number }>();
const CACHE_TTL = 5 * 60 * 1000;

async function getTrendingSearches(): Promise<string[]> {
  try {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    const db = await getAdminDB();
    
    // Fetch trending searches from Firestore (aggregated from all users)
    const trendingSnap = await db
      .collection("analytics")
      .doc("trending")
      .collection("searches")
      .orderBy("count", "desc")
      .limit(20)
      .get();
    
    if (trendingSnap.docs.length > 0) {
      return trendingSnap.docs.map((d) => d.id);
    }
  } catch {
    // Fall through to defaults
  }
  
  // Fallback: return popular default searches
  return [
    "wireless earbuds", "phone case", "laptop stand", "ring light",
    "car phone mount", "portable charger", "led strip lights",
    "kitchen gadgets", "pet supplies", "fitness tracker",
  ];
}

async function getSeasonalSuggestions(): Promise<string[]> {
  try {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    const db = await getAdminDB();
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Fetch seasonal suggestions from Firestore
    const seasonalSnap = await db
      .collection("analytics")
      .doc("seasonal")
      .collection(String(currentYear))
      .doc(String(currentMonth))
      .get();
    
    if (seasonalSnap.exists) {
      const data = seasonalSnap.data();
      if (data?.suggestions && Array.isArray(data.suggestions)) {
        return data.suggestions;
      }
    }
  } catch {
    // Fall through to defaults
  }
  
  // Fallback: use time-based defaults
  const currentMonth = new Date().getMonth();
  const defaults: Record<number, string[]> = {
    0: ["winter jacket", "snow boots", "heater", "humidifier"],
    1: ["valentine gifts", "chocolate box", "flower arrangement"],
    2: ["spring cleaning", "garden tools", "planter"],
    3: ["easter decorations", "spring fashion", "umbrella"],
    4: ["mother day gifts", "outdoor furniture", "sunscreen"],
    5: ["summer gadgets", "swimming gear", "cooler bag"],
    6: ["independence day", "grill accessories", "beach accessories"],
    7: ["back to school", "laptop bag", "stationery"],
    8: ["fall fashion", "harvest decor", "jacket"],
    9: ["halloween costumes", "pumpkin decor", "costume accessories"],
    10: ["black friday", "holiday gifts", "tech deals"],
    11: ["christmas decorations", "gift wrapping", "winter accessories"],
  };
  return defaults[currentMonth] || [];
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (q.length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const cacheKey = q.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      return NextResponse.json(cached.data);
    }

    const lowerQ = q.toLowerCase();
    const suggestions: { text: string; category: string; categoryLabel?: string }[] = [];

    // 1. Trending matches (from Firestore)
    const trendingSearches = await getTrendingSearches();
    const trendingMatches = trendingSearches.filter((t) =>
      t.toLowerCase().includes(lowerQ)
    ).slice(0, 3);
    for (const text of trendingMatches) {
      suggestions.push({ text, category: "trending" });
    }

    // 2. Category matches
    for (const [category, keywords] of Object.entries(CATEGORY_SUGGESTIONS)) {
      const matches = keywords.filter((k) => k.toLowerCase().includes(lowerQ));
      for (const text of matches.slice(0, 2)) {
        suggestions.push({
          text,
          category: "category",
          categoryLabel: category,
        });
      }
    }

    // 3. Seasonal suggestions (from Firestore)
    const seasonalSuggestions = await getSeasonalSuggestions();
    const seasonalMatches = seasonalSuggestions.filter((s) => s.toLowerCase().includes(lowerQ));
    for (const text of seasonalMatches.slice(0, 2)) {
      suggestions.push({ text, category: "seasonal" });
    }

    // 4. Try to get user search history for personalized suggestions (Feature 9)
    try {
      const authHeader = request.headers.get("authorization");
      if (authHeader) {
        const { getAdminDB } = await import("@/lib/firebase-admin");
        const jwt = await import("jsonwebtoken");
        const token = authHeader.replace("Bearer ", "");
        const decoded = jwt.default.decode(token) as { uid?: string } | null;
        if (decoded && decoded.uid) {
          const db = await getAdminDB();
          const historySnap = await db
            .collection("users")
            .doc(decoded.uid)
            .collection("searchHistory")
            .orderBy("createdAt", "desc")
            .limit(20)
            .get();

          const historyQueries = historySnap.docs.map((d) => (d.data().query || "").toLowerCase());
          const historyMatches = historyQueries.filter((h) => h.includes(lowerQ) && !suggestions.some((s) => s.text === h));
          for (const text of historyMatches.slice(0, 2)) {
            suggestions.push({ text, category: "history" });
          }
        }
      }
    } catch {
      // Silently ignore auth/history errors
    }

    const uniqueSuggestions = suggestions
      .filter((s, i, arr) => arr.findIndex((x) => x.text === s.text) === i)
      .slice(0, 8);

    const result = { suggestions: uniqueSuggestions };
    cache.set(cacheKey, { data: result, expiry: Date.now() + CACHE_TTL });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ suggestions: [] });
  }
}
