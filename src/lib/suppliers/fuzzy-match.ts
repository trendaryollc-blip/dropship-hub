import { AUTO_LINK_CONFIDENCE, type AutoLinkResult, type NormalizedSupplierOffer } from "@/types/supplier-offers";

export interface MatchProduct {
  title: string;
  image: string | null;
  price: number | null;
}

function tokenize(value: string): Set<string> {
  const stop = new Set(["the", "a", "an", "for", "with", "and", "or", "new", "hot", "pcs", "lot"]);
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1 && !stop.has(t)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

/**
 * Deterministic match score in [0,1]. Weights: title tokens 0.5, price band
 * 0.3, image URL exact match 0.2. Pure function — no network, no randomness.
 */
export function scoreOfferMatch(
  product: MatchProduct,
  offer: NormalizedSupplierOffer,
): { confidence: number; reasons: string[] } {
  const reasons: string[] = [];
  const titleScore = jaccard(tokenize(product.title), tokenize(offer.title));
  if (titleScore >= 0.5) reasons.push(`title overlap ${Math.round(titleScore * 100)}%`);
  else if (titleScore >= 0.25) reasons.push(`partial title overlap ${Math.round(titleScore * 100)}%`);

  let priceScore = 0;
  if (typeof product.price === "number" && product.price > 0 && typeof offer.unitCost === "number" && offer.unitCost > 0) {
    const ratio = Math.min(product.price, offer.unitCost) / Math.max(product.price, offer.unitCost);
    priceScore = ratio >= 0.5 ? ratio : 0;
    if (priceScore > 0) reasons.push(`price within band (${Math.round(ratio * 100)}%)`);
  }

  let imageScore = 0;
  if (product.image && offer.image && product.image === offer.image) {
    imageScore = 1;
    reasons.push("same image url");
  }

  const confidence = Math.round((titleScore * 0.5 + priceScore * 0.3 + imageScore * 0.2) * 100) / 100;
  return { confidence, reasons };
}

/** Score every offer in place and return the best one when it clears the threshold. */
export function pickAutoLink(
  product: MatchProduct,
  offers: NormalizedSupplierOffer[],
  threshold: number = AUTO_LINK_CONFIDENCE,
): AutoLinkResult | null {
  let best: NormalizedSupplierOffer | null = null;
  let bestScore = -1;
  for (const offer of offers) {
    const { confidence, reasons } = scoreOfferMatch(product, offer);
    offer.confidence = confidence;
    offer.matchReasons = reasons;
    if (confidence > bestScore) {
      bestScore = confidence;
      best = offer;
    }
  }
  if (best && bestScore >= threshold) return { offer: best, confidence: bestScore };
  return null;
}
