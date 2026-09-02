export interface CompetitorListing {
  id: string;
  title: string;
  price: number;
  source: string;
  seller: string;
  sellerRating: number;
  sellerProducts: number;
  link: string;
  shipping: string;
  condition: "New" | "Used" | "Refurbished";
  daysAgo: number;
}

export interface PlatformData {
  platform: string;
  icon: string;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
  sellerCount: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  sparkline: number[];
  listings: CompetitorListing[];
}

export interface SellerProfile {
  name: string;
  platform: string;
  rating: number;
  totalProducts: number;
  price: number;
  threatLevel: "low" | "medium" | "high";
  isDropshipper: boolean;
  otherProducts: { name: string; price: number }[];
  responseTime: string;
  returnPolicy: string;
}

export interface PriceTier {
  range: string;
  count: number;
  percent: number;
  isSweetSpot: boolean;
}

export interface Opportunity {
  type: "opportunity" | "gap" | "avoid";
  title: string;
  description: string;
  count: number;
  potentialMargin?: number;
  actionLabel: string;
}

export interface PricingOption {
  label: string;
  icon: string;
  price: number;
  margin: number;
  description: string;
  tradeoff: string;
  isRecommended: boolean;
  color: string;
}

export interface MarketData {
  query: string;
  totalListings: number;
  avgPrice: number;
  medianPrice: number;
  minPrice: number;
  maxPrice: number;
  profitZone: { min: number; max: number; label: string };
  priceDistribution: PriceTier[];
  platforms: PlatformData[];
  topSellers: SellerProfile[];
  opportunities: Opportunity[];
  pricingOptions: PricingOption[];
  priceHistory: { date: string; avg: number; min: number; max: number }[];
  insights: string[];
}
