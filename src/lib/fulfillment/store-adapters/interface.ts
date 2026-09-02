export interface StoreOrder {
  id: string;
  orderNumber: string;
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
  items: StoreOrderItem[];
  total: number;
  currency: string;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
}

export interface StoreOrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  sku: string;
  imageUrl: string;
}

export interface StoreAdapter {
  platform: string;
  fetchOrders(config: StoreConfig, since?: string): Promise<StoreOrder[]>;
  pushTracking(config: StoreConfig, orderId: string, trackingNumber: string, carrier: string): Promise<boolean>;
  getOrderStatus(config: StoreConfig, orderId: string): Promise<string>;
}

export interface StoreConfig {
  platform: string;
  url: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  consumerKey?: string;
  consumerSecret?: string;
}

export interface TrackingUpdate {
  orderId: string;
  trackingNumber: string;
  carrier: string;
}
