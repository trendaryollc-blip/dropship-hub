export interface UnifiedOrder {
  id: string;
  orderId: string;
  storeId: string;
  storeName: string;
  storePlatform: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: UnifiedOrderItem[];
  totalAmount: number;
  currency: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";
  fulfillmentStatus: "unfulfilled" | "partial" | "fulfilled";
  supplierId?: string;
  supplierName?: string;
  trackingNumber?: string;
  shippingAddress: OrderAddress;
  createdAt: string;
  updatedAt: string;
}

export interface UnifiedOrderItem {
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image?: string;
  sku?: string;
}

export interface OrderAddress {
  fullName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
}

export interface StoreInventoryItem {
  id: string;
  productId: string;
  title: string;
  image?: string;
  sku?: string;
  stores: StoreInventoryEntry[];
  totalStock: number;
  lastSyncedAt: string;
}

export interface StoreInventoryEntry {
  storeId: string;
  storeName: string;
  storePlatform: string;
  stock: number;
  price: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
  lastUpdated: string;
}

export interface StorePerformance {
  storeId: string;
  storeName: string;
  storePlatform: string;
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    totalProfit: number;
    avgOrderValue: number;
    conversionRate: number;
    returnRate: number;
    fulfillmentRate: number;
    avgShippingDays: number;
  };
  trends: {
    ordersTrend: number;
    revenueTrend: number;
    profitTrend: number;
  };
  period: "7d" | "30d" | "90d";
}

export interface BulkPushJob {
  id: string;
  productTitle: string;
  productImage: string;
  productPrice: number;
  productUrl: string;
  productDescription: string;
  targetStores: BulkPushTarget[];
  status: "pending" | "in_progress" | "completed" | "failed" | "partial";
  totalPushed: number;
  totalFailed: number;
  results: BulkPushResult[];
  createdAt: string;
  completedAt?: string;
}

export interface BulkPushTarget {
  storeId: string;
  storeName: string;
  storePlatform: string;
  status: "pending" | "pushed" | "failed";
  platformProductId?: string;
  error?: string;
}

export interface BulkPushResult {
  storeId: string;
  storeName: string;
  success: boolean;
  platformProductId?: string;
  error?: string;
}

export interface InventorySyncLog {
  id: string;
  productId: string;
  productTitle: string;
  sourceStoreId: string;
  sourceStoreName: string;
  action: "push" | "pull" | "sync";
  quantityChange: number;
  previousStock: number;
  newStock: number;
  status: "success" | "failed" | "partial";
  error?: string;
  createdAt: string;
}

export interface StoreDashboardSummary {
  totalStores: number;
  connectedStores: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  syncStatus: "synced" | "syncing" | "error" | "never_synced";
  lastSyncAt?: string;
  storeBreakdown: {
    storeId: string;
    storeName: string;
    storePlatform: string;
    orderCount: number;
    revenue: number;
    productCount: number;
  }[];
}
