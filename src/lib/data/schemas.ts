import { z } from "zod";

// ── Helpers ──────────────────────────────────────────────────────────────────

const firestoreTimestamp = z.any();
const optionalNumber = z.number().optional();
const optionalString = z.string().optional();

// ── User Settings ────────────────────────────────────────────────────────────

export const UserSettingsSchema = z.object({
  aiProviderPriority: z.array(z.object({
    id: z.string(),
    active: z.boolean(),
    priority: z.number(),
  })),
  defaultCurrency: z.string(),
  notifications: z.boolean(),
  theme: z.enum(["dark", "light"]),
  digestSettings: z.object({
    enabled: z.boolean(),
    frequency: z.enum(["daily", "weekly"]),
    includeMetrics: z.boolean(),
    includeAlerts: z.boolean(),
    includeRecommendations: z.boolean(),
    includeWeeklyTrend: z.boolean(),
  }),
});

// ── Favorites ────────────────────────────────────────────────────────────────

export const FavoriteSchema = z.object({
  type: z.enum(["product", "supplier", "niche"]),
  itemId: z.string(),
  title: z.string(),
  addedAt: firestoreTimestamp,
});

// ── Calc History ─────────────────────────────────────────────────────────────

export const CalcHistoryEntrySchema = z.object({
  type: z.enum(["profit", "shipping", "landed", "margin", "adroi"]),
  inputs: z.record(z.string(), z.number()),
  result: z.record(z.string(), z.number()),
  savedAt: firestoreTimestamp,
});

// ── Chat History ─────────────────────────────────────────────────────────────

export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  provider: optionalString,
  timestamp: firestoreTimestamp,
});

// ── Revenue ──────────────────────────────────────────────────────────────────

export const RevenueEntrySchema = z.object({
  date: z.string(),
  amount: z.number(),
  orders: z.number(),
  productTitle: optionalString,
  platform: optionalString,
  profit: optionalNumber,
  createdAt: firestoreTimestamp,
});

// ── Alerts ───────────────────────────────────────────────────────────────────

export const AlertEntrySchema = z.object({
  type: z.enum(["opportunity", "risk", "info", "warning"]),
  title: z.string(),
  description: z.string(),
  action: optionalString,
  actionHref: optionalString,
  read: z.boolean(),
  confidence: optionalNumber,
  aiAnalysis: optionalString,
  createdAt: firestoreTimestamp,
});

// ── Missions ─────────────────────────────────────────────────────────────────

export const MissionEntrySchema = z.object({
  text: z.string(),
  done: z.boolean(),
  date: z.string(),
  createdAt: firestoreTimestamp,
});

// ── Watchlist ────────────────────────────────────────────────────────────────

export const WatchlistEntrySchema = z.object({
  type: z.enum(["product", "niche", "competitor"]),
  title: z.string(),
  itemId: z.string(),
  currentPrice: optionalNumber,
  targetPrice: optionalNumber,
  notes: optionalString,
  addedAt: firestoreTimestamp,
});

// ── Search History ───────────────────────────────────────────────────────────

export const SearchHistoryEntrySchema = z.object({
  query: z.string(),
  source: z.string(),
  resultCount: optionalNumber,
  createdAt: firestoreTimestamp,
});

export const CompetitorSearchEntrySchema = z.object({
  query: z.string(),
  platformsFound: z.number(),
  totalListings: z.number(),
  avgPrice: z.number(),
  createdAt: firestoreTimestamp,
});

// ── Enrichment Cache ─────────────────────────────────────────────────────────

export const EnrichmentCacheEntrySchema = z.object({
  productKey: z.string(),
  data: z.record(z.string(), z.unknown()),
  createdAt: firestoreTimestamp,
});

// ── Digest ───────────────────────────────────────────────────────────────────

export const DigestEntrySchema = z.object({
  date: z.string(),
  summary: z.string(),
  metrics: z.object({
    orders: z.number(),
    revenue: z.number(),
    profit: z.number(),
    stockAlerts: z.number(),
    supplierDelays: z.number(),
  }),
  alerts: z.array(z.object({
    type: z.enum(["stock", "supplier", "adSpend", "trend"]),
    title: z.string(),
    description: z.string(),
    severity: z.enum(["low", "medium", "high"]),
  })),
  recommendations: z.array(z.string()),
  weeklyTrend: z.object({
    direction: z.enum(["up", "down", "stable"]),
    percentage: z.number(),
    insight: z.string(),
  }).optional(),
  generatedAt: firestoreTimestamp,
});

// ── Profit ───────────────────────────────────────────────────────────────────

export const CostProfileEntrySchema = z.object({
  productId: z.string(),
  productTitle: z.string(),
  cogs: z.number(),
  shippingCost: z.number(),
  platformFeePercent: z.number(),
  paymentProcessingPercent: z.number(),
  packagingCost: z.number(),
  otherCosts: z.number(),
  createdAt: firestoreTimestamp,
});

export const ProfitEntryDocSchema = z.object({
  orderId: z.string(),
  date: z.string(),
  productTitle: z.string(),
  platform: z.string(),
  revenue: z.number(),
  cogs: z.number(),
  shippingCost: z.number(),
  platformFee: z.number(),
  paymentProcessing: z.number(),
  refunds: z.number(),
  adSpend: z.number(),
  netProfit: z.number(),
  profitMargin: z.number(),
  createdAt: firestoreTimestamp,
});

// ── Supplier Performance ─────────────────────────────────────────────────────

export const SupplierPerformanceDocSchema = z.object({
  supplierId: z.string(),
  supplierName: z.string(),
  reliabilityScore: z.number(),
  refundRate: z.number(),
  avgShippingDays: z.number(),
  complaintRate: z.number(),
  stockReliability: z.number(),
  snapshotDate: z.string(),
  createdAt: firestoreTimestamp,
});

