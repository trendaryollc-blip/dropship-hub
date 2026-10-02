import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assembleSupplierSources,
  parsePriceWithCurrency,
  sourceToSupplierProfile,
  searchSupplierPlatforms,
  userFacingPlatformError,
  __resetSupplierSearchCacheForTests,
} from "./supplier-platform-search";
import { __resetPoolStateForTests } from "@/lib/api-keys/pool";
import { PublicError } from "@/lib/api-errors";

const mockSearchCJProducts = vi.fn();
vi.mock("@/lib/platform-search", () => ({
  searchCJProducts: (...args: unknown[]) => mockSearchCJProducts(...args),
}));

const mockGetPlatform = vi.fn();
vi.mock("@/lib/platform-config", () => ({
  getPlatform: (...args: unknown[]) => mockGetPlatform(...args),
  selectBestKey: (keys: Array<{ id: string; key: string }>) =>
    Array.isArray(keys) && keys.length > 0 ? keys[0] : null,
  markKeyError: vi.fn(),
  markKeyHealthy: vi.fn(),
}));

function fixture(name: string): string {
  return readFileSync(resolve(process.cwd(), "src/lib/__fixtures__/suppliers", name), "utf8");
}

const ALIBABA_HTML = fixture("alibaba.html");
const DHGATE_HTML = fixture("dhgate.html");
const ALIEXPRESS_HTML = fixture("aliexpress.html");
const GLOBAL_SOURCES_HTML = fixture("globalsources.html");

const ALIBABA_URL = "https://www.alibaba.com/trade/search?SearchText=baby+toys";
const DHGATE_URL = "https://www.dhgate.com/wholesale/search.do?searchkey=baby+toys";
const ALIEXPRESS_URL = "https://www.aliexpress.com/w/wholesale-wireless-earbuds.html";
const GLOBAL_SOURCES_URL =
  "https://www.globalsources.com/exhibitors/HK/?keyword=wireless%20earbuds";

describe("platform HTML fixtures", () => {
  it("extracts store, listing, price and currency data from the Alibaba offer list", () => {
    const sources = assembleSupplierSources("alibaba", "Alibaba", ALIBABA_HTML, ALIBABA_URL);

    expect(sources.length).toBeGreaterThanOrEqual(3);
    const sunshine = sources.find((s) =>
      s.storeUrl.includes("ningbosunshine.en.alibaba.com")
    );
    expect(sunshine).toBeDefined();
    expect(sunshine?.storeName).toBe("Ningbo Sunshine Baby Products Co., Ltd");
    expect(sunshine?.dataSource).toBe("live");
    expect(sunshine?.listings).toHaveLength(1);
    expect(sunshine?.listings[0].price).toBe(2.15);
    expect(sunshine?.listings[0].currency).toBe("USD");
    expect(sunshine?.listings[0].link).toBe(
      "https://www.alibaba.com/product-detail/custom-logo-silicone-baby-teether_1234567890123.html"
    );
    expect(sunshine?.listings[0].rating).toBe(4.7);
    expect(sunshine?.listings[0].reviews).toBe(218);

    const blocks = sources.find((s) => s.storeUrl.includes("earlylearning.en.alibaba.com"));
    expect(blocks?.listings[0].price).toBe(8.99);
    expect(blocks?.listings[0].currency).toBe("USD");
  });

  it("extracts stores and USD prices from the DHgate goods list", () => {
    const sources = assembleSupplierSources("dhgate", "DHgate", DHGATE_HTML, DHGATE_URL);

    expect(sources.length).toBeGreaterThan(0);
    const sunrise = sources.find((s) => s.storeName.includes("Sunrise Baby"));
    expect(sunrise).toBeDefined();
    expect(sunrise?.storeUrl).toContain("dhgate.com/store/buy/sunrise-baby-goods");
    expect(sunrise?.dataSource).toBe("estimated");
    expect(sunrise?.listings[0].title).toContain("Silicone Baby Blocks");
    expect(sunrise?.listings[0].price).toBe(12.99);
    expect(sunrise?.listings[0].currency).toBe("USD");
    expect(sunrise?.listings[0].image).toBe("https://cbu01.alicdn.com/fixture/baby-blocks.jpg");
  });

  it("extracts EUR prices from the AliExpress window markup", () => {
    const sources = assembleSupplierSources(
      "aliexpress",
      "AliExpress",
      ALIEXPRESS_HTML,
      ALIEXPRESS_URL
    );

    expect(sources.length).toBeGreaterThan(0);
    const store = sources.find((s) => s.storeUrl.includes("1100001fixture"));
    expect(store).toBeDefined();
    expect(store?.storeName).toBe("AudioNord Store");
    expect(store?.listings[0].price).toBe(11.29);
    expect(store?.listings[0].currency).toBe("EUR");
    expect(store?.listings[0].link).toBe(
      "https://www.aliexpress.com/item/1005006fixture.html"
    );
  });

  it("extracts suppliers and absolute URLs from the Global Sources Nuxt payload", () => {
    const sources = assembleSupplierSources(
      "global_sources",
      "Global Sources",
      GLOBAL_SOURCES_HTML,
      GLOBAL_SOURCES_URL
    );

    expect(sources).toHaveLength(1);
    expect(sources[0].storeName).toBe("Shenzhen Mark Technology Co., Ltd");
    expect(sources[0].storeUrl).toBe(
      "https://www.globalsources.com/exhibitors/HK/shenzhen-mark-technology-co-ltd_2008825129102/"
    );
    expect(sources[0].dataSource).toBe("live");
    expect(sources[0].listingCount).toBe(2);
    expect(sources[0].listings[0].title).toContain("Wireless Earbuds 60H");
    expect(sources[0].listings[0].link).toBe(
      "https://www.globalsources.com/products/HK/wireless-earbuds-60h-playback_1219763770/"
    );
    expect(sources[0].listings.every((l) => l.price === null)).toBe(true);
  });
});

