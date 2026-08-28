import type { StoreAdapter, StoreConfig, StoreOrder } from "./interface";

export const shopifyAdapter: StoreAdapter = {
  platform: "shopify",

  async fetchOrders(config: StoreConfig, since?: string): Promise<StoreOrder[]> {
    const domain = config.url.replace("https://", "").replace("http://", "").replace(/\/$/, "");
    const baseUrl = `https://${domain}/admin/api/2024-01`;
    const headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.accessToken || config.apiKey,
    };

    let url = `${baseUrl}/orders.json?status=any&limit=50`;
    if (since) url += `&created_at_min=${since}`;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.orders || []).map((order: Record<string, unknown>) => {
      const shipping = (order.shipping_address || {}) as Record<string, string>;
      const lineItems = (order.line_items || []) as Record<string, unknown>[];
      return {
        id: String(order.id),
        orderNumber: `#${order.order_number}`,
        customerName: `${shipping.first_name || ""} ${shipping.last_name || ""}`.trim() || "Customer",
        customerEmail: String(order.email || ""),
        shippingAddress: {
          fullName: `${shipping.first_name || ""} ${shipping.last_name || ""}`.trim(),
          email: String(order.email || ""),
          phone: String(shipping.phone || ""),
          street: String(shipping.address1 || ""),
          city: String(shipping.city || ""),
          state: String(shipping.province || ""),
          zipCode: String(shipping.zip || ""),
          country: String(shipping.country || "US"),
        },
        items: lineItems.map((item: Record<string, unknown>) => ({
          productId: String(item.product_id || ""),
          name: String(item.title || "Product"),
          price: parseFloat(String(item.price || "0")),
          quantity: Number(item.quantity || 1),
          sku: String(item.sku || ""),
          imageUrl: String(((item.image || {}) as Record<string, string>)?.src || ""),
        })),
        total: parseFloat(String(order.total_price || "0")),
        currency: String(order.currency || "USD"),
        status: mapShopifyStatus(String(order.financial_status || "pending")),
        createdAt: String(order.created_at || ""),
      };
    });
  },

  async pushTracking(config: StoreConfig, orderId: string, trackingNumber: string, carrier: string): Promise<boolean> {
    const domain = config.url.replace("https://", "").replace("http://", "").replace(/\/$/, "");
    const baseUrl = `https://${domain}/admin/api/2024-01`;
    const headers = {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": config.accessToken || config.apiKey,
    };

    const res = await fetch(`${baseUrl}/orders/${orderId}/fulfillments.json`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fulfillment: {
          tracking_number: trackingNumber,
          tracking_company: carrier || "Other",
          notify_customer: true,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });
    return res.ok;
  },

  async getOrderStatus(_config: StoreConfig, _orderId: string): Promise<string> {
    return "unknown";
  },
};

function mapShopifyStatus(status: string): StoreOrder["status"] {
  const map: Record<string, StoreOrder["status"]> = {
    paid: "paid",
    pending: "pending",
    authorized: "paid",
    partially_paid: "pending",
    shipped: "shipped",
    fulfilled: "shipped",
    delivered: "delivered",
    cancelled: "cancelled",
    refunded: "cancelled",
  };
  return map[status] || "pending";
}
