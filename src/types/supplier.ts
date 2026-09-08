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
  dataSource: "live" | "estimated";
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
  source: "cj" | "alibaba" | "aliexpress" | "amazon" | "google" | "walmart" | "other";
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

// ── Supplier Due Diligence ─────────────────────────────────────

export interface RedFlag {
  type: "review_manipulation" | "price_gouging" | "stock_unreliable" | "slow_shipping" | "high_refunds" | "new_supplier" | "fake_orders";
  severity: "warning" | "critical";
  evidence: string;
  detectedAt: string;
}

export interface SupplierDueDiligence {
  supplierId: string;
  supplierName: string;
  overallRiskScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  generatedAt: string;
  expiresAt: string;
  redFlags: RedFlag[];
  strengths: string[];
  historyAnalysis: {
    reviewPattern: "organic" | "suspicious" | "mixed";
    averageReviewAge: number;
    refundTrend: "improving" | "stable" | "declining";
    priceStability: "stable" | "volatile" | "declining";
    stockConsistency: number;
  };
  recommendation: {
    verdict: "recommended" | "caution" | "avoid";
    confidence: number;
    summary: string;
    bestFor: string[];
    avoidFor: string[];
  };
  comparableSupplierIds: string[];
}

// ── Cross-Platform Price Intelligence ─────────────────────────

export interface SupplierOffer {
  supplierId: string;
  supplierName: string;
  trustBadge: "gold" | "silver" | "bronze";
  unitPrice: number;
  shippingCost: number;
  shippingDays: number;
  moq: number;
  totalCostPerUnit: number;
  estimatedMargin: number;
  inStock: boolean;
  sampleAvailable: boolean;
  samplePrice: number;
  qualityScore: number;
  reliabilityScore: number;
}

export interface PriceIntelligenceProduct {
  id: string;
  productQuery: string;
  normalizedProductName: string;
  category: string;
  lastUpdated: string;
  offers: SupplierOffer[];
  bestDeal: string;
  priceHistory: PricePoint[];
}

export interface PricePoint {
  date: string;
  supplierId: string;
  price: number;
}

// ── Supplier Health Monitoring ─────────────────────────────────

export interface SupplierHealthMetric {
  current: number;
  trend: number[];
  alert: boolean;
}

export interface SupplierHealthSnapshot {
  supplierId: string;
  timestamp: string;
  metrics: {
    shippingSpeed: SupplierHealthMetric;
    stockLevel: SupplierHealthMetric;
    priceStability: SupplierHealthMetric;
    responseTime: SupplierHealthMetric;
    refundRate: SupplierHealthMetric;
  };
  overallHealth: number;
  healthTrend: "improving" | "stable" | "declining";
  prediction: {
    riskOfIssue: number;
    predictedIssue: string;
    confidence: number;
    daysUntilIssue: number;
  } | null;
}

export interface SupplierHealthAlert {
  id: string;
  supplierId: string;
  type: "shipping_slowdown" | "price_increase" | "stock_low" | "refund_spike" | "response_delay" | "quality_drop" | "predicted_stockout" | "predicted_price_hike";
  severity: "info" | "warning" | "critical";
  message: string;
  metric: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  recommendation: string;
  createdAt: string;
  acknowledged: boolean;
}

// ── Niche Supplier Discovery ──────────────────────────────────

export interface NicheSupplierScore {
  supplierId: string;
  supplierName: string;
  nicheScore: number;
  competitiveDensity: number;
  saturationLevel: "low" | "medium" | "high" | "saturated";
  uniqueProducts: number;
  trendingProducts: number;
  opportunityScore: number;
  categoryBreakdown: {
    category: string;
    density: number;
    avgMargin: number;
    trendDirection: "rising" | "stable" | "falling";
  }[];
}

// ── Sample Ordering ───────────────────────────────────────────

export interface SampleOrder {
  id: string;
  userId: string;
  supplierId: string;
  supplierName: string;
  productName: string;
  productImageUrl: string;
  samplePrice: number;
  status: "requested" | "ordered" | "shipped" | "delivered" | "reviewed";
  trackingNumber?: string;
  orderedAt: string;
  deliveredAt?: string;
  qualityRating?: number;
  qualityBreakdown?: {
    packaging: number;
    productMatch: number;
    materialQuality: number;
    craftsmanship: number;
  };
  photos?: string[];
  notes?: string;
  wouldOrder: boolean;
}

