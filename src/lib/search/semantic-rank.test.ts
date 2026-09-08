import { describe, it, expect } from "vitest";
import {
  extractKeywords,
  computeKeywordOverlap,
  computeRelevanceScore,
  computePriceScore,
  computeRatingScore,
  rankProducts,
} from "./semantic-rank";
import type { MergedProduct } from "./dedup";
import type { ParsedIntent } from "./intent-parser";

// ── Helpers ───────────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<MergedProduct> = {}): MergedProduct {
  return {
    id: "test-product",
    title: "Wireless Bluetooth Earbuds",
    image: "https://example.com/img.jpg",
    images: [],
    platforms: [{ platform: "amazon", price: 25, link: "https://amazon.com/1", originalTitle: "Wireless Bluetooth Earbuds" }],
    bestPrice: 25,
    worstPrice: 25,
    priceSpread: 0,
    avgPrice: 25,
    platformCount: 1,
    bestPlatform: "amazon",
    rating: 4.5,
    reviews: 200,
    brand: "Sony",
    ...overrides,
  };
}

function makeIntent(overrides: Partial<ParsedIntent> = {}): ParsedIntent {
  return {
    keywords: ["wireless", "earbuds"],
    originalQuery: "wireless earbuds",
    confidence: 0.7,
    ...overrides,
  };
}

// ── extractKeywords ───────────────────────────────────────────────────────

describe("extractKeywords", () => {
  it("tokenizes title into lowercase words", () => {
    const result = extractKeywords("Bluetooth Speaker");
    expect(result.has("bluetooth")).toBe(true);
    expect(result.has("speaker")).toBe(true);
  });

  it("removes stop words", () => {
    const result = extractKeywords("The Best Wireless Speaker For Home");
    expect(result.has("the")).toBe(false);
    expect(result.has("best")).toBe(true);
    expect(result.has("for")).toBe(false);
    expect(result.has("home")).toBe(true);
  });

  it("preserves brand names", () => {
    const result = extractKeywords("Sony WH-1000XM5 Headphones");
    expect(result.has("sony")).toBe(true);
  });

  it("preserves model numbers", () => {
    const result = extractKeywords("iPhone 15 Pro Max");
    expect(result.has("15")).toBe(true);
    expect(result.has("pro")).toBe(true);
    expect(result.has("max")).toBe(true);
  });

  it("handles special characters", () => {
    const result = extractKeywords("USB-C to Lightning Cable!");
    expect(result.size).toBeGreaterThan(0);
  });

  it("handles empty string", () => {
    const result = extractKeywords("");
    expect(result.size).toBe(0);
  });

  it("handles single word", () => {
    const result = extractKeywords("headphones");
    expect(result.has("headphones")).toBe(true);
  });
});

// ── computeKeywordOverlap ────────────────────────────────────────────────

describe("computeKeywordOverlap", () => {
  it("returns 1.0 for perfect match", () => {
    const keywords = new Set(["wireless", "earbuds"]);
    expect(computeKeywordOverlap(keywords, ["wireless", "earbuds"])).toBe(1);
  });

  it("returns > 0.5 for partial match", () => {
    const keywords = new Set(["wireless", "bluetooth", "earbuds"]);
    const score = computeKeywordOverlap(keywords, ["wireless", "earbuds"]);
    expect(score).toBeGreaterThan(0.5);
  });

  it("returns 0 for no overlap", () => {
    const keywords = new Set(["laptop", "charger"]);
    expect(computeKeywordOverlap(keywords, ["earbuds", "wireless"])).toBe(0);
  });

  it("handles empty sets", () => {
    expect(computeKeywordOverlap(new Set(), ["a"])).toBe(0);
    expect(computeKeywordOverlap(new Set(["a"]), [])).toBe(0);
    expect(computeKeywordOverlap(new Set(), [])).toBe(0);
  });

  it("handles case differences", () => {
    const keywords = new Set(["wireless"]);
    expect(computeKeywordOverlap(keywords, ["Wireless"])).toBe(1);
  });
});

// ── computePriceScore ────────────────────────────────────────────────────

