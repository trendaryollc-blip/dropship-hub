import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractStores,
  extractListingMatches,
  assembleSupplierSources,
  searchSupplierPlatforms,
  buildSupplierProfiles,
  sourceToSupplierProfile,
  getSupplierPlatformStatuses,
  SUPPLIER_PLATFORMS,
  __resetSupplierSearchCacheForTests,
} from "./supplier-platform-search";
import { __resetPoolStateForTests } from "@/lib/api-keys/pool";
import { PublicError } from "@/lib/api-errors";
import { getAdminDB } from "@/lib/firebase-admin";
import { createMockAdminDB, installDocStoreTransactions } from "@/__tests__/test-utils";
import type { SupplierProviderKeyEntry } from "@/lib/supplier-provider-keys";

const mockSearchCJProducts = vi.fn();
vi.mock("@/lib/platform-search", () => ({
  searchCJProducts: (...args: unknown[]) => mockSearchCJProducts(...args),
}));

const mockGetPlatform = vi.fn();
const mockMarkKeyError = vi.fn();
vi.mock("@/lib/platform-config", () => ({
  getPlatform: (...args: unknown[]) => mockGetPlatform(...args),
  selectBestKey: (keys: Array<{ id: string; key: string }>) =>
    Array.isArray(keys) && keys.length > 0 ? keys[0] : null,
  markKeyError: (...args: unknown[]) => mockMarkKeyError(...args),
  markKeyHealthy: vi.fn(),
}));

const TARGET_URL = "https://www.alibaba.com/trade/search?SearchText=baby+toys";

const STORE_HTML = `
<html><body>
<div class="product-card">
  <a href="https://factory-x.en.alibaba.com/store/123456.html">Factory X Store</a>
  <a href="/product-detail/green-robot-toy_123.html"><h3>Green Robot Toy Set</h3></a>
  <span class="price">$12.99</span>
  <img src="https://cdn.example.com/toy.jpg">
  <span>4.6 / 5 stars</span>
</div>
<div class="product-card">
  <a href="https://factory-x.en.alibaba.com/store/123456.html">Factory X Store</a>
  <a href="/product-detail/blue-robot-toy_456.html"><h3>Blue Robot Toy Figure</h3></a>
  <span class="price">$9.50</span>
</div>
</body></html>`;

const NO_STORE_HTML = `
<html><body>
<div class="card">
  <a href="/product-detail/wobble-toy_789.html"><h3>Wobble Baby Toy</h3></a>
  <span>$5.25</span>
</div>
</body></html>`;

const JSON_LD_HTML = `
<html><body>
<script type="application/ld+json">
{
  "@type": "ItemList",
  "itemListElement": [
    { "@type": "ListItem", "item": { "@type": "Product", "name": "Plush Bear Toy", "url": "https://www.alibaba.com/product-detail/bear-1.html", "image": "https://img.example.com/bear.jpg", "offers": { "price": 8.5 }, "aggregateRating": { "ratingValue": 4.7, "reviewCount": 320 } } },
    { "@type": "ListItem", "item": { "@type": "Product", "name": "Wooden Toy Blocks", "url": "https://www.alibaba.com/product-detail/blocks-2.html", "offers": { "price": 6.25 } } },
    { "@type": "ListItem", "item": { "@type": "Product", "name": "Baby Rattle Set", "url": "https://www.alibaba.com/product-detail/rattle-3.html", "offers": { "price": 3.9 }, "aggregateRating": { "ratingValue": 4.2, "reviewCount": 88 } } }
  ]
}
</script>
</body></html>`;

const customConfig = {
  searchUrl: (q: string) => `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`,
  linkPattern: String.raw`href="(\/product-detail\/[^"]+)"`,
  storePatterns: [
    String.raw`href="((?:https?:)?\/\/[^"]*alibaba\.com\/(?:store|company-detail|supplier)\/[^"]*)"`,
  ],
};

