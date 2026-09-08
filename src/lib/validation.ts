import { z } from "zod";

export const RoutingDecisionSchema = z.object({
  orderId: z.string().max(100).optional(),
  customerLocation: z.string().max(200).optional(),
  productTitle: z.string().max(500).optional(),
  selectedSupplier: z.string().max(200).optional(),
  shippingDays: z.number().min(0).max(365).optional(),
  shippingCost: z.number().min(0).max(10000).optional(),
  totalCost: z.number().min(0).max(100000).optional(),
  reasoning: z.string().max(2000).optional(),
  status: z.enum(["routed", "pending", "fallback", "failed"]).optional(),
  routedAt: z.string().optional(),
});

export const ProfitEntrySchema = z.object({
  orderId: z.string().max(100).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  productTitle: z.string().min(1).max(500),
  platform: z.string().max(100).optional().default("unknown"),
  revenue: z.number().min(0),
  cogs: z.number().min(0),
  shippingCost: z.number().min(0),
  platformFee: z.number().min(0),
  paymentProcessing: z.number().min(0),
  refunds: z.number().min(0),
  adSpend: z.number().min(0),
  otherCosts: z.number().min(0).optional().default(0),
  netProfit: z.number(),
  profitMargin: z.number(),
  productImage: z.string().max(2000).optional().default(""),
  status: z.enum(["completed", "pending", "refunded", "disputed"]).optional().default("completed"),
});

export const SupplierPerformanceSchema = z.object({
  supplierId: z.string().min(1).max(100),
  supplierName: z.string().min(1).max(200),
  reliabilityScore: z.number().min(0).max(100),
  refundRate: z.number().min(0).max(100),
  avgShippingDays: z.number().min(0).max(365),
  complaintRate: z.number().min(0).max(100),
  stockReliability: z.number().min(0).max(100),
  snapshotDate: z.string().optional(),
});

export const StoreConnectionSchema = z.object({
  platform: z.enum(["shopify", "woocommerce", "custom", "trendaryo", "etsy", "bigcommerce", "wix"]),
  name: z.string().min(1).max(200),
  url: z.string().url().max(500),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
  apiKey: z.string().max(500).optional().default(""),
  apiSecret: z.string().max(500).optional().default(""),
  accessToken: z.string().max(500).optional().default(""),
  storeDomain: z.string().max(500).optional().default(""),
});

export const StoreConnectionUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  url: z.string().url().max(500).optional(),
  status: z.enum(["connected", "disconnected", "error"]).optional(),
  apiKey: z.string().max(500).optional(),
  apiSecret: z.string().max(500).optional(),
  accessToken: z.string().max(500).optional(),
  storeDomain: z.string().max(500).optional(),
});

export const ProductLifecycleSchema = z.object({
  productId: z.string().min(1).max(200),
  productTitle: z.string().min(1).max(500),
  currentStage: z.enum(["discovery", "testing", "winning", "scaling", "saturation", "sunset"]),
  stageEnteredAt: z.string(),
  totalDaysTracked: z.number().min(0).max(3650),
});

export const MonitoredProductSchema = z.object({
  productId: z.string().min(1).max(200),
  productTitle: z.string().min(1).max(500),
  productImage: z.string().max(2000).optional().default(""),
  source: z.string().max(100).optional().default("unknown"),
  sourceUrl: z.string().max(2000).optional().default(""),
  currentPrice: z.number().min(0),
});

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; response: Response } {
  const result = schema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const fieldErrors = result.error.flatten().fieldErrors as Record<string, string[] | undefined>;
  const message = Object.entries(fieldErrors)
    .map(([field, msgs]) => `${field}: ${(msgs ?? []).join(", ")}`)
    .join("; ");
  return {
    success: false,
    response: Response.json(
      { error: "Invalid input", details: message },
      { status: 400 }
    ),
  };
}

export const AIChatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string().min(1).max(10000),
  })).min(1).max(100),
    providerPriority: z.array(z.object({
      id: z.string(),
      priority: z.number().min(1).max(10),
      active: z.boolean(),
    })).optional(),
    stream: z.boolean().optional(),
    testKey: z.string().optional(),
    context: z.record(z.string(), z.unknown()).optional(),
    supplierId: z.string().optional(),
});

export const ScraperSchema = z.object({
  query: z.string().min(1).max(500),
  platform: z.string().min(1).max(100),
});

export const StorePushInputSchema = z.object({
  storeId: z.string().min(1).max(200),
  productTitle: z.string().min(1).max(1000),
  productImage: z.string().max(5000).optional().default(""),
  productPrice: z.number().min(0).max(100000),
  productUrl: z.string().max(5000).optional().default(""),
  productDescription: z.string().max(50000).optional().default(""),
  productVariants: z.array(z.object({
    name: z.string().max(200),
    price: z.number().min(0),
    sku: z.string().max(200),
  })).optional(),
  productImages: z.array(z.string().max(5000)).optional(),
});

export const PlatformSearchSchema = z.object({
  query: z.string().min(1).max(500),
  platform: z.string().max(100).optional(),
});

// ── Multi-Store Management ──────────────────────────────────────────────────

