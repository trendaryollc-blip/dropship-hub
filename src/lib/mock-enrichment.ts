export interface PlatformPrice {
  platform: string;
  price: number;
  rating: number;
  reviews: number;
  inStock: boolean;
  url: string;
  sparkline: number[];
}

export interface ReviewData {
  averageRating: number;
  totalReviews: number;
  distribution: { stars: number; percent: number }[];
  sentiment: { positive: string[]; neutral: string[]; negative: string[] };
  topKeywords: string[];
  commonComplaints: string[];
  commonPraise: string[];
  trustworthyScore: number;
}

export interface MarketIntel {
  searchVolume: "high" | "medium" | "low";
  searchVolumeNumber: number;
  trendDirection: "rising" | "stable" | "declining";
  trendSparkline: number[];
  seasonality: string;
  bestTimeToSell: string;
  competitionLevel: "low" | "medium" | "high" | "very-high";
  estimatedSellers: number;
  avgSellerRating: number;
  priceWarRisk: "low" | "medium" | "high";
  canCompete: string;
  riskScore: number;
  riskFactors: { label: string; level: "safe" | "caution" | "avoid" }[];
}

export interface ListingSuggestion {
  title: string;
  description: string;
  tags: string[];
  suggestedPriceRange: string;
  platformTips: { platform: string; tip: string }[];
}

