// ── Search Result Enrichment ───────────────────────────────────────────────
//
// Adds computed intelligence fields to merged search results:
// estimated margin, golden score, trend phase, saturation, competition, etc.

import type { MergedProduct, PlatformOffer } from "./dedup";

// ── Types ──────────────────────────────────────────────────────────────────

export type TrendPhase = "emerging" | "growth" | "mature" | "declining";
export type SaturationLevel = "unsaturated" | "low" | "moderate" | "saturated" | "hyper-saturated";

export interface EnrichedProduct extends MergedProduct {
  estimatedMargin?: number;
  goldenScore?: number;
  goldenRank?: "S" | "A" | "B" | "C" | "D";
  trendPhase?: TrendPhase;
  saturationLevel?: SaturationLevel;
  competitionScore?: number;
  reviewVelocity?: number;
  priceStability?: number;
  supplyChainScore?: number;
}

// ── Platform Cost Estimates (wholesale/supplier averages) ───────────────────

const PLATFORM_COST_RATIOS: Record<string, number> = {
  aliexpress: 0.25,
  alibaba: 0.20,
  cj: 0.22,
  "1688": 0.18,
  temu: 0.30,
  banggood: 0.28,
  dhgate: 0.23,
  amazon: 0.55,
  walmart: 0.50,
  ebay: 0.45,
  etsy: 0.40,
  google_shopping: 0.50,
  shein: 0.27,
};

const PLATFORM_RELIABILITY: Record<string, number> = {
  amazon: 95,
  walmart: 92,
  cj: 88,
  aliexpress: 75,
  ebay: 70,
  google_shopping: 85,
  etsy: 80,
  alibaba: 82,
  temu: 65,
  banggood: 68,
  dhgate: 60,
  shein: 62,
  "1688": 72,
};

// ── Margin Estimation ──────────────────────────────────────────────────────

export function estimateMargin(
  product: MergedProduct,
  platformCosts?: Map<string, number>
): number | undefined {
  const price = product.bestPrice;
  if (price == null || price <= 0) return undefined;

  if (platformCosts && platformCosts.size > 0) {
    let lowestCost = Infinity;
    for (const cost of platformCosts.values()) {
      if (cost > 0 && cost < lowestCost) lowestCost = cost;
    }
    if (lowestCost < Infinity) {
      return Math.round(((price - lowestCost) / price) * 100);
    }
  }

  const sourcingPlatforms = ["cj", "aliexpress", "alibaba", "1688"];
  let bestCostRatio = 0.55;
  for (const platform of product.platforms) {
    const ratio = PLATFORM_COST_RATIOS[platform.platform];
    if (ratio && ratio < bestCostRatio) {
      bestCostRatio = ratio;
    }
  }

  const estimatedCost = price * bestCostRatio;
  return Math.round(((price - estimatedCost) / price) * 100);
}

// ── Quick Golden Score ─────────────────────────────────────────────────────

export function quickGoldenScore(product: MergedProduct): number {
  let score = 0;

  if (product.bestPrice != null && product.bestPrice > 0) {
    if (product.bestPrice >= 15 && product.bestPrice <= 80) score += 20;
    else if (product.bestPrice >= 10 && product.bestPrice <= 150) score += 12;
    else score += 5;
  }

  const margin = estimateMargin(product);
  if (margin != null) {
    if (margin >= 40) score += 20;
    else if (margin >= 25) score += 14;
    else if (margin >= 15) score += 8;
    else score += 3;
  }

  if (product.rating != null) {
    if (product.rating >= 4.5) score += 15;
    else if (product.rating >= 4.0) score += 10;
    else if (product.rating >= 3.5) score += 5;
  }

  if (product.reviews != null) {
    if (product.reviews >= 1000) score += 10;
    else if (product.reviews >= 100) score += 6;
    else if (product.reviews >= 10) score += 3;
  }

  if (product.platformCount >= 3) score += 10;
  else if (product.platformCount >= 2) score += 6;

  if (product.priceSpread >= 0 && product.priceSpread < 20) score += 10;
  else if (product.priceSpread < 40) score += 5;

  if (product.images.length >= 3) score += 5;
  else if (product.images.length >= 1) score += 2;

  if (product.brand) score += 5;

  return Math.min(100, Math.max(0, score));
}

export function goldenRank(score: number): "S" | "A" | "B" | "C" | "D" {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 50) return "B";
  if (score >= 30) return "C";
  return "D";
}

// ── Trend Phase Estimation ─────────────────────────────────────────────────