describe("parsePriceWithCurrency", () => {
  it.each([
    ["$12.99", 12.99, "USD"],
    ["US $1,234.56", 1234.56, "USD"],
    ["€11,29", 11.29, "EUR"],
    ["1.299,00 €", 1299, "EUR"],
    ["£8.50", 8.5, "GBP"],
    ["GBP 12.99", 12.99, "GBP"],
    ["USD 45.00", 45, "USD"],
    ["45.00 EUR", 45, "EUR"],
    ["HK$45.00", 45, "HKD"],
    ["AU$7.95", 7.95, "AUD"],
    ["S$3.20", 3.2, "SGD"],
    ["18.40", 18.4, null],
    ["RMB 1,299", 1299, "CNY"],
    ["JPY ¥1,200", 1200, "JPY"],
  ])("parses %s", (raw, price, currency) => {
    expect(parsePriceWithCurrency(raw)).toEqual({ price, currency });
  });

  it("keeps the price but reports no currency for an ambiguous yen symbol", () => {
    expect(parsePriceWithCurrency("¥880")).toEqual({ price: 880, currency: null });
    expect(parsePriceWithCurrency("￥3,000")).toEqual({ price: 3000, currency: null });
  });

  it("keeps the price when ratings and sold counts sit next to it", () => {
    const priceSpan = '<span class="price">€11,29</span> <span class="star">4.8</span> 1,240 sold';

    expect(parsePriceWithCurrency(priceSpan)).toEqual({ price: 11.29, currency: "EUR" });
  });

  it("ignores a truncated trailing number instead of reporting a short price", () => {
    expect(parsePriceWithCurrency('<span class="price">€11,</span>')).toBeNull();
    expect(parsePriceWithCurrency("Price: 12.")).toBeNull();
  });

  it("applies the platform default currency only when the markup omits one", () => {
    expect(parsePriceWithCurrency("18.40", "USD")).toEqual({ price: 18.4, currency: "USD" });
    expect(parsePriceWithCurrency("¥880", "USD")).toEqual({ price: 880, currency: null });
  });

  it.each(["", "Price on request", "USD", "N/A", "4.8 stars 128 sold"])(
    "returns nulls for %s",
    (raw) => {
      expect(parsePriceWithCurrency(raw)).toBeNull();
    }
  );
});