describe("extractStores", () => {
  it("finds store links with anchor text names and occurrence counts", () => {
    const stores = extractStores(STORE_HTML, customConfig, TARGET_URL);
    expect(stores).toHaveLength(1);
    expect(stores[0].url).toBe("https://factory-x.en.alibaba.com/store/123456.html");
    expect(stores[0].name).toBe("Factory X Store");
    expect(stores[0].count).toBe(2);
    expect(stores[0].firstIndex).toBeLessThan(STORE_HTML.indexOf("green-robot-toy"));
  });

  it("absolutizes protocol-relative store URLs", () => {
    const html = `<a href="//www.dhgate.com/store/9999">Quality Goods Store</a>`;
    const config = {
      searchUrl: (q: string) => `https://www.dhgate.com/wholesale/search.do?searchkey=${q}`,
      linkPattern: String.raw`href="(\/product\/[^"]+)"`,
      storePatterns: [String.raw`href="(\/\/[^"]*dhgate\.com\/store\/[^"]*)"`],
    };
    const stores = extractStores(html, config, "https://www.dhgate.com/");
    expect(stores).toHaveLength(1);
    expect(stores[0].url).toBe("https://www.dhgate.com/store/9999");
    expect(stores[0].name).toBe("Quality Goods Store");
  });

  it("derives a name from the URL when the anchor has no text", () => {
    const html = `<a href="https://www.dhgate.com/store/abc-toys-direct"></a>`;
    const config = {
      searchUrl: (q: string) => `https://www.dhgate.com/search?q=${q}`,
      linkPattern: String.raw`href="(\/product\/[^"]+)"`,
      storePatterns: [String.raw`href="([^"]*dhgate\.com\/store\/[^"]*)"`],
    };
    const stores = extractStores(html, config, "https://www.dhgate.com/");
    expect(stores).toHaveLength(1);
    expect(stores[0].name).toBe("abc toys direct");
  });

  it("returns an empty array when no store links exist", () => {
    expect(extractStores(NO_STORE_HTML, customConfig, TARGET_URL)).toHaveLength(0);
  });
});

describe("extractListingMatches", () => {
  it("extracts title, price, image and rating from product cards", () => {
    const matches = extractListingMatches(STORE_HTML, customConfig, TARGET_URL);
    expect(matches).toHaveLength(2);

    const first = matches[0].listing;
    expect(first.title).toBe("Green Robot Toy Set");
    expect(first.price).toBe(12.99);
    expect(first.image).toBe("https://cdn.example.com/toy.jpg");
    expect(first.rating).toBe(4.6);
    expect(first.link).toBe("https://www.alibaba.com/product-detail/green-robot-toy_123.html");

    const second = matches[1].listing;
    expect(second.title).toBe("Blue Robot Toy Figure");
    expect(second.price).toBe(9.5);
  });

  it("prefers JSON-LD structured data with ratings and review counts", () => {
    const matches = extractListingMatches(JSON_LD_HTML, customConfig, TARGET_URL);
    expect(matches.length).toBeGreaterThanOrEqual(3);
    const bear = matches.find((m) => m.listing.link.includes("bear-1"));
    expect(bear?.listing.price).toBe(8.5);
    expect(bear?.listing.rating).toBe(4.7);
    expect(bear?.listing.reviews).toBe(320);
  });

  it("returns an empty array when the page has no listings", () => {
    expect(extractListingMatches("<html>blocked</html>", customConfig, TARGET_URL)).toHaveLength(0);
  });

  it("reads the card after a very long href attribute", () => {
    const longAttrs = ` data-meta="${"a".repeat(1500)}"`;
    const html = `
    <div>
      <a href="/product-detail/big-attr-toy_777.html"${longAttrs}>
        <h3>Big Attr Toy Title</h3>
        <span>$4.99</span>
      </a>
    </div>`;
    const matches = extractListingMatches(html, customConfig, TARGET_URL);
    expect(matches).toHaveLength(1);
    expect(matches[0].listing.title).toBe("Big Attr Toy Title");
    expect(matches[0].listing.price).toBe(4.99);
  });
});

