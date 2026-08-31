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
