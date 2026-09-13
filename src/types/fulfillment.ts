export interface FulfillmentOrder {
  id: string;
  trendaryoOrderId: string;
  storeOrderId?: string;
  storePlatform?: string;
  storeName?: string;
  orderNumber: string;
  items: FulfillmentOrderItem[];
  customerName: string;
  customerEmail: string;
  shippingAddress: {
    fullName: string;
    email: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  status: "pending" | "in_progress" | "shipped" | "delivered" | "cancelled";
  platformOrders: PlatformOrder[];
  totalRevenue: number;
  totalCost: number;
  profit: number;
  assignedSupplier?: string;
  automationError?: string;
  automationTrigger?: "webhook" | "poll" | "manual" | "bulk" | "scheduled";
  createdAt: string;
  updatedAt: string;
}

export interface FulfillmentOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  source: string;
  supplierId: string;
  supplierName: string;
  imageUrl: string;
  platformProductId: string;
  unitCost: number;
}

export interface PlatformOrder {
  platform: string;
  platformOrderId: string;
  trackingNumber: string | null;
  carrier: string | null;
  status: string;
  placedAt: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  estimatedDelivery: string | null;
  error: string | null;
}

export interface FulfillmentSettings {
  autoApprove: Record<string, boolean>;
  minReliabilityScore: number;
  maxShippingDays: number;
  emailOnNewOrder: boolean;
  emailOnShipment: boolean;
  emailOnDelivery: boolean;
  browserNotifications: boolean;
  defaultSuppliers: Record<string, string>;
  autoSwitchOnDegradation: boolean;
  degradationThreshold: number;
  storeConnections: StoreConnection[];
  supplierPreferences: SupplierPreference[];
}

export interface StoreConnection {
  id: string;
  platform: string;
  name: string;
  url: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  storeDomain?: string;
  status: "connected" | "disconnected" | "error";
  connectedAt: string;
  lastSyncAt?: string;
}

export interface SupplierPreference {
  supplierId: string;
  supplierName: string;
  priority: number;
  enabled: boolean;
  minReliability: number;
  maxShippingDays: number;
}

export interface PlatformDisplayConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  hasApi: boolean;
  autoOrderSupported: boolean;
  description: string;
}

export const PLATFORM_CONFIGS: PlatformDisplayConfig[] = [
  { id: "cj", name: "CJ Dropshipping", icon: "🚚", color: "#22c55e", hasApi: true, autoOrderSupported: true, description: "Full API — orders placed automatically" },
  { id: "aliexpress", name: "AliExpress", icon: "🇨🇳", color: "#e11d48", hasApi: false, autoOrderSupported: false, description: "Manual — open supplier link and order" },
  { id: "amazon", name: "Amazon", icon: "📦", color: "#f59e0b", hasApi: false, autoOrderSupported: false, description: "Manual — copy order details to Amazon" },
  { id: "ebay", name: "eBay", icon: "🏷️", color: "#3b82f6", hasApi: false, autoOrderSupported: false, description: "Manual — place order on eBay" },
  { id: "alibaba", name: "Alibaba", icon: "🏭", color: "#f97316", hasApi: false, autoOrderSupported: false, description: "Manual — contact supplier on Alibaba" },
  { id: "dhgate", name: "DHgate", icon: "🔗", color: "#8b5cf6", hasApi: false, autoOrderSupported: false, description: "Manual — order on DHgate" },
  { id: "temu", name: "Temu", icon: "🔥", color: "#ef4444", hasApi: false, autoOrderSupported: false, description: "Manual — order on Temu" },
  { id: "shein", name: "Shein", icon: "👗", color: "#ec4899", hasApi: false, autoOrderSupported: false, description: "Manual — order on Shein" },
  { id: "banggood", name: "Banggood", icon: "⚡", color: "#f59e0b", hasApi: false, autoOrderSupported: false, description: "Manual — order on Banggood" },
  { id: "custom", name: "Custom Store", icon: "🏪", color: "#6b7280", hasApi: false, autoOrderSupported: false, description: "Manual — order from your custom supplier" },
];

export const DEFAULT_FULFILLMENT_SETTINGS: FulfillmentSettings = {
  autoApprove: { cj: true },
  minReliabilityScore: 80,
  maxShippingDays: 15,
  emailOnNewOrder: true,
  emailOnShipment: true,
  emailOnDelivery: false,
  browserNotifications: true,
  defaultSuppliers: {},
  autoSwitchOnDegradation: true,
  degradationThreshold: 70,
  storeConnections: [],
  supplierPreferences: [
    { supplierId: "cj", supplierName: "CJ Dropshipping", priority: 1, enabled: true, minReliability: 80, maxShippingDays: 15 },
    { supplierId: "aliexpress", supplierName: "AliExpress", priority: 2, enabled: true, minReliability: 70, maxShippingDays: 20 },
    { supplierId: "alibaba", supplierName: "Alibaba", priority: 3, enabled: true, minReliability: 75, maxShippingDays: 25 },
    { supplierId: "amazon", supplierName: "Amazon", priority: 4, enabled: true, minReliability: 85, maxShippingDays: 7 },
    { supplierId: "temu", supplierName: "Temu", priority: 5, enabled: true, minReliability: 70, maxShippingDays: 18 },
    { supplierId: "manual", supplierName: "Manual", priority: 6, enabled: true, minReliability: 100, maxShippingDays: 30 },
  ],
};

