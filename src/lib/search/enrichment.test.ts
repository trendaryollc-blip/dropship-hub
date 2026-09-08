import { describe, it, expect } from "vitest";
import {
  estimateMargin,
  quickGoldenScore,
  goldenRank,
  estimateTrendPhase,
  estimateSaturation,
  computeCompetitionScore,
  computeReviewVelocity,
  computePriceStability,
  computeSupplyChainScore,
  enrichProduct,
  enrichProducts,
  type EnrichedProduct,
} from "./enrichment";
import type { MergedProduct } from "./dedup";

// ── Test Fixtures ──────────────────────────────────────────────────────────

function makeProduct(overrides: Partial<MergedProduct> = {}): MergedProduct {
  return {
    id: "test-product",
    title: "Wireless Bluetooth Earbuds",
    image: "https://img.com/earbuds.jpg",
    images: ["https://img.com/earbuds.jpg"],
    platforms: [
      { platform: "amazon", price: 29.99, link: "https://amazon.com/1", originalTitle: "Wireless Bluetooth Earbuds" },
      { platform: "aliexpress", price: 9.99, link: "https://aliexpress.com/1", originalTitle: "Wireless Earbuds BT" },
    ],
    bestPrice: 9.99,
    worstPrice: 29.99,
    priceSpread: 200,
    avgPrice: 19.99,
    platformCount: 2,
    bestPlatform: "aliexpress",
    rating: 4.3,
    reviews: 2500,
    brand: "TestBrand",
    ...overrides,
  };
}

// ── estimateMargin ─────────────────────────────────────────────────────────

describe("estimateMargin", () => {
  it("calculates margin when cost data available", () => {
    const product = makeProduct({ bestPrice: 50 });
    const costs = new Map([["cj", 15]]);
    expect(estimateMargin(product, costs)).toBe(70);
  });

  it("returns undefined when no cost data", () => {
    const product = makeProduct({ bestPrice: 30 });
    expect(estimateMargin(product)).toBeDefined();
  });

  it("handles zero cost by excluding it", () => {
    const product = makeProduct({ bestPrice: 50 });
    const costs = new Map([["cj", 0]]);
    const margin = estimateMargin(product, costs);
    expect(margin).toBeDefined();
    expect(margin).toBeGreaterThan(0);
  });

  it("handles negative margin", () => {
    const product = makeProduct({ bestPrice: 10 });
    const costs = new Map([["cj", 20]]);
    expect(estimateMargin(product, costs)).toBeLessThan(0);
  });

  it("caps margin at reasonable range", () => {
    const product = makeProduct({ bestPrice: 100 });
    const costs = new Map([["cj", 1]]);
    expect(estimateMargin(product, costs)).toBe(99);
  });

  it("returns undefined for null price", () => {
    const product = makeProduct({ bestPrice: null });
    expect(estimateMargin(product)).toBeUndefined();
  });

  it("uses platform cost ratios when no explicit costs", () => {
    const product = makeProduct({
      bestPrice: 100,
      platforms: [
        { platform: "cj", price: 100, link: "", originalTitle: "" },
      ],
    });
    const margin = estimateMargin(product);
    expect(margin).toBeGreaterThan(50);
  });
});

// ── quickGoldenScore ──────────────────────────────────────────────────────