describe("assembleSupplierSources", () => {
  it("groups listings under the store that appears on the card", () => {
    const sources = assembleSupplierSources("alibaba", "Alibaba", STORE_HTML, TARGET_URL);
    expect(sources).toHaveLength(1);
    expect(sources[0].storeName).toBe("Factory X Store");
    expect(sources[0].storeUrl).toBe("https://factory-x.en.alibaba.com/store/123456.html");
    expect(sources[0].listingCount).toBe(2);
    expect(sources[0].listings).toHaveLength(2);
    expect(sources[0].dataSource).toBe("estimated");
    expect(sources[0].platformId).toBe("alibaba");
  });

  it("falls back to a platform-level source when no store links are found", () => {
    const sources = assembleSupplierSources("alibaba", "Alibaba", NO_STORE_HTML, TARGET_URL);
    expect(sources).toHaveLength(1);
    expect(sources[0].storeName).toBe("Alibaba search results");
    expect(sources[0].storeUrl).toBe(TARGET_URL);
    expect(sources[0].listings).toHaveLength(1);
    expect(sources[0].listings[0].title).toBe("Wobble Baby Toy");
  });

  it("extracts listings from host-prefixed product links", () => {
    const html = `
    <div>
      <a href="//www.alibaba.com/product-detail/host-toy_999.html"><h3>Host Prefixed Toy</h3></a>
      <span>$7.77</span>
    </div>`;
    const sources = assembleSupplierSources("alibaba", "Alibaba", html, TARGET_URL);
    expect(sources).toHaveLength(1);
    expect(sources[0].listings).toHaveLength(1);
    expect(sources[0].listings[0].title).toBe("Host Prefixed Toy");
    expect(sources[0].listings[0].price).toBe(7.77);
    expect(sources[0].listings[0].link).toBe(
      "https://www.alibaba.com/product-detail/host-toy_999.html"
    );
  });

  it("attributes a listing to the store link that appears after it in the card", () => {
    const html = `
    <li>
      <a href="https://www.dhgate.com/product/green-robot/12345.html" class="gallery-img-link"><img src="https://x/t.jpg"></a>
      <div class="gallery-pro-name"><a href="https://www.dhgate.com/product/green-robot/12345.html" class="pro-name" title="Hot BS 148 Rotation Smart Robot Toy">Hot BS 148</a></div>
      <div class="gallery-price-wrap"><span class="us-price">US $9.62</span></div>
      <div class="store-name"><a href="https://www.dhgate.com/store/1890265683">shenzhentoy</a></div>
    </li>`;
    const sources = assembleSupplierSources("dhgate", "DHgate", html, "https://www.dhgate.com/");
    expect(sources).toHaveLength(1);
    expect(sources[0].storeName).toBe("shenzhentoy");
    expect(sources[0].listings).toHaveLength(1);
    expect(sources[0].listings[0].title).toBe("Hot BS 148 Rotation Smart Robot Toy");
    expect(sources[0].listings[0].price).toBe(9.62);
    expect(sources[0].listings[0].link).toBe("https://www.dhgate.com/product/green-robot/12345.html");
  });

  it("parses comma-decimal prices and host-prefixed item links on AliExpress", () => {
    const html = `
    <div class="card">
      <a href="//fr.aliexpress.com/item/1005006123456789.html?spm=a2g0o.tm1000&gatewayAdapt=glo2fra" class="title">Chaussettes Enfant Lot De 10 Paires</a>
      <span class="price-current">11,29 €</span>
    </div>`;
    const sources = assembleSupplierSources(
      "aliexpress",
      "AliExpress",
      html,
      "https://www.aliexpress.com/wholesale?SearchText=chaussettes"
    );
    expect(sources).toHaveLength(1);
    const listing = sources[0].listings[0];
    expect(listing.title).toBe("Chaussettes Enfant Lot De 10 Paires");
    expect(listing.price).toBe(11.29);
    expect(listing.link).toBe(
      "https://fr.aliexpress.com/item/1005006123456789.html?spm=a2g0o.tm1000&gatewayAdapt=glo2fra"
    );
  });

  it("builds live supplier sources from the Global Sources Nuxt payload", () => {
    const payload: unknown[] = [];
    payload[0] = ["ShallowReactive", 1];
    payload[1] = { code: 0, msg: 0, data: 2, timestamp: 0 };
    payload[2] = { pageNum: 0, supplierVOList: 3 };
    payload[3] = [4];
    payload[4] = {
      websiteName: 7,
      supplierDetailUrl: "/exhibitors/HK/shenzhen-mark-technology-co-ltd_2008825129102/",
      products: 5,
    };
    payload[5] = [6];
    payload[6] = {
      productName: "Wireless Earbuds 60H Playback Earphones with Charging Case",
      productPrimaryImage: "https://p.globalsources.com/IMAGES/PDT/anc-tws.jpg",
      productDetailUrl: "/products/HK/wireless-earbuds-60h-playback_1219763770/",
    };
    payload[7] = "Shenzhen Mark Technology Co. Ltd";
    const html = `<html><body><script>window.__NUXT__={};${JSON.stringify(payload)};</script></body></html>`;

    const sources = assembleSupplierSources(
      "global_sources",
      "Global Sources",
      html,
      "https://www.globalsources.com/exhibitors/HK/?keyword=wireless%20earbuds"
    );
    expect(sources).toHaveLength(1);
    expect(sources[0].storeName).toBe("Shenzhen Mark Technology Co. Ltd");
    expect(sources[0].storeUrl).toBe(
      "https://www.globalsources.com/exhibitors/HK/shenzhen-mark-technology-co-ltd_2008825129102/"
    );
    expect(sources[0].dataSource).toBe("live");
    expect(sources[0].listingCount).toBe(1);
    expect(sources[0].listings[0].title).toContain("Wireless Earbuds 60H");
    expect(sources[0].listings[0].price).toBeNull();
    expect(sources[0].listings[0].link).toBe(
      "https://www.globalsources.com/products/HK/wireless-earbuds-60h-playback_1219763770/"
    );
  });

  it("builds live sources from the embedded offer-list JSON when present", () => {
    const payload = {
      offerResultData: {
        offers: [
          {
            title: "<img src='https://x/t.png'></img><span> </span>USB C Hub 7 Port Adapter",
            price: "$12.50~15.00",
            productUrl: "//www.alibaba.com/product-detail/usb-c-hub_111.html",
            supplierHomeHref: "//acme.en.alibaba.com/",
            companyName: "Acme Trading Co.",
            mainImage: "https://cdn.example.com/hub.jpg",
            reviewScore: "4.8",
            reviewCount: "126",
          },
          {
            title: "USB C Hub Slim Model",
            price: "$9.99",
            productUrl: "//www.alibaba.com/product-detail/usb-c-hub-slim_222.html",
            supplierHomeHref: "//acme.en.alibaba.com/",
            companyName: "Acme Trading Co.",
          },
          {
            title: "Budget Hub Without Supplier",
            price: "3.20",
            productUrl: "/product-detail/hub-nosupplier_333.html",
          },
        ],
      },
    };
    const html = `<html><script>window.__page__data_sse10._offer_list = ${JSON.stringify(payload)};</script></html>`;

    const sources = assembleSupplierSources("alibaba", "Alibaba", html, TARGET_URL);

    expect(sources).toHaveLength(2);
    const store = sources[0];
    expect(store.storeName).toBe("Acme Trading Co.");
    expect(store.storeUrl).toBe("https://acme.en.alibaba.com/");
    expect(store.dataSource).toBe("live");
    expect(store.listingCount).toBe(2);
    expect(store.listings[0].title).toBe("USB C Hub 7 Port Adapter");
    expect(store.listings[0].price).toBe(12.5);
    expect(store.listings[0].image).toBe("https://cdn.example.com/hub.jpg");
    expect(store.listings[0].rating).toBe(4.8);
    expect(store.listings[0].reviews).toBe(126);
    expect(store.listings[0].link).toBe("https://www.alibaba.com/product-detail/usb-c-hub_111.html");

    const loose = sources[1];
    expect(loose.storeName).toBe("Alibaba search results");
    expect(loose.dataSource).toBe("live");
    expect(loose.listings).toHaveLength(1);
    expect(loose.listings[0].price).toBe(3.2);
    expect(loose.listings[0].link).toBe(
      "https://www.alibaba.com/product-detail/hub-nosupplier_333.html"
    );
  });

  it("throws a safe error when the page has neither stores nor listings", () => {
    expect(() =>
      assembleSupplierSources("alibaba", "Alibaba", "<html><body>nope</body></html>", TARGET_URL)
    ).toThrow(PublicError);
  });

  it("throws a safe error for an unknown platform", () => {
    expect(() => assembleSupplierSources("unknown", "Unknown", STORE_HTML, TARGET_URL)).toThrow(
      PublicError
    );
  });
});

