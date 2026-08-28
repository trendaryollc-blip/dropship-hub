export interface FulfillmentOrder {
  id: string;
  trendaryoOrderId: string;
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
}

export interface PlatformConfig {
  id: string;
  name: string;
  icon: string;
  color: string;
  hasApi: boolean;
  autoOrderSupported: boolean;
  description: string;
}

export const PLATFORM_CONFIGS: PlatformConfig[] = [
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
};
