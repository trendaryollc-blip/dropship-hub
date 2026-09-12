import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  searchAllPlatforms,
  searchAllPlatformsFromFirestore,
  searchAmazon,
  searchGoogleShopping,
  searchCJProducts,
  searchKeepaProducts,
  searchAliExpress,
  searchViaScraper,
  platforms,
  type SearchResult,
} from "./platform-search";

vi.mock("./platform-config", () => ({
  getAllPlatforms: vi.fn(),
  incrementKeyUsage: vi.fn(),
  markKeyError: vi.fn(),
  markKeyHealthy: vi.fn(),
  setPlatformCooldown: vi.fn(),
  resetBillingPeriodIfNeeded: vi.fn(),
}));

vi.mock("./cj-auth", () => ({
  getCJAccessToken: vi.fn().mockResolvedValue("cj-token"),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { getAllPlatforms, incrementKeyUsage, markKeyHealthy, resetBillingPeriodIfNeeded } from "./platform-config";

function mockFetchResponse(ok: boolean, body: unknown, status = 200) {
  if (ok) {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
      })
    );
  } else {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
      })
    );
  }
}

describe("platform-search individual search functions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAINFOREST_API_KEY = "test-rainforest-key";
    process.env.SERP_API_KEY = "test-serp-key";
    process.env.CJ_API_KEY = "test-cj-key";
    process.env.KEEPA_API_KEY = "test-keepa-key";
    process.env.SCRAPER_API_KEY = "test-scraper-key";
  });

  describe("searchAmazon", () => {
    it("returns mapped Amazon results", async () => {
      mockFetchResponse(true, {
        search_results: [
          {
            title: "Wireless Headphones",
            price: 29.99,
            image: "https://images-amazon.com/img.jpg",
            images: ["https://images-amazon.com/img2.jpg"],
            link: "https://amazon.com/dp/B001",
            asin: "B001",
            brand: "SoundMax",
            rating: 4.5,
            total_ratings: 1200,
          },
        ],
      });

      const result = await searchAmazon("headphones");
      expect(result.search_results).toHaveLength(1);
      expect(result.search_results[0].title).toBe("Wireless Headphones");
      expect(result.search_results[0].price).toBe(29.99);
      expect(result.search_results[0].source).toBe("amazon");
      expect(result.search_results[0].images).toContain("https://images-amazon.com/img2.jpg");
    });

    it("handles Amazon API errors", async () => {
      mockFetchResponse(false, { message: "Invalid key" }, 401);

      await expect(searchAmazon("test")).rejects.toThrow("Rainforest API 401");
    });

    it("maps items without images correctly", async () => {
      mockFetchResponse(true, {
        search_results: [
          { title: "Basic Item", price: 9.99, image: "", link: "https://amazon.com/dp/B002", asin: "B002" },
        ],
      });

      const result = await searchAmazon("basic");
      expect(result.search_results[0].image).toBeNull();
    });

    it("handles items with object images", async () => {
      mockFetchResponse(true, {
        search_results: [
          {
            title: "Multi Image",
            price: 15,
            image: "https://img.jpg",
            images: [{ link: "https://img2.jpg" }, { large: "https://img3.jpg" }, 99],
            link: "https://amazon.com/dp/B003",
            asin: "B003",
          },
        ],
      });

      const result = await searchAmazon("multi");
      expect(result.search_results[0].images).toBeDefined();
      expect(result.search_results[0].images!.length).toBeGreaterThan(1);
    });
  });

  describe("searchGoogleShopping", () => {
    it("returns mapped Google Shopping results", async () => {
      mockFetchResponse(true, {
        shopping_results: [
          {
            title: "Gaming Mouse",
            extracted_price: 45.99,
            thumbnail: "https://serpimg.com/thumb.jpg",
            link: "https://store.com/mouse",
            rating: 4.2,
            reviews: 500,
          },
        ],
      });

      const result = await searchGoogleShopping("gaming mouse");
      expect(result.search_results).toHaveLength(1);
      expect(result.search_results[0].title).toBe("Gaming Mouse");
      expect(result.search_results[0].price).toBe(45.99);
      expect(result.search_results[0].source).toBe("google_shopping");
    });

    it("handles SerpAPI errors", async () => {
      mockFetchResponse(false, {}, 429);
      await expect(searchGoogleShopping("test")).rejects.toThrow("SerpAPI 429");
    });

    it("uses price fallback when extracted_price is missing", async () => {
      mockFetchResponse(true, {
        shopping_results: [
          { title: "Item", price: 19.99, thumbnail: "https://img.jpg", link: "https://store.com" },
        ],
      });

      const result = await searchGoogleShopping("item");
      expect(result.search_results[0].price).toBe(19.99);
    });

    it("handles object image arrays", async () => {
      mockFetchResponse(true, {
        shopping_results: [
          {
            title: "Obj Img",
            price: 9.99,
            thumbnail: "https://serpimg.com/thumb.jpg",
            link: "https://store.com/obj",
            images: ["https://serpimg.com/a.jpg", { original: "https://serpimg.com/orig.jpg" }, 42],
          },
        ],
      });

      const result = await searchGoogleShopping("obj img");
      const images = result.search_results[0].images ?? [];
      expect(images).toContain("https://serpimg.com/thumb.jpg");
      expect(images).toContain("https://serpimg.com/orig.jpg");
    });
  });

  describe("searchKeepaProducts", () => {
    it("returns mapped Keepa results", async () => {
      mockFetchResponse(true, {
        products: [
          {
            title: "Keepa Product",
            stats: { current: [1599] },
            image: "https://keepa.com/img.jpg",
            asin: "B004",
            brand: "TestBrand",
            rating: 4.0,
            reviewCount: 200,
          },
        ],
      });

      const result = await searchKeepaProducts("keepa test");
      expect(result.search_results).toHaveLength(1);
      expect(result.search_results[0].price).toBe(15.99);
      expect(result.search_results[0].source).toBe("keepa");
    });

    it("handles Keepa API errors", async () => {
      mockFetchResponse(false, {}, 500);
      await expect(searchKeepaProducts("test")).rejects.toThrow("Keepa API 500");
    });

    it("returns null price when stats.current is missing", async () => {
      mockFetchResponse(true, {
        products: [{ title: "No Price", image: "img.jpg", asin: "B005" }],
      });

      const result = await searchKeepaProducts("no price");
      expect(result.search_results[0].price).toBeNull();
    });
  });

  describe("searchViaScraper", () => {
    it("returns results from ScraperAPI HTML", async () => {
      const html = `
        <html>
          <a href="/ip/product-123">Link</a>
          <span class="product-title">Test Product</span>
          <span class="product-title"><h3>Walmart Widget</h3></span>
          <span class="price">$19.99</span>
          <img src="https://walmart.com/img.jpg" />
        </html>
      `;
      mockFetchResponse(true, html);

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(html),
        })
      );

      const result = await searchViaScraper("walmart", "widget");
      expect(result.search_results).toBeDefined();
    });

    it("throws for unsupported platform", async () => {
      await expect(searchViaScraper("unsupported_platform", "test")).rejects.toThrow("No scraper config");
    });
  });

  describe("searchAliExpress", () => {
    it("parses JSON-LD structured data", async () => {
      const html = `
        <html>
          <script type="application/ld+json">
          {"@type":"Product","name":"Ali Widget","offers":{"price":12.99},"image":"https://ae01.alicdn.com/img.jpg","url":"https://aliexpress.com/item/123.html"}
          </script>
        </html>
      `;

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(html),
        })
      );

      const result = await searchAliExpress("ali widget");
      expect(result.search_results).toHaveLength(1);
      expect(result.search_results[0].source).toBe("aliexpress");
    });

    it("parses JSON-LD with numeric, string, and lowPrice offers", async () => {
      const html = `
        <html>
          <script type="application/ld+json">
          {"@type":"ItemList","itemListElement":[
            {"item":{"@type":"Product","name":"P1","offers":{"price":11.99},"image":"i1","url":"https://aliexpress.com/item/1.html"}},
            {"item":{"@type":"Product","name":"P2","offers":{"price":"12.99"},"image":"i2","url":"https://aliexpress.com/item/2.html"}},
            {"item":{"@type":"Product","name":"P3","offers":{"lowPrice":13.99},"image":"i3","url":"https://aliexpress.com/item/3.html"}},
            {"item":{"@type":"Product","name":"P4","offers":{},"image":"i4","url":"https://aliexpress.com/item/4.html"}}
          ]}
          </script>
        </html>
      `;

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(html),
        })
      );

      const result = await searchAliExpress("items");
      expect(result.search_results).toHaveLength(3);
      expect(result.search_results.map((r) => r.price)).toEqual([11.99, 12.99, 13.99]);
    });

    it("falls back to regex extraction", async () => {
      const html = `
        <html>
          <a href="/item/12345.html">Product</a>
          <div class="title">AliExpress Product Title</div>
          <span>$25.99</span>
          <img src="https://ae01.alicdn.com/product.jpg" />
        </html>
      `;

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve(html),
        })
      );

      const result = await searchAliExpress("product");
      expect(result.search_results).toBeDefined();
    });

    it("throws when no results found", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          text: () => Promise.resolve("<html><body>empty</body></html>"),
        })
      );

      await expect(searchAliExpress("xyznonexistent")).rejects.toThrow("No results scraped");
    });

    it("handles ScraperAPI errors", async () => {
      mockFetchResponse(false, {}, 503);
      await expect(searchAliExpress("test")).rejects.toThrow("ScraperAPI 503");
    });
  });
});

