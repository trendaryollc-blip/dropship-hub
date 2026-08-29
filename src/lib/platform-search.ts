import { getAllPlatforms, incrementKeyUsage, markKeyError, markKeyHealthy, setPlatformCooldown, selectBestKey, type PlatformConfig as FirestorePlatform } from "./platform-config";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SearchResult {
  title: string;
  price: number | null;
  image: string | null;
  images?: string[];
  link: string;
  source: string;
  brand?: string;
  rating?: number;
  reviews?: number;
  [key: string]: unknown;
}

export interface PlatformSearchResult {
  platform: string;
  name: string;
  data: { search_results: SearchResult[] } | null;
  error?: string;
}

// ── Amazon (via Rainforest API) ──────────────────────────────────────────────

async function searchAmazonWithKey(apiKey: string, query: string): Promise<{ search_results: SearchResult[] }> {
  const params = new URLSearchParams({
    api_key: apiKey,
    type: "search",
    amazon_domain: "amazon.com",
    search_term: query,
    include_clause: "search_results(title,price,image,images,link,asin,brand,rating,total_ratings)",
  });

  const res = await fetch(`https://api.rainforestapi.com/request?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Rainforest API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const items = (data.search_results || []).map((item: Record<string, unknown>) => {
    const primaryImage = String(item.image || "");
    const additionalImages = Array.isArray(item.images)
      ? (item.images as unknown[]).map((img) => {
          if (typeof img === "string") return img;
          if (typeof img === "object" && img !== null) {
            const o = img as Record<string, unknown>;
            return String(o.link || o.url || o.large || o.high_res || "");
          }
          return "";
        }).filter((u) => u && u !== "null" && u !== "")
      : [];
    const allImages = [primaryImage, ...additionalImages].filter((u) => u && u !== "null" && u !== "");
    return {
      title: String(item.title || ""),
      price: typeof item.price === "number" ? item.price : null,
      image: primaryImage || null,
      images: allImages.length > 0 ? allImages : undefined,
      link: String(item.link || ""),
      source: "amazon",
      asin: String(item.asin || ""),
      brand: typeof item.brand === "string" && item.brand ? String(item.brand) : undefined,
      rating: typeof item.rating === "number" ? item.rating : undefined,
      reviews: typeof item.total_ratings === "number" ? item.total_ratings : undefined,
    };
  });

  return { search_results: items };
}

// ── Google Shopping (via SerpAPI) ────────────────────────────────────────────

async function searchGoogleShoppingWithKey(apiKey: string, query: string): Promise<{ search_results: SearchResult[] }> {
  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    api_key: apiKey,
    num: "20",
  });

  const res = await fetch(`https://serpapi.com/search?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`SerpAPI ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const items = (data.shopping_results || []).map((item: Record<string, unknown>) => {
    const primaryImage = String(item.thumbnail || "");
    const serpImages = Array.isArray(item.images) ? (item.images as unknown[]).map((img) => {
      if (typeof img === "string") return img;
      if (typeof img === "object" && img !== null) {
        const o = img as Record<string, unknown>;
        return String(o.original || o.large || o.link || o.url || "");
      }
      return "";
    }).filter((u) => u && u !== "null" && u !== "") : [];
    const allImages = [primaryImage, ...serpImages].filter((u) => u && u !== "null" && u !== "");
    return {
      title: String(item.title || ""),
      price: typeof item.extracted_price === "number" ? item.extracted_price : typeof item.price === "number" ? item.price : null,
      image: primaryImage || null,
      images: allImages.length > 0 ? allImages : undefined,
      link: String(item.link || item.product_link || ""),
      source: "google_shopping",
      rating: typeof item.rating === "number" ? item.rating : undefined,
      reviews: typeof item.reviews === "number" ? item.reviews : undefined,
    };
  });

  return { search_results: items };
}

// ── CJ Dropshipping ─────────────────────────────────────────────────────────

async function getCJAccessToken(apiKey: string): Promise<string> {
  if (apiKey.startsWith("MCP@")) return apiKey;

  const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CJ Auth ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const token = data.data?.accessToken;
  if (!token) throw new Error("CJ auth returned no token");
  return token;
}