describe("sourceToSupplierProfile", () => {
  const source = assembleSupplierSources("alibaba", "Alibaba", STORE_HTML, TARGET_URL)[0];

  it("builds an honest unverified profile with zeroed reliability stats", () => {
    const profile = sourceToSupplierProfile(source, "find suppliers for baby toys");
    expect(profile.trustBadge).toBe("unverified");
    expect(profile.dataSource).toBe("estimated");
    expect(profile.stats.reliabilityScore).toBe(0);
    expect(profile.stats.orderCompletionRate).toBe(0);
    expect(profile.stats.totalProducts).toBe(2);
    expect(profile.source).toBe("alibaba");
    expect(profile.sourceUrl).toBe(source.storeUrl);
    expect(profile.listings).toHaveLength(2);
    expect(profile.matchedQuery).toBe("find suppliers for baby toys");
    expect(profile.description).toContain("not been measured");
  });

  it("derives price range and observed listing ratings from listings", () => {
    const profile = sourceToSupplierProfile(source, "baby toys");
    expect(profile.catalog.priceRange).toEqual({ min: 9.5, max: 12.99, currency: "USD" });
    expect(profile.stats.rating).toBe(4.6);
  });
});

describe("buildSupplierProfiles", () => {
  it("ranks profiles whose name matches the query first", () => {
    const storeSource = assembleSupplierSources("alibaba", "Alibaba", STORE_HTML, TARGET_URL)[0];
    const cjSource = {
      platformId: "cj",
      platformName: "CJ Dropshipping",
      storeName: "CJ Dropshipping",
      storeUrl: "https://www.cjdropshipping.com",
      listingCount: 1,
      listings: [
        { title: "Toy", price: 4, image: null, link: "https://cjdropshipping.com/1" },
      ],
      dataSource: "live" as const,
    };
    const profiles = buildSupplierProfiles([cjSource, storeSource], "factory robot toys");
    expect(profiles[0].name).toBe("Factory X Store");
    expect(profiles).toHaveLength(1);
  });

  it("drops suppliers without matching product listings and keeps matching listings only", () => {
    const matchingSource = {
      platformId: "cj",
      platformName: "CJ Dropshipping",
      storeName: "Wireless Tech Store",
      storeUrl: "https://www.cjdropshipping.com/store",
      listingCount: 2,
      listings: [
        { title: "Wireless Bluetooth Earbuds", price: 12, image: null, link: "https://example.com/earbuds" },
        { title: "Protective Phone Case", price: 4, image: null, link: "https://example.com/case" },
      ],
      dataSource: "live" as const,
    };
    const unrelatedSource = {
      ...matchingSource,
      storeName: "Phone Accessories Store",
      listings: [
        { title: "Protective Phone Case", price: 4, image: null, link: "https://example.com/other-case" },
      ],
    };
    const profiles = buildSupplierProfiles([matchingSource, unrelatedSource], "wireless bluetooth earbuds");

    expect(profiles).toHaveLength(1);
    expect(profiles[0].listings).toHaveLength(1);
    expect(profiles[0].listings?.[0].title).toBe("Wireless Bluetooth Earbuds");
  });

  it("returns no profiles when no listing matches the requested product", () => {
    const unrelatedSource = {
      platformId: "cj",
      platformName: "CJ Dropshipping",
      storeName: "CJ Dropshipping",
      storeUrl: "https://www.cjdropshipping.com",
      listingCount: 1,
      listings: [
        { title: "Protective Phone Case", price: 4, image: null, link: "https://example.com/case" },
      ],
      dataSource: "live" as const,
    };
    const profiles = buildSupplierProfiles([unrelatedSource], "zzzz unrelated query");
    expect(profiles).toHaveLength(0);
  });
});

