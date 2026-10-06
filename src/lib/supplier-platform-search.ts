import { searchCJProducts, type SearchResult } from "@/lib/platform-search";
import { getPlatform, selectBestKey, markKeyError, type PlatformFirestoreConfig } from "@/lib/platform-config";
import {
  withKeyPool,
  getPoolKeys,
  isQuotaError,
  isAuthError,
  ConfigMissingError,
  QuotaExhaustedError,
  type ProviderId,
} from "@/lib/api-keys/pool";
import { getProviderSetup } from "@/lib/api-keys/providers";
import {
  getSupplierProviderKeys,
  isUsableSupplierProviderKey,
  recordSupplierProviderKeySuccess,
  recordSupplierProviderKeyFailure,
} from "@/lib/supplier-provider-keys";
import { PublicError, safeErrorMessage } from "@/lib/api-errors";
import { createLogger } from "@/lib/logger";
import { getFeedCache, setFeedCache, __resetFeedCacheForTests } from "@/lib/feed-cache";
import { parseSupplierQuery, scoreSupplierMatch } from "@/lib/search/supplier-query";
import { parseListingDetails } from "@/lib/suppliers/listing-details";
import type { SupplierProfile, DiscoveredListing } from "@/types/supplier";

const logger = createLogger({ module: "supplier-platform-search" });

export interface SupplierPlatformMeta {
  id: string;
  name: string;
}

export const SUPPLIER_PLATFORMS: SupplierPlatformMeta[] = [
  { id: "alibaba", name: "Alibaba" },
  { id: "dhgate", name: "DHgate" },
  { id: "global_sources", name: "Global Sources" },
  { id: "aliexpress", name: "AliExpress" },
  { id: "cj", name: "CJ Dropshipping" },
];

export function supplierPlatformProvider(platformId: string): ProviderId {
  return platformId === "cj" ? "cj" : "scraperapi";
}

interface SupplierScraperConfig {
  searchUrl: (q: string) => string;
  linkPattern: string;
  storePatterns: string[];
  embeddedJsonMarker?: string;
  payload?: "nuxt-suppliers";
  render?: boolean;
  timeoutMs?: number;
  windowAfter?: number;
  contentProbe?: string;
  defaultCurrency?: string;
}

const supplierScraperConfigs: Record<string, SupplierScraperConfig> = {
  alibaba: {
    searchUrl: (q) => `https://www.alibaba.com/trade/search?SearchText=${encodeURIComponent(q)}`,
    linkPattern: String.raw`href="([^"]*\/product-detail\/[^"]+)"`,
    storePatterns: [
      String.raw`href="((?:https?:)?\/\/[^"]*alibaba\.com\/(?:store|company-detail|supplier)\/[^"]*)"`,
      String.raw`href="(\/\/[^"]*\.en\.alibaba\.com\/store\/[^"]*)"`,
    ],
    embeddedJsonMarker: "_offer_list = ",
    timeoutMs: 90000,
    contentProbe: "_offer_list",
    defaultCurrency: "USD",
  },
  dhgate: {
    searchUrl: (q) => `https://www.dhgate.com/wholesale/search.do?searchkey=${encodeURIComponent(q)}`,
    linkPattern: String.raw`href="([^"]*\/product\/[^"]+)"`,
    storePatterns: [
      String.raw`href="((?:https?:)?\/\/[^"]*dhgate\.com\/store\/[^"]*)"`,
    ],
    render: false,
    timeoutMs: 30000,
    windowAfter: 3000,
    defaultCurrency: "USD",
  },
  global_sources: {
    searchUrl: (q) => `https://www.globalsources.com/exhibitors/HK/?keyword=${encodeURIComponent(q)}`,
    linkPattern: String.raw`href="([^"]*\/products\/[^"]+)"`,
    storePatterns: [
      String.raw`href="([^"]*\/exhibitors\/[^"]+)"`,
    ],
    payload: "nuxt-suppliers",
    render: false,
    timeoutMs: 30000,
    contentProbe: "supplierVOList",
  },
  aliexpress: {
    searchUrl: (q) => `https://www.aliexpress.com/wholesale?SearchText=${encodeURIComponent(q)}`,
    linkPattern: String.raw`href="([^"]*\/(?:item|wholesale)\/[^"]+)"`,
    storePatterns: [
      String.raw`href="((?:https?:)?\/\/[^"]*aliexpress\.com\/store\/[^"]*)"`,
    ],
    render: false,
    timeoutMs: 30000,
    windowAfter: 2500,
    defaultCurrency: "USD",
  },
};

export interface StoreMatch {
  url: string;
  name: string;
  firstIndex: number;
  count: number;
}

export interface SupplierSource {
  platformId: string;
  platformName: string;
  storeName: string;
  storeUrl: string;
  listingCount: number;
  listings: DiscoveredListing[];
  dataSource: "live" | "estimated";
}

export interface SupplierPlatformError {
  platform: string;
  name: string;
  error: string;
}

export interface SupplierSearchOutcome {
  sources: SupplierSource[];
  errors: SupplierPlatformError[];
  keywords: string[];
}

function absolutize(href: string, targetUrl: string): string {
  if (href.startsWith("//")) return `https:${href}`;
  try {
    return new URL(href, targetUrl).toString();
  } catch {
    return href;
  }
}

function stripTags(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeUrlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function nameFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segment = parsed.pathname.split("/").filter(Boolean).pop() || "";
    const cleaned = decodeURIComponent(segment)
      .replace(/\.(html?|php)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\d{4,}\b/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (cleaned.length >= 3) return cleaned.slice(0, 80);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function extractStores(
  html: string,
  config: SupplierScraperConfig,
  targetUrl: string
): StoreMatch[] {
  const byUrl = new Map<string, StoreMatch>();
  for (const pattern of config.storePatterns) {
    const re = new RegExp(pattern, "gi");
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) !== null) {
      const url = absolutize(decodeUrlEntities(match[1]), targetUrl);
      const anchorStart = html.lastIndexOf("<a", match.index);
      const anchorEnd = html.indexOf("</a>", match.index);
      const anchorText =
        anchorStart >= 0 && anchorEnd > anchorStart && anchorEnd - anchorStart < 600
          ? stripTags(html.slice(anchorStart, anchorEnd))
          : "";
      const existing = byUrl.get(url);
      if (existing) {
        existing.count += 1;
        if ((!existing.name || existing.name === "") && anchorText.length <= 80) {
          existing.name = anchorText;
        }
      } else {
        const derived = anchorText && anchorText.length <= 80 ? anchorText : "";
        byUrl.set(url, {
          url,
          name: derived || nameFromUrl(url),
          firstIndex: match.index,
          count: 1,
        });
      }
    }
  }
  return [...byUrl.values()].filter((s) => s.url.includes("."));
}