async function searchCJProductsWithKey(apiKey: string, query: string): Promise<{ search_results: SearchResult[] }> {
  const accessToken = await getCJAccessToken(apiKey);

  const res = await fetch(
    `https://developers.cjdropshipping.com/api2.0/v1/product/list?productNameEn=${encodeURIComponent(query)}&pageNum=1&pageSize=20`,
    {
      method: "GET",
      headers: {
        "CJ-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`CJ Products ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const items = (data.data?.list || data.data || []).map((p: Record<string, unknown>) => {
    const primaryImage = String(p.productImage || "");
    const imageSet = Array.isArray(p.productImageSet)
      ? (p.productImageSet as unknown[]).map((img) => {
          if (typeof img === "string") return img;
          if (typeof img === "object" && img !== null) {
            const o = img as Record<string, unknown>;
            return String(o.url || o.image || o.productImage || "");
          }
          return "";
        }).filter((u) => u && u !== "null" && u !== "")
      : [];
    const allImages = [primaryImage, ...imageSet].filter((u) => u && u !== "null" && u !== "");
    const price = typeof p.sellPrice === "number" ? p.sellPrice : typeof p.sellPrice === "string" ? parseFloat(p.sellPrice) : typeof p.productPrice === "number" ? p.productPrice : typeof p.productPrice === "string" ? parseFloat(p.productPrice) : null;
    return {
      title: String(p.productNameEn || p.productName || ""),
      price: isNaN(price as number) ? null : price,
      image: primaryImage || null,
      images: allImages.length > 0 ? allImages : undefined,
      link: `https://cjdropshipping.com/product-p-${p.pid || ""}`,
      source: "cj",
      brand: typeof p.brand === "string" && p.brand ? String(p.brand) : undefined,
    };
  });

  return { search_results: items };
}

// ── Keepa ────────────────────────────────────────────────────────────────────

async function searchKeepaProductsWithKey(apiKey: string, query: string): Promise<{ search_results: SearchResult[] }> {
  const res = await fetch("https://api.keepa.com/product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: apiKey,
      domain: 1,
      type: "ProductSearch",
      params: {
        term: query,
        excludeCategories: [],
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Keepa API ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const items = (data.products || []).slice(0, 20).map((p: Record<string, unknown>) => ({
    title: String(p.title || ""),
    price: (() => {
      const stats = p.stats as Record<string, unknown> | undefined;
      const current = stats?.current;
      if (Array.isArray(current) && typeof current[0] === "number") return current[0] / 100;
      return null;
    })(),
    image: String(p.image || ""),
    link: `https://www.amazon.com/dp/${p.asin}`,
    source: "keepa",
    brand: typeof p.brand === "string" && p.brand ? String(p.brand) : undefined,
    rating: typeof p.rating === "number" ? p.rating : undefined,
    reviews: typeof p.reviewCount === "number" ? p.reviewCount : undefined,
  }));

  return { search_results: items };
}

// ── Google Shopping (via Serper.dev) ─────────────────────────────────────────

async function searchGoogleShoppingViaSerper(apiKey: string, query: string): Promise<{ search_results: SearchResult[] }> {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      q: query,
      gl: "us",
      hl: "en",
      num: 20,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Serper.dev ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawItems = data.shopping || data.organic || [];

  const items = rawItems.map((item: Record<string, unknown>) => {
    const img = String(item.thumbnail || item.image || item.product_image || "");
    const priceRaw = item.price || item.extracted_price;
    let price: number | null = null;
    if (typeof priceRaw === "number") {
      price = priceRaw;
    } else if (typeof priceRaw === "string" && priceRaw) {
      const parsed = parseFloat(priceRaw.replace(/[^0-9.]/g, ""));
      if (!isNaN(parsed)) price = parsed;
    }

    return {
      title: String(item.title || ""),
      price,
      image: img && img !== "undefined" && img !== "null" ? img : null,
      link: String(item.link || ""),
      source: "google_shopping",
      brand: typeof item.source === "string" ? item.source : undefined,
      rating: typeof item.rating === "number" ? item.rating : undefined,
      reviews: typeof item.reviews === "number" ? item.reviews : undefined,
    };
  });

  return { search_results: items };
}

// ── Walmart (via RapidAPI) ──────────────────────────────────────────────────

async function searchWalmartViaRapidAPI(apiKey: string, query: string): Promise<{ search_results: SearchResult[] }> {
  const params = new URLSearchParams({ query, page: "1", sort: "best_match" });
  const res = await fetch(`https://real-time-walmart-data1.p.rapidapi.com/search?${params}`, {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "real-time-walmart-data1.p.rapidapi.com",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Walmart RapidAPI ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const rawItems = data.data?.products || data.products || data.results || [];
  const items = rawItems.map((item: Record<string, unknown>) => {
    const img = String(item.thumbnail || item.image || item.main_image || item.product_image || "");
    const priceRaw = item.current_price || item.price || item.sale_price || item.extracted_price;
    let price: number | null = null;
    if (typeof priceRaw === "number") {
      price = priceRaw;
    } else if (typeof priceRaw === "string" && priceRaw) {
      const parsed = parseFloat(priceRaw.replace(/[^0-9.]/g, ""));
      if (!isNaN(parsed)) price = parsed;
    }

    return {
      title: String(item.title || item.name || ""),
      price,
      image: img && img !== "undefined" && img !== "null" ? img : null,
      link: String(item.product_url || item.url || item.link || ""),
      source: "walmart",
      brand: typeof item.brand === "string" ? item.brand : undefined,
      rating: typeof item.rating === "number" ? item.rating : typeof item.average_rating === "number" ? item.average_rating : undefined,
      reviews: typeof item.reviews === "number" ? item.reviews : typeof item.num_reviews === "number" ? item.num_reviews : undefined,
    };
  });

  return { search_results: items };
}

// ── AliExpress (via ScraperAPI) ──────────────────────────────────────────────

async function searchAliExpressWithKey(apiKey: string, query: string): Promise<{ search_results: SearchResult[] }> {
  const targetUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`;
  const params = new URLSearchParams({
    api_key: apiKey,
    url: targetUrl,
    render: "true",
  });

  const res = await fetch(`https://api.scraperapi.com?${params}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ScraperAPI ${res.status}: ${body.slice(0, 200)}`);
  }

  const html = await res.text();

  const productLinkPattern = /href="(\/item\/\d+\.html[^"]*)"/gi;
  const productLinks: string[] = [];
  let linkMatch;
  while ((linkMatch = productLinkPattern.exec(html)) !== null) {
    const fullUrl = `https://www.aliexpress.com${linkMatch[1]}`;
    if (!productLinks.includes(fullUrl)) {
      productLinks.push(fullUrl);
    }
  }

  const titleMatches = html.match(/class="[^"]*title[^"]*"[^>]*>([^<]{5,120})/gi) || [];
  const priceMatches = html.match(/\$[\d,]+\.?\d*/g) || [];
  const imgMatches = html.match(/src="(https?:\/\/[^"]*\.(jpg|png|webp)[^"]*)/gi) || [];

  const items: SearchResult[] = titleMatches.slice(0, 15).map((t, i) => ({
    title: t.replace(/<[^>]*>/g, "").replace(/class="[^"]*"/g, "").trim(),
    price: priceMatches[i] ? parseFloat(priceMatches[i].replace("$", "").replace(",", "")) : null,
    image: imgMatches[i] ? imgMatches[i].replace('src="', "").replace(/["'].*$/, "") : null,
    link: productLinks[i] || targetUrl,
    source: "aliexpress",
  }));

  return { search_results: items };
}

// ── Generic Scraper-Based Search ─────────────────────────────────────────────

const scraperSearchConfigs: Record<string, { name: string; searchUrl: (q: string) => string; linkPattern: RegExp }> = {
  walmart: {
    name: "Walmart",
    searchUrl: (q) => `https://www.walmart.com/search?q=${encodeURIComponent(q)}`,
    linkPattern: /href="(\/ip\/[^"]+)"/gi,
  },
  etsy: {
    name: "Etsy",
    searchUrl: (q) => `https://www.etsy.com/search?q=${encodeURIComponent(q)}`,
    linkPattern: /href="(\/listing\/\d+[^"]*)"/gi,
  },
  temu: {
    name: "Temu",
    searchUrl: (q) => `https://www.temu.com/search_result.html?search_key=${encodeURIComponent(q)}`,
    linkPattern: /href="(\/goods[^"]*)"/gi,
  },
  shein: {
    name: "Shein",
    searchUrl: (q) => `https://us.shein.com/pct-search.html?search_value=${encodeURIComponent(q)}`,
    linkPattern: /href="(\/[^"]*-p-\d+[^"]*)"/gi,
  },
  banggood: {
    name: "Banggood",
    searchUrl: (q) => `https://www.banggood.com/search/${encodeURIComponent(q)}.html`,
    linkPattern: /href="(\/[^"]*-p-\d+\.html[^"]*)"/gi,
  },
  dhgate: {
    name: "DHgate",
    searchUrl: (q) => `https://www.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(q)}`,
    linkPattern: /href="(\/product\/[^"]+)"/gi,
  },
  alibaba: {
    name: "Alibaba",
    searchUrl: (q) => `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`,
    linkPattern: /href="(\/product-detail\/[^"]+)"/gi,
  },
};