export const SupplierAlertDocSchema = z.object({
  supplierId: z.string(),
  supplierName: z.string(),
  type: z.string(),
  severity: z.enum(["low", "medium", "high"]),
  title: z.string(),
  description: z.string(),
  read: z.boolean(),
  createdAt: firestoreTimestamp,
});

// ── Product Lifecycle ────────────────────────────────────────────────────────

export const ProductLifecycleDocSchema = z.object({
  productId: z.string(),
  productTitle: z.string(),
  currentStage: z.string(),
  stageEnteredAt: z.string(),
  totalDaysTracked: z.number(),
  createdAt: firestoreTimestamp,
});

export const LifecycleSnapshotDocSchema = z.object({
  productId: z.string(),
  date: z.string(),
  stage: z.string(),
  orders: z.number(),
  revenue: z.number(),
  profit: z.number(),
  competitionCount: z.number(),
  searchVolume: z.number(),
  createdAt: firestoreTimestamp,
});

export const LifecycleAlertDocSchema = z.object({
  productId: z.string(),
  productTitle: z.string(),
  type: z.string(),
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string(),
  description: z.string(),
  read: z.boolean(),
  createdAt: firestoreTimestamp,
});

// ── Customer Service ─────────────────────────────────────────────────────────

export const CSConversationDocSchema = z.object({
  customerName: z.string(),
  customerEmail: z.string(),
  platform: z.string(),
  status: z.enum(["active", "escalated", "resolved", "waiting"]),
  subject: z.string(),
  lastMessage: z.string(),
  messageCount: z.number(),
  aiHandled: z.boolean(),
  createdAt: firestoreTimestamp,
});

export const CSMessageDocSchema = z.object({
  conversationId: z.string(),
  role: z.enum(["customer", "ai", "agent"]),
  content: z.string(),
  confidence: optionalNumber,
  escalated: z.boolean().optional(),
  createdAt: firestoreTimestamp,
});

export const CSTemplateDocSchema = z.object({
  name: z.string(),
  category: z.string(),
  subject: z.string(),
  body: z.string(),
  variables: z.array(z.string()),
  usageCount: z.number(),
  createdAt: firestoreTimestamp,
});

// ── Order Routing ────────────────────────────────────────────────────────────

export const RoutingDecisionDocSchema = z.object({
  orderId: z.string(),
  customerLocation: z.string(),
  productTitle: z.string(),
  selectedSupplier: z.string(),
  shippingDays: z.number(),
  shippingCost: z.number(),
  totalCost: z.number(),
  reasoning: z.string(),
  status: z.string(),
  routedAt: z.string(),
  createdAt: firestoreTimestamp,
});

export const RoutingPreferencesDocSchema = z.object({
  optimization: z.enum(["speed", "cost", "balanced"]),
  maxShippingDays: z.number(),
  minQualityScore: z.number(),
  preferLocalWarehouse: z.boolean(),
  autoFallback: z.boolean(),
  createdAt: firestoreTimestamp,
});

// ── Pushed Products ──────────────────────────────────────────────────────────

export const PushedProductSchema = z.object({
  storeId: z.string(),
  storeName: z.string(),
  productTitle: z.string(),
  productImage: z.string(),
  productPrice: z.number(),
  productUrl: z.string(),
  productDescription: z.string(),
  status: z.enum(["pushed", "live", "error"]),
  pushedAt: firestoreTimestamp,
});

// ── Store Connections ────────────────────────────────────────────────────────

export const StoreConnectionSchema = z.object({
  platform: z.string(),
  name: z.string(),
  url: z.string(),
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  accessToken: z.string().optional(),
  storeDomain: z.string().optional(),
  status: z.enum(["connected", "disconnected", "error"]),
  connectedAt: firestoreTimestamp,
  lastSyncAt: firestoreTimestamp.optional(),
});

// ── Platform Firestore Config ────────────────────────────────────────────────

export const ApiKeyEntrySchema = z.object({
  id: z.string(),
  key: z.string(),
  label: z.string(),
  priority: z.number(),
  requestsUsed: z.number(),
  requestsLimit: z.number(),
  resetDate: z.string(),
  lastError: z.string().nullable(),
  lastTested: firestoreTimestamp.nullable(),
  lastStatus: z.enum(["healthy", "error", "untested"]),
});

export const PlatformConnectorSchema = z.object({
  searchUrlTemplate: z.string().optional(),
  linkPatternSrc: z.string().optional(),
  siteKey: z.string().optional(),
  selectors: z.object({
    title: z.string().optional(),
    price: z.string().optional(),
    image: z.string().optional(),
    link: z.string().optional(),
  }).optional(),
  aiGenerated: z.boolean().optional(),
});

export const PlatformFirestoreConfigSchema = z.object({
  name: z.string(),
  method: z.enum(["official_api", "rainforest", "serpapi", "serper", "rapidapi_walmart", "scraperapi", "custom_scraper"]),
  enabled: z.boolean(),
  keys: z.array(ApiKeyEntrySchema),
  connector: PlatformConnectorSchema.optional(),
  lastHealth: z.enum(["healthy", "error", "untested"]),
  lastSearched: firestoreTimestamp.nullable(),
  lastError: z.string().nullable(),
  cooldownUntil: firestoreTimestamp.nullable(),
  createdAt: firestoreTimestamp,
  updatedAt: firestoreTimestamp,
});

// ── Input Validation Schemas (for function parameters) ───────────────────────

export const AddFavoriteInputSchema = z.object({
  type: z.enum(["product", "supplier", "niche"]),
  itemId: z.string().min(1),
  title: z.string().min(1).max(500),
});

