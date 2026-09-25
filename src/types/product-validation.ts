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
  level: "unsaturated" | "low" | "moderate" | "saturated" | "hyper-saturated" | "unknown";
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

// ── Product Authenticity & Quality ───────────────────────────────────────────

export interface ProductAuthenticityInput {
  productTitle: string;
  productUrl: string;
  productImage: string;
  brand: string;
  materials: string[];
  certifications: string[];
  pricePoint: number;
  category: string;
}

export interface ProductAuthenticityResult {
  score: number;
  authenticityLevel: "verified" | "likely-genuine" | "uncertain" | "likely-counterfeit" | "flagged";
  brandVerification: { isKnown: boolean; riskLevel: "low" | "medium" | "high"; notes: string };
  priceAnalysis: { isReasonable: boolean; marketAvg: number; deviation: number; flag: string | null };
  materialCheck: { verified: boolean; concerns: string[] };
  imageAnalysis: { isOriginal: boolean; matchScore: number; concerns: string[] };
  redFlags: string[];
  insight: string;
}

// ── Supplier Validation ──────────────────────────────────────────────────────

export interface SupplierValidationInput {
  supplierName: string;
  supplierUrl: string;
  reliabilityScore: number;
  shippingSpeed: number;
  returnRate: number;
  orderFulfillmentRate: number;
  communicationScore: number;
  yearsInBusiness: number;
  certifications: string[];
  paymentMethods: string[];
  minOrderQuantity: number;
  sampleAvailable: boolean;
}

export interface SupplierValidationResult {
  score: number;
  tier: "platinum" | "gold" | "silver" | "bronze" | "unverified";
  trustSignals: { label: string; status: "pass" | "warn" | "fail"; detail: string }[];
  riskAssessment: { overall: "low" | "medium" | "high"; factors: string[] };
  shippingAnalysis: { avgDays: number; reliability: string; costTier: "low" | "medium" | "high" };
  paymentProtection: { isProtected: boolean; methods: string[]; notes: string };
  recommendation: string;
  insight: string;
}

// ── Competition Analysis ─────────────────────────────────────────────────────

export interface CompetitionAnalysisInput {
  productTitle: string;
  category: string;
  currentPrice: number;
  topCompetitors: {
    name: string;
    price: number;
    rating: number;
    reviewCount: number;
    monthlySales: number;
    platform: string;
  }[];
  averageMarketPrice: number;
  marketShareData: { seller: string; share: number }[];
}

export interface CompetitionAnalysisResult {
  score: number;
  competitivePosition: "dominant" | "strong" | "competitive" | "weak" | "struggling" | "unknown";
  pricePosition: "premium" | "above-average" | "average" | "below-average" | "budget";
  competitorCount: number;
  topCompetitor: { name: string; price: number; rating: number; threat: "low" | "medium" | "high" };
  priceGap: { vsLowest: number; vsHighest: number; vsAverage: number };
  reviewGap: { vsBest: number; vsAverage: number };
  differentiationOpportunities: string[];
  threats: string[];
  marketPositioning: string;
  insight: string;
}

// ── Risk Assessment ──────────────────────────────────────────────────────────

export interface RiskAssessmentInput {
  productTitle: string;
  category: string;
  materials: string[];
  targetMarkets: string[];
  shippingMethods: string[];
  pricePoint: number;
  isBranded: boolean;
  hasVariants: boolean;
  weight: number;
  dimensions: { length: number; width: number; height: number };
}

export interface RiskAssessmentResult {
  score: number;
  overallRisk: "minimal" | "low" | "moderate" | "high" | "critical";
  legalRisks: { type: string; severity: "low" | "medium" | "high"; description: string; mitigation: string }[];
  complianceIssues: { area: string; status: "compliant" | "warning" | "violation"; details: string }[];
  shippingRestrictions: { region: string; restricted: boolean; reason: string }[];
  platformRisks: { platform: string; compliant: boolean; issues: string[] }[];
  insuranceRecommendation: { needed: boolean; reason: string };
  totalRiskScore: number;
  insight: string;
}

// ── Market Intelligence ──────────────────────────────────────────────────────

export interface MarketIntelligenceInput {
  productTitle: string;
  category: string;
  targetAudience: string;
  pricePoint: number;
  monthlySalesEstimate: number;
}

export interface MarketIntelligenceResult {
  score: number;
  marketSize: { tam: number; sam: number; som: number; currency: string };
  growthRate: { current: number; projected: number; trend: "accelerating" | "stable" | "decelerating" };
  audienceDemographics: {
    primaryAge: string;
    genderSplit: string;
    topLocations: string[];
    buyingBehavior: string;
  };
  demandIndicators: { searchTrend: string; socialBuzz: "low" | "medium" | "high"; seasonalFactor: number };
  priceElasticity: "elastic" | "unit-elastic" | "inelastic";
  marketMaturity: "nascent" | "growth" | "mature" | "declining";
  insight: string;
}

// ── Bundle & Upsell ─────────────────────────────────────────────────────────

export interface BundleAnalysisInput {
  productTitle: string;
  category: string;
  pricePoint: number;
  averageOrderValue: number;
  customerSegment: string;
}

export interface BundleAnalysisResult {
  score: number;
  bundleOpportunities: {
    name: string;
    type: "cross-sell" | "upsell" | "bundle" | "accessory";
    expectedLift: number;
    confidence: number;
    rationale: string;
  }[];
  avgOrderValuePotential: { current: number; potential: number; lift: number };
  customerLifetimeImpact: { oneTime: number; withBundles: number };
  recommendations: string[];
  insight: string;
}

// ── Export & Comparison ──────────────────────────────────────────────────────

export interface ValidationExport {
  productTitle: string;
  exportedAt: string;
  goldenProduct: GoldenProductResult;
  trendVelocity: TrendVelocityResult;
  saturation: SaturationResult;
  profitPotential: ProfitPotentialResult;
  seasonalDemand: SeasonalDemandResult;
  productAuthenticity?: ProductAuthenticityResult;
  supplierValidation?: SupplierValidationResult;
  competitionAnalysis?: CompetitionAnalysisResult;
  riskAssessment?: RiskAssessmentResult;
  marketIntelligence?: MarketIntelligenceResult;
  bundleAnalysis?: BundleAnalysisResult;
}

export interface ComparisonData {
  products: {
    title: string;
    goldenScore: number;
    goldenRank: string;
    results: ProductValidationResult;
  }[];
  winner: number;
  insights: string[];
}

// ── Combined Validation Result ───────────────────────────────────────────────

export interface ProductValidationResult {
  trendVelocity: TrendVelocityResult;
  saturation: SaturationResult;
  profitPotential: ProfitPotentialResult;
  seasonalDemand: SeasonalDemandResult;
  goldenProduct: GoldenProductResult;
  productAuthenticity?: ProductAuthenticityResult;
  supplierValidation?: SupplierValidationResult;
  competitionAnalysis?: CompetitionAnalysisResult;
  riskAssessment?: RiskAssessmentResult;
  marketIntelligence?: MarketIntelligenceResult;
  bundleAnalysis?: BundleAnalysisResult;
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
  riskScore?: number;
  supplierScore?: number;
  competitionScore?: number;
  authenticityScore?: number;
  marketScore?: number;
  inputs: Record<string, unknown>;
  createdAt: Timestamp;
}
