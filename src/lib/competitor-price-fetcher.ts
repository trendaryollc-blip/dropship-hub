import type { CompetitorPrice } from "@/types/price-war";

interface ScrapeResult {
  success: boolean;
  price?: number;
  inStock?: boolean;
  seller?: string;
  error?: string;
}

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
];

const priceCache = new Map<string, { price: number; timestamp: number; inStock: boolean; seller: string }>();
const CACHE_TTL_MS = 60 * 60 * 1000;

function getRandomUA(): string {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function getCachedPrice(url: string): { price: number; inStock: boolean; seller: string } | null {
  const cached = priceCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }
  priceCache.delete(url);
  return null;
}

function setCachedPrice(url: string, price: number, inStock: boolean, seller: string) {
  priceCache.set(url, { price, timestamp: Date.now(), inStock, seller });
}

function detectPlatform(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("amazon.") || lower.includes("amzn.")) return "amazon";
  if (lower.includes("ebay.") || lower.includes("ebay.com")) return "ebay";
  if (lower.includes("walmart.")) return "walmart";
  if (lower.includes("target.")) return "target";
  if (lower.includes("aliexpress.")) return "aliexpress";
  if (lower.includes("shopify.") || lower.includes("myshopify.com")) return "shopify";
  return "generic";
}

function extractPriceFromHtml(html: string, platform: string): { price?: number; inStock: boolean; seller?: string } {
  let price: number | undefined;
  let inStock = true;
  let seller: string | undefined;

  const pricePatterns: Record<string, RegExp[]> = {
    amazon: [
      /class="a-price-whole"[^>]*>(\d+)/,
      /class="a-price-fraction"[^>]*>(\d+)/,
      /\"priceAmount\":(\d+\.?\d*)/,
      /\$(\d{1,5}\.\d{2})/,
      /(\d{1,5}\.\d{2})\s*(?:USD|\$)/,
    ],
    ebay: [
      /class="prcItr"[^>]*>[\s\S]*?(\d+[\.,]\d{2})/,
      /\"price\":\s*\"?(\d+\.?\d*)/,
      /\$(\d{1,5}\.\d{2})/,
    ],
    generic: [
      /\"price\":\s*\"?(\d+\.?\d*)/,
      /\"priceCurrency\".*?\"price\":\s*\"?(\d+\.?\d*)/,
      /class="price"[^>]*>[\s\S]*?(\d+[\.,]\d{2})/,
      /\$(\d{1,5}\.\d{2})/,
      /(\d{1,5}\.\d{2})\s*(?:USD|\$|EUR|GBP)/,
    ],
  };

  const patterns = pricePatterns[platform] || pricePatterns.generic;

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) {
      const parsed = parseFloat(match[1].replace(",", "."));
      if (!isNaN(parsed) && parsed > 0 && parsed < 100000) {
        price = parsed;
        break;
      }
    }
  }

  const lowerHtml = html.toLowerCase();
  if (lowerHtml.includes("out of stock") || lowerHtml.includes("unavailable") || lowerHtml.includes("sold out")) {
    inStock = false;
  }

  const sellerMatch = html.match(/class="seller[^"]*"[^>]*>([^<]+)/i) ||
    html.match(/\"sellerName\":\s*\"([^\"]+)\"/);
  if (sellerMatch) {
    seller = sellerMatch[1].trim();
  }

  return { price, inStock, seller };
}

export async function fetchCompetitorPrice(
  url: string,
  ruleId: string,
  platform?: string
): Promise<ScrapeResult> {
  try {
    const cached = getCachedPrice(url);
    if (cached) {
      return {
        success: true,
        price: cached.price,
        inStock: cached.inStock,
        seller: cached.seller,
      };
    }

    const detectedPlatform = platform || detectPlatform(url);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": getRandomUA(),
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate",
        "Cache-Control": "no-cache",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const { price, inStock, seller } = extractPriceFromHtml(html, detectedPlatform);

    if (price === undefined) {
      return { success: false, error: "Could not extract price from page" };
    }

    setCachedPrice(url, price, inStock, seller || "Unknown");

    return { success: true, price, inStock, seller };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return { success: false, error: "Request timed out" };
    }
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function fetchAllCompetitorPrices(
  ruleId: string,
  competitorUrls: string[],
  platforms: string[]
): Promise<CompetitorPrice[]> {
  const results: CompetitorPrice[] = [];

  const fetches = competitorUrls.map((url, index) =>
    fetchCompetitorPrice(url, ruleId, platforms[index] || platforms[0])
      .then((result) => {
        if (result.success && result.price !== undefined) {
          results.push({
            id: `comp-${Date.now()}-${index}`,
            ruleId,
            platform: detectPlatform(url),
            seller: result.seller || "Unknown",
            price: result.price,
            url,
            shipping: 0,
            totalLanded: result.price,
            inStock: result.inStock ?? true,
            lastSeen: new Date().toISOString(),
          });
        }
      })
      .catch(() => {})
  );

  await Promise.allSettled(fetches);
  return results;
}

export function clearPriceCache() {
  priceCache.clear();
}

export function getCacheStats() {
  return {
    size: priceCache.size,
    ttl: CACHE_TTL_MS,
  };
}