describe("searchSupplierPlatforms", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetPoolStateForTests();
    __resetSupplierSearchCacheForTests();
    process.env.SCRAPER_API_KEYS = "test-scraper-key";
    mockGetPlatform.mockResolvedValue(null);
  });

  afterEach(() => {
    delete process.env.SCRAPER_API_KEYS;
    delete process.env.CJ_API_KEYS;
    vi.unstubAllGlobals();
  });

  it("fans out to scraper platforms and CJ, returning sources per platform", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => STORE_HTML })
    );
    mockSearchCJProducts.mockResolvedValue({
      search_results: [
        { title: "Baby Toy", price: 5, image: null, link: "https://cjdropshipping.com/1", source: "cj" },
      ],
    });

    const outcome = await searchSupplierPlatforms("baby toys", ["alibaba", "cj"]);

    expect(outcome.errors).toHaveLength(0);
    expect(outcome.keywords).toContain("baby");
    const platformIds = outcome.sources.map((s) => s.platformId);
    expect(platformIds).toContain("alibaba");
    expect(platformIds).toContain("cj");
    const cj = outcome.sources.find((s) => s.platformId === "cj");
    expect(cj?.dataSource).toBe("live");
    expect(cj?.storeName).toBe("CJ Dropshipping");
  });

  it("reports a per-platform error instead of failing the whole search", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429, text: async () => "rate limited" })
    );
    mockSearchCJProducts.mockResolvedValue({
      search_results: [
        { title: "Baby Toy", price: 5, image: null, link: "https://cjdropshipping.com/1", source: "cj" },
      ],
    });

    const outcome = await searchSupplierPlatforms("baby toys", ["alibaba", "cj"]);

    expect(outcome.errors).toHaveLength(1);
    expect(outcome.errors[0].platform).toBe("alibaba");
    expect(outcome.errors[0].error).toMatch(/429|quota/i);
    expect(outcome.sources.some((s) => s.platformId === "cj")).toBe(true);
  });

  it("surfaces missing configuration as a setup hint", async () => {
    delete process.env.SCRAPER_API_KEYS;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, text: async () => STORE_HTML })
    );

    const outcome = await searchSupplierPlatforms("baby toys", ["alibaba"]);
    expect(outcome.errors).toHaveLength(1);
    expect(outcome.errors[0].error).toMatch(/ScraperAPI is not configured|SCRAPER_API_KEYS/);
  });

  it("requests non-rendered HTML from ScraperAPI for DHgate and rendered HTML for Alibaba", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => STORE_HTML });
    vi.stubGlobal("fetch", fetchMock);

    await searchSupplierPlatforms("baby toys", ["dhgate"]);
    const dhgateUrl = String(fetchMock.mock.calls[0][0]);
    expect(dhgateUrl).toContain("render=false");

    fetchMock.mockClear();
    await searchSupplierPlatforms("baby toys", ["alibaba"]);
    const alibabaUrl = String(fetchMock.mock.calls[0][0]);
    expect(alibabaUrl).toContain("render=true");
  });

  it("retries once when the fetched page is missing expected content", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, text: async () => "<html>interstitial shell</html>" })
      .mockResolvedValueOnce({
        ok: true,
        text: async () => `${STORE_HTML}<script>window.__p._offer_list = {};</script>`,
      });
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await searchSupplierPlatforms("baby toys", ["alibaba"]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(outcome.errors).toHaveLength(0);
    expect(outcome.sources.some((s) => s.platformId === "alibaba")).toBe(true);
  });

  it("returns no sources and no errors for an empty platform selection intersection", async () => {
    const outcome = await searchSupplierPlatforms("baby toys", ["not_a_platform"]);
    expect(outcome.sources).toHaveLength(0);
    expect(outcome.errors).toHaveLength(0);
  });
});