function extractJsonLdListings(html: string, targetUrl: string): Array<{ listing: DiscoveredListing; index: number }> {
  const pattern = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
  const out: Array<{ listing: DiscoveredListing; index: number }> = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1]);
      const items = parsed["@type"] === "ItemList" ? parsed.itemListElement || [] : [parsed];
      for (const item of items) {
        const product = item.item || item;
        if (product["@type"] !== "Product" && product["@type"] !== "Offer") continue;
        const offers = product.offers || product;
        const price =
          typeof offers.price === "number"
            ? offers.price
            : typeof offers.lowPrice === "number"
              ? offers.lowPrice
              : typeof offers.price === "string"
                ? parseFloat(offers.price)
                : null;
        if (!product.name || !price || price <= 0) continue;
        const currencyToken = offers.priceCurrency ?? product.priceCurrency;
        const currency = normalizeCurrencyToken(
          typeof currencyToken === "string" ? currencyToken : undefined
        );
        out.push({
          listing: {
            title: String(product.name),
            price,
            currency,
            image: product.image
              ? Array.isArray(product.image)
                ? String(product.image[0])
                : String(product.image)
              : null,
            link: product.url ? absolutize(String(product.url), targetUrl) : targetUrl,
            rating:
              typeof product.aggregateRating?.ratingValue === "number"
                ? product.aggregateRating.ratingValue
                : undefined,
            reviews:
              typeof product.aggregateRating?.reviewCount === "number"
                ? product.aggregateRating.reviewCount
                : undefined,
          },
          index: match.index,
        });
      }
    } catch {
      continue;
    }
  }
  return out;
}

const TITLE_PATTERNS = [
  String.raw`class="[^"]*(?:product-title|item-title|goods-title|product-name|pro-name|titleRow)[^"]*"(?:(?!title=")[^>])*>([^<]{5,150})`,
  String.raw`<a[^>]*?(?<![\w-])title="([^"]{8,150})"`,
  String.raw`class="[^"]*(?:product-title|item-title|goods-title|product-name|pro-name|titleRow|title)[^"]*"(?:(?!title=")[^>])*>([\s\S]{5,300}?)<\/(?:a|div|span|h\d)>`,
  String.raw`<h3[^>]*>([\s\S]{5,300}?)<\/h3>`,
  String.raw`<h2[^>]*>([\s\S]{5,300}?)<\/h2>`,
  String.raw`class="[^"]*title[^"]*"[^>]*>([^<]{5,120})`,
];

const CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "CNY",
  "RMB",
  "JPY",
  "HKD",
  "AUD",
  "CAD",
  "SGD",
  "NZD",
  "TWD",
  "INR",
  "KRW",
  "BRL",
  "RUB",
  "CHF",
  "MXN",
  "AED",
  "SAR",
  "PLN",
  "SEK",
  "THB",
  "VND",
  "IDR",
  "TRY",
  "ZAR",
  "PHP",
  "MYR",
  "PKR",
  "EGP",
  "NGN",
  "ILS",
  "UAH",
] as const;

const CURRENCY_CODE_ALIASES: Record<string, string> = { RMB: "CNY" };

const CURRENCY_BY_SYMBOL: Record<string, string> = {
  "US$": "USD",
  "CA$": "CAD",
  "C$": "CAD",
  "AU$": "AUD",
  "A$": "AUD",
  "HK$": "HKD",
  "NT$": "TWD",
  "NZ$": "NZD",
  "S$": "SGD",
  "R$": "BRL",
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "₹": "INR",
  "₩": "KRW",
  "₽": "RUB",
  "₺": "TRY",
  "₪": "ILS",
};

const AMBIGUOUS_SYMBOLS = ["¥", "￥"];

const SYMBOLS_BY_LENGTH = Object.keys(CURRENCY_BY_SYMBOL).sort((a, b) => b.length - a.length);

const CODE_PATTERN = new RegExp(`\\b(${CURRENCY_CODES.join("|")})\\b`, "i");
const CODE_ONLY_PATTERN = new RegExp(`^(?:${CURRENCY_CODES.join("|")})$`);
const NUMBER_PATTERN = /\d[\d.,]*/g;
const PRICE_CONTEXT_PATTERN = /\b(?:price|prices|cost|amount|from|only|was|now)\b/i;

const IMAGE_PATTERN = String.raw`(?:src|data-src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"`;
const RATING_PATTERN = /(\d(?:\.\d)?)\s*(?:\/\s*5|stars?)/i;

function normalizeCurrencyToken(token: string | undefined): string | null {
  if (!token) return null;
  const upper = token.trim().toUpperCase();
  if (CODE_ONLY_PATTERN.test(upper)) return CURRENCY_CODE_ALIASES[upper] ?? upper;
  return CURRENCY_BY_SYMBOL[token.trim()] ?? null;
}

function parsePriceNumber(raw: string): number | null {
  let normalized = raw.trim();
  if (/[.,]$/.test(normalized)) return null;
  if (!/^\d[\d.,]*$/.test(normalized)) return null;
  if (/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) {
    normalized = normalized.replace(/\./g, "");
  } else if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(normalized)) {
    normalized = normalized.replace(/,/g, "");
  } else if (/^\d+,\d{1,2}$/.test(normalized)) {
    normalized = normalized.replace(",", ".");
  }
  const parsed = parseFloat(normalized);
  if (!isFinite(parsed) || parsed <= 0 || parsed >= 100000) return null;
  return parsed;
}

function pricesIn(text: string): number[] {
  const out: number[] = [];
  NUMBER_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NUMBER_PATTERN.exec(text)) !== null) {
    const parsed = parsePriceNumber(match[0]);
    if (parsed !== null) out.push(parsed);
  }
  return out;
}

function adjacentPrice(text: string, symbolIndex: number, symbolLength: number): number | null {
  const after = /^\s*(\d[\d.,]*)/.exec(text.slice(symbolIndex + symbolLength));
  if (after) {
    const parsed = parsePriceNumber(after[1]);
    if (parsed !== null) return parsed;
  }
  const before = /(\d[\d.,]*)\s*$/.exec(text.slice(0, symbolIndex));
  if (before) {
    const parsed = parsePriceNumber(before[1]);
    if (parsed !== null) return parsed;
  }
  return null;
}

