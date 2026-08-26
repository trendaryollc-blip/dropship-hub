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
  selectedSupplier: SupplierOption;
  alternativeSuppliers: SupplierOption[];
  reasoning: string;
  status: "routed" | "pending" | "fallback" | "failed";
  routedAt: string;
  estimatedDelivery: string;
  shippingCost: number;
  totalCost: number;
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
  avgShippingDays: number;
  avgCost: number;
  supplierDistribution: { name: string; count: number; color: string }[];
  optimizationBreakdown: { type: string; count: number }[];
  costSavings: number;
  timeSavings: number;
}

export interface RoutingHistory {
  id: string;
  orderId: string;
  productTitle: string;
  customerLocation: string;
  selectedSupplier: string;
  shippingDays: number;
  shippingCost: number;
  reason: string;
  routedAt: string;
}