async function searchViaScraperWithKey(apiKey: string, platformId: string, query: string): Promise<{ search_results: SearchResult[] }> {
  const config = scraperSearchConfigs[platformId];
  if (!config) throw new Error(`No scraper config for ${platformId}`);

  const targetUrl = config.searchUrl(query);
  const params = new URLSearchParams({
    api_key: apiKey,
    url: targetUrl,
    render: "true",
  });

  const res = await fetch(`https://api.scraperapi.com?${params}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ScraperAPI ${res.status}: ${body.slice(0, 200)}`);
  }

  const html = await res.text();

  const productLinks: string[] = [];
  let linkMatch;
  while ((linkMatch = config.linkPattern.exec(html)) !== null) {
    let fullUrl = linkMatch[1];
    if (fullUrl.startsWith("/")) {
      const base = new URL(targetUrl);
      fullUrl = `${base.origin}${fullUrl}`;
    }
    if (!productLinks.includes(fullUrl)) {
      productLinks.push(fullUrl);
    }
  }

  const titlePatterns = [
    /class="[^"]*(?:product-title|item-title|goods-title|product-name)[^"]*"[^>]*>([^<]{5,150})/gi,
    /<h3[^>]*>([^<]{5,150})<\/h3>/gi,
    /<h2[^>]*>([^<]{5,150})<\/h2>/gi,
    /class="[^"]*title[^"]*"[^>]*>([^<]{5,120})/gi,
  ];
  const titles: string[] = [];
  for (const pat of titlePatterns) {
    let m;
    while ((m = pat.exec(html)) !== null) {
      const t = m[1].replace(/<[^>]*>/g, "").trim();
      if (t.length > 5 && !titles.includes(t)) titles.push(t);
    }
    if (titles.length > 0) break;
  }

  const priceMatches = html.match(/\$[\d,]+\.?\d*/g) || [];
  const prices = priceMatches.map((p) => parseFloat(p.replace("$", "").replace(",", ""))).filter((p) => !isNaN(p) && p > 0);

  const imgMatches = html.match(/src="(https?:\/\/[^"]*\.(jpg|png|webp)[^"]*)/gi) || [];
  const images = imgMatches.map((m) => m.replace('src="', "").replace(/["'].*$/, "")).filter((u) => u.startsWith("http"));

  const count = Math.min(titles.length, productLinks.length, 20);
  const items: SearchResult[] = [];
  for (let i = 0; i < count; i++) {
    items.push({
      title: titles[i],
      price: prices[i] ?? null,
      image: images[i] || null,
      link: productLinks[i] || targetUrl,
      source: platformId,
    });
  }

  if (items.length === 0) {
    throw new Error(`No results scraped from ${config.name}`);
  }

  return { search_results: items };
}

// ── Method-to-Search Function Mapping ───────────────────────────────────────

type SearchFn = (apiKey: string, query: string) => Promise<{ search_results: SearchResult[] }>;

const searchFunctions: Record<string, SearchFn> = {
  rainforest: searchAmazonWithKey,
  serpapi: searchGoogleShoppingWithKey,
  serper: searchGoogleShoppingViaSerper,
  rapidapi_walmart: searchWalmartViaRapidAPI,
  scraperapi: (key, q) => searchViaScraperWithKey(key, "generic", q),
};

// Platforms with dedicated search functions (identified by their Firestore document ID)
const dedicatedSearchFns: Record<string, SearchFn> = {
  amazon: searchAmazonWithKey,
  google_shopping: searchGoogleShoppingWithKey,
  cj: searchCJProductsWithKey,
  keepa: searchKeepaProductsWithKey,
  aliexpress: searchAliExpressWithKey,
  walmart: (key, q) => searchViaScraperWithKey(key, "walmart", q),
  etsy: (key, q) => searchViaScraperWithKey(key, "etsy", q),
  temu: (key, q) => searchViaScraperWithKey(key, "temu", q),
  shein: (key, q) => searchViaScraperWithKey(key, "shein", q),
  banggood: (key, q) => searchViaScraperWithKey(key, "banggood", q),
  dhgate: (key, q) => searchViaScraperWithKey(key, "dhgate", q),
  alibaba: (key, q) => searchViaScraperWithKey(key, "alibaba", q),
};

function getSearchFn(platform: FirestorePlatform): SearchFn {
  // First check if the platform's method has a direct match
  if (searchFunctions[platform.method]) {
    return searchFunctions[platform.method];
  }
  // Then check if we have a dedicated function for this platform ID
  if (dedicatedSearchFns[platform.id]) {
    return dedicatedSearchFns[platform.id];
  }
  // Fall back to scraper
  return searchFunctions.scraperapi;
}

// ── Firestore-Based Search (with Key Fallback) ─────────────────────────────

export async function searchAllPlatformsFromFirestore(
  query: string,
  selectedIds?: string[]
): Promise<PlatformSearchResult[]> {
  let platforms: FirestorePlatform[];
  try {
    platforms = await getAllPlatforms();
  } catch (error) {
    console.error("[platform-search] Failed to load platforms from Firestore:", error);
    return [];
  }

  // Filter to enabled platforms
  let enabled = platforms.filter((p) => p.enabled);

  // Further filter to selected platforms if specified
  if (selectedIds && selectedIds.length > 0) {
    enabled = enabled.filter((p) => selectedIds.includes(p.id));
  }

  // Check cooldowns — skip platforms that are in cooldown
  const now = new Date();
  const ready = enabled.filter((p) => {
    if (!p.cooldownUntil) return true;
    const cd = p.cooldownUntil as unknown as { seconds: number; nanoseconds?: number };
    if (cd && typeof cd.seconds === "number") {
      const cooldownDate = new Date(cd.seconds * 1000);
      return cooldownDate <= now;
    }
    return true;
  });

  if (ready.length === 0) return [];

  const settled = await Promise.allSettled(
    ready.map(async (platform) => {
      const searchFn = getSearchFn(platform);
      const keysSorted = [...platform.keys].sort((a, b) => a.priority - b.priority);

      // Try each key in priority order
      let lastError = "No API keys configured";

      for (const keyEntry of keysSorted) {
        // Check if this key has hit its rate limit
        const resetDate = keyEntry.resetDate ? new Date(keyEntry.resetDate) : null;
        const limitReached = resetDate && resetDate > now
          ? keyEntry.requestsUsed >= keyEntry.requestsLimit
          : false;

        if (limitReached) {
          lastError = `Key "${keyEntry.label}" rate limited (${keyEntry.requestsUsed}/${keyEntry.requestsLimit})`;
          continue;
        }

        try {
          const data = await searchFn(keyEntry.key, query);

          // Success — increment usage and mark healthy
          await incrementKeyUsage(platform.id, keyEntry.id);
          await markKeyHealthy(platform.id, keyEntry.id);

          return {
            platform: platform.id,
            name: platform.name,
            data,
            error: undefined as string | undefined,
          };
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";

          // Check if it's a rate limit / quota error — only set cooldown for these
          const isRateLimit = msg.includes("429") || msg.includes("402") || msg.includes("quota") || msg.includes("limit") || msg.includes("credits");

          if (isRateLimit) {
            // Mark this key as exhausted, try next key
            await markKeyError(platform.id, keyEntry.id, msg);
            lastError = `Key "${keyEntry.label}": ${msg}`;
            continue;
          }

          // Non-rate-limit error (network, timeout, bad response) — try next key
          lastError = msg;
          continue;
        }
      }

      // All keys exhausted or failed — set short cooldown (5 min)
      await setPlatformCooldown(platform.id, 5);
      return {
        platform: platform.id,
        name: platform.name,
        data: null as { search_results: SearchResult[] } | null,
        error: lastError,
      };
    })
  );

  const results: PlatformSearchResult[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") {
      results.push(r.value);
    }
  }

  return results;
}

// ── Legacy Env-Based Search (kept as fallback) ──────────────────────────────

const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;
const CJ_API_KEY = process.env.CJ_API_KEY;
const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

export interface PlatformConfig {
  id: string;
  name: string;
  envKey: string;
  searchFn: (query: string) => Promise<{ search_results: SearchResult[] }>;
}

export const platforms: PlatformConfig[] = [
  { id: "amazon", name: "Amazon", envKey: "RAINFOREST_API_KEY", searchFn: (q) => searchAmazonWithKey(RAINFOREST_API_KEY || "", q) },
  { id: "google_shopping", name: "Google Shopping", envKey: "SERP_API_KEY", searchFn: (q) => searchGoogleShoppingWithKey(SERP_API_KEY || "", q) },
  { id: "cj", name: "CJ Dropshipping", envKey: "CJ_API_KEY", searchFn: (q) => searchCJProductsWithKey(CJ_API_KEY || "", q) },
  { id: "keepa", name: "Keepa", envKey: "KEEPA_API_KEY", searchFn: (q) => searchKeepaProductsWithKey(KEEPA_API_KEY || "", q) },
  { id: "aliexpress", name: "AliExpress", envKey: "SCRAPER_API_KEY", searchFn: (q) => searchAliExpressWithKey(process.env.SCRAPER_API_KEY || "", q) },
  { id: "walmart", name: "Walmart", envKey: "SCRAPER_API_KEY", searchFn: (q) => searchViaScraperWithKey(process.env.SCRAPER_API_KEY || "", "walmart", q) },
  { id: "etsy", name: "Etsy", envKey: "SCRAPER_API_KEY", searchFn: (q) => searchViaScraperWithKey(process.env.SCRAPER_API_KEY || "", "etsy", q) },
  { id: "temu", name: "Temu", envKey: "SCRAPER_API_KEY", searchFn: (q) => searchViaScraperWithKey(process.env.SCRAPER_API_KEY || "", "temu", q) },
  { id: "shein", name: "Shein", envKey: "SCRAPER_API_KEY", searchFn: (q) => searchViaScraperWithKey(process.env.SCRAPER_API_KEY || "", "shein", q) },
  { id: "banggood", name: "Banggood", envKey: "SCRAPER_API_KEY", searchFn: (q) => searchViaScraperWithKey(process.env.SCRAPER_API_KEY || "", "banggood", q) },
  { id: "dhgate", name: "DHgate", envKey: "SCRAPER_API_KEY", searchFn: (q) => searchViaScraperWithKey(process.env.SCRAPER_API_KEY || "", "dhgate", q) },
  { id: "alibaba", name: "Alibaba", envKey: "SCRAPER_API_KEY", searchFn: (q) => searchViaScraperWithKey(process.env.SCRAPER_API_KEY || "", "alibaba", q) },
];

export async function searchAllPlatforms(
  query: string,
  selectedIds?: string[]
): Promise<PlatformSearchResult[]> {
  // Try Firestore first
  try {
    const firestoreResults = await searchAllPlatformsFromFirestore(query, selectedIds);
    if (firestoreResults.length > 0) return firestoreResults;
  } catch (error) {
    console.warn("[platform-search] Firestore search failed, falling back to env vars:", error);
  }

  // Fallback to env-based search
  const toSearch = selectedIds
    ? platforms.filter((p) => selectedIds.includes(p.id))
    : platforms;

  const settled = await Promise.allSettled(
    toSearch.map(async (platform) => {
      try {
        const data = await platform.searchFn(query);
        return {
          platform: platform.id,
          name: platform.name,
          data,
          error: undefined as string | undefined,
        };
      } catch (error) {
        return {
          platform: platform.id,
          name: platform.name,
          data: null as { search_results: SearchResult[] } | null,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    })
  );

  const results: PlatformSearchResult[] = [];
  for (const r of settled) {
    if (r.status === "fulfilled") {
      results.push(r.value);
    }
  }

  return results;
}

// ── Backward-Compatible Exports (for other API routes) ──────────────────────

export async function searchAmazon(query: string): Promise<{ search_results: SearchResult[] }> {
  return searchAmazonWithKey(process.env.RAINFOREST_API_KEY || "", query);
}

export async function searchGoogleShopping(query: string): Promise<{ search_results: SearchResult[] }> {
  return searchGoogleShoppingWithKey(process.env.SERP_API_KEY || "", query);
}

export async function searchCJProducts(query: string): Promise<{ search_results: SearchResult[] }> {
  return searchCJProductsWithKey(process.env.CJ_API_KEY || "", query);
}

export async function searchKeepaProducts(query: string): Promise<{ search_results: SearchResult[] }> {
  return searchKeepaProductsWithKey(process.env.KEEPA_API_KEY || "", query);
}

export async function searchAliExpress(query: string): Promise<{ search_results: SearchResult[] }> {
  return searchAliExpressWithKey(process.env.SCRAPER_API_KEY || "", query);
}

export async function searchViaScraper(platformId: string, query: string): Promise<{ search_results: SearchResult[] }> {
  return searchViaScraperWithKey(process.env.SCRAPER_API_KEY || "", platformId, query);
}