describe("searchAllPlatformsFromFirestore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty when no platforms configured", async () => {
    vi.mocked(getAllPlatforms).mockResolvedValue([]);
    const result = await searchAllPlatformsFromFirestore("test");
    expect(result).toEqual([]);
  });

  it("returns empty when getAllPlatforms fails", async () => {
    vi.mocked(getAllPlatforms).mockRejectedValue(new Error("Firestore error"));
    const result = await searchAllPlatformsFromFirestore("test");
    expect(result).toEqual([]);
  });

  it("filters to enabled platforms only", async () => {
    vi.mocked(getAllPlatforms).mockResolvedValue([
      { id: "enabled1", name: "Enabled", enabled: true, method: "serpapi", keys: [{ id: "k1", key: "test", label: "Primary", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }], lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null },
      { id: "disabled1", name: "Disabled", enabled: false, method: "serpapi", keys: [], lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null },
    ] as never);

    mockFetchResponse(true, { shopping_results: [{ title: "Result", price: 10, thumbnail: "img.jpg", link: "http://test.com" }] });

    const result = await searchAllPlatformsFromFirestore("test");
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe("enabled1");
  });

  it("skips platforms in cooldown", async () => {
    vi.mocked(getAllPlatforms).mockResolvedValue([
      {
        id: "cooled", name: "Cooled", enabled: true, method: "serpapi", keys: [],
        lastHealth: "error", lastSearched: null, lastError: null,
        cooldownUntil: { seconds: Math.floor(Date.now() / 1000) + 300 },
        createdAt: null, updatedAt: null,
      },
    ] as never);

    const result = await searchAllPlatformsFromFirestore("test");
    expect(result).toEqual([]);
  });

  it("searches with specific platform IDs when selectedIds provided", async () => {
    vi.mocked(getAllPlatforms).mockResolvedValue([
      { id: "amazon", name: "Amazon", enabled: true, method: "rainforest", keys: [{ id: "k1", key: "test", label: "Primary", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }], lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null },
      { id: "keepa", name: "Keepa", enabled: true, method: "keepa", keys: [{ id: "k2", key: "test", label: "Primary", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }], lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null },
    ] as never);

    mockFetchResponse(true, {
      search_results: [{ title: "Test", price: 10, image: "img.jpg", link: "http://test.com" }],
    });

    const result = await searchAllPlatformsFromFirestore("test", ["amazon"]);
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe("amazon");
  });

  it("marks key healthy on successful search", async () => {
    vi.mocked(getAllPlatforms).mockResolvedValue([
      { id: "serpapi_platform", name: "SerpAPI", enabled: true, method: "serpapi", keys: [{ id: "k1", key: "test", label: "Primary", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }], lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null },
    ] as never);

    mockFetchResponse(true, {
      shopping_results: [{ title: "Product", price: 20, thumbnail: "img.jpg", link: "http://test.com" }],
    });

    await searchAllPlatformsFromFirestore("product");
    expect(markKeyHealthy).toHaveBeenCalled();
  });

  it("skips rate-limited keys and tries next", async () => {
    vi.mocked(getAllPlatforms).mockResolvedValue([
      {
        id: "test_platform", name: "Test", enabled: true, method: "serpapi",
        keys: [
          { id: "k1", key: "limited", label: "Limited", priority: 1, requestsUsed: 100, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" },
          { id: "k2", key: "available", label: "Available", priority: 2, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" },
        ],
        lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null,
      },
    ] as never);

    mockFetchResponse(true, {
      shopping_results: [{ title: "Result", price: 10, thumbnail: "img.jpg", link: "http://test.com" }],
    });

    const result = await searchAllPlatformsFromFirestore("test");
    expect(result).toHaveLength(1);
  });

  it("auto-resets billing period when resetDate is in the past", async () => {
    const pastDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    vi.mocked(getAllPlatforms).mockResolvedValue([
      {
        id: "scraper_api", name: "ScraperAPI", enabled: true, method: "scraperapi",
        keys: [
          { id: "k1", key: "expired_key", label: "Expired", priority: 1, requestsUsed: 5000, requestsLimit: 5000, resetDate: pastDate, lastError: null, lastTested: null, lastStatus: "untested" },
        ],
        lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null,
      },
    ] as never);

    vi.mocked(resetBillingPeriodIfNeeded).mockResolvedValue(true);

    mockFetchResponse(true, {
      search_results: [{ title: "Reset Result", price: 10, image: "img.jpg", link: "http://test.com" }],
    });

    const result = await searchAllPlatformsFromFirestore("test");
    expect(resetBillingPeriodIfNeeded).toHaveBeenCalledWith("scraper_api", "k1", pastDate);
    expect(result).toHaveLength(1);
  });

  it("skips auto-reset when resetDate is in the future", async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    vi.mocked(getAllPlatforms).mockResolvedValue([
      {
        id: "test_platform", name: "Test", enabled: true, method: "serpapi",
        keys: [
          { id: "k1", key: "active_key", label: "Active", priority: 1, requestsUsed: 50, requestsLimit: 100, resetDate: futureDate, lastError: null, lastTested: null, lastStatus: "untested" },
        ],
        lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null,
      },
    ] as never);

    mockFetchResponse(true, {
      search_results: [{ title: "Active Result", price: 20, image: "img.jpg", link: "http://test.com" }],
    });

    const result = await searchAllPlatformsFromFirestore("test");
    expect(resetBillingPeriodIfNeeded).not.toHaveBeenCalled();
    expect(result).toHaveLength(1);
  });
});

