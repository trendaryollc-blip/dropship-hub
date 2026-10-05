// ── Supplier fulfillment adapters ─────────────────────────────────────────
// CJ is the only platform with a real order-placement API. All other supplier
// platforms resolve to manual adapters that queue deep-link instructions —
// never a fabricated order id.

export interface SupplierOrderInput {
  productId: string;
  quantity: number;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

export interface SupplierOrderResult {
  success: boolean;
  platformOrderId?: string;
  queuedForManual?: boolean;
  deepLink?: string;
  instructions?: string;
  estimatedDelivery?: string;
  error?: string;
}

export interface SupplierTrackingInfo {
  status: string;
  trackingNumber: string | null;
  carrier: string | null;
}

export interface SupplierStockInfo {
  inStock: boolean | null;
  stockLevel: number | null;
}

export interface SupplierAdapter {
  platformId: string;
  canAutoOrder: boolean;
  placeOrder(input: SupplierOrderInput): Promise<SupplierOrderResult>;
  getOrderStatus(ref: string): Promise<SupplierTrackingInfo>;
  checkInventory(productRef: string): Promise<SupplierStockInfo>;
}