export const AddAlertInputSchema = z.object({
  type: z.enum(["opportunity", "risk", "info", "warning"]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  action: z.string().max(200).optional(),
  actionHref: z.string().max(500).optional(),
  read: z.boolean(),
  confidence: z.number().min(0).max(1).optional(),
  aiAnalysis: z.string().max(5000).optional(),
});

export const AddMissionInputSchema = z.object({
  text: z.string().min(1).max(500),
  done: z.boolean(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const AddRevenueEntryInputSchema = z.object({
  date: z.string().min(1),
  amount: z.number().min(0),
  orders: z.number().int().min(0),
  productTitle: z.string().max(500).optional(),
  platform: z.string().max(100).optional(),
  profit: z.number().optional(),
});

export const AddSearchHistoryInputSchema = z.object({
  query: z.string().min(1).max(500),
  source: z.string().min(1).max(100),
  resultCount: z.number().int().min(0).optional(),
});

export const AddCompetitorSearchInputSchema = z.object({
  query: z.string().min(1).max(500),
  platformsFound: z.number().int().min(0),
  totalListings: z.number().int().min(0),
  avgPrice: z.number().min(0),
});

export const AddWatchlistInputSchema = z.object({
  type: z.enum(["product", "niche", "competitor"]),
  title: z.string().min(1).max(500),
  itemId: z.string().min(1),
  currentPrice: z.number().min(0).optional(),
  targetPrice: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

export const AddCostProfileInputSchema = z.object({
  productId: z.string().min(1),
  productTitle: z.string().min(1).max(500),
  cogs: z.number().min(0),
  shippingCost: z.number().min(0),
  platformFeePercent: z.number().min(0).max(100),
  paymentProcessingPercent: z.number().min(0).max(100),
  packagingCost: z.number().min(0),
  otherCosts: z.number().min(0),
});

export const AddProfitEntryInputSchema = z.object({
  orderId: z.string().min(1),
  date: z.string().min(1),
  productTitle: z.string().min(1).max(500),
  platform: z.string().min(1).max(100),
  revenue: z.number(),
  cogs: z.number().min(0),
  shippingCost: z.number().min(0),
  platformFee: z.number().min(0),
  paymentProcessing: z.number().min(0),
  refunds: z.number().min(0),
  adSpend: z.number().min(0),
  netProfit: z.number(),
  profitMargin: z.number(),
});

export const AddSupplierPerformanceInputSchema = z.object({
  supplierId: z.string().min(1),
  supplierName: z.string().min(1).max(200),
  reliabilityScore: z.number().min(0).max(100),
  refundRate: z.number().min(0).max(100),
  avgShippingDays: z.number().min(0),
  complaintRate: z.number().min(0).max(100),
  stockReliability: z.number().min(0).max(100),
  snapshotDate: z.string().min(1),
});

export const AddSupplierAlertInputSchema = z.object({
  supplierId: z.string().min(1),
  supplierName: z.string().min(1).max(200),
  type: z.string().min(1).max(100),
  severity: z.enum(["low", "medium", "high"]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  read: z.boolean(),
});

export const RedFlagSchema = z.object({
  type: z.enum(["review_manipulation", "price_gouging", "stock_unreliable", "slow_shipping", "high_refunds", "new_supplier", "fake_orders"]),
  severity: z.enum(["warning", "critical"]),
  evidence: z.string(),
  detectedAt: z.string(),
});

export const SupplierDueDiligenceDocSchema = z.object({
  supplierId: z.string(),
  supplierName: z.string(),
  overallRiskScore: z.number().min(0).max(100),
  riskLevel: z.enum(["low", "medium", "high", "critical"]),
  generatedAt: z.string(),
  expiresAt: z.string(),
  redFlags: z.array(RedFlagSchema),
  strengths: z.array(z.string()),
  historyAnalysis: z.object({
    reviewPattern: z.enum(["organic", "suspicious", "mixed"]),
    averageReviewAge: z.number(),
    refundTrend: z.enum(["improving", "stable", "declining"]),
    priceStability: z.enum(["stable", "volatile", "declining"]),
    stockConsistency: z.number().min(0).max(100),
  }),
  recommendation: z.object({
    verdict: z.enum(["recommended", "caution", "avoid"]),
    confidence: z.number().min(0).max(100),
    summary: z.string(),
    bestFor: z.array(z.string()),
    avoidFor: z.array(z.string()),
  }),
  comparableSupplierIds: z.array(z.string()),
  createdAt: firestoreTimestamp,
});

export const GenerateDueDiligenceInputSchema = z.object({
  supplierId: z.string().min(1),
  forceRefresh: z.boolean().optional(),
});

// ── Price Intelligence ──────────────────────────────────────────────────────

export const SupplierOfferSchema = z.object({
  supplierId: z.string(),
  supplierName: z.string(),
  trustBadge: z.enum(["gold", "silver", "bronze"]),
  unitPrice: z.number().min(0),
  shippingCost: z.number().min(0),
  shippingDays: z.number().min(0),
  moq: z.number().int().min(1),
  totalCostPerUnit: z.number().min(0),
  estimatedMargin: z.number(),
  inStock: z.boolean(),
  sampleAvailable: z.boolean(),
  samplePrice: z.number().min(0),
  qualityScore: z.number().min(0).max(100),
  reliabilityScore: z.number().min(0).max(100),
});

export const PricePointSchema = z.object({
  date: z.string(),
  supplierId: z.string(),
  price: z.number().min(0),
});

export const PriceIntelligenceDocSchema = z.object({
  id: z.string(),
  productQuery: z.string(),
  normalizedProductName: z.string(),
  category: z.string(),
  lastUpdated: z.string(),
  offers: z.array(SupplierOfferSchema),
  bestDeal: z.string(),
  priceHistory: z.array(PricePointSchema),
  createdAt: firestoreTimestamp,
});

export const PriceLookupInputSchema = z.object({
  product: z.string().min(1).max(500),
  category: z.string().optional(),
  sellingPrice: z.number().min(0).optional(),
  forceRefresh: z.boolean().optional(),
});

export const AddProductLifecycleInputSchema = z.object({
  productId: z.string().min(1),
  productTitle: z.string().min(1).max(500),
  currentStage: z.string().min(1).max(100),
  stageEnteredAt: z.string().min(1),
  totalDaysTracked: z.number().int().min(0),
});

export const AddLifecycleSnapshotInputSchema = z.object({
  productId: z.string().min(1),
  date: z.string().min(1),
  stage: z.string().min(1).max(100),
  orders: z.number().int().min(0),
  revenue: z.number().min(0),
  profit: z.number(),
  competitionCount: z.number().int().min(0),
  searchVolume: z.number().int().min(0),
});

export const AddLifecycleAlertInputSchema = z.object({
  productId: z.string().min(1),
  productTitle: z.string().min(1).max(500),
  type: z.string().min(1).max(100),
  severity: z.enum(["info", "warning", "critical"]),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  read: z.boolean(),
});

export const AddCSConversationInputSchema = z.object({
  customerName: z.string().min(1).max(200),
  customerEmail: z.string().email(),
  platform: z.string().min(1).max(100),
  status: z.enum(["active", "escalated", "resolved", "waiting"]),
  subject: z.string().min(1).max(500),
  lastMessage: z.string().min(1).max(5000),
  messageCount: z.number().int().min(0),
  aiHandled: z.boolean(),
});

export const AddCSMessageInputSchema = z.object({
  conversationId: z.string().min(1),
  role: z.enum(["customer", "ai", "agent"]),
  content: z.string().min(1).max(10000),
  confidence: z.number().min(0).max(1).optional(),
  escalated: z.boolean().optional(),
});

export const AddCSTemplateInputSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().min(1).max(100),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
  variables: z.array(z.string().min(1).max(100)),
  usageCount: z.number().int().min(0),
});

export const AddRoutingDecisionInputSchema = z.object({
  orderId: z.string().min(1),
  customerLocation: z.string().min(1).max(200),
  productTitle: z.string().min(1).max(500),
  selectedSupplier: z.string().min(1).max(200),
  shippingDays: z.number().int().min(0),
  shippingCost: z.number().min(0),
  totalCost: z.number().min(0),
  reasoning: z.string().min(1).max(2000),
  status: z.string().min(1).max(100),
  routedAt: z.string().min(1),
});

export const AddPushedProductInputSchema = z.object({
  storeId: z.string().min(1),
  storeName: z.string().min(1).max(200),
  productTitle: z.string().min(1).max(500),
  productImage: z.string().min(1),
  productPrice: z.number().min(0),
  productUrl: z.string().min(1),
  productDescription: z.string().min(1).max(5000),
  status: z.enum(["pushed", "live", "error"]),
});

export const AddStoreConnectionInputSchema = z.object({
  platform: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  url: z.string().url(),
  apiKey: z.string().max(500).optional(),
  apiSecret: z.string().max(500).optional(),
  accessToken: z.string().max(500).optional(),
  storeDomain: z.string().max(500).optional(),
  status: z.enum(["connected", "disconnected", "error"]),
});

export const SaveDigestInputSchema = z.object({
  date: z.string().min(1),
  summary: z.string().min(1).max(5000),
  metrics: z.object({
    orders: z.number().int().min(0),
    revenue: z.number().min(0),
    profit: z.number(),
    stockAlerts: z.number().int().min(0),
    supplierDelays: z.number().int().min(0),
  }),
  alerts: z.array(z.object({
    type: z.enum(["stock", "supplier", "adSpend", "trend"]),
    title: z.string().min(1).max(200),
    description: z.string().min(1).max(2000),
    severity: z.enum(["low", "medium", "high"]),
  })),
  recommendations: z.array(z.string().min(1).max(500)),
  weeklyTrend: z.object({
    direction: z.enum(["up", "down", "stable"]),
    percentage: z.number(),
    insight: z.string().min(1).max(1000),
  }).optional(),
});

export const SaveRoutingPreferencesInputSchema = z.object({
  optimization: z.enum(["speed", "cost", "balanced"]),
  maxShippingDays: z.number().int().min(0),
  minQualityScore: z.number().min(0).max(100),
  preferLocalWarehouse: z.boolean(),
  autoFallback: z.boolean(),
});

export const CacheEnrichmentInputSchema = z.object({
  productKey: z.string().min(1).max(500),
  data: z.record(z.string(), z.unknown()),
});

export const SaveCalcHistoryInputSchema = z.object({
  type: z.enum(["profit", "shipping", "landed", "margin", "adroi"]),
  inputs: z.record(z.string(), z.number()),
  result: z.record(z.string(), z.number()),
});

export const SaveChatMessageInputSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(50000),
  provider: z.string().max(100).optional(),
});

// ── Product Validation ───────────────────────────────────────────────────────

export const ProductValidationDocSchema = z.object({
  productTitle: z.string(),
  productImage: z.string().optional(),
  productUrl: z.string().optional(),
  goldenScore: z.number(),
  goldenRank: z.string(),
  trendVelocity: z.number(),
  saturationIndex: z.number(),
  profitScore: z.number(),
  seasonalScore: z.number(),
  inputs: z.record(z.string(), z.unknown()),
  createdAt: firestoreTimestamp,
});

export const AddProductValidationInputSchema = z.object({
  productTitle: z.string().min(1).max(500),
  productImage: z.string().max(2000).optional(),
  productUrl: z.string().max(2000).optional(),
  goldenScore: z.number().min(0).max(100),
  goldenRank: z.string().min(1).max(10),
  trendVelocity: z.number().min(0).max(100),
  saturationIndex: z.number().min(0).max(100),
  profitScore: z.number().min(0).max(100),
  seasonalScore: z.number().min(0).max(100),
  inputs: z.record(z.string(), z.unknown()),
});

// ── Ad Campaign Management ─────────────────────────────────────────────────

export const AdConnectionSchema = z.object({
  platform: z.enum(["facebook", "google"]),
  accountId: z.string(),
  accountName: z.string(),
  accessToken: z.string(),
  refreshToken: z.string().optional(),
  expiresAt: z.string(),
  status: z.enum(["active", "expired", "error"]),
  createdAt: firestoreTimestamp,
  updatedAt: firestoreTimestamp,
});

export const AdCampaignSchema = z.object({
  platformCampaignId: z.string().optional(),
  platform: z.enum(["facebook", "google", "manual"]),
  name: z.string(),
  status: z.enum(["active", "paused", "completed", "draft"]),
  productTitle: z.string(),
  productId: z.string().optional(),
  dailyBudget: z.number().min(0),
  totalBudget: z.number().min(0).optional(),
  targeting: z.object({
    locations: z.array(z.string()).optional(),
    ageMin: z.number().optional(),
    ageMax: z.number().optional(),
    interests: z.array(z.string()).optional(),
    gender: z.enum(["all", "male", "female"]).optional(),
  }).optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  metrics: z.object({
    impressions: z.number(),
    clicks: z.number(),
    conversions: z.number(),
    spend: z.number(),
    revenue: z.number(),
    roas: z.number(),
    cpc: z.number(),
    ctr: z.number(),
    conversionRate: z.number(),
  }),
  createdAt: firestoreTimestamp,
  updatedAt: firestoreTimestamp,
});

export const AdCreativeSchema = z.object({
  campaignId: z.string(),
  platform: z.enum(["facebook", "google"]),
  type: z.enum(["headline", "description", "body", "cta"]),
  content: z.string(),
  aiProvider: z.string(),
  performance: z.object({
    impressions: z.number(),
    clicks: z.number(),
    conversions: z.number(),
    ctr: z.number(),
    conversionRate: z.number(),
  }).optional(),
  createdAt: firestoreTimestamp,
});

export const ABTestSchema = z.object({
  campaignId: z.string(),
  name: z.string(),
  status: z.enum(["running", "completed", "paused"]),
  creativeAId: z.string(),
  creativeBId: z.string(),
  splitPercent: z.number().min(0).max(100),
  winnerId: z.string().optional(),
  winnerConfidence: z.number().optional(),
  startDate: z.string(),
  endDate: z.string().optional(),
  results: z.object({
    aMetrics: z.object({
      impressions: z.number(),
      clicks: z.number(),
      conversions: z.number(),
      ctr: z.number(),
      conversionRate: z.number(),
    }),
    bMetrics: z.object({
      impressions: z.number(),
      clicks: z.number(),
      conversions: z.number(),
      ctr: z.number(),
      conversionRate: z.number(),
    }),
    statisticallySignificant: z.boolean(),
    pValue: z.number().optional(),
  }).optional(),
  createdAt: firestoreTimestamp,
  updatedAt: firestoreTimestamp,
});

export const BudgetRecommendationSchema = z.object({
  type: z.enum(["scale_up", "scale_down", "pause", "reallocate", "new_test"]),
  campaignId: z.string(),
  campaignName: z.string(),
  currentBudget: z.number(),
  recommendedBudget: z.number(),
  reason: z.string(),
  expectedImpact: z.object({
    roasChange: z.number(),
    revenueChange: z.number(),
    confidence: z.number(),
  }),
  status: z.enum(["pending", "accepted", "rejected", "expired"]),
  expiresAt: z.string(),
  createdAt: firestoreTimestamp,
});

export const AddAdConnectionInputSchema = z.object({
  platform: z.enum(["facebook", "google"]),
  accountId: z.string().min(1).max(100),
  accountName: z.string().min(1).max(200),
  accessToken: z.string().min(1),
  refreshToken: z.string().optional(),
  expiresAt: z.string().min(1),
  status: z.enum(["active", "expired", "error"]),
});

export const AddAdCampaignInputSchema = z.object({
  platformCampaignId: z.string().max(200).optional(),
  platform: z.enum(["facebook", "google", "manual"]),
  name: z.string().min(1).max(200),
  status: z.enum(["active", "paused", "completed", "draft"]),
  productTitle: z.string().min(1).max(500),
  productId: z.string().max(200).optional(),
  dailyBudget: z.number().min(0),
  totalBudget: z.number().min(0).optional(),
  targeting: z.object({
    locations: z.array(z.string()).optional(),
    ageMin: z.number().optional(),
    ageMax: z.number().optional(),
    interests: z.array(z.string()).optional(),
    gender: z.enum(["all", "male", "female"]).optional(),
  }).optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
  metrics: z.object({
    impressions: z.number().min(0),
    clicks: z.number().min(0),
    conversions: z.number().min(0),
    spend: z.number().min(0),
    revenue: z.number().min(0),
    roas: z.number().min(0),
    cpc: z.number().min(0),
    ctr: z.number().min(0),
    conversionRate: z.number().min(0),
  }),
});

export const AddAdCreativeInputSchema = z.object({
  campaignId: z.string().min(1).max(200),
  platform: z.enum(["facebook", "google"]),
  type: z.enum(["headline", "description", "body", "cta"]),
  content: z.string().min(1).max(5000),
  aiProvider: z.string().min(1).max(100),
});

export const AddABTestInputSchema = z.object({
  campaignId: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  status: z.enum(["running", "completed", "paused"]),
  creativeAId: z.string().min(1).max(200),
  creativeBId: z.string().min(1).max(200),
  splitPercent: z.number().min(0).max(100),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
});

export const AddBudgetRecommendationInputSchema = z.object({
  type: z.enum(["scale_up", "scale_down", "pause", "reallocate", "new_test"]),
  campaignId: z.string().min(1).max(200),
  campaignName: z.string().min(1).max(200),
  currentBudget: z.number().min(0),
  recommendedBudget: z.number().min(0),
  reason: z.string().min(1).max(2000),
  expectedImpact: z.object({
    roasChange: z.number(),
    revenueChange: z.number(),
    confidence: z.number().min(0).max(1),
  }),
  status: z.enum(["pending", "accepted", "rejected", "expired"]),
  expiresAt: z.string().min(1),
});

export const GenerateCreativeInputSchema = z.object({
  platform: z.enum(["facebook", "google"]),
  productTitle: z.string().min(1).max(500),
  productDescription: z.string().min(1).max(5000).optional(),
  targetAudience: z.string().max(500).optional(),
  tone: z.enum(["professional", "casual", "urgent", "playful", "luxury"]).optional(),
  types: z.array(z.enum(["headline", "description", "body", "cta"])).min(1),
  count: z.number().int().min(1).max(10).optional(),
  providerPriority: z.array(z.object({
    id: z.string(),
    active: z.boolean(),
    priority: z.number(),
  })).optional(),
});

// ── Returns & Refund ────────────────────────────────────────────────────────

export const ReturnRequestItemSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  quantity: z.number().int().min(1),
  unitPrice: z.number().min(0),
  imageUrl: z.string(),
});

export const ReturnLabelSchema = z.object({
  trackingNumber: z.string(),
  carrier: z.string(),
  returnAddress: z.string(),
  instructions: z.string(),
  labelUrl: z.string().nullable(),
  generatedAt: z.string(),
});

export const ReturnRequestDocSchema = z.object({
  orderId: z.string(),
  orderNumber: z.string(),
  customerId: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  items: z.array(ReturnRequestItemSchema),
  reason: z.enum([
    "defective", "wrong_item", "not_as_described", "changed_mind",
    "damaged_in_shipping", "size_issue", "quality_issue", "other",
  ]),
  reasonDetails: z.string(),
  status: z.enum([
    "pending", "approved", "label_generated", "shipped_back",
    "received", "inspected", "refunded", "denied", "cancelled",
  ]),
  returnLabel: ReturnLabelSchema.nullable(),
  refundAmount: z.number(),
  supplierId: z.string(),
  supplierName: z.string(),
  platform: z.string(),
  storePlatform: z.string(),
  createdAt: firestoreTimestamp,
});

export const AddReturnRequestInputSchema = z.object({
  orderId: z.string().min(1).max(200),
  orderNumber: z.string().min(1).max(200),
  customerId: z.string().min(1).max(200),
  customerName: z.string().min(1).max(500),
  customerEmail: z.string().email().max(500),
  items: z.array(ReturnRequestItemSchema).min(1),
  reason: z.enum([
    "defective", "wrong_item", "not_as_described", "changed_mind",
    "damaged_in_shipping", "size_issue", "quality_issue", "other",
  ]),
  reasonDetails: z.string().min(1).max(5000),
  supplierId: z.string().min(1).max(200),
  supplierName: z.string().min(1).max(500),
  platform: z.string().min(1).max(100),
  storePlatform: z.string().min(1).max(100),
});

export const SupplierRefundPolicySchema = z.object({
  type: z.enum(["full_refund", "partial_refund", "store_credit_only", "no_refund"]),
  restockingFeePercent: z.number().min(0).max(100),
  refundWindowDays: z.number().int().min(1),
  returnShippingPaidBy: z.enum(["buyer", "seller"]),
});

export const RefundCalculationDocSchema = z.object({
  returnRequestId: z.string(),
  orderId: z.string(),
  subtotal: z.number(),
  shippingCost: z.number(),
  platformFees: z.number(),
  supplierRefundAmount: z.number(),
  totalRefund: z.number(),
  refundMethod: z.enum(["original", "partial", "store_credit"]),
  supplierPolicy: SupplierRefundPolicySchema,
  processed: z.boolean(),
  processedAt: z.string().nullable(),
  createdAt: firestoreTimestamp,
});

export const AddRefundCalculationInputSchema = z.object({
  returnRequestId: z.string().min(1).max(200),
  orderId: z.string().min(1).max(200),
  subtotal: z.number().min(0),
  shippingCost: z.number().min(0),
  platformFees: z.number().min(0),
  supplierRefundAmount: z.number().min(0),
  totalRefund: z.number().min(0),
  refundMethod: z.enum(["original", "partial", "store_credit"]),
  supplierPolicy: SupplierRefundPolicySchema,
});

export const DefectReportDocSchema = z.object({
  productId: z.string(),
  productName: z.string(),
  supplierId: z.string(),
  supplierName: z.string(),
  orderId: z.string(),
  defectType: z.enum([
    "broken", "malfunction", "cosmetic_damage", "missing_parts",
    "wrong_specification", "packaging_damage", "electrical_issue", "other",
  ]),
  description: z.string(),
  severity: z.enum(["low", "medium", "high", "critical"]),
  reportedBy: z.enum(["customer", "quality_check", "auto_detected"]),
  resolution: z.enum([
    "pending", "replacement_sent", "refund_issued",
    "supplier_claimed", "dismissed", "escalated",
  ]),
  resolved: z.boolean(),
  resolvedAt: z.string().nullable(),
  createdAt: firestoreTimestamp,
});

export const AddDefectReportInputSchema = z.object({
  productId: z.string().min(1).max(200),
  productName: z.string().min(1).max(500),
  supplierId: z.string().min(1).max(200),
  supplierName: z.string().min(1).max(500),
  orderId: z.string().min(1).max(200),
  defectType: z.enum([
    "broken", "malfunction", "cosmetic_damage", "missing_parts",
    "wrong_specification", "packaging_damage", "electrical_issue", "other",
  ]),
  description: z.string().min(1).max(5000),
  severity: z.enum(["low", "medium", "high", "critical"]),
  reportedBy: z.enum(["customer", "quality_check", "auto_detected"]),
});

export const ReturnSettingsDocSchema = z.object({
  autoDetectReturns: z.boolean(),
  detectIntervalMinutes: z.number(),
  autoGenerateLabels: z.boolean(),
  defaultRefundMethod: z.enum(["original", "partial", "store_credit"]),
  notifyCustomer: z.boolean(),
  restockingFeePercent: z.number(),
  returnWindowDays: z.number(),
});

export const AddReturnSettingsInputSchema = z.object({
  autoDetectReturns: z.boolean(),
  detectIntervalMinutes: z.number().int().min(5).max(1440),
  autoGenerateLabels: z.boolean(),
  defaultRefundMethod: z.enum(["original", "partial", "store_credit"]),
  notifyCustomer: z.boolean(),
  restockingFeePercent: z.number().min(0).max(100),
  returnWindowDays: z.number().int().min(1).max(365),
});

// ── Shipping Optimization Engine ──────────────────────────────────────────────

export const ShippingRateCacheSchema = z.object({
  cacheKey: z.string(),
  originCountry: z.string().min(2).max(2),
  destinationCountry: z.string().min(2).max(2),
  weightKg: z.number().min(0.01),
  rates: z.array(z.object({
    carrierId: z.string(),
    serviceLevel: z.string(),
    cost: z.number().min(0),
    estimatedDaysMin: z.number().int().min(0),
    estimatedDaysMax: z.number().int().min(0),
  })),
  createdAt: firestoreTimestamp,
  expiresAt: firestoreTimestamp,
});

export const ShippingPreferencesDocSchema = z.object({
  userId: z.string().min(1),
  defaultOptimization: z.enum(["cost", "speed", "balanced", "reliability"]),
  defaultMaxBudget: z.number().min(0),
  defaultMaxDeliveryDays: z.number().int().min(1).max(90),
  preferredCarriers: z.array(z.enum(["cj", "aliexpress_standard", "epacket", "dhl", "fedex"])),
  excludedCarriers: z.array(z.enum(["cj", "aliexpress_standard", "epacket", "dhl", "fedex"])),
  requireTracking: z.boolean(),
  requireInsurance: z.boolean(),
  autoSelectEnabled: z.boolean(),
  createdAt: firestoreTimestamp,
  updatedAt: firestoreTimestamp,
});

export const CustomsEstimateDocSchema = z.object({
  userId: z.string().min(1),
  originCountry: z.string().min(2).max(2),
  destinationCountry: z.string().min(2).max(2),
  totalDeclaredValue: z.number().min(0),
  totalTaxes: z.number().min(0),
  currency: z.string().min(3).max(3),
  itemCount: z.number().int().min(1),
  calculatedAt: firestoreTimestamp,
});

export const RateComparisonHistorySchema = z.object({
  userId: z.string().min(1),
  originCountry: z.string().min(2).max(2),
  destinationCountry: z.string().min(2).max(2),
  weightKg: z.number().min(0.01),
  selectedCarrier: z.string(),
  selectedCost: z.number().min(0),
  cheapestCost: z.number().min(0),
  savings: z.number(),
  comparedAt: firestoreTimestamp,
});

export const AddShippingPreferencesInputSchema = z.object({
  defaultOptimization: z.enum(["cost", "speed", "balanced", "reliability"]),
  defaultMaxBudget: z.number().min(0),
  defaultMaxDeliveryDays: z.number().int().min(1).max(90),
  preferredCarriers: z.array(z.enum(["cj", "aliexpress_standard", "epacket", "dhl", "fedex"])),
  excludedCarriers: z.array(z.enum(["cj", "aliexpress_standard", "epacket", "dhl", "fedex"])),
  requireTracking: z.boolean(),
  requireInsurance: z.boolean(),
  autoSelectEnabled: z.boolean(),
});

// ── Product Listing Generator ─────────────────────────────────────────────

export const ProductInputSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().min(1).max(5000),
  price: z.number().min(0),
  category: z.string().min(1).max(200),
  images: z.array(z.string().url()).max(10),
  specifications: z.record(z.string(), z.string()),
  supplierUrl: z.string().url().optional(),
  supplierName: z.string().max(200).optional(),
  weight: z.number().min(0).optional(),
  dimensions: z.object({
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0),
  }).optional(),
});

