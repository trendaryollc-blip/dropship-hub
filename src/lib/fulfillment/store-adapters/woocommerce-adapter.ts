import type { StoreAdapter, StoreConfig, StoreOrder, HealthResult } from "./interface";

export const woocommerceAdapter: StoreAdapter = {
  platform: "woocommerce",

  async fetchOrders(config: StoreConfig, since?: string): Promise<StoreOrder[]> {
    const baseUrl = config.url.replace(/\/$/, "");
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");

    let url = `${baseUrl}/wp-json/wc/v3/orders?per_page=50&orderby=date&order=desc`;
    if (since) url += `&after=${since}`;

    const res = await fetch(url, {
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (Array.isArray(data) ? data : []).map((order: Record<string, unknown>) => {
      const shipping = (order.shipping || {}) as Record<string, string>;
      const lineItems = (order.line_items || []) as Record<string, unknown>[];
      const billing = (order.billing || {}) as Record<string, string>;
      return {
        id: String(order.id),
        orderNumber: `#${order.number}`,
        customerName: `${shipping.first_name || ""} ${shipping.last_name || ""}`.trim() || "Customer",
        customerEmail: String(billing.email || ""),
        shippingAddress: {
          fullName: `${shipping.first_name || ""} ${shipping.last_name || ""}`.trim(),
          email: String(billing.email || ""),
          phone: String(shipping.phone || billing.phone || ""),
          street: String(shipping.address_1 || ""),
          city: String(shipping.city || ""),
          state: String(shipping.state || ""),
          zipCode: String(shipping.postcode || ""),
          country: String(shipping.country || "US"),
        },
        items: lineItems.map((item: Record<string, unknown>) => ({
          productId: String(item.product_id || ""),
          name: String(item.name || "Product"),
          price: parseFloat(String(item.price || "0")),
          quantity: Number(item.quantity || 1),
          sku: String(item.sku || ""),
          imageUrl: String(((item.image || {}) as Record<string, string>)?.src || ""),
        })),
        total: parseFloat(String(order.total || "0")),
        currency: String(order.currency || "USD"),
        status: mapWooStatus(String(order.status || "pending")),
        createdAt: String(order.date_created || ""),
      };
    });
  },

  async pushTracking(config: StoreConfig, orderId: string, trackingNumber: string, carrier: string): Promise<boolean> {
    const baseUrl = config.url.replace(/\/$/, "");
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");

    const res = await fetch(`${baseUrl}/wp-json/wc/v3/orders/${orderId}`, {
      method: "PUT",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "completed",
        meta_data: [
          { key: "_tracking_number", value: trackingNumber },
          { key: "_tracking_company", value: carrier || "Other" },
        ],
      }),
      signal: AbortSignal.timeout(15000),
    });
    return res.ok;
  },

  async getOrderStatus(_config: StoreConfig, _orderId: string): Promise<string> {
    return "unknown";
  },

  async healthCheck(config: StoreConfig): Promise<HealthResult> {
    const baseUrl = config.url.replace(/\/$/, "");
    const auth = Buffer.from(`${config.apiKey}:${config.apiSecret}`).toString("base64");
    const start = Date.now();
    try {
      const res = await fetch(`${baseUrl}/wp-json/wc/v3/system_status`, {
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      const responseTimeMs = Date.now() - start;
      if (res.status === 401 || res.status === 403) {
        return { status: "credentials_expired", message: "API credentials are invalid or expired", responseTimeMs };
      }
      if (!res.ok) {
        return { status: "error", message: `API returned ${res.status}`, responseTimeMs };
      }
      return { status: "healthy", message: `Connected to WooCommerce at ${baseUrl}`, responseTimeMs };
    } catch (err) {
      return { status: "error", message: err instanceof Error ? err.message : "Connection failed", responseTimeMs: Date.now() - start };
    }
  },
};

function mapWooStatus(status: string): StoreOrder["status"] {
  const map: Record<string, StoreOrder["status"]> = {
    pending: "pending",
    processing: "paid",
    on_hold: "pending",
    completed: "shipped",
    cancelled: "cancelled",
    refunded: "cancelled",
    failed: "cancelled",
  };
  return map[status] || "pending";
}
