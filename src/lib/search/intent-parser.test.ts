import { describe, it, expect, vi } from "vitest";
import {
  parseIntentLocally,
  parseIntentWithAI,
  buildSearchKeywords,
  applyIntentToFilters,
  type ParsedIntent,
} from "./intent-parser";

// ── parseIntentLocally ─────────────────────────────────────────────────────

describe("parseIntentLocally", () => {
  it("extracts keywords from simple query", () => {
    const result = parseIntentLocally("wireless earbuds");
    expect(result.keywords).toContain("wireless");
    expect(result.keywords).toContain("earbuds");
  });

  it("extracts priceMax from 'under $20'", () => {
    const result = parseIntentLocally("wireless earbuds under $20");
    expect(result.priceMax).toBe(20);
  });

  it("extracts priceMax from 'below 50'", () => {
    const result = parseIntentLocally("phone case below 50");
    expect(result.priceMax).toBe(50);
  });

  it("extracts priceMin and priceMax from '$10 to $50'", () => {
    const result = parseIntentLocally("headphones $10 to $50");
    expect(result.priceMin).toBe(10);
    expect(result.priceMax).toBe(50);
  });

  it("detects 'cheap' as priceMax = 20", () => {
    const result = parseIntentLocally("cheap wireless earbuds");
    expect(result.priceMax).toBe(20);
  });

  it("detects 'expensive' as priceMin = 50", () => {
    const result = parseIntentLocally("expensive leather bag");
    expect(result.priceMin).toBe(50);
  });

  it("extracts minRating from '4+ stars'", () => {
    const result = parseIntentLocally("headphones 4+ stars");
    expect(result.minRating).toBe(4);
  });

  it("extracts minRating from 'highly rated'", () => {
    const result = parseIntentLocally("highly rated phone case");
    expect(result.minRating).toBe(4);
  });

  it("extracts platform from 'on amazon'", () => {
    const result = parseIntentLocally("wireless earbuds on amazon");
    expect(result.platforms).toContain("amazon");
  });

  it("extracts platform from 'on aliexpress'", () => {
    const result = parseIntentLocally("phone accessories on aliexpress");
    expect(result.platforms).toContain("aliexpress");
  });

  it("extracts platform from 'from CJ'", () => {
    const result = parseIntentLocally("pet supplies from CJ");
    expect(result.platforms).toContain("cj");
  });

  it("detects 'trending' flag", () => {
    const result = parseIntentLocally("trending wireless earbuds");
    expect(result.trending).toBe(true);
    expect(result.sortBy).toBe("trending");
  });

  it("detects 'free shipping' flag", () => {
    const result = parseIntentLocally("phone case free shipping");
    expect(result.freeShipping).toBe(true);
  });

  it("detects 'high margin' flag", () => {
    const result = parseIntentLocally("high margin electronics");
    expect(result.sortBy).toBe("margin");
  });

  it("extracts category from 'pet products'", () => {
    const result = parseIntentLocally("pet products");
    expect(result.categories).toContain("pet");
  });

  it("extracts category from 'kitchen gadgets'", () => {
    const result = parseIntentLocally("kitchen gadgets");
    expect(result.categories).toContain("home");
  });

  it("extracts category from 'fitness equipment'", () => {
    const result = parseIntentLocally("fitness equipment");
    expect(result.categories).toContain("fitness");
  });

  it("extracts brand from capitalized word", () => {
    const result = parseIntentLocally("Nike shoes");
    expect(result.brand).toBe("Nike");
  });

  it("extracts sortBy from 'cheapest'", () => {
    const result = parseIntentLocally("wireless earbuds cheapest");
    expect(result.sortBy).toBe("price");
  });

  it("extracts sortBy from 'best rated'", () => {
    const result = parseIntentLocally("wireless earbuds best rated");
    expect(result.sortBy).toBe("rating");
  });

  it("extracts sortBy from 'most reviewed'", () => {
    const result = parseIntentLocally("wireless earbuds most reviewed");
    expect(result.sortBy).toBe("reviews");
  });

  it("extracts review count from '100+ reviews'", () => {
    const result = parseIntentLocally("wireless earbuds 100+ reviews");
    expect(result.minReviews).toBe(100);
  });

  it("handles empty query", () => {
    const result = parseIntentLocally("");
    expect(result.keywords).toEqual([]);
    expect(result.confidence).toBe(0);
  });

  it("handles query with only filler words", () => {
    const result = parseIntentLocally("find me some best top good");
    expect(result.keywords).toEqual([]);
  });

  it("handles complex multi-filter query", () => {
    const result = parseIntentLocally(
      "cheap trending pet products under $20 on amazon 4+ stars"
    );
    expect(result.priceMax).toBe(20);
    expect(result.trending).toBe(true);
    expect(result.categories).toContain("pet");
    expect(result.platforms).toContain("amazon");
    expect(result.minRating).toBe(4);
  });

  it("returns confidence > 0.5 for parseable queries", () => {
    const result = parseIntentLocally("wireless earbuds under $30 on amazon");
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it("returns confidence < 0.5 for unparseable queries", () => {
    const result = parseIntentLocally("asdfghjkl");
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });

  it("preserves original query", () => {
    const result = parseIntentLocally("cheap wireless earbuds on amazon");
    expect(result.originalQuery).toBe("cheap wireless earbuds on amazon");
  });
});

// ── parseIntentWithAI ──────────────────────────────────────────────────────

describe("parseIntentWithAI", () => {
  it("returns parsed intent on successful API call", async () => {
    const mockAi = vi.fn().mockResolvedValue(
      JSON.stringify({
        keywords: ["wireless", "earbuds", "bluetooth"],
        priceMax: 25,
        platforms: ["amazon"],
        trending: true,
      })
    );
    const result = await parseIntentWithAI("cheap trending wireless earbuds", mockAi);
    expect(result.priceMax).toBe(25);
    expect(result.platforms).toContain("amazon");
    expect(result.trending).toBe(true);
    expect(result.confidence).toBe(0.9);
    expect(mockAi).toHaveBeenCalledOnce();
  });

  it("falls back to local parser on API failure", async () => {
    const mockAi = vi.fn().mockRejectedValue(new Error("API error"));
    const result = await parseIntentWithAI("wireless earbuds under $20", mockAi);
    expect(result.priceMax).toBe(20);
    expect(result.confidence).toBeLessThan(0.9);
  });

  it("handles malformed API response", async () => {
    const mockAi = vi.fn().mockResolvedValue("not valid json");
    const result = await parseIntentWithAI("wireless earbuds", mockAi);
    expect(result.keywords).toBeDefined();
  });

  it("handles timeout", async () => {
    const mockAi = vi.fn().mockImplementation(() => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 10)));
    const result = await parseIntentWithAI("wireless earbuds", mockAi);
    expect(result.keywords).toBeDefined();
  });

  it("returns local parse for very short queries", async () => {
    const mockAi = vi.fn();
    const result = await parseIntentWithAI("ab", mockAi);
    expect(mockAi).not.toHaveBeenCalled();
    expect(result.confidence).toBeLessThanOrEqual(0.5);
  });

  it("returns local parse for empty query", async () => {
    const mockAi = vi.fn();
    const result = await parseIntentWithAI("", mockAi);
    expect(mockAi).not.toHaveBeenCalled();
  });
});

