import { describe, it, expect } from "vitest";
import { mergeProducts, type SearchResult } from "@/lib/search/dedup";
import { enrichProducts, type EnrichedProduct } from "@/lib/search/enrichment";
import { parseIntentLocally } from "@/lib/search/intent-parser";
import { rankProducts, type RankedProduct } from "@/lib/search/semantic-rank";
import { matchAlertToProducts, isPriceDrop, type SearchAlert } from "@/lib/search/alerts";

// ── Test Fixtures ──────────────────────────────────────────────────────────

const MOCK_SEARCH_RESULTS: SearchResult[] = [
  {
    title: "Wireless Bluetooth Earbuds Pro",
    price: 29.99,
    image: "https://img.com/earbuds.jpg",
    link: "https://amazon.com/dp/B0TEST1",
    source: "amazon",
    rating: 4.5,
    reviews: 2500,
    brand: "SoundMax",
  },
  {
    title: "Wireless Bluetooth Earbuds Pro",
    price: 9.99,
    image: "https://img.com/earbuds.jpg",
    link: "https://aliexpress.com/item/123",
    source: "aliexpress",
    rating: 4.2,
    reviews: 800,
  },
  {
    title: "Stainless Steel Kitchen Knife Set 8 Piece",
    price: 45.99,
    image: "https://img.com/knife.jpg",
    link: "https://amazon.com/dp/B0TEST2",
    source: "amazon",
    rating: 4.7,
    reviews: 5000,
    brand: "SharpEdge",
  },
  {
    title: "Professional Kitchen Knife Set Stainless Steel",
    price: 39.99,
    image: "https://img.com/knife.jpg",
    link: "https://walmart.com/ip/789",
    source: "walmart",
    rating: 4.6,
    reviews: 3200,
  },
  {
    title: "Yoga Mat Non-Slip Exercise Fitness",
    price: 19.99,
    image: "https://img.com/yoga.jpg",
    link: "https://ebay.com/itm/321",
    source: "ebay",
    rating: 4.3,
    reviews: 1200,
  },
];

// ── Pipeline: Dedup → Enrich → Rank ────────────────────────────────────────

describe("Search Enhancement Pipeline - Deduplication", () => {
  it("deduplicates results from multi-platform search", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    expect(merged.length).toBeLessThan(MOCK_SEARCH_RESULTS.length);
  });

  it("merges earbuds from 2 platforms into 1", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const earbuds = merged.find((p) => p.title.toLowerCase().includes("earbuds"));
    expect(earbuds).toBeDefined();
    expect(earbuds!.platformCount).toBe(2);
  });

  it("merges knife set from 2 platforms into 1", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const knife = merged.find((p) => p.title.toLowerCase().includes("knife"));
    expect(knife).toBeDefined();
    expect(knife!.platformCount).toBe(2);
  });

  it("picks best price across platforms", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const earbuds = merged.find((p) => p.title.toLowerCase().includes("earbuds"));
    expect(earbuds!.bestPrice).toBe(9.99);
  });

  it("tracks all platform offers after merge", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const earbuds = merged.find((p) => p.title.toLowerCase().includes("earbuds"));
    expect(earbuds!.platforms.length).toBe(2);
  });

  it("preserves platform metadata after merge", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const earbuds = merged.find((p) => p.title.toLowerCase().includes("earbuds"));
    const sources = earbuds!.platforms.map((p) => p.platform);
    expect(sources).toContain("amazon");
    expect(sources).toContain("aliexpress");
  });

  it("keeps distinct products separate", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    expect(merged.length).toBeGreaterThanOrEqual(3);
    expect(merged.some((p) => p.title.toLowerCase().includes("earbuds"))).toBe(true);
    expect(merged.some((p) => p.title.toLowerCase().includes("knife"))).toBe(true);
    expect(merged.some((p) => p.title.toLowerCase().includes("yoga"))).toBe(true);
  });
});

describe("Search Enhancement Pipeline - Enrichment", () => {
  it("enriches merged products with computed fields", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const enriched = enrichProducts(merged);

    for (const product of enriched) {
      expect(product.goldenScore).toBeDefined();
      expect(product.goldenRank).toBeDefined();
      expect(product.trendPhase).toBeDefined();
      expect(product.saturationLevel).toBeDefined();
      expect(product.competitionScore).toBeDefined();
      expect(product.reviewVelocity).toBeDefined();
      expect(product.priceStability).toBeDefined();
      expect(product.supplyChainScore).toBeDefined();
    }
  });

  it("computes golden score for multi-platform products", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const enriched = enrichProducts(merged);
    const earbuds = enriched.find((p) => p.title.toLowerCase().includes("earbuds"));
    expect(earbuds!.goldenScore).toBeGreaterThan(30);
  });

  it("estimates margin for products", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const enriched = enrichProducts(merged);
    for (const product of enriched) {
      expect(product.estimatedMargin).toBeDefined();
    }
  });

  it("detects trend phase correctly", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const enriched = enrichProducts(merged);
    const earbuds = enriched.find((p) => p.title.toLowerCase().includes("earbuds"));
    expect(["emerging", "growth", "mature", "declining"]).toContain(earbuds!.trendPhase);
  });

  it("preserves original data after enrichment", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const enriched = enrichProducts(merged);
    const earbuds = enriched.find((p) => p.title.toLowerCase().includes("earbuds"));
    expect(earbuds!.bestPrice).toBe(9.99);
    expect(earbuds!.platformCount).toBe(2);
  });
});