describe("searchAllPlatforms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("falls back to env-based search when Firestore fails", async () => {
    vi.mocked(getAllPlatforms).mockRejectedValue(new Error("Firestore down"));

    mockFetchResponse(true, {
      search_results: [{ title: "Fallback", price: 10, image: "img.jpg", link: "http://test.com" }],
    });

    const result = await searchAllPlatforms("test");
    expect(result).toBeDefined();
  });

  it("returns results from env-based search for selected platforms", async () => {
    vi.mocked(getAllPlatforms).mockRejectedValue(new Error("no firestore"));

    mockFetchResponse(true, {
      search_results: [{ title: "Env Result", price: 15, image: "img.jpg", link: "http://test.com" }],
    });

    const result = await searchAllPlatforms("test", ["amazon"]);
    expect(result).toBeDefined();
  });

  it("returns error results for platforms that fail", async () => {
    vi.mocked(getAllPlatforms).mockRejectedValue(new Error("no firestore"));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );

    const result = await searchAllPlatforms("test", ["amazon"]);
    expect(result).toHaveLength(1);
    expect(result[0].error).toContain("Network error");
  });
});

describe("platforms config", () => {
  it("exports all platform configurations", () => {
    expect(platforms.length).toBeGreaterThan(0);
    expect(platforms.find((p) => p.id === "amazon")).toBeTruthy();
    expect(platforms.find((p) => p.id === "google_shopping")).toBeTruthy();
    expect(platforms.find((p) => p.id === "cj")).toBeTruthy();
    expect(platforms.find((p) => p.id === "keepa")).toBeTruthy();
    expect(platforms.find((p) => p.id === "walmart")).toBeTruthy();
  });

  it("each platform has required fields", () => {
    for (const p of platforms) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.envKey).toBeTruthy();
      expect(typeof p.searchFn).toBe("function");
    }
  });
});