export interface SupplierMatch {
  id: string;
  name: string;
  trustBadge: "gold" | "silver" | "bronze";
  location: string;
  flag: string;
  price: number;
  shippingToUS: string;
  shippingToEU: string;
  reliabilityScore: number;
  responseTime: string;
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededRandom(seed: string, min: number, max: number): number {
  const r = hashStr(seed) / 2147483647;
  return min + r * (max - min);
}

export function enrichProduct(title: string, source: string, price: number | null, rating?: number, reviews?: number) {
  const seed = title + source;
  const basePrice = price || 29.99;
  const baseRating = rating || 4.3;
  const baseReviews = reviews || 1000;

  const platforms: PlatformPrice[] = [
    { platform: "Amazon", price: +(basePrice * seededRandom(seed + "amz", 0.85, 1.15)).toFixed(2), rating: +(baseRating + seededRandom(seed + "amzr", -0.3, 0.3)).toFixed(1), reviews: Math.round(baseReviews * seededRandom(seed + "amzrev", 0.5, 3)), inStock: true, url: "#", sparkline: Array.from({ length: 7 }, (_, i) => +(basePrice * (0.9 + seededRandom(seed + "amzs" + i, 0, 0.2))).toFixed(2)) },
    { platform: "AliExpress", price: +(basePrice * seededRandom(seed + "ali", 0.15, 0.4)).toFixed(2), rating: +(baseRating + seededRandom(seed + "alir", -0.4, 0.2)).toFixed(1), reviews: Math.round(baseReviews * seededRandom(seed + "alirev", 2, 8)), inStock: true, url: "#", sparkline: Array.from({ length: 7 }, (_, i) => +(basePrice * 0.25 * (0.9 + seededRandom(seed + "alis" + i, 0, 0.2))).toFixed(2)) },
    { platform: "eBay", price: +(basePrice * seededRandom(seed + "eb", 0.6, 0.9)).toFixed(2), rating: +(baseRating + seededRandom(seed + "ebr", -0.3, 0.2)).toFixed(1), reviews: Math.round(baseReviews * seededRandom(seed + "ebrev", 0.2, 1.5)), inStock: true, url: "#", sparkline: Array.from({ length: 7 }, (_, i) => +(basePrice * 0.75 * (0.9 + seededRandom(seed + "ebs" + i, 0, 0.2))).toFixed(2)) },
    { platform: "CJ Dropshipping", price: +(basePrice * seededRandom(seed + "cj", 0.12, 0.35)).toFixed(2), rating: +(baseRating + seededRandom(seed + "cjr", -0.2, 0.3)).toFixed(1), reviews: Math.round(baseReviews * seededRandom(seed + "cjrev", 1, 5)), inStock: true, url: "#", sparkline: Array.from({ length: 7 }, (_, i) => +(basePrice * 0.2 * (0.9 + seededRandom(seed + "cjs" + i, 0, 0.2))).toFixed(2)) },
  ];

  const cheapest = [...platforms].sort((a, b) => a.price - b.price)[0];
  const mostExpensive = [...platforms].sort((a, b) => b.price - a.price)[0];
  const priceSpread = mostExpensive.price - cheapest.price;
  const bestRating = [...platforms].sort((a, b) => b.rating - a.rating)[0];

  const reviewsData: ReviewData = {
    averageRating: baseRating,
    totalReviews: baseReviews,
    distribution: [
      { stars: 5, percent: Math.round(seededRandom(seed + "r5", 35, 55)) },
      { stars: 4, percent: Math.round(seededRandom(seed + "r4", 15, 30)) },
      { stars: 3, percent: Math.round(seededRandom(seed + "r3", 8, 18)) },
      { stars: 2, percent: Math.round(seededRandom(seed + "r2", 3, 10)) },
      { stars: 1, percent: 0 },
    ],
    sentiment: {
      positive: ["Great quality for the price", "Fast shipping", "Works as described", "Exactly what I needed", "Good build quality"],
      neutral: ["Okay for the price", "Decent but not premium", "Average quality", "Does the job"],
      negative: ["Took longer than expected", "Slightly smaller than pictured", "Packaging could be better"],
    },
    topKeywords: ["quality", "value", "fast shipping", "as described", "recommend", "good product", "works well"],
    commonComplaints: ["Shipping time varies", "Packaging could improve", "Color slightly different from photos"],
    commonPraise: ["Excellent value for money", "Fast delivery", "Product matches description", "Good customer service"],
    trustworthyScore: Math.round(seededRandom(seed + "trust", 72, 96)),
  };

  const vol = seededRandom(seed + "vol", 0, 100);
  const marketIntel: MarketIntel = {
    searchVolume: vol > 66 ? "high" : vol > 33 ? "medium" : "low",
    searchVolumeNumber: Math.round(seededRandom(seed + "voln", 5000, 150000)),
    trendDirection: seededRandom(seed + "trend", 0, 1) > 0.6 ? "rising" : seededRandom(seed + "trend2", 0, 1) > 0.4 ? "stable" : "declining",
    trendSparkline: Array.from({ length: 14 }, (_, i) => Math.round(30 + seededRandom(seed + "ts" + i, 0, 40) + (i * seededRandom(seed + "trend", -2, 4)))),
    seasonality: "Year-round demand with holiday peaks",
    bestTimeToSell: "Q4 (Oct-Dec) for holiday gifts, Q1 for New Year resolutions",
    competitionLevel: priceSpread > basePrice * 0.5 ? "medium" : "high",
    estimatedSellers: Math.round(seededRandom(seed + "sellers", 200, 5000)),
    avgSellerRating: +(baseRating + seededRandom(seed + "avgr", -0.2, 0.2)).toFixed(1),
    priceWarRisk: priceSpread > basePrice * 0.6 ? "low" : "medium",
    canCompete: priceSpread > basePrice * 0.4 ? "Yes - good price spread allows competitive margins" : "Challenging - tight margins across platforms",
    riskScore: Math.round(seededRandom(seed + "risk", 15, 65)),
    riskFactors: [
      { label: "Brand trademark risk", level: seededRandom(seed + "tm", 0, 1) > 0.7 ? "caution" : "safe" },
      { label: "Counterfeit likelihood", level: seededRandom(seed + "cf", 0, 1) > 0.8 ? "caution" : "safe" },
      { label: "Return rate estimate", level: "safe" },
      { label: "Shipping complexity", level: seededRandom(seed + "ship", 0, 1) > 0.6 ? "caution" : "safe" },
      { label: "Seasonal dependency", level: "safe" },
    ],
  };

  const listingSuggestion: ListingSuggestion = {
    title: `Premium ${title} - Fast Free Shipping`,
    description: `Discover the ${title}. High quality, verified seller, 30-day returns. Shop with confidence - trusted by thousands of happy customers.`,
    tags: title.toLowerCase().split(" ").slice(0, 5),
    suggestedPriceRange: `$${(cheapest.price * 1.8).toFixed(2)} - $${(cheapest.price * 3.2).toFixed(2)}`,
    platformTips: [
      { platform: "Amazon", tip: "Use FBA for Prime badge. Consider bundled offers to increase AOV." },
      { platform: "Shopify", tip: "High margin potential. Focus on Facebook/Instagram ads with lifestyle photos." },
      { platform: "eBay", tip: "List as auction for engagement. Use best offer feature to capture more buyers." },
    ],
  };

  const supplierMatches: SupplierMatch[] = [
    { id: "s1", name: "TechSource Global", trustBadge: "gold", location: "Shenzhen, China", flag: "\ud83c\udde8\ud83c\uddf3", price: +cheapest.price.toFixed(2), shippingToUS: "7-12 days", shippingToEU: "10-18 days", reliabilityScore: 92, responseTime: "< 4 hours" },
    { id: "s2", name: "PrimeDrop Fulfillment", trustBadge: "gold", location: "Los Angeles, US", flag: "\ud83c\uddfa\ud83c\uddf8", price: +(cheapest.price * 1.3).toFixed(2), shippingToUS: "2-5 days", shippingToEU: "7-14 days", reliabilityScore: 96, responseTime: "< 2 hours" },
    { id: "s4", name: "CJ Direct", trustBadge: "silver", location: "Yiwu, China", flag: "\ud83c\udde8\ud83c\uddf3", price: +(cheapest.price * 0.9).toFixed(2), shippingToUS: "8-15 days", shippingToEU: "12-20 days", reliabilityScore: 85, responseTime: "< 8 hours" },
  ];

  return { platforms, cheapest, mostExpensive, priceSpread, bestRating, reviewsData, marketIntel, listingSuggestion, supplierMatches };
}

export type EnrichedProduct = ReturnType<typeof enrichProduct>;