export const ListingGenerationInputSchema = z.object({
  product: ProductInputSchema,
  platform: z.enum(["amazon", "shopify", "etsy", "ebay", "walmart"]),
  tone: z.enum(["professional", "casual", "luxury", "budget", "handmade"]).optional(),
  targetAudience: z.string().max(500).optional(),
  competitorListings: z.array(z.object({
    title: z.string(),
    price: z.number(),
  })).max(20).optional(),
});

export const ListingDocSchema = z.object({
  platform: z.enum(["amazon", "shopify", "etsy", "ebay", "walmart"]),
  title: z.string(),
  description: z.string(),
  bulletPoints: z.array(z.string()),
  seoTags: z.array(z.string()),
  backendKeywords: z.array(z.string()).optional(),
  storyDescription: z.string().optional(),
  characterCounts: z.object({
    title: z.number(),
    description: z.number(),
  }),
  optimizationScore: z.number().min(0).max(100),
  productTitle: z.string(),
  productImage: z.string().optional(),
  productPrice: z.number(),
  notes: z.string().optional(),
  usedAt: z.string().optional(),
  createdAt: firestoreTimestamp,
});

export const AddListingInputSchema = z.object({
  platform: z.enum(["amazon", "shopify", "etsy", "ebay", "walmart"]),
  title: z.string().min(1),
  description: z.string().min(1),
  bulletPoints: z.array(z.string()),
  seoTags: z.array(z.string()),
  backendKeywords: z.array(z.string()).optional(),
  storyDescription: z.string().optional(),
  characterCounts: z.object({
    title: z.number(),
    description: z.number(),
  }),
  optimizationScore: z.number().min(0).max(100),
  productTitle: z.string().min(1),
  productImage: z.string().optional(),
  productPrice: z.number().min(0),
  notes: z.string().optional(),
});