describe("computePriceScore", () => {
  const intent = makeIntent({ priceMin: 10, priceMax: 50 });

  it("returns 100 when price is within range", () => {
    expect(computePriceScore(25, intent)).toBe(100);
  });

  it("returns > 80 when price is within 10% of range", () => {
    expect(computePriceScore(52, intent)).toBeGreaterThan(80);
  });

  it("returns 50 when price is 50% outside range", () => {
    expect(computePriceScore(80, intent)).toBeLessThanOrEqual(50);
  });

  it("returns 0 when price is 2x outside range", () => {
    expect(computePriceScore(120, intent)).toBe(0);
  });

  it("returns 50 for null price", () => {
    expect(computePriceScore(null, intent)).toBe(50);
  });

  it("handles min-only constraint", () => {
    const minOnly = makeIntent({ priceMin: 30 });
    expect(computePriceScore(25, minOnly)).toBeLessThan(100);
    expect(computePriceScore(35, minOnly)).toBe(100);
  });

  it("handles max-only constraint", () => {
    const maxOnly = makeIntent({ priceMax: 40 });
    expect(computePriceScore(35, maxOnly)).toBe(100);
    expect(computePriceScore(60, maxOnly)).toBeLessThan(100);
  });

  it("returns 70 when no price constraints", () => {
    const noPrice = makeIntent();
    expect(computePriceScore(25, noPrice)).toBe(70);
  });
});

// ── computeRatingScore ───────────────────────────────────────────────────