describe("currency honesty in supplier profiles", () => {
  it("reports a single currency when every priced listing agrees", () => {
    const [source] = assembleSupplierSources("alibaba", "Alibaba", ALIBABA_HTML, ALIBABA_URL);
    const profile = sourceToSupplierProfile(source, "baby toys");

    expect(profile.catalog.priceRange.currency).toBe("USD");
    expect(profile.catalog.priceRange.min).toBe(2.15);
  });

  it("drops the currency when listings are mixed instead of guessing", () => {
    const sources = assembleSupplierSources("alibaba", "Alibaba", ALIBABA_HTML, ALIBABA_URL);
    const mixed = {
      ...sources[0],
      listings: [
        { ...sources[0].listings[0], price: 10, currency: "USD" },
        { ...sources[0].listings[0], price: 9, currency: "EUR" },
      ],
    };

    const profile = sourceToSupplierProfile(mixed, "baby toys");

    expect(profile.catalog.priceRange).toEqual({ min: 9, max: 10, currency: null });
    expect(profile.trustBadge).toBe("unverified");
  });
});

describe("userFacingPlatformError", () => {
  it("never leaks upstream HTML or bodies", () => {
    const message = userFacingPlatformError(
      new Error("<html><body><h1>503 Service Unavailable</h1> nginx</body></html>"),
      "DHgate"
    );

    expect(message).not.toMatch(/<html|nginx/i);
    expect(message).toContain("DHgate");
  });

  it("translates upstream auth failures without echoing the body", () => {
    const upstream = Object.assign(
      new PublicError("ScraperAPI 403: <html><body><h1>403 Forbidden</h1></body></html>"),
      { status: 403 }
    );

    const message = userFacingPlatformError(upstream, "Alibaba");

    expect(message).toContain("Alibaba");
    expect(message).toMatch(/needs attention|403/);
    expect(message).not.toMatch(/<html|Forbidden/i);
  });

  it("never passes upstream markup through a curated error", () => {
    const markup = new PublicError("<html><body>Cloudflare error 1010</body></html>");

    const message = userFacingPlatformError(markup, "DHgate");

    expect(message).not.toMatch(/<html|Cloudflare/i);
  });

  it("translates upstream rate limits", () => {
    const message = userFacingPlatformError(new PublicError("rate limited", 429), "AliExpress");

    expect(message).toMatch(/rate limit/i);
  });

  it("translates timeouts", () => {
    const abort = new DOMException("The operation was aborted.", "AbortError");
    expect(userFacingPlatformError(abort, "DHgate")).toBe("DHgate search timed out");
  });

  it("keeps curated platform guidance so admins can act on it", () => {
    const curated = new PublicError(
      "All 3 shared ScraperAPI key(s) are unavailable. Open Admin -> Supplier Provider Keys."
    );

    expect(userFacingPlatformError(curated, "Alibaba")).toContain("Supplier Provider Keys");
  });
});

describe("parse-yield honesty", () => {
  it("reports an anti-bot page as blocked instead of claiming the layout changed", () => {
    const blocked = `<html><head><title>Just a moment...</title></head><body>
      <div id="cf-browser-verification">Checking your browser before accessing</div>
      <script src="/cdn-cgi/challenge-platform/h/b/orchestrate/jsch/v1"></script>
    </body></html>`;

    expect(() =>
      assembleSupplierSources("alibaba", "Alibaba", blocked, ALIBABA_URL)
    ).toThrow(/blocked the automated request/i);
  });

  it("still reports a layout change when the page looks normal but has no data", () => {
    const empty = "<html><head><title>Alibaba.com</title></head><body><div id='root'></div></body></html>";

    expect(() =>
      assembleSupplierSources("alibaba", "Alibaba", empty, ALIBABA_URL)
    ).toThrow(/may have changed its layout/i);
  });
});

