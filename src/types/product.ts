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