describe("searchAllPlatformsFromFirestore — error paths", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("sets cooldown when all keys are exhausted", async () => {
    const { setPlatformCooldown, markKeyError } = await import("./platform-config");
    vi.mocked(setPlatformCooldown).mockResolvedValue(undefined);
    vi.mocked(markKeyError).mockResolvedValue(undefined);

    vi.mocked(getAllPlatforms).mockResolvedValue([
      {
        id: "fail_plat",
        name: "Fail Platform",
        enabled: true,
        method: "rainforest",
        keys: [
          { id: "k1", key: "bad", label: "Key1", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" },
        ],
        lastHealth: "untested",
        lastSearched: null,
        lastError: null,
        cooldownUntil: null,
        createdAt: null,
        updatedAt: null,
      },
    ] as never);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network timeout"))
    );

    const result = await searchAllPlatformsFromFirestore("test");
    expect(result).toHaveLength(1);
    expect(result[0].error).toBe("Network timeout");
    expect(result[0].data).toBeNull();
    expect(setPlatformCooldown).toHaveBeenCalledWith("fail_plat", 5);
  });

  it("marks key error on rate-limit (429) and tries next key", async () => {
    const { markKeyError } = await import("./platform-config");
    vi.mocked(markKeyError).mockResolvedValue(undefined);

    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          return { ok: false, status: 429, json: () => Promise.resolve({}), text: () => Promise.resolve("Rate limited") };
        }
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({ shopping_results: [{ title: "Success", price: 10, thumbnail: "img.jpg", link: "http://test.com" }] }),
        };
      })
    );

    vi.mocked(getAllPlatforms).mockResolvedValue([
      {
        id: "multi_key",
        name: "Multi Key",
        enabled: true,
        method: "serpapi",
        keys: [
          { id: "k1", key: "limited", label: "Limited", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" },
          { id: "k2", key: "working", label: "Working", priority: 2, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" },
        ],
        lastHealth: "untested",
        lastSearched: null,
        lastError: null,
        cooldownUntil: null,
        createdAt: null,
        updatedAt: null,
      },
    ] as never);

    const result = await searchAllPlatformsFromFirestore("test");
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe("multi_key");
    expect(markKeyError).toHaveBeenCalledWith("multi_key", "k1", expect.stringContaining("429"));
  });

  it("handles non-rate-limit errors by trying next key without markKeyError", async () => {
    const { markKeyError, setPlatformCooldown } = await import("./platform-config");
    vi.mocked(markKeyError).mockResolvedValue(undefined);
    vi.mocked(setPlatformCooldown).mockResolvedValue(undefined);

    let callCount = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => {
        callCount++;
        if (callCount === 1) {
          throw new Error("DNS resolution failed");
        }
        return {
          ok: true,
          status: 200,
          json: () => Promise.resolve({ shopping_results: [{ title: "OK", price: 5, thumbnail: "img.jpg", link: "http://ok.com" }] }),
        };
      })
    );

    vi.mocked(getAllPlatforms).mockResolvedValue([
      {
        id: "dns_test",
        name: "DNS Test",
        enabled: true,
        method: "serpapi",
        keys: [
          { id: "k1", key: "bad", label: "Bad DNS", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" },
          { id: "k2", key: "ok", label: "OK", priority: 2, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" },
        ],
        lastHealth: "untested",
        lastSearched: null,
        lastError: null,
        cooldownUntil: null,
        createdAt: null,
        updatedAt: null,
      },
    ] as never);

    const result = await searchAllPlatformsFromFirestore("test");
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe("dns_test");
    expect(markKeyError).not.toHaveBeenCalled();
  });

  it("handles quota/credits errors as rate-limit errors", async () => {
    const { markKeyError } = await import("./platform-config");
    vi.mocked(markKeyError).mockResolvedValue(undefined);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("402 Payment Required: quota exceeded"))
    );

    vi.mocked(getAllPlatforms).mockResolvedValue([
      {
        id: "quota_plat",
        name: "Quota Platform",
        enabled: true,
        method: "rainforest",
        keys: [
          { id: "k1", key: "exhausted", label: "Exhausted", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" },
        ],
        lastHealth: "untested",
        lastSearched: null,
        lastError: null,
        cooldownUntil: null,
        createdAt: null,
        updatedAt: null,
      },
    ] as never);

    const result = await searchAllPlatformsFromFirestore("test");
    expect(result).toHaveLength(1);
    expect(result[0].error).toContain("quota");
    expect(markKeyError).toHaveBeenCalledWith("quota_plat", "k1", expect.stringContaining("quota"));
  });

  it("returns empty when no keys configured for a platform", async () => {
    vi.mocked(getAllPlatforms).mockResolvedValue([
      {
        id: "no_keys",
        name: "No Keys",
        enabled: true,
        method: "rainforest",
        keys: [],
        lastHealth: "untested",
        lastSearched: null,
        lastError: null,
        cooldownUntil: null,
        createdAt: null,
        updatedAt: null,
      },
    ] as never);

    const result = await searchAllPlatformsFromFirestore("test");
    expect(result).toHaveLength(1);
    expect(result[0].error).toBe("No API keys configured");
  });

  it("passes selectedIds filter to Firestore search", async () => {
    vi.mocked(getAllPlatforms).mockResolvedValue([
      { id: "amazon", name: "Amazon", enabled: true, method: "rainforest", keys: [{ id: "k1", key: "test", label: "Primary", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }], lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null },
      { id: "keepa", name: "Keepa", enabled: true, method: "keepa", keys: [{ id: "k2", key: "test", label: "Primary", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }], lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null },
    ] as never);

    mockFetchResponse(true, {
      search_results: [{ title: "Test", price: 10, image: "img.jpg", link: "http://test.com" }],
    });

    const result = await searchAllPlatformsFromFirestore("test", ["amazon", "keepa"]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.platform)).toEqual(expect.arrayContaining(["amazon", "keepa"]));
  });
});

