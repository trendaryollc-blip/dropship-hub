export interface NicheProduct {
  id: string;
  name: string;
  image: string;
  sellPrice: number;
  costPrice: number;
  margin: number;
  orders: number | null;
  rating: number | null;
  shippingDays: number | null;
  returnRate: number | null;
}

export interface NicheSupplier {
  name: string;
  badge: "gold" | "silver" | "bronze";
  reliability: number;
  avgShippingDays: number;
  price: number;
  moq: number;
  responseRate: number;
}

export interface NicheCompetition {
  avgStoreRating: number | null;
  storeCount: number | null;
  priceRange: { min: number; max: number; avg: number } | null;
  topPlatforms: string[];
  saturationLevel: "low" | "medium" | "high" | "very-high";
}

export interface NicheGeographic {
  country: string;
  demand: number;
  avgOrderValue: number;
}

export interface NicheSeasonal {
  month: string;
  demand: number;
  isPeak: boolean;
}

export interface NicheData {
  id: string;
  name: string;
  icon: string;
  image: string;
  category: string;
  heat: number;
  productCount: number;
  avgMargin: number | null;
  growth: number | null;
  trend: "up" | "down" | "stable" | null;
  trendDirection: "rising" | "stable" | "declining" | null;
  weeklyData: number[];
  demandSparkline: number[];
  scores: {
    demand: number;
    profit: number;
    competition: number;
    trend: number;
    seasonality: number;
  };
  overallScore: number;
  grade: "A+" | "A" | "B+" | "B" | "C+" | "C";
  topProduct: string;
  topProductPrice: number | null;
  topProductMargin: number | null;
  aiInsight: string;
  competitionLevel: "low" | "medium" | "high" | "very-high";
  saturation: number;
  avgSellingPrice: number | null;
  bestPlatforms: string[];
  seasonality: string | null;
  riskLevel: "low" | "medium" | "high";
  topSuppliers: NicheSupplier[];
  relatedNiches: string[];
  keywords: string[];
  estimatedMonthlyRevenue: number | null;
  profitPerUnit: number | null;
  avgShippingDays: number | null;
  avgReturnRate: number | null;
  topProducts: NicheProduct[];
  competition: NicheCompetition;
  geographicDemand: NicheGeographic[];
  seasonalTrend: NicheSeasonal[];
  isFallback?: boolean;
}