export function parsePriceWithCurrency(
  raw: string,
  defaultCurrency?: string
): { price: number; currency: string | null } | null {
  if (!raw) return null;
  const text = stripTags(raw).replace(/\s+/g, " ").trim();
  if (!text) return null;

  const codeMatch = CODE_PATTERN.exec(text);
  const declaredCurrency = codeMatch ? normalizeCurrencyToken(codeMatch[1]) : null;

  for (const symbol of SYMBOLS_BY_LENGTH) {
    const index = text.indexOf(symbol);
    if (index < 0) continue;
    const price = adjacentPrice(text, index, symbol.length);
    if (price === null) continue;
    return { price, currency: CURRENCY_BY_SYMBOL[symbol] };
  }

  for (const symbol of AMBIGUOUS_SYMBOLS) {
    const index = text.indexOf(symbol);
    if (index < 0) continue;
    const price = adjacentPrice(text, index, symbol.length);
    if (price === null) continue;
    return { price, currency: declaredCurrency };
  }

  const fallbackCurrency = declaredCurrency ?? defaultCurrency ?? null;
  const numbers = pricesIn(text);
  if (numbers.length === 1) return { price: numbers[0], currency: fallbackCurrency };
  if (numbers.length > 1 && PRICE_CONTEXT_PATTERN.test(text)) {
    return { price: numbers[0], currency: fallbackCurrency };
  }
  return null;
}

function firstTitle(segment: string): string {
  for (const source of TITLE_PATTERNS) {
    const m = new RegExp(source, "i").exec(segment);
    if (m) {
      const cleaned = stripTags(m[1]).slice(0, 150);
      if (cleaned.length >= 5) return cleaned;
    }
  }
  return "";
}

function extractWindowListing(
  afterSegment: string,
  beforeSegment: string,
  link: string,
  defaultCurrency?: string
): DiscoveredListing | null {
  const title = firstTitle(afterSegment) || firstTitle(beforeSegment);
  if (!title) return null;

  const parsed =
    parsePriceWithCurrency(afterSegment, defaultCurrency) ??
    parsePriceWithCurrency(beforeSegment, defaultCurrency);

  const imageMatch =
    new RegExp(IMAGE_PATTERN, "i").exec(afterSegment) ||
    new RegExp(IMAGE_PATTERN, "i").exec(beforeSegment);
  const ratingMatch = RATING_PATTERN.exec(afterSegment) || RATING_PATTERN.exec(beforeSegment);
  const details = parseListingDetails(`${afterSegment} ${beforeSegment}`);

  return {
    title,
    price: parsed?.price ?? null,
    currency: parsed?.currency ?? defaultCurrency ?? null,
    image: imageMatch ? imageMatch[1] : null,
    link,
    rating: ratingMatch ? parseFloat(ratingMatch[1]) : undefined,
    moq: details.moq ?? null,
    shippingDays: details.shippingDays ?? null,
    yearsInBusiness: details.yearsInBusiness ?? null,
  };
}

export function extractListingMatches(
  html: string,
  config: SupplierScraperConfig,
  targetUrl: string
): Array<{ listing: DiscoveredListing; index: number; windowStoreUrl?: string }> {
  const jsonLd = extractJsonLdListings(html, targetUrl);
  const linkRe = new RegExp(config.linkPattern, "gi");
  const out: Array<{ listing: DiscoveredListing; index: number; windowStoreUrl?: string }> = [];
  const seen = new Set<string>();
  const windowAfter = config.windowAfter ?? 2500;
  const storeRes = config.storePatterns.map((pattern) => new RegExp(pattern, "i"));

  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(html)) !== null) {
    const link = absolutize(decodeUrlEntities(match[1]), targetUrl);
    if (seen.has(link)) continue;
    const attrEnd = match.index + match[0].length;
    const afterEnd = Math.min(html.length, attrEnd + windowAfter);
    const beforeStart = Math.max(0, match.index - 600);
    const afterSegment = html.slice(attrEnd, afterEnd);
    const listing = extractWindowListing(
      afterSegment,
      html.slice(beforeStart, match.index),
      link,
      config.defaultCurrency
    );
    if (listing) {
      seen.add(link);
      let windowStoreUrl: string | undefined;
      for (const storeRe of storeRes) {
        const storeMatch = storeRe.exec(afterSegment);
        if (storeMatch) {
          windowStoreUrl = absolutize(decodeUrlEntities(storeMatch[1]), targetUrl);
          break;
        }
      }
      out.push({ listing, index: match.index, windowStoreUrl });
    }
  }

  const merged = [...jsonLd, ...out];
  const byLink = new Map<string, { listing: DiscoveredListing; index: number }>();
  for (const entry of merged) {
    const existing = byLink.get(entry.listing.link);
    if (!existing || (existing.listing.price === null && entry.listing.price !== null)) {
      byLink.set(entry.listing.link, entry);
    }
  }
  return [...byLink.values()].sort((a, b) => a.index - b.index);
}

const MAX_STORES = 5;
const MAX_LISTINGS = 20;
const ATTRIBUTION_WINDOW = 4000;