describe("searchAllPlatforms — backward-compatible exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("searchAmazon delegates to searchAmazonWithKey", async () => {
    mockFetchResponse(true, {
      search_results: [{ title: "Product", price: 9.99, image: "img.jpg", link: "http://amazon.com/dp/B001" }],
    });

    process.env.RAINFOREST_API_KEY = "test-key";
    const result = await searchAmazon("headphones");
    expect(result.search_results).toHaveLength(1);
    expect(result.search_results[0].source).toBe("amazon");
  });

  it("searchGoogleShopping delegates to searchGoogleShoppingWithKey", async () => {
    mockFetchResponse(true, {
      shopping_results: [{ title: "Mouse", price: 29.99, thumbnail: "img.jpg", link: "http://store.com/mouse" }],
    });

    process.env.SERP_API_KEY = "test-key";
    const result = await searchGoogleShopping("mouse");
    expect(result.search_results).toHaveLength(1);
    expect(result.search_results[0].source).toBe("google_shopping");
  });

  it("searchCJProducts delegates to searchCJProductsWithKey", async () => {
    mockFetchResponse(true, {
      data: { list: [{ productName: "Widget", productImage: "img.jpg", sellPrice: "5.99", productUrl: "http://cj.com/1" }] },
    });

    process.env.CJ_API_KEY = "test-key";
    const result = await searchCJProducts("widget");
    expect(result.search_results).toHaveLength(1);
    expect(result.search_results[0].source).toBe("cj");
  });

  it("searchKeepaProducts delegates to searchKeepaProductsWithKey", async () => {
    mockFetchResponse(true, {
      products: [{ title: "Keepa Item", stats: { current: [1999] }, image: "img.jpg", asin: "B001" }],
    });

    process.env.KEEPA_API_KEY = "test-key";
    const result = await searchKeepaProducts("item");
    expect(result.search_results).toHaveLength(1);
    expect(result.search_results[0].source).toBe("keepa");
  });

  it("searchAliExpress delegates to searchAliExpressWithKey", async () => {
    const html = `
      <html>
        <script type="application/ld+json">
        {"@type":"Product","name":"Ali Product","offers":{"price":8.99},"image":"https://ae01.alicdn.com/img.jpg","url":"https://aliexpress.com/item/1.html"}
        </script>
      </html>
    `;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(html) })
    );

    process.env.SCRAPER_API_KEY = "test-key";
    const result = await searchAliExpress("ali product");
    expect(result.search_results).toHaveLength(1);
    expect(result.search_results[0].source).toBe("aliexpress");
  });

  it("searchViaScraper delegates to searchViaScraperWithKey", async () => {
    const html = `
      <html>
        <a href="/ip/product-123">Link</a>
        <span class="product-title"><h3>Walmart Item</h3></span>
        <span class="price">$12.99</span>
        <img src="https://walmart.com/img.jpg" />
      </html>
    `;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(html) })
    );

    process.env.SCRAPER_API_KEY = "test-key";
    const result = await searchViaScraper("walmart", "item");
    expect(result.search_results).toBeDefined();
  });

  it("searchAllPlatforms returns Firestore results when available", async () => {
    vi.mocked(getAllPlatforms).mockResolvedValue([
      { id: "serpapi_plat", name: "SerpAPI", enabled: true, method: "serpapi", keys: [{ id: "k1", key: "test", label: "Primary", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }], lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null },
    ] as never);

    mockFetchResponse(true, {
      shopping_results: [{ title: "FS Result", price: 15, thumbnail: "img.jpg", link: "http://test.com" }],
    });

    const result = await searchAllPlatforms("test");
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe("serpapi_plat");
  });

  it("searchAllPlatforms returns empty when Firestore fails and env fallback finds nothing", async () => {
    vi.mocked(getAllPlatforms).mockRejectedValue(new Error("Firestore down"));

    mockFetchResponse(true, { search_results: [] });

    const result = await searchAllPlatforms("test", ["nonexistent_platform"]);
    expect(result).toEqual([]);
  });
});

