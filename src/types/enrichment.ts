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
