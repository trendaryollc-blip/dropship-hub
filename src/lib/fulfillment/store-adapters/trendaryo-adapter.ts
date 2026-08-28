import jwt from "jsonwebtoken";
import type { StoreAdapter, StoreConfig, StoreOrder } from "./interface";

export const trendaryoAdapter: StoreAdapter = {
  platform: "trendaryo",

  async fetchOrders(config: StoreConfig): Promise<StoreOrder[]> {
    const backendUrl = config.url;
    const apiKey = config.apiKey;
    const jwtSecret = process.env.TRENDARYO_JWT_SECRET || "";
    const adminUid = process.env.TRENDARYO_ADMIN_UID || "";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (jwtSecret && adminUid) {
      const token = jwt.sign({ userId: adminUid, role: "admin", type: "access" }, jwtSecret, { expiresIn: "1h" });
      headers["Authorization"] = `Bearer ${token}`;
    } else if (apiKey) {
      headers["x-api-key"] = apiKey;
    }

    const res = await fetch(`${backendUrl}/api/orders`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return [];
    const data = await res.json();

    return (data.data?.orders || []).map((order: Record<string, unknown>) => {
      const addr = (order.shippingAddress || {}) as Record<string, string>;
      const items = (order.items || []) as Record<string, unknown>[];
      return {
        id: String(order.id),
        orderNumber: String(order.orderNumber || `#${order.id}`),
        customerName: String(addr.fullName || "Customer"),
        customerEmail: String(addr.email || ""),
        shippingAddress: {
          fullName: String(addr.fullName || ""),
          email: String(addr.email || ""),
          phone: String(addr.phone || ""),
          street: String(addr.street || ""),
          city: String(addr.city || ""),
          state: String(addr.state || ""),
          zipCode: String(addr.zipCode || ""),
          country: String(addr.country || "US"),
        },
        items: items.map((item: Record<string, unknown>) => ({
          productId: String(item.productId || ""),
          name: String(item.name || "Product"),
          price: parseFloat(String(item.price || "0")),
          quantity: Number(item.quantity || 1),
          sku: "",
          imageUrl: "",
        })),
        total: parseFloat(String(order.total || "0")),
        currency: String(order.currency || "USD"),
        status: mapTrendaryoStatus(String(order.status || "pending")),
        createdAt: String((() => { const ts = order.createdAt as Record<string, number> | undefined; return ts?.seconds ? new Date(ts.seconds * 1000).toISOString() : ""; })()),
      };
    });
  },

  async pushTracking(config: StoreConfig, orderId: string, trackingNumber: string, carrier: string): Promise<boolean> {
    const backendUrl = config.url;
    const jwtSecret = process.env.TRENDARYO_JWT_SECRET || "";
    const adminUid = process.env.TRENDARYO_ADMIN_UID || "";

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (jwtSecret && adminUid) {
      const token = jwt.sign({ userId: adminUid, role: "admin", type: "access" }, jwtSecret, { expiresIn: "1h" });
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${backendUrl}/api/orders/${orderId}`, {
      method: "PUT",
      headers,
      body: JSON.stringify({ status: "shipped", trackingNumber, carrier }),
      signal: AbortSignal.timeout(15000),
    });
    return res.ok;
  },

  async getOrderStatus(_config: StoreConfig, _orderId: string): Promise<string> {
    return "unknown";
  },
};

function mapTrendaryoStatus(status: string): StoreOrder["status"] {
  const map: Record<string, StoreOrder["status"]> = {
    pending: "pending",
    processing: "paid",
    shipped: "shipped",
    delivered: "delivered",
    cancelled: "cancelled",
  };
  return map[status] || "pending";
}