// ── Price War Bot ─────────────────────────────────────────────────────────

export const PriceRuleSchema = z.object({
  productTitle: z.string().min(1).max(500),
  productImage: z.string().optional(),
  productUrl: z.string().url().optional(),
  myPrice: z.number().min(0),
  cost: z.number().min(0),
  floorPrice: z.number().min(0),
  minMargin: z.number().min(0).max(100),
  strategy: z.enum(["match_lowest", "stay_below", "maintain_margin", "undercut_percent", "fixed"]),
  strategyConfig: z.object({
    undercutPercent: z.number().min(0).max(50).optional(),
    belowPercent: z.number().min(0).max(50).optional(),
    targetMargin: z.number().min(0).max(100).optional(),
    maxIncrease: z.number().min(0).max(100).optional(),
    maxDecrease: z.number().min(0).max(100).optional(),
  }),
  platforms: z.array(z.string()).min(1),
  competitorUrls: z.array(z.string().url()),
  status: z.enum(["active", "paused", "triggered", "error"]).optional(),
});

export const AddPriceRuleInputSchema = PriceRuleSchema;

export const PriceAdjustmentLogSchema = z.object({
  ruleId: z.string(),
  productTitle: z.string(),
  previousPrice: z.number(),
  newPrice: z.number(),
  reason: z.string(),
  strategy: z.enum(["match_lowest", "stay_below", "maintain_margin", "undercut_percent", "fixed"]),
  competitorPrice: z.number().optional(),
  marginBefore: z.number(),
  marginAfter: z.number(),
  autoApplied: z.boolean(),
  createdAt: firestoreTimestamp,
});