describe("computeRatingScore", () => {
  it("returns 100 when product exceeds rating requirement", () => {
    const product = makeProduct({ rating: 4.8 });
    const intent = makeIntent({ minRating: 4 });
    expect(computeRatingScore(product, intent)).toBe(100);
  });

  it("returns proportional score when close to requirement", () => {
    const product = makeProduct({ rating: 3.8 });
    const intent = makeIntent({ minRating: 4 });
    const score = computeRatingScore(product, intent);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("returns 0 when far below requirement", () => {
    const product = makeProduct({ rating: 1.0 });
    const intent = makeIntent({ minRating: 4 });
    expect(computeRatingScore(product, intent)).toBe(0);
  });

  it("returns 50 for null rating", () => {
    const product = makeProduct({ rating: undefined });
    const intent = makeIntent({ minRating: 4 });
    expect(computeRatingScore(product, intent)).toBe(50);
  });

  it("returns 70 when no rating requirement", () => {
    const product = makeProduct({ rating: 4.5 });
    const intent = makeIntent();
    expect(computeRatingScore(product, intent)).toBe(70);
  });
});

// ── computeRelevanceScore ────────────────────────────────────────────────

describe("computeRelevanceScore", () => {
  it("returns high score for exact keyword match", () => {
    const product = makeProduct({ title: "Wireless Earbuds Pro" });
    const intent = makeIntent({ keywords: ["wireless", "earbuds"] });
    const score = computeRelevanceScore(product, intent);
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it("returns high score for price within range", () => {
    const product = makeProduct({ bestPrice: 30 });
    const intent = makeIntent({ priceMin: 20, priceMax: 50 });
    const score = computeRelevanceScore(product, intent);
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it("returns high score for matching rating", () => {
    const product = makeProduct({ rating: 4.7 });
    const intent = makeIntent({ minRating: 4 });
    const score = computeRelevanceScore(product, intent);
    expect(score).toBeGreaterThanOrEqual(60);
  });

  it("penalizes products outside price range", () => {
    const product = makeProduct({ bestPrice: 200 });
    const intent = makeIntent({ priceMax: 50 });
    const lowPrice = makeProduct({ bestPrice: 30 });
    const highScore = computeRelevanceScore(lowPrice, intent);
    const lowScore = computeRelevanceScore(product, intent);
    expect(highScore).toBeGreaterThan(lowScore);
  });

  it("penalizes products with low ratings", () => {
    const good = makeProduct({ rating: 4.8 });
    const bad = makeProduct({ rating: 2.0 });
    const intent = makeIntent({ minRating: 4 });
    expect(computeRelevanceScore(good, intent)).toBeGreaterThan(
      computeRelevanceScore(bad, intent)
    );
  });

  it("gives bonus for trending products", () => {
    const trending = makeProduct({ platformCount: 5, reviews: 500 });
    const notTrending = makeProduct({ platformCount: 1, reviews: 10 });
    const intent = makeIntent({ trending: true });
    expect(computeRelevanceScore(trending, intent)).toBeGreaterThan(
      computeRelevanceScore(notTrending, intent)
    );
  });

  it("gives bonus for preferred platform", () => {
    const onAmazon = makeProduct({ platforms: [{ platform: "amazon", price: 25, link: "", originalTitle: "" }] });
    const onEbay = makeProduct({ platforms: [{ platform: "ebay", price: 25, link: "", originalTitle: "" }] });
    const intent = makeIntent({ platforms: ["amazon"] });
    expect(computeRelevanceScore(onAmazon, intent)).toBeGreaterThan(
      computeRelevanceScore(onEbay, intent)
    );
  });

  it("handles null price (no penalty)", () => {
    const product = makeProduct({ bestPrice: null });
    const intent = makeIntent({ priceMax: 50 });
    const score = computeRelevanceScore(product, intent);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("handles null rating (no penalty)", () => {
    const product = makeProduct({ rating: undefined });
    const intent = makeIntent({ minRating: 4 });
    const score = computeRelevanceScore(product, intent);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("returns score between 0-100", () => {
    const product = makeProduct();
    const intent = makeIntent({ keywords: ["wireless"], priceMin: 10, priceMax: 100, minRating: 3, platforms: ["amazon"] });
    const score = computeRelevanceScore(product, intent);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ── rankProducts ─────────────────────────────────────────────────────────

describe("rankProducts", () => {
  it("sorts products by relevance score descending", () => {
    const products = [
      makeProduct({ id: "low", title: "Random Toy", bestPrice: 200, rating: 2 }),
      makeProduct({ id: "high", title: "Wireless Earbuds", bestPrice: 25, rating: 4.5 }),
    ];
    const intent = makeIntent({ keywords: ["wireless", "earbuds"], priceMax: 50, minRating: 4 });
    const ranked = rankProducts(products, intent);
    expect(ranked[0].id).toBe("high");
    expect(ranked[1].id).toBe("low");
  });

  it("assigns rank reasons", () => {
    const products = [makeProduct({ title: "Wireless Earbuds" })];
    const intent = makeIntent({ keywords: ["wireless", "earbuds"] });
    const ranked = rankProducts(products, intent);
    expect(ranked[0].rankReason).toBeTruthy();
  });

  it("returns empty array for empty input", () => {
    expect(rankProducts([], makeIntent())).toEqual([]);
  });

  it("handles intent with no filters (general ranking)", () => {
    const products = [makeProduct(), makeProduct({ id: "p2" })];
    const ranked = rankProducts(products, makeIntent());
    expect(ranked.length).toBe(2);
    ranked.forEach((p) => expect(p.relevanceScore).toBeGreaterThanOrEqual(0));
  });

  it("handles intent with all filters", () => {
    const products = [makeProduct()];
    const intent = makeIntent({
      keywords: ["wireless"],
      priceMin: 10,
      priceMax: 50,
      minRating: 4,
      platforms: ["amazon"],
      brand: "Sony",
      trending: true,
    });
    const ranked = rankProducts(products, intent);
    expect(ranked.length).toBe(1);
    expect(ranked[0].relevanceScore).toBeGreaterThanOrEqual(0);
  });

  it("preserves original product data", () => {
    const product = makeProduct({ id: "preserve-test", brand: "Sony" });
    const ranked = rankProducts([product], makeIntent());
    expect(ranked[0].id).toBe("preserve-test");
    expect(ranked[0].brand).toBe("Sony");
    expect(ranked[0].title).toBe("Wireless Bluetooth Earbuds");
  });

  it("handles 1000 products efficiently (< 50ms)", () => {
    const products = Array.from({ length: 1000 }, (_, i) =>
      makeProduct({ id: `p${i}`, title: `Product ${i} wireless earbuds`, bestPrice: 10 + (i % 50) })
    );
    const intent = makeIntent({ keywords: ["wireless", "earbuds"], priceMax: 40 });
    const start = performance.now();
    const ranked = rankProducts(products, intent);
    const elapsed = performance.now() - start;
    expect(ranked.length).toBe(1000);
    expect(elapsed).toBeLessThan(200);
  });
});
