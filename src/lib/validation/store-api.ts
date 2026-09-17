import { z } from "zod";

export const ConnectedStoreSchema = z.object({
  id: z.string(),
  platform: z.string(),
  name: z.string(),
  url: z.string().optional().default(""),
  backendUrl: z.string().optional(),
  apiKey: z.string().optional(),
  status: z.enum(["connected", "disconnected", "error"]),
  connectedAt: z.string(),
  lastSyncAt: z.string().optional(),
  productCount: z.number().optional(),
  orderCount: z.number().optional(),
});

export const ConnectionsResponseSchema = z.object({
  connections: z.array(ConnectedStoreSchema).optional().default([]),
});

export const PushedProductSchema = z.object({
  id: z.string(),
  storeId: z.string(),
  storeName: z.string(),
  productTitle: z.string(),
  productImage: z.string().optional().default(""),
  productPrice: z.number(),
  productUrl: z.string().optional().default(""),
  productDescription: z.string().optional(),
  status: z.enum(["pushed", "live", "error"]),
  pushedAt: z.string(),
});

export const PushResponseSchema = z.object({
  products: z.array(PushedProductSchema).optional().default([]),
});

export const UnifiedOrderItemSchema = z.object({
  productId: z.string(),
  title: z.string(),
  quantity: z.number(),
  unitPrice: z.number(),
  totalPrice: z.number(),
  image: z.string().optional(),
  sku: z.string().optional(),
});

export const UnifiedOrderSchema = z.object({
  id: z.string(),
  orderId: z.string(),
  storeId: z.string(),
  storeName: z.string(),
  storePlatform: z.string(),
  orderNumber: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  items: z.array(UnifiedOrderItemSchema),
  totalAmount: z.number(),
  currency: z.string(),
  status: z.enum(["pending", "processing", "shipped", "delivered", "cancelled", "refunded"]),
  fulfillmentStatus: z.enum(["unfulfilled", "partial", "fulfilled"]),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  trackingNumber: z.string().optional(),
  shippingAddress: z.object({
    fullName: z.string(),
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zipCode: z.string(),
    country: z.string(),
    phone: z.string().optional(),
  }),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const OrdersResponseSchema = z.object({
  orders: z.array(UnifiedOrderSchema).optional().default([]),
});

export const StoreInventoryEntrySchema = z.object({
  storeId: z.string(),
  storeName: z.string(),
  storePlatform: z.string(),
  stock: z.number(),
  price: z.number(),
  status: z.enum(["in_stock", "low_stock", "out_of_stock"]),
  lastUpdated: z.string(),
});

export const StoreInventoryItemSchema = z.object({
  id: z.string(),
  productId: z.string(),
  title: z.string(),
  image: z.string().optional(),
  sku: z.string().optional(),
  stores: z.array(StoreInventoryEntrySchema),
  totalStock: z.number(),
  lastSyncedAt: z.string(),
});

export const InventoryResponseSchema = z.object({
  inventory: z.array(StoreInventoryItemSchema).optional().default([]),
});

export const StorePerformanceSchema = z.object({
  storeId: z.string(),
  storeName: z.string(),
  storePlatform: z.string(),
  metrics: z.object({
    totalOrders: z.number(),
    totalRevenue: z.number(),
    totalProfit: z.number(),
    avgOrderValue: z.number(),
    conversionRate: z.number(),
    returnRate: z.number(),
    fulfillmentRate: z.number(),
    avgShippingDays: z.number(),
  }),
  trends: z.object({
    ordersTrend: z.number(),
    revenueTrend: z.number(),
    profitTrend: z.number(),
  }),
  period: z.enum(["7d", "30d", "90d"]),
});

export const PerformanceResponseSchema = z.object({
  performances: z.array(StorePerformanceSchema).optional().default([]),
});

export const BulkPushTargetSchema = z.object({
  storeId: z.string(),
  storeName: z.string(),
  storePlatform: z.string(),
  status: z.enum(["pending", "pushed", "failed"]),
  platformProductId: z.string().optional(),
  error: z.string().optional(),
});

export const BulkPushJobSchema = z.object({
  id: z.string(),
  productTitle: z.string(),
  productImage: z.string().optional().default(""),
  productPrice: z.number(),
  productUrl: z.string().optional().default(""),
  productDescription: z.string().optional().default(""),
  targetStores: z.array(BulkPushTargetSchema),
  status: z.enum(["pending", "in_progress", "completed", "failed", "partial"]),
  totalPushed: z.number(),
  totalFailed: z.number(),
  results: z.array(z.object({
    storeId: z.string(),
    storeName: z.string(),
    success: z.boolean(),
    platformProductId: z.string().optional(),
    error: z.string().optional(),
  })),
  createdAt: z.string(),
  completedAt: z.string().optional(),
});

export const BulkPushResponseSchema = z.object({
  jobs: z.array(BulkPushJobSchema).optional().default([]),
});
