import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// Tests for the CURRENT /api/webhooks/shopify implementation:
//   - inline HMAC verification over the raw body with SHOPIFY_WEBHOOK_SECRET
//   - user scan via Admin SDK: users → storeConnections (platform+domain)
//   - orders/create|updated → webhookOrders doc write + SSE broadcast
//   - products/update → inventory broadcast
//   - any other topic → accepted ({ received: true }) without DB work
const originalEnv = { ...process.env };

const mockGetAdminDB = vi.fn();
const mockBroadcast = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: mockGetAdminDB,
}));

vi.mock("@/app/api/store/events/route", () => ({
  broadcast: mockBroadcast,
}));

const WEBHOOK_SECRET = "webhook_secret_123";

function sign(body: string, secret = WEBHOOK_SECRET) {
  return crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
}

function makeShopifyWebhookRequest(body: string, headers: Record<string, string>) {
  return new Request("http://localhost/api/webhooks/shopify", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  }) as any;
}

// Admin SDK mock shaped like the real chain used by the route:
//   db.collection("users").get()
//   userDoc.ref.collection("storeConnections").where().where().get()
//   userDoc.ref.collection("webhookOrders").doc(id).set(payload)
const mockUsersGet = vi.fn();
const mockConnectionsGet = vi.fn();
const mockWebhookOrderSet = vi.fn();

function wireDb({ connectionFound = true } = {}) {
  const userDoc = {
    id: "user-abc",
    ref: {
      collection: vi.fn((name: string) => {
        if (name === "storeConnections") {
          return {
            where: vi.fn().mockReturnThis(),
            get: mockConnectionsGet,
          };
        }
        // webhookOrders
        return {
          doc: vi.fn(() => ({ set: mockWebhookOrderSet })),
        };
      }),
    },
  };
  mockUsersGet.mockResolvedValue({ docs: [userDoc] });
  mockConnectionsGet.mockResolvedValue(
    connectionFound
      ? { empty: false, docs: [{ id: "conn-1", data: () => ({ name: "My Shop" }) }] }
      : { empty: true, docs: [] }
  );
  mockWebhookOrderSet.mockResolvedValue(undefined);
  mockGetAdminDB.mockResolvedValue({
    collection: vi.fn(() => ({ get: mockUsersGet })),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env = { ...originalEnv, SHOPIFY_WEBHOOK_SECRET: WEBHOOK_SECRET };
  wireDb();
});

afterEach(() => {
  process.env = originalEnv;
});
describe("/api/webhooks/shopify", () => {
  describe("POST", () => {
    it("returns 501 when SHOPIFY_WEBHOOK_SECRET is not configured", async () => {
      delete process.env.SHOPIFY_WEBHOOK_SECRET;
      const { POST } = await import("./route");
      const body = JSON.stringify({ id: 1 });
      const req = makeShopifyWebhookRequest(body, {
        "x-shopify-topic": "orders/create",
        "x-shopify-shop-domain": "test.myshopify.com",
        "x-shopify-hmac-sha256": sign(body),
      });
      const response = await POST(req);
      expect(response.status).toBe(501);
    });

    it("returns 401 when HMAC verification fails", async () => {
      const { POST } = await import("./route");
      const body = JSON.stringify({ id: 1 });
      const req = makeShopifyWebhookRequest(body, {
        "x-shopify-topic": "orders/create",
        "x-shopify-shop-domain": "test.myshopify.com",
        "x-shopify-hmac-sha256": "bad_hmac",
      });
      const response = await POST(req);
      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Invalid HMAC");
    });

    it("accepts a validly signed webhook for an unknown topic without touching the database", async () => {
      const { POST } = await import("./route");
      const body = JSON.stringify({ id: 1 });
      const req = makeShopifyWebhookRequest(body, {
        "x-shopify-topic": "unknown/topic",
        "x-shopify-shop-domain": "test.myshopify.com",
        "x-shopify-hmac-sha256": sign(body),
      });
      const response = await POST(req);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.received).toBe(true);
      expect(mockUsersGet).not.toHaveBeenCalled();
      expect(mockWebhookOrderSet).not.toHaveBeenCalled();
    });

    it("processes orders/create and writes the webhookOrders doc", async () => {
      const { POST } = await import("./route");
      const body = JSON.stringify({
        id: 1001,
        order_number: 1001,
        email: "john@example.com",
        total_price: "59.98",
        currency: "USD",
        financial_status: "paid",
        fulfillment_status: null,
        created_at: "2024-01-01T00:00:00Z",
        shipping_address: { first_name: "John", last_name: "Doe" },
        line_items: [
          { product_id: 111, title: "Earbuds", quantity: 2, price: "29.99" },
        ],
      });
      const req = makeShopifyWebhookRequest(body, {
        "x-shopify-topic": "orders/create",
        "x-shopify-shop-domain": "test.myshopify.com",
        "x-shopify-hmac-sha256": sign(body),
      });
      const response = await POST(req);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.received).toBe(true);

      expect(mockWebhookOrderSet).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: "1001",
          customerEmail: "john@example.com",
          totalAmount: 59.98,
          status: "paid",
          fulfillmentStatus: "unfulfilled",
          storeId: "conn-1",
          storePlatform: "shopify",
        })
      );
      expect(mockBroadcast).toHaveBeenCalledWith(
        "user-abc",
        "order_updated",
        expect.objectContaining({ orderId: "1001", shopDomain: "test.myshopify.com" })
      );
    });

    it("skips users without a matching shopify store connection", async () => {
      wireDb({ connectionFound: false });
      const { POST } = await import("./route");
      const body = JSON.stringify({ id: 1001 });
      const req = makeShopifyWebhookRequest(body, {
        "x-shopify-topic": "orders/create",
        "x-shopify-shop-domain": "other-store.myshopify.com",
        "x-shopify-hmac-sha256": sign(body),
      });
      const response = await POST(req);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockWebhookOrderSet).not.toHaveBeenCalled();
      expect(mockBroadcast).not.toHaveBeenCalled();
    });

    it("processes products/update and broadcasts inventory update", async () => {
      const { POST } = await import("./route");
      const body = JSON.stringify({ id: 2001, title: "Nice Widget" });
      const req = makeShopifyWebhookRequest(body, {
        "x-shopify-topic": "products/update",
        "x-shopify-shop-domain": "test.myshopify.com",
        "x-shopify-hmac-sha256": sign(body),
      });
      const response = await POST(req);
      const data = await response.json();
      expect(response.status).toBe(200);
      expect(data.received).toBe(true);
      expect(mockWebhookOrderSet).not.toHaveBeenCalled();
      expect(mockBroadcast).toHaveBeenCalledWith(
        "user-abc",
        "inventory_updated",
        expect.objectContaining({ productId: "2001", shopDomain: "test.myshopify.com" })
      );
    });

    it("returns 500 when the database read throws", async () => {
      mockUsersGet.mockRejectedValue(new Error("DB write failed"));
      const { POST } = await import("./route");
      const body = JSON.stringify({ id: 1 });
      const req = makeShopifyWebhookRequest(body, {
        "x-shopify-topic": "orders/create",
        "x-shopify-shop-domain": "test.myshopify.com",
        "x-shopify-hmac-sha256": sign(body),
      });
      const response = await POST(req);
      expect(response.status).toBe(500);
    });
  });
});