function parseJsonBlockAt(source: string, start: number): unknown | null {
  const open = source[start];
  if (open !== "[" && open !== "{") return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "[" || ch === "{") depth++;
    else if (ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(source.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function pageJsonAt(html: string, marker: string): unknown | null {
  const markerIndex = html.indexOf(marker);
  if (markerIndex < 0) return null;
  const start = html.indexOf("{", markerIndex);
  if (start < 0) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(start, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function looksLikeEmbeddedCard(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.title === "string" && typeof record.productUrl === "string";
}

function collectEmbeddedCards(node: unknown, out: Record<string, unknown>[], depth: number): void {
  if (depth > 8 || out.length >= 300) return;
  if (Array.isArray(node)) {
    if (node.some(looksLikeEmbeddedCard)) {
      for (const item of node) {
        if (looksLikeEmbeddedCard(item)) out.push(item as Record<string, unknown>);
      }
      return;
    }
    for (const item of node) collectEmbeddedCards(item, out, depth + 1);
    return;
  }
  if (node && typeof node === "object") {
    for (const value of Object.values(node)) collectEmbeddedCards(value, out, depth + 1);
  }
}

function stringField(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function numericField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  if (typeof value === "number" && isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (isFinite(parsed)) return parsed;
  }
  return null;
}

function firstPriceValue(raw: string): number | null {
  const match = /(\d[\d.,]*)/.exec(raw);
  if (!match) return null;
  return parsePriceNumber(match[1]);
}

function embeddedCurrencyValue(raw: string): string | null {
  const symbol = /[$¥￥€£]/.exec(raw);
  return symbol ? normalizeCurrencyToken(symbol[0]) : null;
}

function embeddedImage(record: Record<string, unknown>): string | null {
  const main = stringField(record, "mainImage");
  if (main) return absolutize(main, "");
  const images = record.multiImage;
  if (Array.isArray(images)) {
    for (const image of images) {
      if (typeof image === "string" && image.startsWith("http")) return image;
    }
  }
  return null;
}

function embeddedToListing(
  card: Record<string, unknown>,
  targetUrl: string,
  defaultCurrency?: string
): DiscoveredListing | null {
  const rawTitle = stringField(card, "title");
  const productUrl = stringField(card, "productUrl");
  if (!rawTitle || !productUrl) return null;
  const title = stripTags(rawTitle).slice(0, 150);
  if (title.length < 5) return null;
  const rawPrice = stringField(card, "price");
  const rating = numericField(card, "reviewScore");
  const reviews = numericField(card, "reviewCount");
  const moq = numericField(card, "moq") ?? numericField(card, "minOrder") ?? numericField(card, "minOrderQuantity");
  const shippingDays = numericField(card, "deliveryDays") ?? numericField(card, "shippingDays");
  return {
    title,
    price: rawPrice ? firstPriceValue(rawPrice) : null,
    currency: rawPrice
      ? embeddedCurrencyValue(rawPrice) ?? defaultCurrency ?? null
      : defaultCurrency ?? null,
    image: embeddedImage(card),
    link: absolutize(productUrl, targetUrl),
    rating: rating && rating > 0 && rating <= 5 ? rating : undefined,
    reviews: reviews && reviews > 0 ? Math.round(reviews) : undefined,
    moq: moq && moq > 0 ? Math.round(moq) : null,
    shippingDays: shippingDays && shippingDays > 0 ? Math.round(shippingDays) : null,
  };
}

function assembleFromEmbeddedCards(
  platformId: string,
  platformName: string,
  html: string,
  targetUrl: string,
  config: SupplierScraperConfig
): SupplierSource[] | null {
  if (!config.embeddedJsonMarker) return null;
  const payload = pageJsonAt(html, config.embeddedJsonMarker);
  if (payload === null) return null;
  const cards: Record<string, unknown>[] = [];
  collectEmbeddedCards(payload, cards, 0);
  if (cards.length === 0) return null;

  const byStore = new Map<string, { storeName: string; listings: DiscoveredListing[] }>();
  const loose: DiscoveredListing[] = [];

  for (const card of cards) {
    const listing = embeddedToListing(card, targetUrl, config.defaultCurrency);
    if (!listing) continue;
    const storeRaw = stringField(card, "supplierHomeHref") ?? stringField(card, "supplierHref");
    if (!storeRaw) {
      loose.push(listing);
      continue;
    }
    const storeUrl = absolutize(storeRaw, targetUrl);
    const existing = byStore.get(storeUrl);
    if (existing) {
      existing.listings.push(listing);
    } else {
      byStore.set(storeUrl, {
        storeName: stringField(card, "companyName") || nameFromUrl(storeUrl),
        listings: [listing],
      });
    }
  }

  if (byStore.size === 0 && loose.length === 0) return null;

  const sources: SupplierSource[] = [...byStore.entries()]
    .sort((a, b) => b[1].listings.length - a[1].listings.length)
    .slice(0, MAX_STORES)
    .map(([storeUrl, bucket]) => ({
      platformId,
      platformName,
      storeName: bucket.storeName,
      storeUrl,
      listingCount: bucket.listings.length,
      listings: bucket.listings.slice(0, MAX_LISTINGS),
      dataSource: "live" as const,
    }));

  if (loose.length > 0) {
    sources.push({
      platformId,
      platformName,
      storeName: `${platformName} search results`,
      storeUrl: targetUrl,
      listingCount: loose.length,
      listings: loose.slice(0, MAX_LISTINGS),
      dataSource: "live",
    });
  }

  return sources;
}

function assembleFromNuxtSuppliers(
  platformId: string,
  platformName: string,
  html: string,
  targetUrl: string
): SupplierSource[] | null {
  const markerIndex = html.indexOf('"supplierVOList"');
  if (markerIndex < 0) return null;
  const scriptStart = html.lastIndexOf("<script", markerIndex);
  const scriptOpen = scriptStart >= 0 ? html.indexOf(">", scriptStart) : -1;
  const scriptEnd = html.indexOf("</script>", markerIndex);
  if (scriptOpen < 0 || scriptEnd < 0) return null;
  const content = html.slice(scriptOpen + 1, scriptEnd);

  let arr: unknown[] | null = null;
  for (const start of [content.indexOf("["), content.indexOf("{")]) {
    if (start < 0) continue;
    const parsed = parseJsonBlockAt(content, start);
    if (Array.isArray(parsed)) {
      arr = parsed;
      break;
    }
  }
  if (!arr) return null;

  const deref = (value: unknown): unknown =>
    typeof value === "number" && value >= 0 && value < arr!.length ? arr![value] : value;

  let supplierList: unknown = null;
  for (const element of arr) {
    if (!element || typeof element !== "object" || Array.isArray(element)) continue;
    const record = element as Record<string, unknown>;
    if (!("data" in record)) continue;
    const data = deref(record.data);
    if (!data || typeof data !== "object" || Array.isArray(data)) continue;
    const list = deref((data as Record<string, unknown>).supplierVOList);
    if (Array.isArray(list)) {
      supplierList = list;
      break;
    }
  }
  if (!Array.isArray(supplierList)) return null;

  const sources: SupplierSource[] = [];
  for (const rawSupplier of supplierList) {
    const supplier = deref(rawSupplier);
    if (!supplier || typeof supplier !== "object" || Array.isArray(supplier)) continue;
    const record = supplier as Record<string, unknown>;
    const nameValue = deref(record.websiteName);
    const name = typeof nameValue === "string" ? nameValue.trim() : "";
    const detailValue = deref(record.supplierDetailUrl);
    const detailUrl = typeof detailValue === "string" ? detailValue : "";
    if (!name || !detailUrl) continue;

    const listings: DiscoveredListing[] = [];
    const rawProducts = deref(record.products);
    if (Array.isArray(rawProducts)) {
      for (const rawProduct of rawProducts.slice(0, MAX_LISTINGS)) {
        const product = deref(rawProduct);
        if (!product || typeof product !== "object" || Array.isArray(product)) continue;
        const p = product as Record<string, unknown>;
        const titleValue = deref(p.productName);
        const title =
          typeof titleValue === "string" ? stripTags(titleValue).slice(0, 150) : "";
        const urlValue = deref(p.productDetailUrl);
        const url = typeof urlValue === "string" ? urlValue : "";
        if (!title || !url) continue;
        const imageValue = deref(p.productPrimaryImage);
        listings.push({
          title,
          price: null,
          image: typeof imageValue === "string" ? imageValue : null,
          link: absolutize(url, targetUrl),
        });
      }
    }
    if (listings.length === 0) continue;
    sources.push({
      platformId,
      platformName,
      storeName: name.slice(0, 120),
      storeUrl: absolutize(detailUrl, targetUrl),
      listingCount: listings.length,
      listings,
      dataSource: "live",
    });
  }
  if (sources.length === 0) return null;
  return sources.slice(0, MAX_STORES);
}

const BLOCK_PAGE_PATTERNS = [
  /_Incapsula_Resource/i,
  /Incapsula incident ID/i,
  /cf-browser-verification|cf_chl_opt|Just a moment/i,
  /<title>[^<]*(?:Access Denied|Attention Required|Just a moment|captcha)/i,
  /\/cdn-cgi\/challenge-platform/i,
  /please (?:enable|verify) (?:cookies|javascript)/i,
  /punish|_____tmd_____/i,
  /robot check|are you a human|unusual traffic/i,
  /滑动验证|请输入验证码|安全验证/,
];

function looksLikeBlockPage(html: string): boolean {
  if (!html) return false;
  return BLOCK_PAGE_PATTERNS.some((pattern) => pattern.test(html));
}

export function assembleSupplierSources(
  platformId: string,
  platformName: string,
  html: string,
  targetUrl: string
): SupplierSource[] {
  const config = supplierScraperConfigs[platformId];
  if (!config) throw new PublicError(`No supplier scraper config for ${platformId}`);

  if (config.payload === "nuxt-suppliers") {
    const fromPayload = assembleFromNuxtSuppliers(platformId, platformName, html, targetUrl);
    if (fromPayload) return fromPayload;
  }

  const embedded = assembleFromEmbeddedCards(platformId, platformName, html, targetUrl, config);
  if (embedded) return embedded;

  const stores = extractStores(html, config, targetUrl);
  const storeByUrl = new Map(stores.map((store) => [store.url, store]));
  const listingMatches = extractListingMatches(html, config, targetUrl);

  const attributed = new Map<string, DiscoveredListing[]>();
  const loose: DiscoveredListing[] = [];

  for (const { listing, index, windowStoreUrl } of listingMatches) {
    let best: StoreMatch | null = (windowStoreUrl && storeByUrl.get(windowStoreUrl)) || null;
    if (!best) {
      let bestDistance = Infinity;
      for (const store of stores) {
        const distance = index - store.firstIndex;
        if (distance >= 0 && distance < ATTRIBUTION_WINDOW && distance < bestDistance) {
          best = store;
          bestDistance = distance;
        }
      }
    }
    if (best) {
      const bucket = attributed.get(best.url) ?? [];
      bucket.push(listing);
      attributed.set(best.url, bucket);
    } else {
      loose.push(listing);
    }
  }

  if (stores.length === 0 && listingMatches.length === 0) {
    throw new PublicError(
      looksLikeBlockPage(html)
        ? `${platformName} blocked the automated request (anti-bot page instead of search results).`
        : `No supplier data found on ${platformName}. The site may have changed its layout or blocked the request.`
    );
  }

  const sources: SupplierSource[] = stores
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_STORES)
    .map((store) => {
      const listings = (attributed.get(store.url) ?? []).slice(0, MAX_LISTINGS);
      return {
        platformId,
        platformName,
        storeName: store.name,
        storeUrl: store.url,
        listingCount: listings.length > 0 ? listings.length : store.count,
        listings,
        dataSource: "estimated" as const,
      };
    });

  if (loose.length > 0) {
    sources.push({
      platformId,
      platformName,
      storeName: `${platformName} search results`,
      storeUrl: targetUrl,
      listingCount: loose.length,
      listings: loose.slice(0, MAX_LISTINGS),
      dataSource: "estimated",
    });
  }

  return sources;
}

async function withSupplierKey<T>(
  platformId: string,
  platformName: string,
  provider: ProviderId,
  deadlineAt: number,
  fn: (key: string) => Promise<T>
): Promise<T> {
  let firestoreConfig: PlatformFirestoreConfig | null = null;
  try {
    firestoreConfig = await getPlatform(platformId);
  } catch (error) {
    logger.warn("firestore platform lookup failed, falling back to env keys", {
      platformId,
      error: safeErrorMessage(error, "lookup failed"),
    });
  }

  if (firestoreConfig?.enabled && firestoreConfig.keys.length > 0) {
    const entry = selectBestKey(firestoreConfig.keys);
    if (entry) {
      try {
        return await fn(entry.key);
      } catch (error) {
        if (isQuotaError(error) || isAuthError(error)) {
          logger.warn("platform key failed, trying env pool instead", {
            platformId,
            keyId: entry.id,
            error: safeErrorMessage(error, "key failed"),
          });
          try {
            await markKeyError(platformId, entry.id, safeErrorMessage(error, "key failed"));
          } catch {
          }
        } else {
          throw error;
        }
      }
    }
  }

  let envError: unknown = null;
  try {
    return await withKeyPool(provider, fn);
  } catch (error) {
    const canFallBack =
      error instanceof ConfigMissingError ||
      error instanceof QuotaExhaustedError ||
      isAuthError(error);
    if (!canFallBack) throw error;
    envError = error;
  }

  const adminKeys = await getSupplierProviderKeys(provider);
  const adminUnavailable = () =>
    new PublicError(
      `All ${adminKeys.length} shared ${getProviderSetup(provider).name} key(s) are unavailable (quota exhausted or authorization failed). Fix them in Admin → Supplier Provider Keys.`
    );

  const usableKeys = adminKeys.filter(isUsableSupplierProviderKey);
  if (usableKeys.length === 0) {
    if (adminKeys.length > 0) throw adminUnavailable();
    throw envError;
  }

  for (const entry of usableKeys) {
    if (Date.now() >= deadlineAt - 1500) throw timeoutError(platformName, deadlineAt);
    try {
      const value = await fn(entry.key);
      await recordSupplierProviderKeySuccess(provider, entry.id);
      return value;
    } catch (error) {
      if (isTimeoutError(error)) throw error;
      if (!isQuotaError(error) && !isAuthError(error)) throw error;
      await recordSupplierProviderKeyFailure(provider, entry.id, safeErrorMessage(error, "key failed"));
    }
  }
  throw adminUnavailable();
}

function isTimeoutError(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return name === "TimeoutError" || name === "AbortError";
}

function timeoutError(platformName: string, deadlineAt: number, startedAt?: number): PublicError {
  const seconds = Math.max(
    1,
    Math.round((deadlineAt - (startedAt ?? Date.now())) / 1000)
  );
  return new PublicError(`${platformName} search timed out after ${seconds}s`);
}

async function fetchSearchHtml(
  platformName: string,
  platformId: string,
  query: string,
  config: SupplierScraperConfig,
  deadlineAt: number
): Promise<{ html: string; targetUrl: string }> {
  const targetUrl = config.searchUrl(query);
  const startedAt = Date.now();
  return withSupplierKey(platformId, platformName, "scraperapi", deadlineAt, async (key) => {
    const params = new URLSearchParams({
      api_key: key,
      url: targetUrl,
      render: config.render === false ? "false" : "true",
    });
    const fetchPage = async (): Promise<string> => {
      const remaining = deadlineAt - Date.now();
      if (remaining <= 1500) throw timeoutError(platformName, deadlineAt, startedAt);
      const budget = Math.max(1500, Math.min(config.timeoutMs ?? 30000, remaining));
      let res: Response;
      try {
        res = await fetch(`https://api.scraperapi.com?${params}`, {
          signal: AbortSignal.timeout(budget),
        });
      } catch (error) {
        if (isTimeoutError(error)) throw timeoutError(platformName, deadlineAt, startedAt);
        throw error;
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        const error = new PublicError(
          `ScraperAPI ${res.status}: ${body.slice(0, 200)}`
        ) as PublicError & { status?: number };
        error.status = res.status;
        throw error;
      }
      return res.text();
    };
    const hasProbe = (html: string): boolean =>
      !config.contentProbe || html.includes(config.contentProbe);

    let html = await fetchPage();
    if (!hasProbe(html) && deadlineAt - Date.now() > 5000) {
      logger.warn("search page missing expected content, retrying once", {
        platformId,
        probe: config.contentProbe,
        length: html.length,
      });
      try {
        const retryHtml = await fetchPage();
        if (hasProbe(retryHtml) || retryHtml.length > html.length) html = retryHtml;
      } catch (error) {
        logger.warn("search page retry failed, keeping first response", {
          platformId,
          error: safeErrorMessage(error, "retry failed"),
        });
      }
    }
    return { html, targetUrl };
  });
}

function toDiscoveredListing(result: SearchResult): DiscoveredListing {
  return {
    title: result.title,
    price: typeof result.price === "number" ? result.price : null,
    currency: typeof result.price === "number" ? "USD" : null,
    image: result.image ?? null,
    link: result.link,
    rating: result.rating,
    reviews: result.reviews,
  };
}

async function searchCJSource(query: string): Promise<SupplierSource[]> {
  const data = await searchCJProducts(query);
  const listings = data.search_results.map(toDiscoveredListing).slice(0, MAX_LISTINGS);
  if (listings.length === 0) throw new PublicError("No CJ Dropshipping results returned");
  return [
    {
      platformId: "cj",
      platformName: "CJ Dropshipping",
      storeName: "CJ Dropshipping",
      storeUrl: "https://www.cjdropshipping.com",
      listingCount: listings.length,
      listings,
      dataSource: "live",
    },
  ];
}

const SCRAPE_CACHE_NAMESPACE = "supplier-platform-search";
const SCRAPE_CACHE_TTL_SECONDS = 600;
const SCRAPE_FAILURE_CACHE_TTL_SECONDS = 60;
const inFlightScrapes = new Map<string, Promise<SupplierSource[]>>();

interface CachedScrapeFailure {
  failed: true;
  message: string;
}

function cacheKeyFor(platformId: string, query: string): string {
  return `${platformId}:${query.trim().toLowerCase().replace(/\s+/g, " ")}`;
}

export function __resetSupplierSearchCacheForTests(): void {
  inFlightScrapes.clear();
  __resetFeedCacheForTests();
}

async function searchScraperSource(
  meta: SupplierPlatformMeta,
  query: string,
  deadlineAt: number
): Promise<SupplierSource[]> {
  const config = supplierScraperConfigs[meta.id];
  if (!config) throw new PublicError(`No supplier scraper config for ${meta.id}`);
  const { html, targetUrl } = await fetchSearchHtml(meta.name, meta.id, query, config, deadlineAt);
  const sources = assembleSupplierSources(meta.id, meta.name, html, targetUrl);
  const listings = sources.reduce((sum, source) => sum + source.listings.length, 0);
  const priced = sources.reduce(
    (sum, source) => sum + source.listings.filter((listing) => listing.price !== null).length,
    0
  );
  if (listings === 0 || priced === 0) {
    logger.warn("supplier parse yield low — markup may have changed", {
      platformId: meta.id,
      stores: sources.length,
      listings,
      priced,
      htmlLength: html.length,
    });
  }
  return sources;
}

async function searchPlatformCached(
  meta: SupplierPlatformMeta,
  query: string,
  deadlineAt: number,
  useCache: boolean
): Promise<SupplierSource[]> {
  const cacheKey = cacheKeyFor(meta.id, query);
  if (useCache) {
    const cached = await getFeedCache<SupplierSource[] | CachedScrapeFailure>(
      SCRAPE_CACHE_NAMESPACE,
      cacheKey,
      SCRAPE_CACHE_TTL_SECONDS
    );
    if (Array.isArray(cached) && cached.length > 0) return cached;
    const cachedFailure = cached as CachedScrapeFailure | null;
    if (cachedFailure && cachedFailure.failed === true) {
      throw new PublicError(cachedFailure.message);
    }
  }

  const existing = inFlightScrapes.get(cacheKey);
  if (existing) return existing;

  const run = (
    meta.id === "cj" ? searchCJSource(query) : searchScraperSource(meta, query, deadlineAt)
  )
    .then(async (sources) => {
      if (useCache && sources.length > 0) {
        await setFeedCache(SCRAPE_CACHE_NAMESPACE, cacheKey, sources, SCRAPE_CACHE_TTL_SECONDS);
      }
      return sources;
    })
    .catch(async (error: unknown) => {
      if (useCache && shouldCacheFailure(error)) {
        await setFeedCache(
          SCRAPE_CACHE_NAMESPACE,
          cacheKey,
          { failed: true, message: userFacingPlatformError(error, meta.name) },
          SCRAPE_FAILURE_CACHE_TTL_SECONDS
        );
      }
      throw error;
    })
    .finally(() => {
      inFlightScrapes.delete(cacheKey);
    });

  inFlightScrapes.set(cacheKey, run);
  return run;
}

function shouldCacheFailure(error: unknown): boolean {
  if (error instanceof ConfigMissingError) return false;
  if (isTimeoutError(error)) return true;
  return isQuotaError(error) || isAuthError(error) || error instanceof PublicError;
}

const UPSTREAM_STATUS_PATTERN = /ScraperAPI\s+(\d{3})/i;

export function userFacingPlatformError(error: unknown, platformName: string): string {
  const raw = safeErrorMessage(error, `${platformName} search failed`);
  const looksLikeMarkup = /<[a-z!/][\s\S]*>|&(?:[a-z]{2,6}|#\d{2,5});/i.test(raw);

  if (isTimeoutError(error)) return `${platformName} search timed out`;

  const errorStatus = (error as { status?: number; statusCode?: number } | null) ?? {};
  const statusMatch = UPSTREAM_STATUS_PATTERN.exec(raw);
  const status = errorStatus.status ?? errorStatus.statusCode ?? (statusMatch ? Number(statusMatch[1]) : undefined);

  if (typeof status === "number" && !Number.isNaN(status)) {
    if (status === 401 || status === 403) {
      return `${platformName} provider key needs attention (upstream ${status})`;
    }
    if (status === 429) {
      return `${platformName} hit an upstream rate limit — try again shortly`;
    }
    if (status >= 500) {
      return `${platformName} is temporarily blocking automated requests (upstream ${status})`;
    }
  }

  if (error instanceof PublicError) {
    if (looksLikeMarkup) return `${platformName} rejected the request — try again shortly`;
    return raw.length > 200 ? `${platformName} search failed` : raw;
  }

  if (isQuotaError(error)) {
    return `${platformName} provider quota is exhausted — add or refresh provider keys`;
  }
  if (error instanceof ConfigMissingError) {
    return `${platformName} is not configured — add a provider key in Admin → Supplier Provider Keys`;
  }
  if (looksLikeMarkup || raw.length > 200) return `${platformName} search failed (upstream error)`;
  return raw;
}

export interface SupplierPlatformEvent {
  platform: string;
  name: string;
  sources: SupplierSource[];
  error?: string;
}

export interface SupplierSearchOptions {
  deadlineMs?: number;
  useCache?: boolean;
  onPlatformComplete?: (event: SupplierPlatformEvent) => void | Promise<void>;
}

export const DEFAULT_SEARCH_DEADLINE_MS = 55_000;

export async function searchSupplierPlatforms(
  query: string,
  platformIds?: string[],
  options: SupplierSearchOptions = {}
): Promise<SupplierSearchOutcome> {
  const keywords = parseSupplierQuery(query);
  const ids =
    platformIds && platformIds.length > 0
      ? new Set(platformIds)
      : new Set(SUPPLIER_PLATFORMS.map((p) => p.id));
  const selected = SUPPLIER_PLATFORMS.filter((p) => ids.has(p.id));
  const deadlineAt = Date.now() + Math.max(1000, options.deadlineMs ?? DEFAULT_SEARCH_DEADLINE_MS);
  const useCache = options.useCache !== false;

  const emit = (event: SupplierPlatformEvent): void => {
    const hook = options.onPlatformComplete;
    if (!hook) return;
    void Promise.resolve()
      .then(() => hook(event))
      .catch((error: unknown) => {
        logger.warn("supplier platform progress callback failed", {
          platformId: event.platform,
          error: safeErrorMessage(error, "failed"),
        });
      });
  };

  const tasks = selected.map((meta) => ({
    meta,
    promise: searchPlatformCached(meta, query, deadlineAt, useCache).then(
      (sources): { sources: SupplierSource[]; error?: string } => {
        if (sources.length > 0) {
          emit({ platform: meta.id, name: meta.name, sources });
          return { sources };
        }
        logger.warn("supplier platform produced no usable data", {
          platformId: meta.id,
          error: "empty result",
        });
        const message = `${meta.name} returned no stores or listings`;
        emit({ platform: meta.id, name: meta.name, sources: [], error: message });
        return { sources: [], error: message };
      },
      (reason: unknown): { sources: SupplierSource[]; error?: string } => {
        logger.warn("supplier platform produced no usable data", {
          platformId: meta.id,
          error: safeErrorMessage(reason, "failed"),
        });
        const message = userFacingPlatformError(reason, meta.name);
        emit({ platform: meta.id, name: meta.name, sources: [], error: message });
        return { sources: [], error: message };
      }
    ),
  }));

  const settled = await Promise.allSettled(tasks.map((task) => task.promise));

  const sources: SupplierSource[] = [];
  const errors: SupplierPlatformError[] = [];

  for (const [index, task] of tasks.entries()) {
    const result = settled[index];
    if (result.status === "fulfilled") {
      if (result.value.error) {
        errors.push({
          platform: task.meta.id,
          name: task.meta.name,
          error: result.value.error,
        });
        continue;
      }
      sources.push(...result.value.sources);
      continue;
    }
    errors.push({
      platform: task.meta.id,
      name: task.meta.name,
      error: userFacingPlatformError(result.reason, task.meta.name),
    });
  }

  return { sources, errors, keywords };
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "store"
  );
}

function priceRangeOf(listings: DiscoveredListing[]): {
  min: number;
  max: number;
  currency: string | null;
} {
  const priced = listings.filter(
    (l): l is DiscoveredListing & { price: number } => typeof l.price === "number" && l.price > 0
  );
  if (priced.length === 0) return { min: 0, max: 0, currency: null };
  const currencies = new Set(priced.map((l) => l.currency ?? null));
  return {
    min: Math.min(...priced.map((l) => l.price)),
    max: Math.max(...priced.map((l) => l.price)),
    currency: currencies.size === 1 ? [...currencies][0] : null,
  };
}

function observedMoq(listings: DiscoveredListing[]): number {
  const values = listings
    .map((l) => l.moq)
    .filter((m): m is number => typeof m === "number" && m > 0);
  return values.length > 0 ? Math.min(...values) : 0;
}

function observedRating(listings: DiscoveredListing[]): { rating: number; reviews: number } {
  const ratings = listings
    .map((l) => l.rating)
    .filter((r): r is number => typeof r === "number" && r > 0);
  const reviews = listings
    .map((l) => l.reviews)
    .filter((r): r is number => typeof r === "number" && r > 0);
  if (ratings.length === 0) return { rating: 0, reviews: 0 };
  const avg = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  return { rating: Math.round(avg * 10) / 10, reviews: reviews.length > 0 ? Math.max(...reviews) : 0 };
}

const CATALOG_STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "your", "you", "new", "hot", "sale",
  "free", "best", "high", "quality", "hot", "newest", "cheap", "wholesale",
  "pcs", "pack", "set", "sets", "size", "color", "colour", "style", "type",
  "product", "item", "items", "goods", "shipping", "stock", "order",
]);

/**
 * Categories observed in the store's actual listing titles.
 *
 * Never derived from the search query — seeding specializations with query
 * tokens makes every discovered supplier match every query (scoreSupplierMatch
 * reads those fields), which is how bogus "relevance" scores appeared.
 */
function catalogTermsFromListings(listings: DiscoveredListing[], limit: number): string[] {
  const counts = new Map<string, number>();
  for (const listing of listings) {
    const words = listing.title
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 3 && !CATALOG_STOP_WORDS.has(word));
    for (const word of new Set(words)) counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([word]) => word);
}

