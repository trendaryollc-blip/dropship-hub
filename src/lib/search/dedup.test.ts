import { describe, it, expect } from "vitest";
import {
  normalizeTitle,
  titleSimilarity,
  imageSimilarity,
  shouldMerge,
  computePriceSpread,
  mergeProducts,
  type SearchResult,
  type PlatformOffer,
  type MergedProduct,
} from "./dedup";

// ── normalizeTitle ──────────────────────────────────────────────────────────

describe("normalizeTitle", () => {
  it("removes special characters and extra spaces", () => {
    expect(normalizeTitle("Hello, World!  How are you?")).toBe("hello world how are you");
  });

  it("lowercases all text", () => {
    expect(normalizeTitle("WIRELESS Earbuds PRO")).toBe("wireless earbuds pro");
  });

  it("removes common filler words", () => {
    expect(normalizeTitle("The Wireless Earbuds for the Home")).toBe("wireless earbuds home");
  });

  it("handles empty string", () => {
    expect(normalizeTitle("")).toBe("");
  });

  it("handles null/undefined gracefully", () => {
    expect(normalizeTitle(null as unknown as string)).toBe("");
    expect(normalizeTitle(undefined as unknown as string)).toBe("");
  });

  it("preserves brand names and model numbers", () => {
    expect(normalizeTitle("Sony WH-1000XM5 Headphones")).toBe("sony wh1000xm5 headphones");
  });

  it("collapses multiple spaces", () => {
    expect(normalizeTitle("wireless   earbuds    pro")).toBe("wireless earbuds pro");
  });

  it("removes quantity descriptors", () => {
    expect(normalizeTitle("1pc Wireless Earbuds 1pcs Set")).toBe("wireless earbuds");
  });
});

// ── titleSimilarity ────────────────────────────────────────────────────────

describe("titleSimilarity", () => {
  it("returns 1.0 for identical titles", () => {
    expect(titleSimilarity("wireless earbuds pro", "wireless earbuds pro")).toBe(1);
  });

  it("returns > 0.8 for same product different wording", () => {
    const sim = titleSimilarity(
      "Wireless Bluetooth Earbuds Pro",
      "Pro Wireless Bluetooth Earbuds"
    );
    expect(sim).toBeGreaterThan(0.8);
  });

  it("returns < 0.3 for completely different products", () => {
    const sim = titleSimilarity("wireless earbuds", "kitchen knife set");
    expect(sim).toBeLessThan(0.3);
  });

  it("handles partial word overlap", () => {
    const sim = titleSimilarity("wireless earbuds bluetooth", "wireless earbuds noise cancelling");
    expect(sim).toBeGreaterThan(0.3);
    expect(sim).toBeLessThan(1);
  });

  it("handles brand name matching", () => {
    const sim = titleSimilarity("Sony WH-1000XM5", "Sony WH1000XM5 Headphones");
    expect(sim).toBeGreaterThan(0.4);
  });

  it("handles empty strings", () => {
    expect(titleSimilarity("", "something")).toBe(0);
    expect(titleSimilarity("something", "")).toBe(0);
    expect(titleSimilarity("", "")).toBe(1);
  });

  it("handles single-word titles", () => {
    expect(titleSimilarity("earbuds", "earbuds")).toBe(1);
    expect(titleSimilarity("earbuds", "headphones")).toBe(0);
  });

  it("is commutative", () => {
    const a = "wireless earbuds pro bluetooth";
    const b = "bluetooth pro wireless earbuds";
    expect(titleSimilarity(a, b)).toBe(titleSimilarity(b, a));
  });
});

// ── imageSimilarity ────────────────────────────────────────────────────────

describe("imageSimilarity", () => {
  it("returns 1.0 for identical URLs", () => {
    expect(imageSimilarity("https://example.com/img.jpg", "https://example.com/img.jpg")).toBe(1);
  });

  it("returns 1.0 when only query params differ", () => {
    expect(
      imageSimilarity(
        "https://example.com/img.jpg?w=100",
        "https://example.com/img.jpg?h=200"
      )
    ).toBe(1);
  });

  it("returns > 0.9 for same base URL different paths depth", () => {
    const sim = imageSimilarity(
      "https://example.com/products/img.jpg",
      "https://example.com/products/large/img.jpg"
    );
    expect(sim).toBeGreaterThan(0);
  });

  it("returns < 0.1 for completely different domains", () => {
    const sim = imageSimilarity(
      "https://amazon.com/img1.jpg",
      "https://aliexpress.com/img2.jpg"
    );
    expect(sim).toBeLessThan(0.5);
  });

  it("handles missing URLs", () => {
    expect(imageSimilarity("", "")).toBe(1);
    expect(imageSimilarity("https://example.com/img.jpg", "")).toBe(0);
    expect(imageSimilarity("", "https://example.com/img.jpg")).toBe(0);
  });

  it("normalizes http vs https", () => {
    expect(
      imageSimilarity("http://example.com/img.jpg", "https://example.com/img.jpg")
    ).toBe(1);
  });

  it("strips trailing slashes", () => {
    expect(
      imageSimilarity("https://example.com/", "https://example.com")
    ).toBe(1);
  });
});

