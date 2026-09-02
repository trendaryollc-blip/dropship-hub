import { Timestamp } from "firebase/firestore";

// ── Trend Velocity ───────────────────────────────────────────────────────────

export interface TrendVelocityInput {
  currentSearchVolume: number;
  historicalSearchVolumes: number[];
  currentSellerCount: number;
  historicalSellerCounts: number[];
  currentPrice: number;
  historicalPrices: number[];
}

export interface TrendVelocityResult {
  score: number;
  velocity: number;
  acceleration: number;
  phase: "emerging" | "growth" | "mature" | "declining";
  weeklyGrowthRates: number[];
  insight: string;
}

// ── Saturation Index ─────────────────────────────────────────────────────────

export interface SaturationInput {
  totalSellers: number;
  topSellerMarketShare: number;
  avgSellerRating: number;
  avgSellerReviews: number;
  priceRange: { min: number; max: number };
  uniqueVariants: number;
  platformCount: number;
}

export interface SaturationResult {
  index: number;
  level: "unsaturated" | "low" | "moderate" | "saturated" | "hyper-saturated";
  sellerCount: number;
  marketConcentration: number;
  priceWarRisk: "low" | "medium" | "high";
  barrierToEntry: "low" | "medium" | "high";
  insight: string;
}

// ── Profit Potential ─────────────────────────────────────────────────────────

export interface ProfitPotentialInput {
  productCost: number;
  sellingPrice: number;
  shippingCost: number;
  platformFeePercent: number;
  adCostPerClick: number;
  conversionRate: number;
  returnRate: number;
  averageOrderValue: number;
  monthlyAdBudget: number;
  estimatedMonthlySales: number;
}

export interface ProfitPotentialResult {
  score: number;
  netProfitPerUnit: number;
  profitMargin: number;
  roi: number;
  breakEvenROAS: number;
  monthlyNetProfit: number;
  monthlyROI: number;
  costBreakdown: { name: string; value: number; pct: number; color: string }[];
  riskAdjustedReturn: number;
  insight: string;
}

// ── Seasonal Demand ──────────────────────────────────────────────────────────

export interface SeasonalDemandInput {
  monthlySearchVolumes: number[];
  monthlySalesData: number[];
  monthlyRevenue: number[];
  category: string;
}

export interface SeasonalDemandResult {
  score: number;
  peakMonth: number;
  lowMonth: number;
  seasonalityIndex: number;
  currentPhase: "peak" | "off-peak" | "building" | "declining";
  forecast: { month: string; predicted: number; confidence: number }[];
  monthLabels: string[];
  insight: string;
}

// ── Golden Product Score ─────────────────────────────────────────────────────

export interface GoldenProductInput {
  trendVelocity: TrendVelocityResult;
  saturation: SaturationResult;
  profitPotential: ProfitPotentialResult;
  seasonalDemand: SeasonalDemandResult;
  reviewScore: number;
  reviewCount: number;
  supplierReliability: number;
  shippingSpeed: number;
  returnRate: number;
  competitionLevel: "low" | "medium" | "high" | "very-high";
}

export interface GoldenCriterion {
  name: string;
  score: number;
  weight: number;
  contribution: number;
  status: "excellent" | "good" | "average" | "poor";
}

export interface GoldenProductResult {
  score: number;
  rank: "S" | "A" | "B" | "C" | "D";
  criteria: GoldenCriterion[];
  verdict: string;
  actionItems: string[];
  overallInsight: string;
}

// ── Combined Validation Result ───────────────────────────────────────────────

export interface ProductValidationResult {
  trendVelocity: TrendVelocityResult;
  saturation: SaturationResult;
  profitPotential: ProfitPotentialResult;
  seasonalDemand: SeasonalDemandResult;
  goldenProduct: GoldenProductResult;
}

// ── Firestore Document ───────────────────────────────────────────────────────

export interface ProductValidationDoc {
  id: string;
  productTitle: string;
  productImage?: string;
  productUrl?: string;
  goldenScore: number;
  goldenRank: string;
  trendVelocity: number;
  saturationIndex: number;
  profitScore: number;
  seasonalScore: number;
  inputs: Record<string, unknown>;
  createdAt: Timestamp;
}