describe("supplier search caching, deadlines and progress", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetPoolStateForTests();
    __resetSupplierSearchCacheForTests();
    process.env.SCRAPER_API_KEYS = "test-scraper-key";
    mockGetPlatform.mockResolvedValue(null);
    mockSearchCJProducts.mockResolvedValue({ search_results: [] });
  });

  afterEach(() => {
    delete process.env.SCRAPER_API_KEYS;
    delete process.env.CJ_API_KEYS;
    vi.unstubAllGlobals();
  });

  it("serves repeated identical searches from cache and re-scrapes when caching is off", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => ALIBABA_HTML });
    vi.stubGlobal("fetch", fetchMock);

    await searchSupplierPlatforms("cache probe alpha", ["alibaba"]);
    await searchSupplierPlatforms("cache probe alpha", ["alibaba"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await searchSupplierPlatforms("cache probe alpha", ["alibaba"], { useCache: false });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("deduplicates concurrent identical searches into a single upstream fetch", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => ALIBABA_HTML });
    vi.stubGlobal("fetch", fetchMock);

    const [first, second] = await Promise.all([
      searchSupplierPlatforms("cache probe concurrent", ["alibaba"]),
      searchSupplierPlatforms("cache probe concurrent", ["alibaba"]),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(first.sources.length).toBe(second.sources.length);
    expect(first.sources.length).toBeGreaterThan(0);
  });

  it("emits each platform as soon as it finishes instead of waiting for the slowest one", async () => {
    let slowFinished = false;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("dhgate")) {
          return { ok: true, text: async () => DHGATE_HTML };
        }
        await new Promise((resolve) => setTimeout(resolve, 60));
        slowFinished = true;
        return { ok: true, text: async () => ALIEXPRESS_HTML };
      })
    );

    const events: Array<{ platform: string; slowStillRunning: boolean }> = [];
    const outcome = await searchSupplierPlatforms("progress probe", ["dhgate", "aliexpress"], {
      onPlatformComplete: (event) => {
        events.push({ platform: event.platform, slowStillRunning: !slowFinished });
      },
    });

    const dhgateEvent = events.find((e) => e.platform === "dhgate");
    expect(dhgateEvent?.slowStillRunning).toBe(true);
    expect(events.map((e) => e.platform).sort()).toEqual(["aliexpress", "dhgate"]);
    expect(outcome.errors).toHaveLength(0);
    const ids = outcome.sources.map((s) => s.platformId);
    expect(ids.filter((id) => id === "dhgate").length).toBeGreaterThan(0);
    expect(ids.filter((id) => id === "aliexpress").length).toBeGreaterThan(0);
    expect(Math.max(...ids.map((id, i) => (id === "dhgate" ? i : -1)))).toBeLessThan(
      Math.min(...ids.map((id, i) => (id === "aliexpress" ? i : Number.MAX_SAFE_INTEGER)))
    );
  });

  it("keeps the search successful when a progress consumer throws", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => ALIBABA_HTML })
    );

    const outcome = await searchSupplierPlatforms("progress probe throwing", ["alibaba"], {
      onPlatformComplete: () => {
        throw new Error("consumer exploded");
      },
    });

    expect(outcome.errors).toHaveLength(0);
    expect(outcome.sources.length).toBeGreaterThan(0);
  });

  it("remembers a failed scrape briefly so a repeat search is not re-billed", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503, text: async () => "upstream busy" });
    vi.stubGlobal("fetch", fetchMock);

    const first = await searchSupplierPlatforms("failure cache probe", ["alibaba"]);
    const second = await searchSupplierPlatforms("failure cache probe", ["alibaba"]);

    expect(first.errors[0].error).toMatch(/temporarily blocking|503/i);
    expect(second.errors[0].error).toBe(first.errors[0].error);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("re-scrapes a cached failure when caching is disabled", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue({ ok: false, status: 503, text: async () => "upstream busy" });
    vi.stubGlobal("fetch", fetchMock);

    await searchSupplierPlatforms("failure cache bypass probe", ["alibaba"]);
    const forced = await searchSupplierPlatforms("failure cache bypass probe", ["alibaba"], {
      useCache: false,
    });

    expect(forced.errors).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("stops a hanging platform fetch at the deadline and reports it as a timeout", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_url: string, init: { signal?: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal?.addEventListener("abort", () =>
              reject(new DOMException("The operation was aborted.", "AbortError"))
            );
          })
      )
    );

    const outcome = await searchSupplierPlatforms("deadline probe", ["alibaba"], {
      deadlineMs: 1000,
    });

    expect(outcome.sources).toHaveLength(0);
    expect(outcome.errors).toHaveLength(1);
    expect(outcome.errors[0].error).toMatch(/timed out/i);
  });
});