describe("quickGoldenScore", () => {
  it("returns high score for product with good metrics", () => {
    const product = makeProduct({
      bestPrice: 29.99,
      rating: 4.7,
      reviews: 3000,
      platformCount: 4,
      priceSpread: 10,
      images: ["a.jpg", "b.jpg", "c.jpg"],
      brand: "TestBrand",
    });
    expect(quickGoldenScore(product)).toBeGreaterThanOrEqual(70);
  });

  it("returns low score for product with poor metrics", () => {
    const product = makeProduct({
      bestPrice: 200,
      rating: undefined,
      reviews: undefined,
      platformCount: 1,
      priceSpread: 80,
      images: [],
      brand: undefined,
      estimatedMargin: undefined,
    });
    expect(quickGoldenScore(product)).toBeLessThan(40);
  });

  it("handles null rating/reviews", () => {
    const product = makeProduct({ rating: undefined, reviews: undefined });
    const score = quickGoldenScore(product);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("handles null price", () => {
    const product = makeProduct({ bestPrice: null });
    const score = quickGoldenScore(product);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("returns 0-100 range", () => {
    const product = makeProduct();
    const score = quickGoldenScore(product);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("gives bonus for multi-platform availability", () => {
    const single = makeProduct({ platformCount: 1, priceSpread: 0 });
    const multi = makeProduct({ platformCount: 4, priceSpread: 0 });
    expect(quickGoldenScore(multi)).toBeGreaterThan(quickGoldenScore(single));
  });

  it("gives bonus for low price spread", () => {
    const tight = makeProduct({ priceSpread: 5, platformCount: 3 });
    const wide = makeProduct({ priceSpread: 60, platformCount: 3 });
    expect(quickGoldenScore(tight)).toBeGreaterThan(quickGoldenScore(wide));
  });
});

// ── goldenRank ────────────────────────────────────────────────────────────

describe("goldenRank", () => {
  it("returns S for score >= 85", () => {
    expect(goldenRank(85)).toBe("S");
    expect(goldenRank(100)).toBe("S");
  });

  it("returns A for score >= 70", () => {
    expect(goldenRank(70)).toBe("A");
    expect(goldenRank(84)).toBe("A");
  });

  it("returns B for score >= 50", () => {
    expect(goldenRank(50)).toBe("B");
    expect(goldenRank(69)).toBe("B");
  });

  it("returns C for score >= 30", () => {
    expect(goldenRank(30)).toBe("C");
    expect(goldenRank(49)).toBe("C");
  });

  it("returns D for score < 30", () => {
    expect(goldenRank(0)).toBe("D");
    expect(goldenRank(29)).toBe("D");
  });
});

// ── estimateTrendPhase ────────────────────────────────────────────────────

describe("estimateTrendPhase", () => {
  it("returns emerging for new products with few platforms", () => {
    const product = makeProduct({ platformCount: 1, reviews: 10, priceSpread: 0 });
    expect(estimateTrendPhase(product)).toBe("emerging");
  });

  it("returns growth for moderate platform count", () => {
    const product = makeProduct({ platformCount: 3, reviews: 200, priceSpread: 15 });
    expect(estimateTrendPhase(product)).toBe("growth");
  });

  it("returns mature for products on many platforms", () => {
    const product = makeProduct({ platformCount: 8, reviews: 2000, priceSpread: 10 });
    expect(estimateTrendPhase(product)).toBe("mature");
  });

  it("returns declining for products with high price spread", () => {
    const product = makeProduct({ platformCount: 8, reviews: 2000, priceSpread: 60 });
    expect(estimateTrendPhase(product)).toBe("declining");
  });

  it("handles unknown product age via heuristics", () => {
    const product = makeProduct({ platformCount: 2, reviews: 50, priceSpread: 30 });
    const phase = estimateTrendPhase(product);
    expect(["emerging", "growth", "mature", "declining"]).toContain(phase);
  });
});

// ── estimateSaturation ────────────────────────────────────────────────────

describe("estimateSaturation", () => {
  it("returns unsaturated for single-platform products", () => {
    const product = makeProduct({ platformCount: 1, reviews: 5, priceSpread: 0 });
    expect(estimateSaturation(product)).toBe("unsaturated");
  });

  it("returns low for 2-3 platforms", () => {
    const product = makeProduct({ platformCount: 2, reviews: 50, priceSpread: 20 });
    const level = estimateSaturation(product);
    expect(["unsaturated", "low"]).toContain(level);
  });

  it("returns moderate for 4-6 platforms", () => {
    const product = makeProduct({ platformCount: 5, reviews: 500, priceSpread: 15 });
    const level = estimateSaturation(product);
    expect(["low", "moderate"]).toContain(level);
  });

  it("returns saturated for 7+ platforms", () => {
    const product = makeProduct({ platformCount: 8, reviews: 2000, priceSpread: 8 });
    const level = estimateSaturation(product);
    expect(["moderate", "saturated", "hyper-saturated"]).toContain(level);
  });

  it("returns hyper-saturated for 10+ platforms with tight pricing", () => {
    const product = makeProduct({
      platformCount: 12,
      reviews: 8000,
      priceSpread: 5,
      rating: 4.6,
    });
    expect(estimateSaturation(product)).toBe("hyper-saturated");
  });
});

// ── computeCompetitionScore ───────────────────────────────────────────────

describe("computeCompetitionScore", () => {
  it("returns score 0-100", () => {
    const product = makeProduct();
    const score = computeCompetitionScore(product);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("increases with more platforms", () => {
    const few = makeProduct({ platformCount: 1, reviews: 10 });
    const many = makeProduct({ platformCount: 6, reviews: 10 });
    expect(computeCompetitionScore(many)).toBeGreaterThan(computeCompetitionScore(few));
  });

  it("increases with more reviews", () => {
    const low = makeProduct({ reviews: 5 });
    const high = makeProduct({ reviews: 15000 });
    expect(computeCompetitionScore(high)).toBeGreaterThan(computeCompetitionScore(low));
  });

  it("increases with tight pricing across platforms", () => {
    const wide = makeProduct({ platformCount: 4, priceSpread: 60 });
    const tight = makeProduct({ platformCount: 4, priceSpread: 8 });
    expect(computeCompetitionScore(tight)).toBeGreaterThan(computeCompetitionScore(wide));
  });
});

// ── computeReviewVelocity ─────────────────────────────────────────────────

describe("computeReviewVelocity", () => {
  it("calculates reviews/month for known data", () => {
    expect(computeReviewVelocity(120, 2)).toBe(20);
  });

  it("estimates for unknown age using platform heuristics", () => {
    const velocity = computeReviewVelocity(600, 3);
    expect(velocity).toBeGreaterThan(0);
  });

  it("handles zero reviews", () => {
    expect(computeReviewVelocity(0, 2)).toBe(0);
  });

  it("handles very new products", () => {
    const velocity = computeReviewVelocity(10, 1);
    expect(velocity).toBeGreaterThan(0);
  });
});

// ── computePriceStability ─────────────────────────────────────────────────

describe("computePriceStability", () => {
  it("returns 100 for constant prices", () => {
    expect(computePriceStability(0)).toBe(100);
  });

  it("returns high score for low spread", () => {
    expect(computePriceStability(3)).toBe(95);
    expect(computePriceStability(8)).toBe(85);
  });

  it("returns medium score for moderate spread", () => {
    expect(computePriceStability(15)).toBe(70);
    expect(computePriceStability(25)).toBe(55);
  });

  it("returns low score for volatile prices", () => {
    expect(computePriceStability(40)).toBe(35);
    expect(computePriceStability(60)).toBe(15);
  });

  it("handles single price point", () => {
    expect(computePriceStability(0)).toBe(100);
  });
});

// ── computeSupplyChainScore ───────────────────────────────────────────────

describe("computeSupplyChainScore", () => {
  it("returns higher score for reliable platforms", () => {
    const amazon = makeProduct({
      platforms: [{ platform: "amazon", price: 30, link: "", originalTitle: "" }],
    });
    const ebay = makeProduct({
      platforms: [{ platform: "ebay", price: 30, link: "", originalTitle: "" }],
    });
    expect(computeSupplyChainScore(amazon)).toBeGreaterThan(computeSupplyChainScore(ebay));
  });

  it("averages across multiple platforms", () => {
    const product = makeProduct({
      platforms: [
        { platform: "amazon", price: 30, link: "", originalTitle: "" },
        { platform: "aliexpress", price: 10, link: "", originalTitle: "" },
      ],
    });
    const score = computeSupplyChainScore(product);
    expect(score).toBeGreaterThan(60);
    expect(score).toBeLessThan(95);
  });

  it("returns 0 for empty platforms", () => {
    const product = makeProduct({ platforms: [] });
    expect(computeSupplyChainScore(product)).toBe(0);
  });
});

// ── enrichProduct ─────────────────────────────────────────────────────────

describe("enrichProduct", () => {
  it("enriches all fields", () => {
    const product = makeProduct();
    const enriched = enrichProduct(product);
    expect(enriched.estimatedMargin).toBeDefined();
    expect(enriched.goldenScore).toBeDefined();
    expect(enriched.goldenRank).toBeDefined();
    expect(enriched.trendPhase).toBeDefined();
    expect(enriched.saturationLevel).toBeDefined();
    expect(enriched.competitionScore).toBeDefined();
    expect(enriched.reviewVelocity).toBeDefined();
    expect(enriched.priceStability).toBeDefined();
    expect(enriched.supplyChainScore).toBeDefined();
  });

  it("preserves original data", () => {
    const product = makeProduct({ title: "Test Product", bestPrice: 25 });
    const enriched = enrichProduct(product);
    expect(enriched.title).toBe("Test Product");
    expect(enriched.bestPrice).toBe(25);
    expect(enriched.id).toBe("test-product");
  });

  it("goldenRank matches goldenScore", () => {
    const product = makeProduct();
    const enriched = enrichProduct(product);
    if (enriched.goldenScore! >= 85) expect(enriched.goldenRank).toBe("S");
    else if (enriched.goldenScore! >= 70) expect(enriched.goldenRank).toBe("A");
    else if (enriched.goldenScore! >= 50) expect(enriched.goldenRank).toBe("B");
    else if (enriched.goldenScore! >= 30) expect(enriched.goldenRank).toBe("C");
    else expect(enriched.goldenRank).toBe("D");
  });

  it("handles products with missing data gracefully", () => {
    const product = makeProduct({
      rating: undefined,
      reviews: undefined,
      brand: undefined,
      bestPrice: null,
    });
    const enriched = enrichProduct(product);
    expect(enriched.goldenScore).toBeGreaterThanOrEqual(0);
    expect(enriched.trendPhase).toBeDefined();
  });
});

// ── enrichProducts ────────────────────────────────────────────────────────

describe("enrichProducts", () => {
  it("enriches all products in array", () => {
    const products = [makeProduct({ id: "1" }), makeProduct({ id: "2" })];
    const enriched = enrichProducts(products);
    expect(enriched).toHaveLength(2);
    expect(enriched[0].goldenScore).toBeDefined();
    expect(enriched[1].goldenScore).toBeDefined();
  });

  it("handles empty array", () => {
    expect(enrichProducts([])).toEqual([]);
  });

  it("preserves original data", () => {
    const products = [makeProduct({ id: "unique-123" })];
    const enriched = enrichProducts(products);
    expect(enriched[0].id).toBe("unique-123");
  });

  it("passes platformCosts through", () => {
    const product = makeProduct({ bestPrice: 50 });
    const costs = new Map([["cj", 10]]);
    const enriched = enrichProducts([product], costs);
    expect(enriched[0].estimatedMargin).toBe(80);
  });
});
