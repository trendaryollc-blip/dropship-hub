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
    active: z.boolean(),
    priority: z.number(),
  })).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  stream: z.boolean().optional(),
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
