// ── Product Deduplication & Cross-Platform Merging ──────────────────────────
//
// Groups search results from different platforms that represent the same
// physical product into a single MergedProduct with cross-platform pricing.

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

export interface PlatformOffer {
  platform: string;
  price: number | null;
  link: string;
  originalTitle: string;
  rating?: number;
  reviews?: number;
}

export interface MergedProduct {
  id: string;
  title: string;
  image: string | null;
  images: string[];
  platforms: PlatformOffer[];
  bestPrice: number | null;
  worstPrice: number | null;
  priceSpread: number;
  avgPrice: number | null;
  platformCount: number;
  bestPlatform: string;
  rating?: number;
  reviews?: number;
  brand?: string;
  [key: string]: unknown;
}

// ── Title Normalization ────────────────────────────────────────────────────

const FILLER_WORDS = new Set([
  "the", "for", "with", "a", "an", "of", "in", "on", "to", "and", "or",
  "is", "it", "by", "at", "be", "as", "this", "that", "from", "but",
  "not", "was", "were", "been", "has", "have", "had", "do",
  "does", "did", "will", "would", "could", "should", "may", "might",
  "can", "shall", "new", "original", "genuine", "authentic", "official",
  "1pc", "1pcs", "1 piece", "lot", "set", "pack", "pieces",
]);

export function normalizeTitle(title: string): string {
  if (!title) return "";

  let normalized = title
    .toLowerCase()
    .replace(/([a-zA-Z])[-](\d)/g, "$1$2")
    .replace(/(\d)[-]([a-zA-Z])/g, "$1$2")
    .replace(/[^\w\s\d]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized
    .split(" ")
    .filter((w) => w.length > 0 && !FILLER_WORDS.has(w));
  return words.join(" ");
}

// ── Title Similarity ───────────────────────────────────────────────────────

export function titleSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;

  const wordsA = new Set(normalizeTitle(a).split(" ").filter(Boolean));
  const wordsB = new Set(normalizeTitle(b).split(" ").filter(Boolean));

  if (wordsA.size === 0 && wordsB.size === 0) return 1;
  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const word of wordsA) {
    if (wordsB.has(word)) intersection++;
  }

  const union = wordsA.size + wordsB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

// ── Image Similarity ───────────────────────────────────────────────────────

function normalizeImageUrl(url: string): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.toLowerCase();
  } catch {
    return url.toLowerCase().replace(/[?#].*$/, "").replace(/\/+$/, "");
  }
}

export function imageSimilarity(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;

  const normA = normalizeImageUrl(a);
  const normB = normalizeImageUrl(b);

  if (normA === normB) return 1;

  const partsA = normA.split("/").filter(Boolean);
  const partsB = normB.split("/").filter(Boolean);

  if (partsA.length === 0 && partsB.length === 0) return 1;
  if (partsA.length === 0 || partsB.length === 0) return 0;

  let matchingParts = 0;
  const maxLen = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < Math.min(partsA.length, partsB.length); i++) {
    if (partsA[partsA.length - 1 - i] === partsB[partsB.length - 1 - i]) {
      matchingParts++;
    } else {
      break;
    }
  }

  return matchingParts / maxLen;
}

// ── Merge Decision ─────────────────────────────────────────────────────────

export function shouldMerge(a: SearchResult, b: SearchResult): boolean {
  if (a.source === b.source && a.link === b.link) return true;

  const titleSim = titleSimilarity(a.title, b.title);
  const imgSim = imageSimilarity(a.image || "", b.image || "");

  if (titleSim >= 0.5 && imgSim > 0.8) return true;

  if (titleSim > 0.65 && a.price != null && b.price != null) {
    const ratio = Math.max(a.price, b.price) / Math.max(1, Math.min(a.price, b.price));
    if (ratio <= 1.3) return true;
  }

  return false;
}

// ── Price Spread Calculation ───────────────────────────────────────────────

export function computePriceSpread(offers: PlatformOffer[]): {
  best: number | null;
  worst: number | null;
  avg: number | null;
  spread: number;
  bestPlatform: string;
} {
  const priced = offers.filter((o) => o.price != null && o.price > 0);
  if (priced.length === 0) {
    return { best: null, worst: null, avg: null, spread: 0, bestPlatform: "" };
  }

  const prices = priced.map((o) => o.price!);
  const best = Math.min(...prices);
  const worst = Math.max(...prices);
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const spread = best > 0 ? ((worst - best) / best) * 100 : 0;
  const bestPlatform = priced.find((o) => o.price === best)?.platform || "";

  return {
    best: Math.round(best * 100) / 100,
    worst: Math.round(worst * 100) / 100,
    avg: Math.round(avg * 100) / 100,
    spread: Math.round(spread * 10) / 10,
    bestPlatform,
  };
}

// ── Union-Find for Clustering ──────────────────────────────────────────────

class UnionFind {
  private parent: number[];
  private rank: number[];

  constructor(size: number) {
    this.parent = Array.from({ length: size }, (_, i) => i);
    this.rank = new Array(size).fill(0);
  }

  find(x: number): number {
    if (this.parent[x] !== x) {
      this.parent[x] = this.find(this.parent[x]);
    }
    return this.parent[x];
  }