export function sourceToSupplierProfile(source: SupplierSource, query: string): SupplierProfile {
  const { rating, reviews } = observedRating(source.listings);
  const categories = catalogTermsFromListings(source.listings, 15);
  const description =
    `${source.storeName} is a storefront on ${source.platformName}, ` +
    `surfaced by a live search for "${query}". ` +
    `Reliability, shipping, and response metrics have not been measured for this supplier.`;

  return {
    id: `${source.platformId}-${slugify(source.storeName)}`,
    name: source.storeName,
    slug: `${source.platformId}-${slugify(source.storeName)}`,
    location: "Unknown",
    country: "",
    flag: "\u{1F310}",
    description,
    specializations: categories.slice(0, 8),
    trustBadge: "unverified",
    dataSource: source.dataSource,
    stats: {
      reliabilityScore: 0,
      rating,
      reviews,
      responseTime: "Not measured",
      responseTimeHours: 0,
      shippingDays: 0,
      shippingDaysEU: 0,
      orderCompletionRate: 0,
      disputeRate: 0,
      monthlyOrders: 0,
      totalProducts: source.listingCount,
      yearEstablished: 0,
      communicationScore: 0,
      qualityScore: 0,
      priceCompetitiveness: 0,
    },
    shipping: {
      methods: [],
      processingTime: "Not measured",
      freeShippingThreshold: null,
      packagingQuality: "standard",
    },
    quality: {
      inspection: "Not inspected",
      returnPolicy: "Not verified",
      refundPolicy: "Not verified",
      replacementPolicy: "Not verified",
      disputeResolution: "Not verified",
      certifications: [],
    },
    catalog: {
      categories: categories.slice(0, 15),
      priceRange: priceRangeOf(source.listings),
      moq: observedMoq(source.listings),
      samplesAvailable: false,
      samplePrice: null,
    },
    communication: {
      methods: [],
      languages: [],
      supportHours: "Not measured",
    },
    source: source.platformId as SupplierProfile["source"],
    sourceUrl: source.storeUrl,
    lastUpdated: new Date().toISOString(),
    listings: source.listings,
    matchedQuery: query,
  };
}