describe("platform-search — individual function deep coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.RAINFOREST_API_KEY = "test-key";
    process.env.SERP_API_KEY = "test-key";
    process.env.CJ_API_KEY = "test-cj";
    process.env.KEEPA_API_KEY = "test-keepa";
    process.env.SCRAPER_API_KEY = "test-scraper";
  });

  describe("searchCJProducts", () => {
    it("returns mapped CJ results with productImageSet", async () => {
      mockFetchResponse(true, {
        data: {
          list: [
            {
              productNameEn: "CJ Widget",
              productImage: "https://cj.com/img.jpg",
              productImageSet: ["https://cj.com/img2.jpg", { url: "https://cj.com/img3.jpg" }],
              sellPrice: 8.99,
              pid: "P001",
              brand: "CJBrand",
            },
          ],
        },
      });

      const result = await searchCJProducts("cj widget");
      expect(result.search_results).toHaveLength(1);
      expect(result.search_results[0].title).toBe("CJ Widget");
      expect(result.search_results[0].price).toBe(8.99);
      expect(result.search_results[0].source).toBe("cj");
      expect(result.search_results[0].images).toBeDefined();
    });

    it("skips non-string non-object entries in productImageSet", async () => {
      mockFetchResponse(true, {
        data: {
          list: [
            {
              productNameEn: "Mixed Images",
              productImage: "https://cj.com/main.jpg",
              productImageSet: ["https://cj.com/a.jpg", 42, { image: "https://cj.com/b.jpg" }],
              sellPrice: 4.99,
              pid: "P_MIX",
            },
          ],
        },
      });

      const result = await searchCJProducts("mixed");
      const images = result.search_results[0].images ?? [];
      expect(images).toContain("https://cj.com/main.jpg");
      expect(images).toContain("https://cj.com/b.jpg");
      expect(images).not.toContain(42);
    });

    it("handles CJ API errors", async () => {
      mockFetchResponse(false, {}, 403);
      await expect(searchCJProducts("test")).rejects.toThrow("CJ Products 403");
    });

    it("handles CJ products with string sellPrice", async () => {
      mockFetchResponse(true, {
        data: [
          {
            productNameEn: "String Price",
            productImage: "img.jpg",
            sellPrice: "12.50",
            pid: "P002",
          },
        ],
      });

      const result = await searchCJProducts("string price");
      expect(result.search_results[0].price).toBe(12.50);
    });

    it("falls back to productPrice when sellPrice is missing", async () => {
      mockFetchResponse(true, {
        data: [{ productNameEn: "Fallback Price", productImage: "img.jpg", productPrice: 9.99, pid: "P003" }],
      });

      const result = await searchCJProducts("fallback");
      expect(result.search_results[0].price).toBe(9.99);
    });

    it("handles null price when neither sellPrice nor productPrice", async () => {
      mockFetchResponse(true, {
        data: [{ productNameEn: "No Price", productImage: "img.jpg", pid: "P004" }],
      });

      const result = await searchCJProducts("no price");
      expect(result.search_results[0].price).toBeNull();
    });
  });

  describe("searchGoogleShopping via Serper", () => {
    it("returns mapped Serper results", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              shopping: [
                { title: "Serper Item", price: "$19.99", thumbnail: "thumb.jpg", link: "http://serper.com", rating: 4.1, reviews: 100 },
              ],
            }),
        })
      );

      const { searchAllPlatformsFromFirestore } = await import("./platform-search");
      const { getAllPlatforms } = await import("./platform-config");
      vi.mocked(getAllPlatforms).mockResolvedValue([
        {
          id: "serper_plat",
          name: "Serper",
          enabled: true,
          method: "serper",
          keys: [{ id: "k1", key: "test", label: "Primary", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }],
          lastHealth: "untested",
          lastSearched: null,
          lastError: null,
          cooldownUntil: null,
          createdAt: null,
          updatedAt: null,
        },
      ] as never);

      const result = await searchAllPlatformsFromFirestore("serper test");
      expect(result).toHaveLength(1);
      expect(result[0].data?.search_results[0].source).toBe("google_shopping");
    });

    it("handles Serper numeric price", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              organic: [{ title: "Num Price", price: 29.99, thumbnail: "t.jpg", link: "http://test.com" }],
            }),
        })
      );

      const { getAllPlatforms } = await import("./platform-config");
      vi.mocked(getAllPlatforms).mockResolvedValue([
        {
          id: "serper2",
          name: "Serper2",
          enabled: true,
          method: "serper",
          keys: [{ id: "k1", key: "test", label: "P", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }],
          lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null,
        },
      ] as never);

      const { searchAllPlatformsFromFirestore } = await import("./platform-search");
      const result = await searchAllPlatformsFromFirestore("num price");
      expect(result).toHaveLength(1);
    });

    it("handles Serper API error responses", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 429, text: () => Promise.resolve("Rate limited") })
      );

      const { getAllPlatforms } = await import("./platform-config");
      vi.mocked(getAllPlatforms).mockResolvedValue([
        {
          id: "serper_fail",
          name: "Serper Fail",
          enabled: true,
          method: "serper",
          keys: [{ id: "k1", key: "test", label: "P", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }],
          lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null,
        },
      ] as never);

      const { searchAllPlatformsFromFirestore } = await import("./platform-search");
      const result = await searchAllPlatformsFromFirestore("serper err");
      expect(result).toHaveLength(1);
      expect(result[0].error).toContain("Serper.dev 429");
    });
  });

  describe("searchWalmart via RapidAPI", () => {
    it("returns mapped Walmart results", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              data: {
                products: [
                  { title: "Walmart Item", current_price: 14.99, thumbnail: "w.jpg", product_url: "http://walmart.com/1", brand: "WM", rating: 4.3, reviews: 200 },
                ],
              },
            }),
        })
      );

      const { getAllPlatforms } = await import("./platform-config");
      vi.mocked(getAllPlatforms).mockResolvedValue([
        {
          id: "walmart_api",
          name: "Walmart API",
          enabled: true,
          method: "rapidapi_walmart",
          keys: [{ id: "k1", key: "test", label: "P", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }],
          lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null,
        },
      ] as never);

      const { searchAllPlatformsFromFirestore } = await import("./platform-search");
      const result = await searchAllPlatformsFromFirestore("walmart test");
      expect(result).toHaveLength(1);
      expect(result[0].data?.search_results[0].source).toBe("walmart");
    });

    it("handles Walmart API errors", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({ ok: false, status: 500, text: () => Promise.resolve("Server error") })
      );

      const { getAllPlatforms } = await import("./platform-config");
      vi.mocked(getAllPlatforms).mockResolvedValue([
        {
          id: "walmart_fail",
          name: "Walmart Fail",
          enabled: true,
          method: "rapidapi_walmart",
          keys: [{ id: "k1", key: "test", label: "P", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }],
          lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null,
        },
      ] as never);

      const { searchAllPlatformsFromFirestore } = await import("./platform-search");
      const result = await searchAllPlatformsFromFirestore("walmart fail");
      expect(result).toHaveLength(1);
      expect(result[0].error).toContain("500");
    });

    it("handles Walmart string price parsing", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              products: [{ title: "Str Price", price: "$25.50", thumbnail: "img.jpg", product_url: "http://test.com", average_rating: 4.0, num_reviews: 50 }],
            }),
        })
      );

      const { getAllPlatforms } = await import("./platform-config");
      vi.mocked(getAllPlatforms).mockResolvedValue([
        {
          id: "wm_str",
          name: "WM Str",
          enabled: true,
          method: "rapidapi_walmart",
          keys: [{ id: "k1", key: "test", label: "P", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }],
          lastHealth: "untested", lastSearched: null, lastError: null, cooldownUntil: null, createdAt: null, updatedAt: null,
        },
      ] as never);

      const { searchAllPlatformsFromFirestore } = await import("./platform-search");
      const result = await searchAllPlatformsFromFirestore("str price");
      expect(result).toHaveLength(1);
    });
  });

  describe("searchViaScraper deep coverage", () => {
    it("uses JSON-LD structured data when available", async () => {
      const html = `
        <html>
          <script type="application/ld+json">
          {"@type":"ItemList","itemListElement":[{"item":{"@type":"Product","name":"JSON Product","offers":{"price":22.99},"image":"https://img.com/p.jpg","url":"http://etsy.com/1","brand":{"name":"BrandA"},"aggregateRating":{"ratingValue":4.5,"reviewCount":100}}}]}
          </script>
        </html>
      `;
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(html) }));

      const result = await searchViaScraper("etsy", "json product");
      expect(result.search_results).toHaveLength(1);
      expect(result.search_results[0].title).toBe("JSON Product");
    });

    it("parses scraper JSON-LD with string and lowPrice offers (3+ items)", async () => {
      const html = `
        <html>
          <script type="application/ld+json">
          {"@type":"ItemList","itemListElement":[
            {"item":{"@type":"Product","name":"S1","offers":{"price":1.99},"image":"i1","url":"http://site.com/1"}},
            {"item":{"@type":"Product","name":"S2","offers":{"price":"2.99"},"image":"i2","url":"http://site.com/2"}},
            {"item":{"@type":"Product","name":"S3","offers":{"lowPrice":3.99},"image":"i3","url":"http://site.com/3"}}
          ]}
          </script>
        </html>
      `;
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(html) }));

      const result = await searchViaScraper("etsy", "json items");
      expect(result.search_results).toHaveLength(3);
      expect(result.search_results.map((r) => r.price)).toEqual([1.99, 2.99, 3.99]);
    });

    it("handles ScraperAPI errors", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 503, text: () => Promise.resolve("Service unavailable") }));
      await expect(searchViaScraper("etsy", "test")).rejects.toThrow("ScraperAPI 503");
    });

    it("throws when no results scraped", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("<html><body>empty</body></html>") }));
      await expect(searchViaScraper("temu", "xyznonexistent")).rejects.toThrow("No results scraped");
    });

    it("extracts prices from HTML regex fallback", async () => {
      const html = `
        <html>
          <a href="/ip/product-123">Link</a>
          <h3>Walmart Product</h3>
          <span class="price">$29.99</span>
          <img src="https://walmart.com/product.jpg" />
        </html>
      `;
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(html) }));
      const result = await searchViaScraper("walmart", "product");
      expect(result.search_results).toBeDefined();
    });
  });

  describe("searchAllPlatforms — env fallback with selectedIds", () => {
    it("filters env platforms by selectedIds", async () => {
      vi.mocked(getAllPlatforms).mockRejectedValue(new Error("no firestore"));

      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ shopping_results: [{ title: "Filtered", price: 10, thumbnail: "img.jpg", link: "http://test.com" }] }),
        })
      );

      const result = await searchAllPlatforms("test", ["google_shopping"]);
      expect(result).toHaveLength(1);
      expect(result[0].platform).toBe("google_shopping");
    });

    it("searchAllPlatforms returns empty when env fallback finds nothing for selectedIds", async () => {
      vi.mocked(getAllPlatforms).mockRejectedValue(new Error("no firestore"));
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ search_results: [] }) }));

      const result = await searchAllPlatforms("test", ["nonexistent_platform"]);
      expect(result).toEqual([]);
    });
  });
});

