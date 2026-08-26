const RAINFOREST_API_KEY = process.env.RAINFOREST_API_KEY;
const SERP_API_KEY = process.env.SERP_API_KEY;
const CJ_EMAIL = process.env.CJ_EMAIL;
const CJ_PASSWORD = process.env.CJ_PASSWORD;
const KEEPA_API_KEY = process.env.KEEPA_API_KEY;

export interface SearchResult {
  title: string;
  price: number | null;
  image: string | null;
  images?: string[];
  link: string;
  source: string;
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

export async function searchAmazon(query: string): Promise<{ search_results: SearchResult[] }> {
  if (!RAINFOREST_API_KEY) throw new Error("RAINFOREST_API_KEY not configured");

  const params = new URLSearchParams({
    api_key: RAINFOREST_API_KEY,
    type: "search",
    amazon_domain: "amazon.com",
    search_term: query,
    include_clause: "search_results(title,price,image,images,link,asin,rating,total_ratings)",
  });

  const res = await fetch(`https://api.rainforestapi.com/request?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Rainforest ${res.status}`);

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
      rating: typeof item.rating === "number" ? item.rating : undefined,
      reviews: typeof item.total_ratings === "number" ? item.total_ratings : undefined,
    };
  });

  return { search_results: items };
}

// ── Google Shopping (via SerpAPI) ────────────────────────────────────────────

export async function searchGoogleShopping(query: string): Promise<{ search_results: SearchResult[] }> {
  if (!SERP_API_KEY) throw new Error("SERP_API_KEY not configured");

  const params = new URLSearchParams({
    engine: "google_shopping",
    q: query,
    api_key: SERP_API_KEY,
    num: "20",
  });

  const res = await fetch(`https://serpapi.com/search?${params}`, {
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`SerpAPI ${res.status}`);

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

async function getCJAccessToken(): Promise<string> {
  if (!CJ_EMAIL || !CJ_PASSWORD) throw new Error("CJ credentials not configured");

  const res = await fetch("https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: CJ_EMAIL, password: CJ_PASSWORD }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`CJ Auth ${res.status}`);

  const data = await res.json();
  const token = data.data?.accessToken;
  if (!token) throw new Error("CJ auth returned no token");
  return token;
}

export async function searchCJProducts(query: string): Promise<{ search_results: SearchResult[] }> {
  const accessToken = await getCJAccessToken();

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
  if (!res.ok) throw new Error(`CJ Products ${res.status}`);

  const data = await res.json();
  const items = (data.data || []).map((p: Record<string, unknown>) => {
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
    return {
      title: String(p.productNameEn || p.productName || ""),
      price: typeof p.sellPrice === "number" ? p.sellPrice : typeof p.productPrice === "number" ? p.productPrice : null,
      image: primaryImage || null,
      images: allImages.length > 0 ? allImages : undefined,
      link: `https://cjdropshipping.com/product-p-${p.pid || ""}`,
      source: "cj",
    };
  });

  return { search_results: items };
}

// ── Keepa ────────────────────────────────────────────────────────────────────

export async function searchKeepaProducts(query: string): Promise<{ search_results: SearchResult[] }> {
  if (!KEEPA_API_KEY) throw new Error("KEEPA_API_KEY not configured");

  const res = await fetch("https://api.keepa.com/product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key: KEEPA_API_KEY,
      domain: 1,
      type: "ProductSearch",
      params: {
        term: query,
        excludeCategories: [],
      },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Keepa ${res.status}`);

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
    rating: typeof p.rating === "number" ? p.rating : undefined,
    reviews: typeof p.reviewCount === "number" ? p.reviewCount : undefined,
  }));

  return { search_results: items };
}

// ── AliExpress (via ScraperAPI) ──────────────────────────────────────────────

export async function searchAliExpress(query: string): Promise<{ search_results: SearchResult[] }> {
  const scraperKey = process.env.SCRAPER_API_KEY;
  if (!scraperKey) throw new Error("SCRAPER_API_KEY not configured for AliExpress");

  const targetUrl = `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(query)}`;
  const params = new URLSearchParams({
    api_key: scraperKey,
    url: targetUrl,
    render: "true",
  });

  const res = await fetch(`https://api.scraperapi.com?${params}`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`ScraperAPI ${res.status}`);

  const html = await res.text();

  // Extract product data from AliExpress HTML
  const titleMatches = html.match(/class="[^"]*title[^"]*"[^>]*>([^<]{5,120})/gi) || [];
  const priceMatches = html.match(/\$[\d,]+\.?\d*/g) || [];
  const imgMatches = html.match(/src="(https?:\/\/[^"]*\.(jpg|png|webp)[^"]*)/gi) || [];

  const items: SearchResult[] = titleMatches.slice(0, 15).map((t, i) => ({
    title: t.replace(/<[^>]*>/g, "").replace(/class="[^"]*"/g, "").trim(),
    price: priceMatches[i] ? parseFloat(priceMatches[i].replace("$", "").replace(",", "")) : null,
    image: imgMatches[i] ? imgMatches[i].replace('src="', "").replace(/["'].*$/, "") : null,
    link: targetUrl,
    source: "aliexpress",
  }));

  return { search_results: items };
}

// ── eBay (disabled — requires OAuth 2.0, placeholder keys) ──────────────────

export async function searchEbay(_query: string): Promise<{ search_results: SearchResult[] }> {
  throw new Error("eBay search disabled — requires OAuth 2.0 setup with real API keys");
}

// ── Platform Registry ────────────────────────────────────────────────────────

export interface PlatformConfig {
  id: string;
  name: string;
  envKey: string;
  searchFn: (query: string) => Promise<{ search_results: SearchResult[] }>;
}

export const platforms: PlatformConfig[] = [
  { id: "amazon", name: "Amazon", envKey: "RAINFOREST_API_KEY", searchFn: searchAmazon },
  { id: "google_shopping", name: "Google Shopping", envKey: "SERP_API_KEY", searchFn: searchGoogleShopping },
  { id: "cj", name: "CJ Dropshipping", envKey: "CJ_API_KEY", searchFn: searchCJProducts },
  { id: "keepa", name: "Keepa", envKey: "KEEPA_API_KEY", searchFn: searchKeepaProducts },
  { id: "aliexpress", name: "AliExpress", envKey: "SCRAPER_API_KEY", searchFn: searchAliExpress },
  // eBay disabled — requires OAuth 2.0 setup
  // { id: "ebay", name: "eBay", envKey: "EBAY_APP_ID", searchFn: searchEbay },
];

export async function searchAllPlatforms(
  query: string,
  selectedIds?: string[]
): Promise<PlatformSearchResult[]> {
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