export function buildSupplierProfiles(sources: SupplierSource[], query: string): SupplierProfile[] {
  const tokens = parseSupplierQuery(query);
  const matchingSources = sources
    .map((source) => {
      const listings = source.listings.filter((listing) => listingMatchesQuery(listing.title, tokens));
      return { ...source, listings, listingCount: listings.length };
    })
    .filter((source) => tokens.length === 0 || source.listings.length > 0);

  return matchingSources
    .map((source) => sourceToSupplierProfile(source, query))
    .map((profile) => ({ profile, score: scoreSupplierMatch(profile, tokens) }))
    .sort(
      (a, b) => b.score - a.score || b.profile.stats.totalProducts - a.profile.stats.totalProducts
    )
    .map((entry) => entry.profile);
}

function listingMatchesQuery(title: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const matchedTokens = tokens.filter((token) => {
    const singular = token.endsWith("s") ? token.slice(0, -1) : token;
    const plural = token.endsWith("s") ? token : `${token}s`;
    return normalizedTitle.includes(token) || normalizedTitle.includes(singular) || normalizedTitle.includes(plural);
  });
  const requiredMatches = Math.min(tokens.length, Math.max(1, Math.ceil(tokens.length / 2)));
  return matchedTokens.length >= requiredMatches;
}