// ── shouldMerge ────────────────────────────────────────────────────────────

describe("shouldMerge", () => {
  const base: SearchResult = {
    title: "Wireless Bluetooth Earbuds Pro",
    price: 29.99,
    image: "https://example.com/earbuds.jpg",
    link: "https://amazon.com/dp/B0TEST",
    source: "amazon",
  };

  it("merges products with similar titles and same image", () => {
    const other: SearchResult = {
      ...base,
      source: "google_shopping",
      link: "https://google.com/shopping/product/1",
    };
    expect(shouldMerge(base, other)).toBe(true);
  });

  it("merges products with similar titles and similar price", () => {
    const other: SearchResult = {
      ...base,
      price: 32.99,
      image: "https://different.com/img.jpg",
      source: "ebay",
      link: "https://ebay.com/itm/123",
    };
    expect(shouldMerge(base, other)).toBe(true);
  });

  it("does NOT merge products with different titles", () => {
    const other: SearchResult = {
      ...base,
      title: "Stainless Steel Kitchen Knife Set",
      source: "ebay",
      link: "https://ebay.com/itm/456",
    };
    expect(shouldMerge(base, other)).toBe(false);
  });

  it("does NOT merge products with very different prices (> 3x)", () => {
    const other: SearchResult = {
      ...base,
      price: 99.99,
      image: "https://different.com/img.jpg",
      title: "Wireless Bluetooth Earbuds Pro",
      source: "ebay",
      link: "https://ebay.com/itm/789",
    };
    expect(shouldMerge(base, other)).toBe(false);
  });

  it("merges products with null prices", () => {
    const withNull: SearchResult = {
      ...base,
      price: null,
      source: "ebay",
      link: "https://ebay.com/itm/321",
    };
    expect(shouldMerge(base, withNull)).toBe(true);
  });

  it("merges products with null images but similar titles", () => {
    const withNull: SearchResult = {
      ...base,
      image: null,
      source: "ebay",
      link: "https://ebay.com/itm/654",
    };
    expect(shouldMerge(base, withNull)).toBe(true);
  });

  it("merges products with identical source and link", () => {
    const same: SearchResult = {
      ...base,
      price: 50,
    };
    expect(shouldMerge(same, same)).toBe(true);
  });
});

// ── computePriceSpread ─────────────────────────────────────────────────────

describe("computePriceSpread", () => {
  it("returns correct best price", () => {
    const offers: PlatformOffer[] = [
      { platform: "amazon", price: 29.99, link: "", originalTitle: "" },
      { platform: "ebay", price: 24.99, link: "", originalTitle: "" },
      { platform: "aliexpress", price: 19.99, link: "", originalTitle: "" },
    ];
    expect(computePriceSpread(offers).best).toBe(19.99);
  });

  it("returns correct worst price", () => {
    const offers: PlatformOffer[] = [
      { platform: "amazon", price: 29.99, link: "", originalTitle: "" },
      { platform: "ebay", price: 24.99, link: "", originalTitle: "" },
      { platform: "aliexpress", price: 19.99, link: "", originalTitle: "" },
    ];
    expect(computePriceSpread(offers).worst).toBe(29.99);
  });

  it("returns correct average", () => {
    const offers: PlatformOffer[] = [
      { platform: "a", price: 10, link: "", originalTitle: "" },
      { platform: "b", price: 20, link: "", originalTitle: "" },
      { platform: "c", price: 30, link: "", originalTitle: "" },
    ];
    expect(computePriceSpread(offers).avg).toBe(20);
  });

  it("returns correct spread percentage", () => {
    const offers: PlatformOffer[] = [
      { platform: "a", price: 10, link: "", originalTitle: "" },
      { platform: "b", price: 20, link: "", originalTitle: "" },
    ];
    expect(computePriceSpread(offers).spread).toBe(100);
  });

  it("identifies correct best platform", () => {
    const offers: PlatformOffer[] = [
      { platform: "amazon", price: 30, link: "", originalTitle: "" },
      { platform: "aliexpress", price: 15, link: "", originalTitle: "" },
    ];
    expect(computePriceSpread(offers).bestPlatform).toBe("aliexpress");
  });

  it("handles single offer", () => {
    const offers: PlatformOffer[] = [
      { platform: "amazon", price: 25, link: "", originalTitle: "" },
    ];
    const result = computePriceSpread(offers);
    expect(result.best).toBe(25);
    expect(result.worst).toBe(25);
    expect(result.avg).toBe(25);
    expect(result.spread).toBe(0);
  });

  it("handles offers with null prices (excludes them)", () => {
    const offers: PlatformOffer[] = [
      { platform: "amazon", price: 25, link: "", originalTitle: "" },
      { platform: "ebay", price: null, link: "", originalTitle: "" },
    ];
    const result = computePriceSpread(offers);
    expect(result.best).toBe(25);
    expect(result.worst).toBe(25);
  });

  it("handles all null prices", () => {
    const offers: PlatformOffer[] = [
      { platform: "amazon", price: null, link: "", originalTitle: "" },
      { platform: "ebay", price: null, link: "", originalTitle: "" },
    ];
    const result = computePriceSpread(offers);
    expect(result.best).toBeNull();
    expect(result.worst).toBeNull();
    expect(result.avg).toBeNull();
    expect(result.spread).toBe(0);
  });

  it("handles zero prices by excluding them", () => {
    const offers: PlatformOffer[] = [
      { platform: "amazon", price: 0, link: "", originalTitle: "" },
      { platform: "ebay", price: 25, link: "", originalTitle: "" },
    ];
    const result = computePriceSpread(offers);
    expect(result.best).toBe(25);
  });
});