describe("Search Enhancement Pipeline - Intent Parsing + Ranking", () => {
  it("parses natural language into structured intent", () => {
    const intent = parseIntentLocally("cheap wireless earbuds under $20 on amazon 4+ stars");
    expect(intent.priceMax).toBe(20);
    expect(intent.platforms).toContain("amazon");
    expect(intent.minRating).toBe(4);
    expect(intent.keywords.length).toBeGreaterThan(0);
  });

  it("ranks products by relevance to parsed intent", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const intent = parseIntentLocally("wireless earbuds under $20");
    const ranked = rankProducts(merged, intent);

    expect(ranked.length).toBe(merged.length);
    expect(ranked[0].relevanceScore).toBeGreaterThanOrEqual(ranked[ranked.length - 1].relevanceScore);
  });

  it("earbuds rank higher than knives for earbuds query", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const intent = parseIntentLocally("wireless earbuds");
    const ranked = rankProducts(merged, intent);

    const earbudsIndex = ranked.findIndex((p) => p.title.toLowerCase().includes("earbuds"));
    const knifeIndex = ranked.findIndex((p) => p.title.toLowerCase().includes("knife"));
    expect(earbudsIndex).toBeLessThan(knifeIndex);
  });

  it("assigns meaningful rank reasons", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const intent = parseIntentLocally("wireless earbuds under $30");
    const ranked = rankProducts(merged, intent);

    for (const product of ranked) {
      expect(product.rankReason).toBeTruthy();
      expect(product.rankReason.length).toBeGreaterThan(0);
    }
  });

  it("filters by price range intent", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const intent = parseIntentLocally("wireless earbuds under $15");
    const ranked = rankProducts(merged, intent);

    const earbuds = ranked.find((p) => p.title.toLowerCase().includes("earbuds"));
    expect(earbuds!.bestPrice).toBeLessThanOrEqual(15);
    expect(earbuds!.relevanceScore).toBeGreaterThan(50);
  });

  it("full pipeline: dedup → enrich → parse → rank", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const enriched = enrichProducts(merged);
    const intent = parseIntentLocally("cheap wireless earbuds under $20 trending");
    const ranked = rankProducts(enriched, intent);

    expect(ranked.length).toBe(merged.length);
    expect(ranked[0].goldenScore).toBeDefined();
    expect(ranked[0].relevanceScore).toBeGreaterThanOrEqual(0);
    expect(ranked[0].relevanceScore).toBeLessThanOrEqual(100);
    expect(ranked[0].rankReason).toBeTruthy();
  });
});

describe("Search Enhancement Pipeline - Alert Matching", () => {
  it("matches products against alert criteria", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const alert: SearchAlert = {
      id: "alert-1",
      userId: "user-1",
      query: "wireless earbuds",
      platforms: ["amazon"],
      priceMax: 30,
      minRating: 4,
      notifyOn: "any",
      isActive: true,
      createdAt: "2026-01-01T00:00:00Z",
    };

    const match = matchAlertToProducts(alert, merged);
    expect(match).not.toBeNull();
    expect(match!.matchedProducts.length).toBeGreaterThan(0);
  });

  it("rejects products outside price range", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const alert: SearchAlert = {
      id: "alert-2",
      userId: "user-1",
      query: "kitchen knife",
      platforms: [],
      priceMax: 5,
      notifyOn: "any",
      isActive: true,
      createdAt: "2026-01-01T00:00:00Z",
    };

    const match = matchAlertToProducts(alert, merged);
    expect(match).toBeNull();
  });

  it("detects price drops correctly", () => {
    expect(isPriceDrop(100, 80, 10)).toBe(true);
    expect(isPriceDrop(100, 95, 10)).toBe(false);
    expect(isPriceDrop(100, 110, 10)).toBe(false);
    expect(isPriceDrop(null, 50, 10)).toBe(false);
  });

  it("matches alert with no platform filter", () => {
    const merged = mergeProducts(MOCK_SEARCH_RESULTS);
    const alert: SearchAlert = {
      id: "alert-3",
      userId: "user-1",
      query: "earbuds",
      platforms: [],
      notifyOn: "new_product",
      isActive: true,
      createdAt: "2026-01-01T00:00:00Z",
    };

    const match = matchAlertToProducts(alert, merged);
    expect(match).not.toBeNull();
    expect(match!.matchType).toBe("new_product");
  });
});

describe("Search Enhancement Pipeline - Performance", () => {
  it("full pipeline handles 200 products efficiently", () => {
    const products: SearchResult[] = Array.from({ length: 200 }, (_, i) => ({
      title: `Product ${i % 20} variant ${i}`,
      price: 10 + (i % 50) * 0.5,
      image: `https://img.com/${i % 20}.jpg`,
      link: `https://example.com/${i}`,
      source: ["amazon", "ebay", "aliexpress", "walmart", "cj"][i % 5],
      rating: 3 + (i % 20) * 0.1,
      reviews: i * 10,
    }));

    const start = performance.now();

    const merged = mergeProducts(products);
    const enriched = enrichProducts(merged);
    const intent = parseIntentLocally("product 0 wireless under $50");
    const ranked = rankProducts(enriched, intent);

    const elapsed = performance.now() - start;

    expect(merged.length).toBeLessThanOrEqual(20);
    expect(ranked.length).toBe(merged.length);
    expect(elapsed).toBeLessThan(10000);
  });
});