export const PriceWarSettingsSchema = z.object({
  enabled: z.boolean(),
  checkIntervalMinutes: z.number().min(5).max(1440),
  autoApply: z.boolean(),
  maxDailyAdjustments: z.number().min(1).max(100),
  notifyOnAdjustment: z.boolean(),
  notifyOnFloorBreach: z.boolean(),
});

export const AddPriceAdjustmentLogInputSchema = z.object({
  ruleId: z.string().min(1),
  productTitle: z.string().min(1),
  previousPrice: z.number().min(0),
  newPrice: z.number().min(0),
  reason: z.string().min(1),
  strategy: z.enum(["match_lowest", "stay_below", "maintain_margin", "undercut_percent", "fixed"]),
  competitorPrice: z.number().min(0).optional(),
  marginBefore: z.number(),
  marginAfter: z.number(),
  autoApplied: z.boolean(),
});

// ── Customer Service (Enhanced) ───────────────────────────────────────────

export const KnowledgeBaseEntrySchema = z.object({
  category: z.enum(["product", "shipping", "returns", "faq", "policy"]),
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(5000),
  keywords: z.array(z.string()),
  productId: z.string().optional(),
  productTitle: z.string().optional(),
  usageCount: z.number().min(0).optional(),
  lastUsed: z.string().optional(),
  createdAt: firestoreTimestamp,
});

