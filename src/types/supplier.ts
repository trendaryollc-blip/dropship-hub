export interface SupplierProfile {
  id: string;
  name: string;
  slug: string;
  location: string;
  country: string;
  flag: string;
  description: string;
  specializations: string[];
  trustBadge: "gold" | "silver" | "bronze";
  dataSource: "live" | "estimated" | "sample";
  stats: {
    reliabilityScore: number;
    rating: number;
    reviews: number;
    responseTime: string;
    responseTimeHours: number;
    shippingDays: number;
    shippingDaysEU: number;
    orderCompletionRate: number;
    disputeRate: number;
    monthlyOrders: number;
    totalProducts: number;
    yearEstablished: number;
    communicationScore: number;
    qualityScore: number;
    priceCompetitiveness: number;
  };
  shipping: {
    methods: string[];
    processingTime: string;
    freeShippingThreshold: number | null;
    packagingQuality: "standard" | "premium" | "enterprise";
  };
  quality: {
    inspection: string;
    returnPolicy: string;
    refundPolicy: string;
    replacementPolicy: string;
    disputeResolution: string;
    certifications: string[];
  };
  catalog: {
    categories: string[];
    priceRange: { min: number; max: number };
    moq: number;
    samplesAvailable: boolean;
    samplePrice: number | null;
  };
  communication: {
    methods: string[];
    languages: string[];
    supportHours: string;
  };
  source: "cj" | "alibaba" | "aliexpress" | "amazon" | "google" | "keepa" | "walmart" | "compiled";
  sourceUrl: string | null;
  lastUpdated: string;
}

export interface SupplierSearchResult {
  suppliers: SupplierProfile[];
  total: number;
  sources: string[];
}

// ── Supplier Performance Intelligence ──────────────────────────

export interface SupplierPerformance {
  supplierId: string;
  supplierName: string;
  reliabilityScore: number;
  reliabilityTrend: number;
  refundRate: number;
  refundRateTrend: number;
  avgShippingDays: number;
  shippingTrend: number;
  complaintRate: number;
  complaintTrend: number;
  stockReliability: number;
  stockTrend: number;
  communicationScore: number;
  qualityScore: number;
  totalOrders: number;
  responseTimeHours: number;
  dailySnapshots: SupplierMetricSnapshot[];
  status: "excellent" | "good" | "warning" | "critical";
}

export interface SupplierMetricSnapshot {
  date: string;
  reliabilityScore: number;
  refundRate: number;
  shippingDays: number;
  complaintRate: number;
  stockReliability: number;
  orders: number;
}

export interface SupplierAlert {
  id: string;
  supplierId: string;
  supplierName: string;
  type: "quality_degradation" | "shipping_delay" | "stock_low" | "refund_spike" | "communication_issue";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  metric: string;
  previousValue: number;
  currentValue: number;
  changePercent: number;
  recommendation: string;
  createdAt: string;
}

export interface SupplierComparison {
  suppliers: {
    name: string;
    reliabilityScore: number;
    refundRate: number;
    avgShippingDays: number;
    complaintRate: number;
    stockReliability: number;
    priceCompetitiveness: number;
    totalOrders: number;
  }[];
}
