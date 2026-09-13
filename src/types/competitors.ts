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

export interface SWOTItem {
  category: "strengths" | "weaknesses" | "opportunities" | "threats";
  items: string[];
}

export interface CompetitorSWOT {
  sellerName: string;
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
  exploitableVulnerability: string;
}

export interface GapItem {
  type: "product" | "feature" | "content" | "keyword" | "price";
  title: string;
  description: string;
  demandScore: number;
  competitionLevel: "low" | "medium" | "high";
  estimatedValue: string;
  actionLabel: string;
}

export interface AdIntel {
  platform: string;
  estimatedSpend: string;
  adCount: number;
  topKeywords: string[];
  adType: string;
  socialFollowers: number;
  engagementRate: string;
}

export interface CompetitorAdIntel {
  sellerName: string;
  totalAdSpend: string;
  platforms: AdIntel[];
  socialPresence: { platform: string; followers: number; engagement: string }[];
  topPerformingAd: { title: string; platform: string; estimatedReach: string };
  seoScore: number;
  keywordOverlap: number;
}

export interface ActionItem {
  id: string;
  priority: "critical" | "high" | "medium" | "low";
  category: "pricing" | "product" | "marketing" | "sourcing" | "listing";
  title: string;
  description: string;
  impact: string;
  effort: "easy" | "medium" | "hard";
  estimatedGain: string;
  relatedCompetitor?: string;
}

export interface ExecutiveSummary {
  competitionIntensity: number;
  threatLevel: "low" | "medium" | "high" | "critical";
  keyOpportunity: string;
  marketMomentum: "heating" | "stable" | "cooling";
  totalSellers: number;
  avgRating: number;
  priceVolatility: number;
  topThreat: string;
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
  executiveSummary?: ExecutiveSummary;
  competitorSWOT?: CompetitorSWOT[];
  gapAnalysis?: GapItem[];
  adIntel?: CompetitorAdIntel[];
  actionItems?: ActionItem[];
}