export const AddKnowledgeBaseInputSchema = z.object({
  category: z.enum(["product", "shipping", "returns", "faq", "policy"]),
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(5000),
  keywords: z.array(z.string()).min(1),
  productId: z.string().optional(),
  productTitle: z.string().optional(),
});

export const EscalationRuleSchema = z.object({
  name: z.string().min(1).max(200),
  enabled: z.boolean(),
  conditions: z.object({
    minOrderValue: z.number().min(0).optional(),
    minUrgencyScore: z.number().min(1).max(10).optional(),
    sentimentThreshold: z.number().min(-1).max(1).optional(),
    frustrationKeywords: z.array(z.string()).optional(),
    vipCustomer: z.boolean().optional(),
    messageCount: z.number().min(1).optional(),
    responseCount: z.number().min(1).optional(),
  }),
  action: z.enum(["escalate", "tag_priority", "notify_manager", "auto_respond"]),
  priority: z.enum(["low", "medium", "high"]),
});

export const AddEscalationRuleInputSchema = EscalationRuleSchema;

// ── Trend Predictor ───────────────────────────────────────────────────────

export const TrendSignalSchema = z.object({
  platform: z.enum(["tiktok", "instagram", "twitter", "google_trends", "amazon_movers", "reddit"]),
  keyword: z.string().min(1).max(200),
  category: z.string().min(1).max(200),
  volume: z.number().min(0),
  previousVolume: z.number().min(0),
  growthRate: z.number(),
  direction: z.enum(["rising", "peaking", "stable", "declining"]),
  velocity: z.number(),
  acceleration: z.number(),
  saturationLevel: z.number().min(0).max(100),
});

