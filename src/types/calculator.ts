export type CalculatorCategory = "profit-pricing" | "shipping-logistics" | "advertising" | "platform-specific";

export type CalculatorId =
  | "profit"
  | "margin"
  | "break-even"
  | "shipping"
  | "landed-cost"
  | "customs"
  | "ad-roi"
  | "returns"
  | "amazon-fba"
  | "platform-comparison";

export interface CalculatorMeta {
  id: CalculatorId;
  label: string;
  description: string;
  icon: string;
  href: string;
  category: CalculatorCategory;
  isNew?: boolean;
}

export interface CalculatorCategoryMeta {
  id: CalculatorCategory;
  label: string;
  description: string;
  icon: string;
  color: string;
  calculators: CalculatorMeta[];
}

export interface AmazonFBACalcInput {
  productCategory: string;
  productWeight: number;
  productDimensions: { length: number; width: number; height: number };
  sellingPrice: number;
  productCost: number;
  shippingToWarehouse: number;
  monthlyStorageMonths: number;
}

export interface AmazonFBACalcResult {
  fbaFee: number;
  referralFee: number;
  storageFee: number;
  totalAmazonFees: number;
  profitPerUnit: number;
  margin: number;
  roi: number;
  fbaVsFbm: { fba: number; fbm: number; savings: number };
  breakdown: { name: string; value: number; pct: number; color: string }[];
}

export interface BreakEvenCalcInput {
  fixedCosts: number;
  sellingPrice: number;
  variableCostPerUnit: number;
  monthlyAdBudget: number;
}

export interface BreakEvenCalcResult {
  breakEvenUnits: number;
  breakEvenRevenue: number;
  contributionMargin: number;
  contributionMarginPct: number;
  daysToBreakEven: number;
  monthlyProjection: { month: number; cumulativeProfit: number; orders: number }[];
}

export interface ReturnsCalcInput {
  sellingPrice: number;
  productCost: number;
  shippingCost: number;
  returnRate: number;
  returnShippingCost: number;
  refundProcessingFee: number;
  monthlyOrders: number;
}

export interface ReturnsCalcResult {
  returnCostPerUnit: number;
  totalMonthlyReturnCost: number;
  returnImpactOnMargin: number;
  netLossPerReturn: number;
  annualReturnCost: number;
  breakdown: { name: string; value: number; color: string }[];
}

export interface PlatformFeeData {
  platform: string;
  monthlyFee: number;
  transactionFee: number;
  perOrderFee: number;
  referralFee: number;
  paymentProcessing: number;
  color: string;
}

export interface PlatformComparisonResult {
  platforms: (PlatformFeeData & {
    totalFeeAtPrice: number;
    netProfitAtPrice: number;
    effectiveFeeRate: number;
  })[];
  bestPlatform: string;
  worstPlatform: string;
}
