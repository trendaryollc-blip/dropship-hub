export interface CostProfile {
  id: string;
  productId: string;
  productTitle: string;
  cogs: number;
  shippingCost: number;
  platformFeePercent: number;
  paymentProcessingPercent: number;
  packagingCost: number;
  otherCosts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfitEntry {
  id: string;
  orderId: string;
  date: string;
  productTitle: string;
  productImage: string;
  platform: string;
  supplier: string;
  revenue: number;
  cogs: number;
  shippingCost: number;
  platformFee: number;
  paymentProcessing: number;
  refunds: number;
  adSpend: number;
  otherCosts: number;
  netProfit: number;
  profitMargin: number;
  campaignName?: string;
  customerLocation?: string;
  status: "completed" | "pending" | "refunded" | "disputed";
}

export interface ProfitSummary {
  totalRevenue: number;
  totalProfit: number;
  totalCosts: number;
  profitMargin: number;
  totalOrders: number;
  avgOrderProfit: number;
  avgOrderValue: number;
  refundRate: number;
  topProducts: ProductProfitability[];
  dailyBreakdown: DailyProfit[];
  costBreakdown: CostBreakdownItem[];
}

export interface ProductProfitability {
  productTitle: string;
  productImage: string;
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  profitMargin: number;
  trend: number;
  status: "profitable" | "breakeven" | "losing";
}

export interface DailyProfit {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
  costs: number;
}

export interface CostBreakdownItem {
  name: string;
  value: number;
  pct: number;
  color: string;
}

export interface CampaignProfit {
  campaignName: string;
  adSpend: number;
  revenue: number;
  profit: number;
  roas: number;
  orders: number;
}

export interface ProfitTimeframe {
  label: string;
  value: string;
}

export interface ProfitFilters {
  timeframe: "7d" | "30d" | "90d" | "all";
  platform?: string;
  supplier?: string;
  product?: string;
}