export const TrendPredictionSchema = z.object({
  productIdea: z.string().min(1).max(500),
  category: z.string().min(1).max(200),
  trendScore: z.number().min(0).max(100),
  confidence: z.enum(["high", "medium", "low"]),
  direction: z.enum(["rising", "peaking", "stable", "declining"]),
  predictedPeak: z.string(),
  timeToPeak: z.string(),
  saturationRisk: z.number().min(0).max(100),
  competitionLevel: z.enum(["low", "medium", "high", "very_high"]),
  reasoning: z.string(),
  relatedKeywords: z.array(z.string()),
  suggestedPlatforms: z.array(z.string()),
  estimatedMargin: z.number(),
});

export const RisingStarSchema = z.object({
  productKeyword: z.string().min(1).max(200),
  category: z.string().min(1).max(200),
  growthVelocity: z.number(),
  competitionScore: z.number().min(0).max(100),
  opportunityScore: z.number().min(0).max(100),
  currentVolume: z.number().min(0),
  peakVolume: z.number().min(0).optional(),
  platforms: z.array(z.enum(["tiktok", "instagram", "twitter", "google_trends", "amazon_movers", "reddit"])),
  status: z.enum(["emerging", "rising", "hot", "peaking", "saturated"]),
  reasoning: z.string(),
});

export const TrendWatchlistEntrySchema = z.object({
  keyword: z.string().min(1).max(200),
  category: z.string().min(1).max(200),
  alertOnRising: z.boolean(),
  alertOnPeak: z.boolean(),
  alertOnSaturation: z.boolean(),
});

export const AddTrendWatchlistInputSchema = z.object({
  keyword: z.string().min(1).max(200),
  category: z.string().min(1).max(200),
  alertOnRising: z.boolean(),
  alertOnPeak: z.boolean(),
  alertOnSaturation: z.boolean(),
});
