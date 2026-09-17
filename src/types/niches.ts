export interface NicheProduct {
  id: string;
  name: string;
  image: string;
  sellPrice: number;
  costPrice: number;
  margin: number;
  orders: number;
  rating: number;
  shippingDays: number;
  returnRate: number;
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
  avgStoreRating: number;
  storeCount: number;
  priceRange: { min: number; max: number; avg: number };
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
  avgMargin: number;
  growth: number;
  trend: "up" | "down" | "stable";
  trendDirection: "rising" | "stable" | "declining";
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
  topProductPrice: number;
  topProductMargin: number;
  aiInsight: string;
  competitionLevel: "low" | "medium" | "high" | "very-high";
  saturation: number;
  avgSellingPrice: number;
  bestPlatforms: string[];
  seasonality: string;
  riskLevel: "low" | "medium" | "high";
  topSuppliers: NicheSupplier[];
  relatedNiches: string[];
  keywords: string[];
  estimatedMonthlyRevenue: number;
  profitPerUnit: number;
  avgShippingDays: number;
  avgReturnRate: number;
  topProducts: NicheProduct[];
  competition: NicheCompetition;
  geographicDemand: NicheGeographic[];
  seasonalTrend: NicheSeasonal[];
}