export interface SupplierPlatformStatus {
  id: string;
  name: string;
  configured: boolean;
  method: string;
  source: "firestore" | "env" | "admin";
}

export async function getSupplierPlatformStatuses(): Promise<SupplierPlatformStatus[]> {
  const adminKeysByProvider = new Map<string, Awaited<ReturnType<typeof getSupplierProviderKeys>>>();
  const statuses: SupplierPlatformStatus[] = [];
  for (const meta of SUPPLIER_PLATFORMS) {
    const provider = supplierPlatformProvider(meta.id);
    let configured = false;
    let source: SupplierPlatformStatus["source"] = "env";
    try {
      const cfg = await getPlatform(meta.id);
      if (cfg && cfg.keys.length > 0) {
        configured = true;
        source = "firestore";
      }
    } catch {
      configured = false;
    }
    if (!configured && getPoolKeys(provider).length > 0) {
      configured = true;
      source = "env";
    }
    if (!configured) {
      if (!adminKeysByProvider.has(provider)) {
        adminKeysByProvider.set(provider, await getSupplierProviderKeys(provider));
      }
      if ((adminKeysByProvider.get(provider) ?? []).length > 0) {
        configured = true;
        source = "admin";
      }
    }
    statuses.push({
      id: meta.id,
      name: meta.name,
      configured,
      method: meta.id === "cj" ? "official_api" : "scraperapi",
      source,
    });
  }
  return statuses;
}