// ── buildSearchKeywords ────────────────────────────────────────────────────

describe("buildSearchKeywords", () => {
  it("removes price-related words from keywords", () => {
    const intent: ParsedIntent = {
      keywords: ["cheap", "wireless", "earbuds", "under"],
      priceMax: 20,
      originalQuery: "cheap wireless earbuds under $20",
      confidence: 0.8,
    };
    const keywords = buildSearchKeywords(intent);
    expect(keywords).not.toContain("cheap");
    expect(keywords).not.toContain("under");
    expect(keywords).toContain("wireless");
    expect(keywords).toContain("earbuds");
  });

  it("removes platform names from keywords", () => {
    const intent: ParsedIntent = {
      keywords: ["wireless", "earbuds"],
      platforms: ["amazon"],
      originalQuery: "wireless earbuds on amazon",
      confidence: 0.8,
    };
    const keywords = buildSearchKeywords(intent);
    expect(keywords).not.toContain("amazon");
  });

  it("removes filler words", () => {
    const intent: ParsedIntent = {
      keywords: ["best", "top", "wireless", "earbuds"],
      originalQuery: "best top wireless earbuds",
      confidence: 0.8,
    };
    const keywords = buildSearchKeywords(intent);
    expect(keywords).not.toContain("best");
    expect(keywords).not.toContain("top");
  });

  it("preserves brand names", () => {
    const intent: ParsedIntent = {
      keywords: ["shoes"],
      brand: "Nike",
      originalQuery: "Nike shoes",
      confidence: 0.8,
    };
    const keywords = buildSearchKeywords(intent);
    expect(keywords[0]).toBe("Nike");
  });

  it("preserves product type words", () => {
    const intent: ParsedIntent = {
      keywords: ["bluetooth", "speaker", "portable"],
      originalQuery: "bluetooth speaker portable",
      confidence: 0.8,
    };
    const keywords = buildSearchKeywords(intent);
    expect(keywords).toContain("bluetooth");
    expect(keywords).toContain("speaker");
    expect(keywords).toContain("portable");
  });

  it("handles empty intent", () => {
    const intent: ParsedIntent = {
      keywords: [],
      originalQuery: "",
      confidence: 0,
    };
    const keywords = buildSearchKeywords(intent);
    expect(keywords).toEqual([""]);
  });

  it("adds categories when not already in keywords", () => {
    const intent: ParsedIntent = {
      keywords: ["wireless"],
      categories: ["electronics"],
      originalQuery: "wireless electronics",
      confidence: 0.8,
    };
    const keywords = buildSearchKeywords(intent);
    expect(keywords).toContain("electronics");
  });
});

