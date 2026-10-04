import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/auth";
import { ConfigMissingError, withKeyPool } from "@/lib/api-keys/pool";
import { LIMITS } from "@/lib/rate-limit";

type MatchType = "exact" | "visual";

interface ImageMatch {
  title: string;
  platform: string;
  url: string;
  image: string | null;
  price: string | null;
  matchType: MatchType;
}

const MARKETPLACES: Array<{ id: string; domains: string[] }> = [
  { id: "amazon", domains: ["amazon", "amzn.to"] },
  { id: "aliexpress", domains: ["aliexpress"] },
  { id: "ebay", domains: ["ebay"] },
  { id: "walmart", domains: ["walmart"] },
  { id: "etsy", domains: ["etsy"] },
  { id: "alibaba", domains: ["alibaba"] },
  { id: "temu", domains: ["temu"] },
  { id: "shein", domains: ["shein"] },
  { id: "dhgate", domains: ["dhgate"] },
  { id: "cjdropshipping", domains: ["cjdropshipping"] },
  { id: "banggood", domains: ["banggood"] },
];

function parseImageUrl(value: unknown): URL | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const hostname = url.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname.endsWith(".local") ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
    ) return null;
    return url;
  } catch {
    return null;
  }
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function platformFromUrl(rawUrl: string): string | null {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    const labels = hostname.split(".");
    return MARKETPLACES.find((marketplace) => marketplace.domains.some((domain) =>
      domain.includes(".") ? hostname === domain || hostname.endsWith(`.${domain}`) : labels.includes(domain)
    ))?.id ?? null;
  } catch {
    return null;
  }
}

function normalizePlatform(value: string): string {
  const normalized = value.toLowerCase().replace(/[\s_-]+/g, "");
  return normalized === "cj" ? "cjdropshipping" : normalized;
}

function normalizePrice(value: unknown, currency?: unknown): string | null {
  if (typeof value === "string" && value.trim()) {
    const raw = value.trim();
    const code = typeof currency === "string" ? currency.trim().toUpperCase() : "";
    if (!code || /[$€£¥₹₩]|\b(?:USD|EUR|GBP|CNY|JPY|INR|CAD|AUD)\b/i.test(raw)) return raw;
    return `${raw} ${code}`;
  }
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    const code = typeof currency === "string" ? currency.trim().toUpperCase() : "";
    if (code) {
      try {
        return new Intl.NumberFormat("en", { style: "currency", currency: code }).format(value);
      } catch {
        return `${value} ${code}`;
      }
    }
    return String(value);
  }
  return null;
}

function priceFromMatch(item: Record<string, unknown>): string | null {
  const price = item.price;
  if (price && typeof price === "object") {
    const details = price as Record<string, unknown>;
    const currency = details.currency || item.currency;
    for (const field of ["raw", "value", "formatted", "extracted_value", "amount"]) {
      const normalized = normalizePrice(details[field], currency);
      if (normalized) return normalized;
    }
  }

  const currency = item.currency;
  for (const candidate of [price, item.price_str, item.price_value, item.extracted_price]) {
    const normalized = normalizePrice(candidate, currency);
    if (normalized) return normalized;
  }
  return null;
}

function mapMatches(values: unknown, matchType: MatchType, sourcePlatform: string): ImageMatch[] {
  if (!Array.isArray(values)) return [];
  return values.flatMap((value): ImageMatch[] => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    const url = stringValue(item.link || item.url || item.product_link);
    const platform = platformFromUrl(url);
    if (!url || !platform || platform === sourcePlatform) return [];
    return [{
      title: stringValue(item.title) || "Marketplace listing",
      platform,
      url,
      image: stringValue(item.thumbnail || item.image) || null,
      price: priceFromMatch(item),
      matchType,
    }];
  });
}

function titleOverlap(left: string, right: string): number {
  const words = (value: string) => new Set(
    value.toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter((word) => word.length > 2)
  );
  const leftWords = words(left);
  const rightWords = words(right);
  if (leftWords.size === 0 || rightWords.size === 0) return 0;
  const shared = [...leftWords].filter((word) => rightWords.has(word)).length;
  return shared / Math.min(leftWords.size, rightWords.size);
}

function attachProductPrices(matches: ImageMatch[], productData: Record<string, unknown>): ImageMatch[] {
  const productMatches = [
    ...mapMatches(productData.product_results, "visual", ""),
    ...mapMatches(productData.shopping_results, "visual", ""),
    ...mapMatches(productData.products, "visual", ""),
    ...mapMatches(productData.visual_matches, "visual", ""),
  ].filter((match) => match.price);

  return matches.map((match) => {
    if (match.price) return match;
    const candidate = productMatches
      .filter((product) => product.platform === match.platform)
      .map((product) => ({ product, overlap: titleOverlap(match.title, product.title) }))
      .filter(({ overlap }) => overlap >= 0.5)
      .sort((a, b) => b.overlap - a.overlap)[0];
    return candidate ? { ...match, price: candidate.product.price } : match;
  });
}

export const POST = withAuth(async (request: NextRequest) => {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const imageUrl = parseImageUrl(body?.imageUrl);
  if (!imageUrl) {
    return NextResponse.json({ error: "A valid public product image URL is required" }, { status: 400 });
  }

  try {
    const searchLens = async (type?: string) => withKeyPool("serpapi", async (apiKey) => {
      const params = new URLSearchParams({
        engine: "google_lens",
        url: imageUrl.toString(),
        api_key: apiKey,
        country: "us",
        hl: "en",
      });
      if (type) params.set("type", type);
      const response = await fetch(`https://serpapi.com/search.json?${params}`, {
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) {
        throw Object.assign(new Error(`Image search provider returned ${response.status}`), { status: response.status });
      }
      return response.json() as Promise<Record<string, unknown>>;
    });

    const data = await searchLens();
    const sourcePlatform = normalizePlatform(stringValue(body?.source));
    const exactMatches = mapMatches(data.exact_matches, "exact", sourcePlatform);
    const visualMatches = mapMatches(data.visual_matches, "visual", sourcePlatform);
    const seen = new Set<string>();
    const matches = [...exactMatches, ...visualMatches]
      .filter((match) => {
        const key = match.url.toLowerCase().split("?")[0];
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 40);
    let enrichedMatches = matches;
    if (matches.some((match) => !match.price)) {
      try {
        enrichedMatches = attachProductPrices(matches, await searchLens("products"));
      } catch {
        // Keep the valid visual results when optional price enrichment fails.
      }
    }

    return NextResponse.json({
      matches: enrichedMatches,
      total: enrichedMatches.length,
      exactCount: enrichedMatches.filter((match) => match.matchType === "exact").length,
      visualCount: enrichedMatches.filter((match) => match.matchType === "visual").length,
      searchedImage: imageUrl.toString(),
    });
  } catch (error) {
    if (error instanceof ConfigMissingError) {
      return NextResponse.json({ error: "Image search is unavailable: configure a SerpAPI key" }, { status: 503 });
    }
    return NextResponse.json({ error: "Image search failed. Please try again." }, { status: 502 });
  }
}, LIMITS.PRODUCT_ENRICH);