export interface SupplierQualityScore {
  supplierId: string;
  avgQualityRating: number;
  totalSamplesReviewed: number;
  breakdownAverages: {
    packaging: number;
    productMatch: number;
    materialQuality: number;
    craftsmanship: number;
  };
  communityVerdict: "excellent" | "good" | "average" | "poor";
  recentReviews: SampleReview[];
}

export interface SampleReview {
  userId: string;
  userName: string;
  rating: number;
  breakdown: {
    packaging: number;
    productMatch: number;
    materialQuality: number;
    craftsmanship: number;
  };
  notes: string;
  photos: string[];
  verified: boolean;
  date: string;
}

// ── Smart Supplier Matching ───────────────────────────────────

export interface StoreProfile {
  niche: string;
  targetAudience: string;
  priceRange: { min: number; max: number };
  monthlyVolume: number;
  priorities: {
    speed: number;
    price: number;
    quality: number;
    reliability: number;
  };
}

export interface SupplierRecommendation {
  supplierId: string;
  supplierName: string;
  role: "primary" | "backup" | "niche" | "seasonal";
  categories: string[];
  reason: string;
  matchScore: number;
  estimatedMargin: number;
  riskMitigation: string;
  synergy: string;
}

export interface SupplierMatchResult {
  id: string;
  userId: string;
  storeProfile: StoreProfile;
  generatedAt: string;
  recommendations: SupplierRecommendation[];
  portfolioSummary: {
    totalSuppliers: number;
    estimatedMonthlyCost: number;
    estimatedAvgMargin: number;
    riskScore: number;
    coverageScore: number;
  };
}

// ── Live Chat ─────────────────────────────────────────────────

export interface SupplierConversation {
  id: string;
  supplierId: string;
  supplierName: string;
  subject: string;
  lastMessageAt: string;
  unreadCount: number;
  status: "active" | "archived";
  messages: SupplierMessageItem[];
}

export interface SupplierMessageItem {
  id: string;
  direction: "outgoing" | "incoming";
  subject?: string;
  body: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
}

export interface MessageTemplate {
  id: string;
  name: string;
  category: "sample_request" | "negotiation" | "quality_issue" | "stock_inquiry" | "custom";
  subject: string;
  body: string;
  variables: string[];
}

// ── Radar Comparison ──────────────────────────────────────────

export interface RadarComparisonSupplier {
  supplierId: string;
  supplierName: string;
  color: string;
  scores: {
    price: number;
    speed: number;
    quality: number;
    reliability: number;
    communication: number;
  };
  overallScore: number;
}

export interface RadarComparison {
  suppliers: RadarComparisonSupplier[];
  insights: string[];
}

// ── Seasonal Intelligence ─────────────────────────────────────

export interface SeasonalInsight {
  id: string;
  season: "q4" | "back_to_school" | "summer" | "valentines" | "mothers_day" | "custom";
  eventName: string;
  startDate: string;
  endDate: string;
  supplierPerformance: {
    supplierId: string;
    supplierName: string;
    historicalReliability: number;
    peakOrderCapacity: number;
    averageDelay: number;
    priceStability: number;
    userRating: number;
  }[];
  recommendations: {
    tier: "elite" | "reliable" | "risky" | "avoid";
    supplierIds: string[];
    reason: string;
  }[];
  preparationTips: string[];
  daysUntilEvent: number;
}

// ── Community Reviews ─────────────────────────────────────────

export interface SupplierReview {
  id: string;
  supplierId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  overallRating: number;
  breakdown: {
    productQuality: number;
    shippingSpeed: number;
    communication: number;
    pricing: number;
    reliability: number;
  };
  title: string;
  body: string;
  photos: string[];
  orderVolume: number;
  timeWorkingWithSupplier: string;
  verified: boolean;
  helpful: number;
  createdAt: string;
}

export interface SupplierCommunityScore {
  supplierId: string;
  totalReviews: number;
  avgRating: number;
  breakdownAverages: {
    productQuality: number;
    shippingSpeed: number;
    communication: number;
    pricing: number;
    reliability: number;
  };
  verifiedPercentage: number;
  sentimentDistribution: {
    positive: number;
    neutral: number;
    negative: number;
  };
  topPraise: string[];
  topComplaints: string[];
}