// ── applyIntentToFilters ──────────────────────────────────────────────────

describe("applyIntentToFilters", () => {
  it("maps priceMax to filters", () => {
    const intent: ParsedIntent = {
      keywords: [],
      priceMax: 25,
      originalQuery: "under $25",
      confidence: 0.8,
    };
    const filters = applyIntentToFilters(intent);
    expect(filters.priceMax).toBe("25");
  });

  it("maps priceMin to filters", () => {
    const intent: ParsedIntent = {
      keywords: [],
      priceMin: 10,
      originalQuery: "over $10",
      confidence: 0.8,
    };
    const filters = applyIntentToFilters(intent);
    expect(filters.priceMin).toBe("10");
  });

  it("maps minRating to filters", () => {
    const intent: ParsedIntent = {
      keywords: [],
      minRating: 4,
      originalQuery: "4+ stars",
      confidence: 0.8,
    };
    const filters = applyIntentToFilters(intent);
    expect(filters.minRating).toBe(4);
  });

  it("maps platforms to platformFilter", () => {
    const intent: ParsedIntent = {
      keywords: [],
      platforms: ["amazon", "ebay"],
      originalQuery: "on amazon",
      confidence: 0.8,
    };
    const filters = applyIntentToFilters(intent);
    expect(filters.platformFilter).toContain("amazon");
    expect(filters.platformFilter).toContain("ebay");
  });

  it("maps sortBy correctly", () => {
    const intent: ParsedIntent = {
      keywords: [],
      trending: true,
      originalQuery: "trending",
      confidence: 0.8,
    };
    const filters = applyIntentToFilters(intent);
    expect(filters.trendingDirection).toContain("rising");
  });

  it("handles undefined fields (no override)", () => {
    const intent: ParsedIntent = {
      keywords: ["wireless"],
      originalQuery: "wireless",
      confidence: 0.5,
    };
    const filters = applyIntentToFilters(intent);
    expect(filters.priceMin).toBe("");
    expect(filters.priceMax).toBe("");
    expect(filters.minRating).toBe(0);
  });

  it("combines with existing filters", () => {
    const existing = {
      brands: ["Samsung"],
      priceMin: "10",
      priceMax: "",
      minRating: 3,
      minMargin: 0,
      competitionLevel: [] as ("low" | "medium" | "high")[],
      trendingDirection: [] as ("rising" | "stable" | "declining")[],
      platformFilter: ["walmart"],
    };
    const intent: ParsedIntent = {
      keywords: [],
      priceMax: 50,
      platforms: ["amazon"],
      brand: "Apple",
      originalQuery: "Apple on amazon under $50",
      confidence: 0.8,
    };
    const filters = applyIntentToFilters(intent, existing);
    expect(filters.brands).toContain("Samsung");
    expect(filters.brands).toContain("Apple");
    expect(filters.priceMin).toBe("10");
    expect(filters.priceMax).toBe("50");
    expect(filters.minRating).toBe(3);
    expect(filters.platformFilter).toContain("walmart");
    expect(filters.platformFilter).toContain("amazon");
  });

  it("creates default filter when no existing", () => {
    const intent: ParsedIntent = {
      keywords: ["test"],
      originalQuery: "test",
      confidence: 0.5,
    };
    const filters = applyIntentToFilters(intent);
    expect(filters.brands).toEqual([]);
    expect(filters.priceMin).toBe("");
    expect(filters.priceMax).toBe("");
  });
});
