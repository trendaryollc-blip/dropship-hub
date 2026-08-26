export interface PlatformPrice {
  platform: string;
  price: number;
  url: string;
  inStock: boolean;
  rating: number;
  reviews: number;
}

export interface Supplier {
  id: string;
  name: string;
  location: string;
  reliabilityScore: number;
  shippingDays: number;
  rating: number;
  reviews: number;
  responseTime: string;
  trustBadge: "gold" | "silver" | "bronze";
  orderCompletionRate: number;
  disputeRate: number;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  platformPrices: PlatformPrice[];
  suppliers: Supplier[];
  trending: boolean;
  riskScore: number;
  profitPotential: "high" | "medium" | "low";
  competitionLevel: "low" | "medium" | "high" | "very-high";
  searchVolume: number;
  averageRating: number;
  totalReviews: number;
  marketTrend: "rising" | "stable" | "declining";
  seasonality: string;
  tags: string[];
}

export interface CalculatorInput {
  productCost: number;
  sellingPrice: number;
  shippingCost: number;
  platformFeePercent: number;
  adSpend: number;
  taxPercent: number;
  tariffPercent: number;
  customsDuty: number;
  otherCosts: number;
}

export interface CalculatorResult {
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
  breakEvenUnits: number;
  landedCost: number;
  costBreakdown: { name: string; value: number; color: string }[];
}

// ── Product Lifecycle Manager ──────────────────────────────────

export type LifecycleStage = "discovery" | "testing" | "winning" | "scaling" | "saturation" | "sunset";

export interface ProductLifecycle {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  category: string;
  currentStage: LifecycleStage;
  stageEnteredAt: string;
  daysInStage: number;
  totalDaysTracked: number;
  snapshots: LifecycleSnapshot[];
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    totalProfit: number;
    avgProfitMargin: number;
    competitionCount: number;
    searchVolume: number;
    trendDirection: "rising" | "stable" | "declining";
  };
  alerts: LifecycleAlert[];
  recommendations: string[];
}

export interface LifecycleSnapshot {
  date: string;
  stage: LifecycleStage;
  orders: number;
  revenue: number;
  profit: number;
  competitionCount: number;
  searchVolume: number;
}

export interface LifecycleAlert {
  id: string;
  type: "stage_transition" | "competition_spike" | "profit_decline" | "trend_shift" | "sunset_warning";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  detectedAt: string;
}

export interface LifecycleStageInfo {
  stage: LifecycleStage;
  label: string;
  color: string;
  bgColor: string;
  description: string;
  typicalDuration: string;
}
