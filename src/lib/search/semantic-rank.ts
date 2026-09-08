// ── Semantic Relevance Ranking ─────────────────────────────────────────────
//
// Computes weighted relevance scores for merged products against a parsed
// search intent and re-ranks results accordingly.

// ── Types ──────────────────────────────────────────────────────────────────

import type { MergedProduct } from "./dedup";
import type { ParsedIntent } from "./intent-parser";

export interface RankedProduct extends MergedProduct {
  relevanceScore: number;
  rankReason: string;
}

// ── Stop Words ─────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "a", "an", "for", "with", "and", "or", "to", "in", "on", "at",
  "of", "is", "it", "that", "this", "from", "but", "not", "be", "as",
  "was", "are", "were", "has", "have", "had", "do", "does", "did",
  "will", "would", "could", "should", "may", "might", "can", "shall",
  "i", "me", "my", "we", "our", "you", "your", "he", "she", "they",
  "1pc", "1pcs", "set", "pack", "lot",
]);

// ── Keyword Extraction ────────────────────────────────────────────────────

export function extractKeywords(title: string): Set<string> {
  if (!title) return new Set();
  const words = title
    .toLowerCase()
    .replace(/[^\w\s\d]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
  return new Set(words);
}

// ── Keyword Overlap ───────────────────────────────────────────────────────

export function computeKeywordOverlap(
  keywords: Set<string>,
  queryKeywords: string[]
): number {
  if (keywords.size === 0 || queryKeywords.length === 0) return 0;
  const querySet = new Set(queryKeywords.map((k) => k.toLowerCase()));
  let intersection = 0;
  for (const kw of keywords) {
    if (querySet.has(kw)) intersection++;
  }
  const union = keywords.size + querySet.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Score Components ──────────────────────────────────────────────────────

export function computePriceScore(
  price: number | null,
  intent: ParsedIntent
): number {
  if (price == null) return 50;

  const hasMin = intent.priceMin != null;
  const hasMax = intent.priceMax != null;

  if (!hasMin && !hasMax) return 70;

  if (hasMin && hasMax) {
    if (price >= intent.priceMin! && price <= intent.priceMax!) return 100;
    const range = intent.priceMax! - intent.priceMin!;
    if (price < intent.priceMin!) {
      const diff = intent.priceMin! - price;
      return Math.max(0, 100 - (diff / Math.max(range, 1)) * 100);
    }
    const diff = price - intent.priceMax!;
    return Math.max(0, 100 - (diff / Math.max(range, 1)) * 100);
  }

  if (hasMax) {
    if (price <= intent.priceMax!) return 100;
    const overage = price - intent.priceMax!;
    return Math.max(0, 100 - (overage / intent.priceMax!) * 200);
  }

  if (hasMin) {
    if (price >= intent.priceMin!) return 100;
    const under = intent.priceMin! - price;
    return Math.max(0, 100 - (under / intent.priceMin!) * 200);
  }

  return 70;
}

export function computeRatingScore(
  product: MergedProduct,
  intent: ParsedIntent
): number {
  const rating = product.rating;
  if (rating == null) return 50;
  if (intent.minRating == null) return 70;

  if (rating >= intent.minRating!) return 100;
  const gap = intent.minRating! - rating;
  return Math.max(0, 100 - gap * 40);
}

// ── Relevance Score ───────────────────────────────────────────────────────

export function computeRelevanceScore(
  product: MergedProduct,
  intent: ParsedIntent
): number {
  const productKeywords = extractKeywords(product.title);
  const keywordOverlap = computeKeywordOverlap(productKeywords, intent.keywords);
  const keywordScore = keywordOverlap * 100;

  const priceScore = computePriceScore(product.bestPrice, intent);
  const ratingScore = computeRatingScore(product, intent);

  const reviewScore = product.reviews != null
    ? Math.min(100, Math.log10(product.reviews + 1) * 25)
    : 50;

  let platformScore = 70;
  if (intent.platforms && intent.platforms.length > 0 && product.platforms.length > 0) {
    const preferred = new Set(intent.platforms);
    const matchCount = product.platforms.filter((p) => preferred.has(p.platform)).length;
    platformScore = matchCount > 0 ? 100 : 40;
  }

  const trendingScore = intent.trending
    ? Math.min(100, product.platformCount * 15 + (product.reviews ? Math.min(product.reviews / 100, 30) : 0))
    : 70;

  let brandScore = 70;
  if (intent.brand && product.brand) {
    brandScore = product.brand.toLowerCase() === intent.brand.toLowerCase() ? 100 : 20;
  }

  const raw =
    keywordScore * 0.30 +
    priceScore * 0.20 +
    ratingScore * 0.15 +
    reviewScore * 0.10 +
    platformScore * 0.10 +
    trendingScore * 0.10 +
    brandScore * 0.05;

  return Math.round(Math.min(100, Math.max(0, raw)));
}

// ── Rank Reason Builder ───────────────────────────────────────────────────

function buildRankReason(
  product: MergedProduct,
  intent: ParsedIntent,
  score: number
): string {
  const reasons: string[] = [];

  const productKeywords = extractKeywords(product.title);
  const overlap = computeKeywordOverlap(productKeywords, intent.keywords);
  if (overlap > 0.3) reasons.push("keyword match");

  if (product.bestPrice != null && intent.priceMax != null && product.bestPrice <= intent.priceMax) {
    reasons.push("within budget");
  }
  if (product.bestPrice != null && intent.priceMin != null && product.bestPrice >= intent.priceMin) {
    reasons.push("above min price");
  }

  if (product.rating != null && intent.minRating != null && product.rating >= intent.minRating) {
    reasons.push("meets rating");
  }

  if (intent.platforms && intent.platforms.length > 0) {
    const preferred = new Set(intent.platforms);
    if (product.platforms.some((p) => preferred.has(p.platform))) {
      reasons.push("preferred platform");
    }
  }

  if (intent.brand && product.brand && product.brand.toLowerCase() === intent.brand.toLowerCase()) {
    reasons.push("brand match");
  }

  if (intent.trending && product.platformCount > 2) {
    reasons.push("trending");
  }

  if (product.platformCount > 3) reasons.push("multi-platform");
  if (product.priceSpread < 10 && product.platformCount > 1) reasons.push("consistent pricing");

  return reasons.length > 0 ? reasons.join("; ") : score > 60 ? "general relevance" : "low relevance";
}

// ── Rank Products ─────────────────────────────────────────────────────────

export function rankProducts(
  products: MergedProduct[],
  intent: ParsedIntent
): RankedProduct[] {
  if (products.length === 0) return [];

  const ranked: RankedProduct[] = products.map((product) => {
    const relevanceScore = computeRelevanceScore(product, intent);
    const rankReason = buildRankReason(product, intent, relevanceScore);
    return {
      ...product,
      relevanceScore,
      rankReason,
    };
  });

  ranked.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return ranked;
}