  union(x: number, y: number): void {
    const rootX = this.find(x);
    const rootY = this.find(y);
    if (rootX === rootY) return;
    if (this.rank[rootX] < this.rank[rootY]) {
      this.parent[rootX] = rootY;
    } else if (this.rank[rootX] > this.rank[rootY]) {
      this.parent[rootY] = rootX;
    } else {
      this.parent[rootY] = rootX;
      this.rank[rootX]++;
    }
  }

  getClusters(): Map<number, number[]> {
    const clusters = new Map<number, number[]>();
    for (let i = 0; i < this.parent.length; i++) {
      const root = this.find(i);
      const cluster = clusters.get(root) || [];
      cluster.push(i);
      clusters.set(root, cluster);
    }
    return clusters;
  }
}

// ── Product ID Generation ──────────────────────────────────────────────────

function generateProductId(title: string, image: string | null): string {
  const slug = normalizeTitle(title)
    .split(" ")
    .slice(0, 6)
    .join("-")
    .replace(/[^a-z0-9-]/g, "");
  const imgHash = image ? image.length.toString(36) : "noimg";
  return `merged-${slug}-${imgHash}`;
}

// ── Core Merge Function ────────────────────────────────────────────────────

export function mergeProducts(products: SearchResult[]): MergedProduct[] {
  if (products.length === 0) return [];
  if (products.length === 1) {
    const p = products[0];
    return [singleToMerged(p)];
  }

  const uf = new UnionFind(products.length);

  for (let i = 0; i < products.length; i++) {
    for (let j = i + 1; j < products.length; j++) {
      if (shouldMerge(products[i], products[j])) {
        uf.union(i, j);
      }
    }
  }

  const clusters = uf.getClusters();
  const merged: MergedProduct[] = [];

  for (const indices of clusters.values()) {
    const group = indices.map((i) => products[i]);
    merged.push(mergeCluster(group));
  }

  return merged;
}

function singleToMerged(product: SearchResult): MergedProduct {
  const offer: PlatformOffer = {
    platform: product.source,
    price: product.price,
    link: product.link,
    originalTitle: product.title,
    rating: product.rating,
    reviews: product.reviews,
  };

  const pricing = computePriceSpread([offer]);
  const allImages = collectImages(product);

  return {
    id: generateProductId(product.title, product.image),
    title: product.title,
    image: product.image,
    images: allImages,
    platforms: [offer],
    bestPrice: pricing.best,
    worstPrice: pricing.worst,
    priceSpread: pricing.spread,
    avgPrice: pricing.avg,
    platformCount: 1,
    bestPlatform: pricing.bestPlatform || product.source,
    rating: product.rating,
    reviews: product.reviews,
    brand: product.brand,
  };
}

function mergeCluster(products: SearchResult[]): MergedProduct {
  const primary = selectPrimary(products);

  const offers: PlatformOffer[] = products.map((p) => ({
    platform: p.source,
    price: p.price,
    link: p.link,
    originalTitle: p.title,
    rating: p.rating,
    reviews: p.reviews,
  }));

  const dedupedOffers = dedupOffers(offers);
  const pricing = computePriceSpread(dedupedOffers);
  const allImages = products.flatMap((p) => collectImages(p));

  return {
    id: generateProductId(primary.title, primary.image),
    title: selectBestTitle(products),
    image: primary.image,
    images: [...new Set(allImages)].slice(0, 10),
    platforms: dedupedOffers,
    bestPrice: pricing.best,
    worstPrice: pricing.worst,
    priceSpread: pricing.spread,
    avgPrice: pricing.avg,
    platformCount: dedupedOffers.length,
    bestPlatform: pricing.bestPlatform || primary.source,
    rating: primary.rating,
    reviews: primary.reviews,
    brand: primary.brand,
  };
}

function selectPrimary(products: SearchResult[]): SearchResult {
  return [...products].sort((a, b) => {
    const scoreA = (a.rating || 0) * 20 + Math.min(a.reviews || 0, 5000) * 0.001;
    const scoreB = (b.rating || 0) * 20 + Math.min(b.reviews || 0, 5000) * 0.001;
    return scoreB - scoreA;
  })[0];
}

function selectBestTitle(products: SearchResult[]): string {
  const scored = products.map((p) => ({
    title: p.title,
    score: p.title.length * 0.3 + (p.reviews || 0) * 0.0001 + (p.rating || 0) * 2,
  }));
  return scored.sort((a, b) => b.score - a.score)[0].title;
}

function dedupOffers(offers: PlatformOffer[]): PlatformOffer[] {
  const byPlatform = new Map<string, PlatformOffer[]>();
  for (const offer of offers) {
    const existing = byPlatform.get(offer.platform) || [];
    existing.push(offer);
    byPlatform.set(offer.platform, existing);
  }

  const result: PlatformOffer[] = [];
  for (const platformOffers of byPlatform.values()) {
    const cheapest = platformOffers.reduce((best, o) => {
      if (o.price == null) return best;
      if (best.price == null) return o;
      return o.price < best.price ? o : best;
    }, platformOffers[0]);
    result.push(cheapest);
  }
  return result;
}

function collectImages(product: SearchResult): string[] {
  const images: string[] = [];
  if (product.image && product.image !== "null" && product.image !== "undefined") {
    images.push(product.image);
  }
  if (Array.isArray(product.images)) {
    for (const img of product.images) {
      if (typeof img === "string" && img && img !== "null" && img !== "undefined" && !images.includes(img)) {
        images.push(img);
      }
    }
  }
  return images;
}