export function estimateTrendPhase(product: MergedProduct): TrendPhase {
  const platformCount = product.platformCount;
  const reviewCount = product.reviews || 0;
  const priceSpread = product.priceSpread;

  if (platformCount <= 1 && reviewCount < 50) return "emerging";
  if (platformCount >= 2 && platformCount <= 5 && reviewCount < 500) return "growth";
  if (platformCount >= 6 || reviewCount >= 1000) {
    if (priceSpread > 50) return "declining";
    return "mature";
  }
  if (priceSpread > 40) return "declining";
  return "growth";
}

// ── Saturation Estimation ──────────────────────────────────────────────────

export function estimateSaturation(product: MergedProduct): SaturationLevel {
  const platformCount = product.platformCount;
  const reviewCount = product.reviews || 0;
  const priceSpread = product.priceSpread;

  let score = 0;

  if (platformCount >= 10) score += 40;
  else if (platformCount >= 7) score += 30;
  else if (platformCount >= 4) score += 20;
  else if (platformCount >= 2) score += 10;

  if (reviewCount >= 5000) score += 30;
  else if (reviewCount >= 1000) score += 20;
  else if (reviewCount >= 100) score += 10;

  if (priceSpread < 10 && platformCount >= 3) score += 20;
  else if (priceSpread < 25) score += 10;

  if (product.rating != null && product.rating >= 4.5 && reviewCount >= 500) score += 10;

  if (score >= 70) return "hyper-saturated";
  if (score >= 50) return "saturated";
  if (score >= 30) return "moderate";
  if (score >= 15) return "low";
  return "unsaturated";
}

// ── Competition Score ──────────────────────────────────────────────────────

export function computeCompetitionScore(product: MergedProduct): number {
  let score = 50;

  if (product.platformCount >= 5) score += 20;
  else if (product.platformCount >= 3) score += 10;
  else if (product.platformCount <= 1) score -= 15;

  const reviewCount = product.reviews || 0;
  if (reviewCount >= 10000) score += 20;
  else if (reviewCount >= 1000) score += 10;
  else if (reviewCount < 10) score -= 10;

  if (product.priceSpread < 15 && product.platformCount >= 3) score += 15;
  else if (product.priceSpread > 50) score -= 10;

  return Math.min(100, Math.max(0, score));
}

// ── Review Velocity ────────────────────────────────────────────────────────

export function computeReviewVelocity(reviews: number, platformCount: number): number {
  if (reviews <= 0) return 0;
  const estimatedAge = Math.max(6, platformCount * 3);
  return Math.round(reviews / estimatedAge);
}

// ── Price Stability ────────────────────────────────────────────────────────

export function computePriceStability(priceSpread: number): number {
  if (priceSpread <= 0) return 100;
  if (priceSpread < 5) return 95;
  if (priceSpread < 10) return 85;
  if (priceSpread < 20) return 70;
  if (priceSpread < 30) return 55;
  if (priceSpread < 50) return 35;
  return 15;
}

// ── Supply Chain Score ─────────────────────────────────────────────────────

export function computeSupplyChainScore(product: MergedProduct): number {
  if (product.platforms.length === 0) return 0;

  let totalScore = 0;
  for (const offer of product.platforms) {
    const reliability = PLATFORM_RELIABILITY[offer.platform] ?? 60;
    totalScore += reliability;
  }
  return Math.round(totalScore / product.platforms.length);
}

// ── Main Enrichment Pipeline ──────────────────────────────────────────────

export function enrichProduct(
  product: MergedProduct,
  platformCosts?: Map<string, number>
): EnrichedProduct {
  const margin = estimateMargin(product, platformCosts);
  const gScore = quickGoldenScore(product);
  const gRank = goldenRank(gScore);
  const trend = estimateTrendPhase(product);
  const saturation = estimateSaturation(product);
  const competition = computeCompetitionScore(product);
  const reviewVel = computeReviewVelocity(product.reviews || 0, product.platformCount);
  const priceStab = computePriceStability(product.priceSpread);
  const supplyChain = computeSupplyChainScore(product);

  return {
    ...product,
    estimatedMargin: margin,
    goldenScore: gScore,
    goldenRank: gRank,
    trendPhase: trend,
    saturationLevel: saturation,
    competitionScore: competition,
    reviewVelocity: reviewVel,
    priceStability: priceStab,
    supplyChainScore: supplyChain,
  };
}

export function enrichProducts(
  products: MergedProduct[],
  platformCosts?: Map<string, number>
): EnrichedProduct[] {
  return products.map((p) => enrichProduct(p, platformCosts));
}
