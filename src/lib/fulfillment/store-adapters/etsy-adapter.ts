import type { StoreAdapter, StoreConfig, StoreOrder } from "./interface";

export const etsyAdapter: StoreAdapter = {
  platform: "etsy",

  async fetchOrders(config: StoreConfig, since?: string): Promise<StoreOrder[]> {
    const baseUrl = "https://openapi.etsy.com/v3";
    const headers = {
      "x-api-key": config.apiKey,
      Authorization: `Bearer ${config.accessToken || ""}`,
    };

    let url = `${baseUrl}/application/shops/${config.apiSecret}/receipts`;
    if (since) url += `?min_created=${Math.floor(new Date(since).getTime() / 1000)}`;

    const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.results || []).map((receipt: Record<string, unknown>) => {
      const addr = (receipt.address || {}) as Record<string, string>;
      const transactions = (receipt.transactions || []) as Record<string, unknown>[];
      return {
        id: String(receipt.receipt_id),
        orderNumber: `#${receipt.receipt_id}`,
        customerName: String(addr.first_name + " " + addr.last_name || "Customer"),
        customerEmail: String(receipt.buyer_email || ""),
        shippingAddress: {
          fullName: `${addr.first_name || ""} ${addr.last_name || ""}`.trim(),
          email: String(receipt.buyer_email || ""),
          phone: String(addr.phone || ""),
          street: String(addr.street1 || ""),
          city: String(addr.city || ""),
          state: String(addr.state || ""),
          zipCode: String(addr.zip || ""),
          country: String(addr.country_code || "US"),
        },
        items: transactions.map((t: Record<string, unknown>) => {
          const tPrice = (t.price || {}) as Record<string, string>;
          const tImage = (t.image || {}) as Record<string, string>;
          return {
            productId: String(t.listing_id || ""),
            name: String(t.title || "Product"),
            price: parseFloat(String(tPrice.amount || t.price || "0")),
            quantity: Number(t.quantity || 1),
            sku: String(t.sku || ""),
            imageUrl: String(tImage.url_170x135 || ""),
          };
        }),
        total: parseFloat(String(((receipt.grandtotal || {}) as Record<string, string>).amount || receipt.grandtotal || "0")),
        currency: String(((receipt.grandtotal || {}) as Record<string, string>).currency_code || "USD"),
        status: mapEtsyStatus(String(receipt.status || "open")),
        createdAt: String(receipt.create_timestamp ? new Date(Number(receipt.create_timestamp) * 1000).toISOString() : ""),
      };
    });
  },

  async pushTracking(config: StoreConfig, orderId: string, trackingNumber: string, carrier: string): Promise<boolean> {
    const baseUrl = "https://openapi.etsy.com/v3";
    const headers = {
      "x-api-key": config.apiKey,
      Authorization: `Bearer ${config.accessToken || ""}`,
      "Content-Type": "application/json",
    };

    const res = await fetch(`${baseUrl}/application/shops/${config.apiSecret}/receipts/${orderId}/tracking`, {
      method: "POST",
      headers,
      body: JSON.stringify({ tracking_code: trackingNumber, carrier_name: carrier || "Other" }),
      signal: AbortSignal.timeout(15000),
    });
    return res.ok;
  },

  async getOrderStatus(_config: StoreConfig, _orderId: string): Promise<string> {
    return "unknown";
  },
};

function mapEtsyStatus(status: string): StoreOrder["status"] {
  const map: Record<string, StoreOrder["status"]> = {
    open: "pending",
    paid: "paid",
    completed: "shipped",
    closed: "delivered",
    cancelled: "cancelled",
  };
  return map[status] || "pending";
}
