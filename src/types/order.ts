export interface RoutingDecision {
  id: string;
  orderId: string;
  orderDate: string;
  customerName: string;
  customerLocation: string;
  productTitle: string;
  productImage: string;
  quantity: number;
  totalPrice: number;
  selectedSupplier: SupplierOption | string | null;
  alternativeSuppliers: SupplierOption[];
  reasoning: string;
  status: "routed" | "pending" | "fallback" | "failed";
  routedAt: string;
  estimatedDelivery: string;
  shippingCost: number | null;
  totalCost: number | null;
}

export interface SupplierOption {
  supplierId: string;
  supplierName: string;
  inStock: boolean;
  stockLevel: number;
  shippingDays: number;
  shippingCost: number;
  unitCost: number;
  totalCost: number;
  qualityScore: number;
  location: string;
  reliabilityScore: number;
  totalScore: number;
  selected: boolean;
  rejectionReason?: string;
}

export interface RoutingPreferences {
  optimization: "speed" | "cost" | "balanced";
  maxShippingDays: number;
  minQualityScore: number;
  preferLocalWarehouse: boolean;
  autoFallback: boolean;
  maxFallbackAttempts: number;
}

export interface RoutingAnalytics {
  totalRouted: number;
  avgShippingDays: number | null;
  avgCost: number | null;
  supplierDistribution: { name: string; count: number; color: string }[];
  optimizationBreakdown: { type: string; count: number }[];
  costSavings: number | null;
  timeSavings: number | null;
  /** Orders per day for the selected window (real data from the API). */
  dailyCounts?: { date: string; count: number }[];
}

export interface RoutingHistory {
  id: string;
  orderId: string;
  productTitle: string;
  customerLocation: string;
  customerName?: string;
  selectedSupplier: string;
  shippingDays: number | null;
  shippingCost: number | null;
  totalCost: number | null;
  reason: string;
  status: "routed" | "pending" | "fallback" | "failed";
  routedAt: string;
}