describe("platform-search — custom connectors and fallbacks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    process.env.SCRAPER_API_KEY = "test-scraper";
  });

  function platformWith(id: string, extra: Record<string, unknown> = {}) {
    return {
      id,
      name: id,
      enabled: true,
      method: "custom_scraper",
      keys: [{ id: "k1", key: "test", label: "Primary", priority: 1, requestsUsed: 0, requestsLimit: 100, resetDate: "2099-01-01", lastError: null, lastTested: null, lastStatus: "untested" }],
      lastHealth: "untested",
      lastSearched: null,
      lastError: null,
      cooldownUntil: null,
      createdAt: null,
      updatedAt: null,
      ...extra,
    } as never;
  }

  it("searches via custom connector with template and default selectors", async () => {
    const html = `
      <html>
        <a href="/product-1.html">Prod 1</a>
        <div class="product-title">Custom Widget</div>
        <span>$14.99</span>
        <img src="https://custom.com/p1.jpg" />
      </html>
    `;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(html) }));
    vi.mocked(getAllPlatforms).mockResolvedValue([
      platformWith("custom1", {
        connector: { searchUrlTemplate: "https://custom.com/search?q={{query}}" },
      }),
    ]);

    const result = await searchAllPlatformsFromFirestore("my widget");
    expect(result).toHaveLength(1);
    expect(result[0].error).toBeUndefined();
    expect(result[0].data?.search_results).toHaveLength(1);
    expect(result[0].data?.search_results[0].title).toBe("Custom Widget");
    expect(result[0].data?.search_results[0].price).toBe(14.99);
    expect(result[0].data?.search_results[0].link).toBe("https://custom.com/product-1.html");
    const url = String(vi.mocked(fetch).mock.calls[0][0]);
    expect(url).toContain("api.scraperapi.com");
    expect(url).toContain("q%3Dmy%2520widget");
  });

  it("uses custom connector selectors when provided", async () => {
    const html = `
      <html>
        <a href="/deal/77.html">Deal</a>
        <h1 class="prod-name">Selector Product</h1>
        <span>19.99 USD</span>
        <img data-src="https://cdn.com/photo.png" />
      </html>
    `;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(html) }));
    vi.mocked(getAllPlatforms).mockResolvedValue([
      platformWith("custom2", {
        connector: {
          searchUrlTemplate: "https://site.com/go?kw={{query}}",
          selectors: {
            link: 'href="(\\/deal\\/[^"]+)"',
            title: 'class="prod-name"[^>]*>([^<]+)',
            price: "([\\d.]+)\\s*USD",
            image: 'data-src="(https?:\\/\\/[^"]+)"',
          },
        },
      }),
    ]);

    const result = await searchAllPlatformsFromFirestore("selector");
    expect(result).toHaveLength(1);
    const item = result[0].data?.search_results[0];
    expect(item?.title).toBe("Selector Product");
    expect(item?.price).toBe(19.99);
    expect(item?.image).toBe("https://cdn.com/photo.png");
    expect(item?.link).toBe("https://site.com/deal/77.html");
  });

  it("throws when custom connector scrapes no results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve("<html>nothing here</html>") }));
    vi.mocked(getAllPlatforms).mockResolvedValue([
      platformWith("custom3", {
        connector: { searchUrlTemplate: "https://site.com/search?q={{query}}" },
      }),
    ]);

    const result = await searchAllPlatformsFromFirestore("nothing");
    expect(result).toHaveLength(1);
    expect(result[0].data).toBeNull();
    expect(result[0].error).toContain("No results scraped via custom connector");
  });

  it("throws ScraperAPI error when custom connector request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 502, text: () => Promise.resolve("Bad gateway") })
    );
    vi.mocked(getAllPlatforms).mockResolvedValue([
      platformWith("custom4", {
        connector: { searchUrlTemplate: "https://site.com/search?q={{query}}" },
      }),
    ]);

    const result = await searchAllPlatformsFromFirestore("fail");
    expect(result).toHaveLength(1);
    expect(result[0].error).toContain("ScraperAPI 502");
  });

  it("reuses built-in scraper config when connector has siteKey", async () => {
    const html = `
      <html>
        <a href="/ip/widget-1">Link</a>
        <h3>SiteKey Widget</h3>
        <span>$8.99</span>
        <img src="https://walmart.com/i.jpg" />
      </html>
    `;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(html) }));
    vi.mocked(getAllPlatforms).mockResolvedValue([
      platformWith("sitekey_plat", {
        connector: { siteKey: "walmart" },
      }),
    ]);

    const result = await searchAllPlatformsFromFirestore("widget");
    expect(result).toHaveLength(1);
    expect(result[0].data?.search_results[0].link).toContain("walmart.com");
  });

  it("falls back to generic scraper for connector with no template or siteKey", async () => {
    vi.mocked(getAllPlatforms).mockResolvedValue([
      platformWith("empty_connector", { connector: { aiGenerated: true } }),
    ]);

    const result = await searchAllPlatformsFromFirestore("widget");
    expect(result).toHaveLength(1);
    expect(result[0].error).toContain("No scraper config for generic");
  });

  it("falls back to generic scraper for unknown method and id without connector", async () => {
    vi.mocked(getAllPlatforms).mockResolvedValue([
      platformWith("unknown_plat", { method: "official_api" }),
    ]);

    const result = await searchAllPlatformsFromFirestore("widget");
    expect(result).toHaveLength(1);
    expect(result[0].error).toContain("No scraper config for generic");
  });

  it("invokes every dedicated scraper-based search function", async () => {
    const html = `
      <html>
        <script type="application/ld+json">
        {"@type":"ItemList","itemListElement":[
          {"item":{"@type":"Product","name":"D1","offers":{"price":1},"image":"i1","url":"u1"}},
          {"item":{"@type":"Product","name":"D2","offers":{"price":2},"image":"i2","url":"u2"}},
          {"item":{"@type":"Product","name":"D3","offers":{"price":3},"image":"i3","url":"u3"}}
        ]}
        </script>
      </html>
    `;
    const ids = ["walmart", "etsy", "temu", "shein", "banggood", "dhgate", "alibaba", "wish", "ebay", "shopee", "1688", "global_sources"];
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, text: () => Promise.resolve(html) }));
    vi.mocked(getAllPlatforms).mockResolvedValue(ids.map((id) => platformWith(id)) as never[]);

    const result = await searchAllPlatformsFromFirestore("dedicated");
    const platformsReturned = new Set(result.map((r) => r.platform));
    for (const id of ids) {
      expect(platformsReturned).toContain(id);
    }
  });

  it("treats malformed cooldownUntil as ready to search", async () => {
    mockFetchResponse(true, { shopping_results: [{ title: "CD", price: 5, thumbnail: "img.jpg", link: "http://cd.com" }] });
    vi.mocked(getAllPlatforms).mockResolvedValue([
      platformWith("cd_plat", {
        method: "serpapi",
        cooldownUntil: {},
      }),
    ]);

    const result = await searchAllPlatformsFromFirestore("cd");
    expect(result).toHaveLength(1);
    expect(result[0].platform).toBe("cd_plat");
  });

  it("logs a warning and falls back when getAllPlatforms returns a non-array", async () => {
    const { logger } = await import("@/lib/logger");
    mockFetchResponse(true, { search_results: [{ title: "Env", price: 1, image: "i", link: "http://e.com" }] });
    vi.mocked(getAllPlatforms).mockResolvedValue(null as never);

    const result = await searchAllPlatforms("fallback");
    expect(logger.warn).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
});