describe("getSupplierPlatformStatuses", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPlatform.mockResolvedValue(null);
    delete process.env.SCRAPER_API_KEYS;
    delete process.env.CJ_API_KEYS;
  });

  it("marks platforms unconfigured when neither Firestore nor env keys exist", async () => {
    const statuses = await getSupplierPlatformStatuses();
    expect(statuses).toHaveLength(SUPPLIER_PLATFORMS.length);
    expect(statuses.every((s) => s.configured === false)).toBe(true);
  });

  it("marks scraper platforms configured when SCRAPER_API_KEYS is set", async () => {
    process.env.SCRAPER_API_KEYS = "key-1";
    const statuses = await getSupplierPlatformStatuses();
    const alibaba = statuses.find((s) => s.id === "alibaba");
    const cj = statuses.find((s) => s.id === "cj");
    expect(alibaba?.configured).toBe(true);
    expect(alibaba?.source).toBe("env");
    expect(cj?.configured).toBe(false);
    delete process.env.SCRAPER_API_KEYS;
  });

  it("prefers Firestore keys when a platform document has keys", async () => {
    mockGetPlatform.mockResolvedValue({ keys: [{ id: "k1", key: "fk" }] });
    const statuses = await getSupplierPlatformStatuses();
    const dhgate = statuses.find((s) => s.id === "dhgate");
    expect(dhgate?.configured).toBe(true);
    expect(dhgate?.source).toBe("firestore");
  });
});