// ─── Return / Refund Types ───────────────────────────────────────────────────

export type ReturnStatus =
  | "requested"
  | "approved"
  | "denied"
  | "return_in_transit"
  | "return_received"
  | "refund_processing"
  | "refunded"
  | "closed";

export type ReturnReason =
  | "defective"
  | "wrong_item"
  | "not_as_described"
  | "changed_mind"
  | "damaged_in_transit"
  | "other";

export interface ReturnItem {
  orderItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  reason: string;
  condition?: "unused" | "opened" | "damaged" | "defective";
}

export interface ReturnRequest {
  id: string;
  orderId: string;
  uid: string;
  status: ReturnStatus;
  reason: ReturnReason;
  reasonDescription: string;
  items: ReturnItem[];
  requestedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  supplierRMANumber?: string;
  returnLabelUrl?: string;
  returnTrackingNumber?: string;
  refundAmount?: number;
  refundMethod?: "original" | "store_credit" | "manual";
  refundProcessedAt?: string;
  customerEmail: string;
  customerName: string;
  notes?: string;
  internalNotes?: string;
  statusHistory: ReturnStatusEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface ReturnStatusEntry {
  status: ReturnStatus;
  timestamp: string;
  note?: string;
  actor?: string;
}

export const RETURN_STATUS_CONFIG: Record<ReturnStatus, { label: string; color: string; bg: string; icon: string }> = {
  requested: { label: "Requested", color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/20", icon: "⏳" },
  approved: { label: "Approved", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/20", icon: "✅" },
  denied: { label: "Denied", color: "text-red-400", bg: "bg-red-500/20 border-red-500/20", icon: "❌" },
  return_in_transit: { label: "In Transit", color: "text-purple-400", bg: "bg-purple-500/20 border-purple-500/20", icon: "🚚" },
  return_received: { label: "Received", color: "text-blue-400", bg: "bg-blue-500/20 border-blue-500/20", icon: "📦" },
  refund_processing: { label: "Refund Processing", color: "text-amber-400", bg: "bg-amber-500/20 border-amber-500/20", icon: "⏳" },
  refunded: { label: "Refunded", color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/20", icon: "💰" },
  closed: { label: "Closed", color: "text-muted-foreground", bg: "bg-surface border-white/10", icon: "🔒" },
};

export const RETURN_REASON_CONFIG: Record<ReturnReason, { label: string; icon: string }> = {
  defective: { label: "Defective Product", icon: "🔧" },
  wrong_item: { label: "Wrong Item Received", icon: "📦" },
  not_as_described: { label: "Not As Described", icon: "📝" },
  changed_mind: { label: "Changed Mind", icon: "💭" },
  damaged_in_transit: { label: "Damaged In Transit", icon: "💥" },
  other: { label: "Other", icon: "❓" },
};

// ─── Phase 3: Bulk Operations Types ──────────────────────────────────────────

export interface BulkOperation {
  id: string;
  uid: string;
  action: "status_update" | "supplier_assignment" | "cancel" | "fulfill" | "export" | "csv_import";
  status: "pending" | "running" | "completed" | "failed";
  totalOrders: number;
  processedOrders: number;
  successOrders: number;
  failedOrders: number;
  failedItems: Array<{ orderId: string; error: string }>;
  parameters: Record<string, unknown>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BulkStatusUpdate {
  orderIds: string[];
  newStatus: FulfillmentOrder["status"];
  note?: string;
}

export interface BulkSupplierAssignment {
  orderIds: string[];
  supplierId: string;
  supplierName: string;
  reason?: string;
}

export interface CSVImportRow {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone?: string;
  productName: string;
  productSku?: string;
  quantity: number;
  unitPrice: number;
  source: string;
  supplierId?: string;
}

export interface CSVImportResult {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: Array<{ row: number; message: string }>;
  importedOrders: string[];
}

export const BULK_ACTION_CONFIG: Record<string, { label: string; icon: string; color: string; description: string }> = {
  status_update: { label: "Update Status", icon: "🔄", color: "text-blue-400", description: "Change status of selected orders" },
  supplier_assignment: { label: "Assign Supplier", icon: "🏭", color: "text-purple-400", description: "Assign a supplier to selected orders" },
  cancel: { label: "Cancel Orders", icon: "❌", color: "text-red-400", description: "Cancel selected orders" },
  fulfill: { label: "Auto-Fulfill", icon: "⚡", color: "text-emerald-400", description: "Auto-fulfill selected orders" },
  export: { label: "Export CSV", icon: "📤", color: "text-accent", description: "Export selected orders to CSV" },
  csv_import: { label: "Import CSV", icon: "📥", color: "text-amber-400", description: "Import orders from CSV file" },
};

// ─── Phase 4: Dashboard Types ────────────────────────────────────────────────

export interface SLADashboardData {
  summary: {
    totalOrders: number;
    onTimeRate: number;
    avgFulfillmentHours: number;
    atRiskOrders: number;
    overdueOrders: number;
  };
  breakdown: Array<{
    status: string;
    count: number;
    avgHours: number;
    onTimeRate: number;
  }>;
  alerts: Array<{
    orderId: string;
    orderNumber: string;
    customerName: string;
    hoursElapsed: number;
    expectedBy: string;
    severity: "warning" | "critical";
    message: string;
  }>;
  timeline: Array<{
    date: string;
    onTime: number;
    late: number;
    total: number;
  }>;
}

export interface SupplierPerformanceData {
  suppliers: Array<{
    supplierId: string;
    supplierName: string;
    orderCount: number;
    avgShippingDays: number;
    onTimeRate: number;
    returnRate: number;
    avgQualityScore: number;
    totalRevenue: number;
    totalProfit: number;
    avgMargin: number;
    reliabilityTrend: "improving" | "stable" | "declining";
    status: "excellent" | "good" | "warning" | "poor";
  }>;
  summary: {
    totalSuppliers: number;
    bestPerformer: string;
    worstPerformer: string;
    avgOverallScore: number;
  };
}

export interface InventoryDashboardData {
  summary: {
    totalSKUs: number;
    lowStockCount: number;
    outOfStockCount: number;
    avgStockLevel: number;
    totalInventoryValue: number;
  };
  alerts: Array<{
    productId: string;
    productName: string;
    supplierName: string;
    currentStock: number;
    reorderPoint: number;
    severity: "out_of_stock" | "critical" | "low";
    lastUpdated: string;
  }>;
  topProducts: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    revenue: number;
    avgDailyDemand: number;
    daysOfStock: number;
    status: "healthy" | "low" | "critical" | "stockout";
  }>;
}

// ─── Phase 5: Communication Types ────────────────────────────────────────────

export type NotificationType =
  | "order_received"
  | "order_approved"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "return_requested"
  | "return_approved"
  | "refund_processed"
  | "supplier_alert"
  | "sla_warning"
  | "sla_breach"
  | "inventory_low"
  | "bulk_operation_complete"
  | "system_alert";

export type NotificationPriority = "low" | "medium" | "high" | "urgent";

export interface AppNotification {
  id: string;
  uid: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  orderId?: string;
  read: boolean;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  readAt?: string;
}

export interface OrderNote {
  id: string;
  orderId: string;
  uid: string;
  author: string;
  content: string;
  isInternal: boolean;
  isSystemGenerated: boolean;
  createdAt: string;
  updatedAt: string;
}

export const NOTIFICATION_TYPE_CONFIG: Record<NotificationType, { label: string; icon: string; color: string; bg: string }> = {
  order_received: { label: "New Order", icon: "📦", color: "text-blue-400", bg: "bg-blue-500/20" },
  order_approved: { label: "Order Approved", icon: "✅", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  order_shipped: { label: "Order Shipped", icon: "🚚", color: "text-purple-400", bg: "bg-purple-500/20" },
  order_delivered: { label: "Order Delivered", icon: "🎉", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  order_cancelled: { label: "Order Cancelled", icon: "❌", color: "text-red-400", bg: "bg-red-500/20" },
  return_requested: { label: "Return Requested", icon: "↩️", color: "text-amber-400", bg: "bg-amber-500/20" },
  return_approved: { label: "Return Approved", icon: "✅", color: "text-blue-400", bg: "bg-blue-500/20" },
  refund_processed: { label: "Refund Processed", icon: "💰", color: "text-emerald-400", bg: "bg-emerald-500/20" },
  supplier_alert: { label: "Supplier Alert", icon: "⚠️", color: "text-amber-400", bg: "bg-amber-500/20" },
  sla_warning: { label: "SLA Warning", icon: "⏰", color: "text-amber-400", bg: "bg-amber-500/20" },
  sla_breach: { label: "SLA Breach", icon: "🚨", color: "text-red-400", bg: "bg-red-500/20" },
  inventory_low: { label: "Low Inventory", icon: "📊", color: "text-amber-400", bg: "bg-amber-500/20" },
  bulk_operation_complete: { label: "Bulk Complete", icon: "⚡", color: "text-blue-400", bg: "bg-blue-500/20" },
  system_alert: { label: "System Alert", icon: "🔔", color: "text-red-400", bg: "bg-red-500/20" },
};