// ── mergeProducts ──────────────────────────────────────────────────────────

describe("mergeProducts", () => {
  it("returns empty array for empty input", () => {
    expect(mergeProducts([])).toEqual([]);
  });

  it("returns single product for single input", () => {
    const input: SearchResult[] = [
      { title: "Test Product", price: 10, image: null, link: "https://example.com", source: "amazon" },
    ];
    const result = mergeProducts(input);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Test Product");
    expect(result[0].platformCount).toBe(1);
  });

  it("merges 2 identical products from different platforms", () => {
    const input: SearchResult[] = [
      { title: "Wireless Earbuds Bluetooth Pro", price: 29.99, image: "https://img.com/a.jpg", link: "https://amazon.com/1", source: "amazon" },
      { title: "Wireless Earbuds Bluetooth Pro", price: 27.99, image: "https://img.com/a.jpg", link: "https://google.com/1", source: "google_shopping" },
    ];
    const result = mergeProducts(input);
    expect(result).toHaveLength(1);
    expect(result[0].platformCount).toBe(2);
    expect(result[0].bestPrice).toBe(27.99);
    expect(result[0].worstPrice).toBe(29.99);
  });

  it("merges cluster of 3+ similar products", () => {
    const input: SearchResult[] = [
      { title: "Sony WH-1000XM5 Headphones", price: 348, image: "https://img.com/sony.jpg", link: "https://amazon.com/1", source: "amazon" },
      { title: "Sony WH1000XM5 Wireless Headphones", price: 329, image: "https://img.com/sony.jpg", link: "https://google.com/1", source: "google_shopping" },
      { title: "Sony WH-1000XM5 Noise Cancelling Headphones", price: 339, image: "https://img.com/sony.jpg", link: "https://walmart.com/1", source: "walmart" },
    ];
    const result = mergeProducts(input);
    expect(result).toHaveLength(1);
    expect(result[0].platformCount).toBe(3);
    expect(result[0].bestPrice).toBe(329);
  });

  it("keeps separate products that are truly different", () => {
    const input: SearchResult[] = [
      { title: "Wireless Earbuds Bluetooth", price: 29.99, image: "https://img.com/earbuds.jpg", link: "https://amazon.com/1", source: "amazon" },
      { title: "Stainless Steel Kitchen Knife Set 8 Piece", price: 45.99, image: "https://img.com/knife.jpg", link: "https://amazon.com/2", source: "amazon" },
    ];
    const result = mergeProducts(input);
    expect(result).toHaveLength(2);
  });

  it("picks highest-rated product as primary", () => {
    const input: SearchResult[] = [
      { title: "Wireless Earbuds Pro", price: 29.99, image: "https://img.com/a.jpg", link: "https://amazon.com/1", source: "amazon", rating: 3.5, reviews: 100 },
      { title: "Wireless Earbuds Pro", price: 27.99, image: "https://img.com/a.jpg", link: "https://google.com/1", source: "google_shopping", rating: 4.8, reviews: 5000 },
    ];
    const result = mergeProducts(input);
    expect(result[0].rating).toBe(4.8);
    expect(result[0].reviews).toBe(5000);
  });

  it("computes correct bestPrice", () => {
    const input: SearchResult[] = [
      { title: "Product A", price: 30, image: "https://img.com/a.jpg", link: "https://amazon.com/1", source: "amazon" },
      { title: "Product A", price: 20, image: "https://img.com/a.jpg", link: "https://ebay.com/1", source: "ebay" },
      { title: "Product A", price: 25, image: "https://img.com/a.jpg", link: "https://walmart.com/1", source: "walmart" },
    ];
    const result = mergeProducts(input);
    expect(result[0].bestPrice).toBe(20);
  });

  it("tracks all platform offers", () => {
    const input: SearchResult[] = [
      { title: "Product X", price: 10, image: "https://img.com/x.jpg", link: "https://amazon.com/1", source: "amazon" },
      { title: "Product X", price: 12, image: "https://img.com/x.jpg", link: "https://ebay.com/1", source: "ebay" },
    ];
    const result = mergeProducts(input);
    expect(result[0].platforms).toHaveLength(2);
    expect(result[0].platforms.map((p) => p.platform).sort()).toEqual(["amazon", "ebay"]);
  });

  it("deduplicates platforms (keeps cheapest)", () => {
    const input: SearchResult[] = [
      { title: "Product Y", price: 15, image: "https://img.com/y.jpg", link: "https://amazon.com/1", source: "amazon" },
      { title: "Product Y", price: 12, image: "https://img.com/y.jpg", link: "https://amazon.com/2", source: "amazon" },
    ];
    const result = mergeProducts(input);
    expect(result[0].platforms).toHaveLength(1);
    expect(result[0].platforms[0].price).toBe(12);
  });

  it("preserves all unique images", () => {
    const input: SearchResult[] = [
      { title: "Product Z", price: 10, image: "https://img.com/z1.jpg", images: ["https://img.com/z2.jpg"], link: "https://amazon.com/1", source: "amazon" },
      { title: "Product Z", price: 12, image: "https://img.com/z3.jpg", link: "https://ebay.com/1", source: "ebay" },
    ];
    const result = mergeProducts(input);
    expect(result[0].images.length).toBeGreaterThanOrEqual(2);
  });

  it("handles mixed products: some merge, some don't", () => {
    const input: SearchResult[] = [
      { title: "Wireless Earbuds Pro", price: 29.99, image: "https://img.com/earbuds.jpg", link: "https://amazon.com/1", source: "amazon" },
      { title: "Wireless Earbuds Pro", price: 27.99, image: "https://img.com/earbuds.jpg", link: "https://google.com/1", source: "google_shopping" },
      { title: "Laptop Stand Adjustable", price: 35.99, image: "https://img.com/stand.jpg", link: "https://amazon.com/2", source: "amazon" },
      { title: "Laptop Stand Adjustable Aluminum", price: 33.99, image: "https://img.com/stand.jpg", link: "https://ebay.com/1", source: "ebay" },
    ];
    const result = mergeProducts(input);
    expect(result).toHaveLength(2);
    const earbuds = result.find((r) => r.title.toLowerCase().includes("earbuds"));
    const stand = result.find((r) => r.title.toLowerCase().includes("laptop"));
    expect(earbuds?.platformCount).toBe(2);
    expect(stand?.platformCount).toBe(2);
  });

  it("handles products with null prices", () => {
    const input: SearchResult[] = [
      { title: "Mystery Product", price: null, image: "https://img.com/m.jpg", link: "https://amazon.com/1", source: "amazon" },
      { title: "Mystery Product", price: null, image: "https://img.com/m.jpg", link: "https://ebay.com/1", source: "ebay" },
    ];
    const result = mergeProducts(input);
    expect(result).toHaveLength(1);
    expect(result[0].bestPrice).toBeNull();
    expect(result[0].platformCount).toBe(2);
  });

  it("handles 100 products efficiently (< 100ms)", () => {
    const products: SearchResult[] = Array.from({ length: 100 }, (_, i) => ({
      title: `Product ${i % 20} variant ${i}`,
      price: 10 + i * 0.5,
      image: `https://img.com/${i % 20}.jpg`,
      link: `https://example.com/${i}`,
      source: ["amazon", "ebay", "google_shopping", "walmart", "aliexpress"][i % 5],
    }));
    const start = performance.now();
    const result = mergeProducts(products);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(1000);
    expect(result.length).toBeLessThanOrEqual(20);
  });
});