export const BulkPushSchema = z.object({
  productTitle: z.string().min(1).max(1000),
  productImage: z.string().max(5000).optional().default(""),
  productPrice: z.number().min(0).max(100000),
  productUrl: z.string().max(5000).optional().default(""),
  productDescription: z.string().max(50000).optional().default(""),
  targetStoreIds: z.array(z.string().min(1).max(200)).min(1).max(20),
  productVariants: z.array(z.object({
    name: z.string().max(200),
    price: z.number().min(0),
    sku: z.string().max(200),
  })).optional(),
});

export const InventorySyncSchema = z.object({
  productId: z.string().min(1).max(200),
  sourceStoreId: z.string().min(1).max(200),
  newStock: z.number().min(0).max(100000),
});

// ── Supplier Relationship Management ────────────────────────────────────────

export const SupplierMessageSchema = z.object({
  supplierId: z.string().min(1).max(100),
  supplierName: z.string().min(1).max(200),
  subject: z.string().min(1).max(500),
  body: z.string().min(1).max(10000),
  messageType: z.enum(["inquiry", "negotiation", "order_issue", "quality", "general"]),
  relatedOrderId: z.string().max(200).optional(),
});

export const NegotiationSchema = z.object({
  supplierId: z.string().min(1).max(100),
  supplierName: z.string().min(1).max(200),
  productTitle: z.string().min(1).max(500),
  productId: z.string().max(200).optional(),
  initialPrice: z.number().min(0).max(100000),
  targetPrice: z.number().min(0).max(100000),
  quantity: z.number().min(1).max(100000),
  notes: z.string().max(5000).optional().default(""),
});

export const NegotiationRoundSchema = z.object({
  price: z.number().min(0).max(100000),
  message: z.string().min(1).max(5000),
  initiator: z.enum(["us", "supplier"]),
});

export const ScorecardUpdateSchema = z.object({
  supplierId: z.string().min(1).max(100),
  supplierName: z.string().min(1).max(200),
  criteria: z.object({
    speed: z.object({ score: z.number().min(0).max(100), weight: z.number().min(0).max(1) }),
    quality: z.object({ score: z.number().min(0).max(100), weight: z.number().min(0).max(1) }),
    communication: z.object({ score: z.number().min(0).max(100), weight: z.number().min(0).max(1) }),
    price: z.object({ score: z.number().min(0).max(100), weight: z.number().min(0).max(1) }),
    reliability: z.object({ score: z.number().min(0).max(100), weight: z.number().min(0).max(1) }),
  }),
});

export const AutoSwitchRuleSchema = z.object({
  supplierId: z.string().min(1).max(100),
  supplierName: z.string().min(1).max(200),
  enabled: z.boolean(),
  threshold: z.number().min(0).max(100),
  metric: z.enum(["overall_score", "speed", "quality", "communication", "price", "reliability"]),
  action: z.enum(["alert", "auto_switch", "notify_only"]),
  fallbackSupplierId: z.string().max(100).optional(),
  fallbackSupplierName: z.string().max(200).optional(),
});

// ── AI Product Listing Generator ──────────────────────────────────────────

export const ListingGenerateSchema = z.object({
  product: z.object({
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
  }),
  platform: z.enum(["amazon", "shopify", "etsy", "ebay", "walmart"]),
  tone: z.enum(["professional", "casual", "luxury", "budget", "handmade"]).optional(),
  targetAudience: z.string().max(500).optional(),
  competitorListings: z.array(z.object({
    title: z.string(),
    price: z.number(),
  })).max(20).optional(),
});

// ── AI Price War Bot ──────────────────────────────────────────────────────

export const PriceRuleInputSchema = z.object({
  productTitle: z.string().min(1).max(500),
  productImage: z.string().max(5000).optional().default(""),
  productUrl: z.string().url().max(2000).optional(),
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
  platforms: z.array(z.string().min(1)).min(1).max(10),
  competitorUrls: z.array(z.string().url().max(2000)).min(1).max(20),
});

export const PriceWarExecuteSchema = z.object({
  ruleId: z.string().min(1).max(200).optional(),
  dryRun: z.boolean().optional(),
});

// ── AI Customer Service (Enhanced) ────────────────────────────────────────

export const CSMessageInputSchema = z.object({
  uid: z.string().min(1),
  message: z.string().min(1).max(10000),
  conversationId: z.string().min(1).max(200),
});

export const KnowledgeBaseInputSchema = z.object({
  category: z.enum(["product", "shipping", "returns", "faq", "policy"]),
  title: z.string().min(1).max(500),
  content: z.string().min(1).max(5000),
  keywords: z.array(z.string().min(1).max(100)).min(1).max(20),
  productId: z.string().max(200).optional(),
  productTitle: z.string().max(500).optional(),
});

export const EscalationRuleInputSchema = z.object({
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

// ── AI Trend Predictor ────────────────────────────────────────────────────

export const TrendAnalysisInputSchema = z.object({
  keyword: z.string().min(1).max(200),
  category: z.string().max(200).optional(),
  platforms: z.array(z.enum(["tiktok", "instagram", "twitter", "google_trends", "amazon_movers", "reddit"])).optional(),
  timeframe: z.enum(["7d", "30d", "90d"]).optional(),
});

export const TrendWatchlistInputSchema = z.object({
  keyword: z.string().min(1).max(200),
  category: z.string().min(1).max(200),
  alertOnRising: z.boolean(),
  alertOnPeak: z.boolean(),
  alertOnSaturation: z.boolean(),
});
