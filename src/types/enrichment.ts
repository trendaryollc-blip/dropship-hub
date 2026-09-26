export interface PlatformPrice {
  platform: string;
  price: number;
  rating: number | null;
  reviews: number | null;
  inStock: boolean | null;
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
  trustworthyScore: number | null;
  /** true when star ratings were estimated from review text, not reported by the source. */
  ratingsEstimated?: boolean;
}

export interface MarketIntel {
  searchVolume: "high" | "medium" | "low";
  interestIndex: number;
  trendDirection: "rising" | "stable" | "declining";
  trendSparkline: number[];
  seasonality: string;
  bestTimeToSell: string;
  competitionLevel: "low" | "medium" | "high" | "very-high";
  estimatedSellers: number;
  avgSellerRating: number | null;
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
  fallback: boolean;
  platformTips: { platform: string; tip: string }[];
}

export interface SupplierMatch {
  id: string;
  name: string;
  trustBadge: "gold" | "silver" | "bronze";
  location: string;
  flag: string;
  price: number | null;
  shippingToUS: string;
  shippingToEU: string;
  reliabilityScore: number;
  responseTime: string;
}