describe("admin supplier provider key fallback", () => {
  let mockDB: ReturnType<typeof createMockAdminDB>;

  function adminKey(overrides: Partial<SupplierProviderKeyEntry> = {}): SupplierProviderKeyEntry {
    return {
      id: "skey_1",
      key: "admin-scraper-key",
      label: "Primary",
      priority: 1,
      requestsUsed: 0,
      requestsLimit: 1000,
      resetDate: "2026-10-01",
      lastError: null,
      lastStatus: "untested",
      ...overrides,
    };
  }

  async function seedAdminKeys(provider: string, keys: SupplierProviderKeyEntry[]): Promise<void> {
    await mockDB.collection("system").doc("supplierProviderKeys").set({ [provider]: keys });
  }

  async function readAdminKeys(provider: string): Promise<SupplierProviderKeyEntry[]> {
    const doc = await mockDB.collection("system").doc("supplierProviderKeys").get();
    const data = doc.exists ? doc.data() : {};
    return ((data as Record<string, unknown>)[provider] as SupplierProviderKeyEntry[]) || [];
  }

  beforeEach(() => {
    vi.clearAllMocks();
    __resetPoolStateForTests();
    __resetSupplierSearchCacheForTests();
    delete process.env.SCRAPER_API_KEYS;
    delete process.env.CJ_API_KEYS;
    mockGetPlatform.mockResolvedValue(null);
    mockDB = createMockAdminDB();
    installDocStoreTransactions(mockDB);
    vi.mocked(getAdminDB).mockResolvedValue(mockDB as never);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.mocked(getAdminDB).mockReset();
  });

  it("uses an admin supplier-provider key when no platform or env keys exist", async () => {
    await seedAdminKeys("scraperapi", [adminKey()]);
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => STORE_HTML });
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await searchSupplierPlatforms("baby toys", ["alibaba"]);

    expect(outcome.errors).toHaveLength(0);
    expect(outcome.sources.some((s) => s.platformId === "alibaba")).toBe(true);
    expect(String(fetchMock.mock.calls[0][0])).toContain("admin-scraper-key");
    const keys = await readAdminKeys("scraperapi");
    expect(keys[0].requestsUsed).toBe(1);
    expect(keys[0].lastStatus).toBe("healthy");
  });

  it("marks an exhausted admin key and rotates to the next one", async () => {
    await seedAdminKeys("scraperapi", [
      adminKey({ id: "skey_1", priority: 1 }),
      adminKey({ id: "skey_2", key: "admin-scraper-key-2", priority: 2 }),
    ]);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429, text: async () => "rate limited" })
      .mockResolvedValueOnce({ ok: true, text: async () => STORE_HTML });
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await searchSupplierPlatforms("baby toys", ["alibaba"]);

    expect(outcome.errors).toHaveLength(0);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);
    const keys = await readAdminKeys("scraperapi");
    expect(keys.find((k) => k.id === "skey_1")?.lastStatus).toBe("error");
    expect(keys.find((k) => k.id === "skey_1")?.lastError).toMatch(/429/);
    expect(keys.find((k) => k.id === "skey_2")?.lastStatus).toBe("healthy");
    expect(keys.find((k) => k.id === "skey_2")?.requestsUsed).toBe(1);
  });

  it("surfaces an honest error when every admin key is unavailable", async () => {
    await seedAdminKeys("scraperapi", [adminKey({ lastStatus: "error", lastError: "429" })]);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await searchSupplierPlatforms("baby toys", ["alibaba"]);

    expect(outcome.sources).toHaveLength(0);
    expect(outcome.errors).toHaveLength(1);
    expect(outcome.errors[0].error).toMatch(/unavailable/i);
    expect(outcome.errors[0].error).toMatch(/Supplier Provider Keys/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the env setup hint when no admin keys exist either", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const outcome = await searchSupplierPlatforms("baby toys", ["alibaba"]);

    expect(outcome.errors).toHaveLength(1);
    expect(outcome.errors[0].error).toMatch(/ScraperAPI is not configured|SCRAPER_API_KEYS/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports admin supplier-provider keys as the configured source", async () => {
    await seedAdminKeys("scraperapi", [adminKey()]);

    const statuses = await getSupplierPlatformStatuses();
    const alibaba = statuses.find((s) => s.id === "alibaba");
    const cj = statuses.find((s) => s.id === "cj");

    expect(alibaba?.configured).toBe(true);
    expect(alibaba?.source).toBe("admin");
    expect(cj?.configured).toBe(false);
  });
});
