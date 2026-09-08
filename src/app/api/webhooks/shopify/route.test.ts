import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalEnv = { ...process.env };

const mockVerifyShopifyWebhook = vi.fn();
const mockProcessIncomingWebhook = vi.fn();
const mockGetAdminDB = vi.fn();

vi.mock("@/lib/shopify/webhooks", () => ({
  verifyShopifyWebhook: mockVerifyShopifyWebhook,
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: mockGetAdminDB,
}));

vi.mock("@/lib/webhooks/incoming", () => ({
  processIncomingWebhook: mockProcessIncomingWebhook,
}));

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

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env = { ...originalEnv, SHOPIFY_WEBHOOK_SECRET: "webhook_secret_123" };
  mockVerifyShopifyWebhook.mockReturnValue(true);
  mockProcessIncomingWebhook.mockResolvedValue({ id: "wh-1", status: "processed" });
  mockGetAdminDB.mockResolvedValue({
    collectionGroup: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({
                empty: false,
                docs: [{
                  ref: { parent: { parent: { id: "user-abc" } } },
                }],
              }),
            }),
          }),
        }),
      }),
    }),
  });
});

afterEach(() => {
  process.env = originalEnv;
});

describe("/api/webhooks/shopify", () => {
  describe("GET", () => {
    it("returns status ok with topics list", async () => {
      const { GET } = await import("./route");
      const response = await GET();
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("ok");
      expect(data.topics).toContain("orders/create");
      expect(data.topics).toContain("products/update");
    });
  });

  describe("POST", () => {
    it("returns 400 when shop domain is missing", async () => {
      const { POST } = await import("./route");
      const body = JSON.stringify({ id: 1 });
      const req = makeShopifyWebhookRequest(body, {
        "x-shopify-topic": "orders/create",
      });
      const response = await POST(req);
      expect(response.status).toBe(400);
    });

    it("returns 401 when HMAC verification fails", async () => {
      mockVerifyShopifyWebhook.mockReturnValue(false);
      const { POST } = await import("./route");
      const body = JSON.stringify({ id: 1 });
      const req = makeShopifyWebhookRequest(body, {
        "x-shopify-topic": "orders/create",
        "x-shopify-shop-domain": "test.myshopify.com",
        "x-shopify-hmac-sha256": "bad_hmac",
      });
      const response = await POST(req);
      expect(response.status).toBe(401);
    });

    it("returns 200 skipped for unknown topic", async () => {
      const { POST } = await import("./route");
      const body = JSON.stringify({ id: 1 });
      const req = makeShopifyWebhookRequest(body, {
        "x-shopify-topic": "unknown/topic",
        "x-shopify-shop-domain": "test.myshopify.com",
      });
      const response = await POST(req);
      const data = await response.json();
      expect(data.received).toBe(true);
      expect(data.skipped).toBe(true);
    });

    it("returns 404 when store is not connected", async () => {
      mockGetAdminDB.mockResolvedValue({
        collectionGroup: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
                }),
              }),
            }),
          }),
        }),
      });

      const { POST } = await import("./route");
      const body = JSON.stringify({ id: 1 });
      const req = makeShopifyWebhookRequest(body, {
        "x-shopify-topic": "orders/create",
        "x-shopify-shop-domain": "disconnected.myshopify.com",
      });
      const response = await POST(req);
      expect(response.status).toBe(404);
    });

    it("processes order webhook successfully", async () => {
      const orderBody = JSON.stringify({
        id: 1001,
        order_number: 101,
        total_price: "49.99",
        currency: "USD",
        financial_status: "paid",
        fulfillment_status: "fulfilled",
        customer: { first_name: "John", last_name: "Doe", email: "john@test.com" },
        shipping_address: { address1: "123 Main St", city: "NYC", province_code: "NY", zip: "10001", country_code: "US" },
        line_items: [{ product_id: "p1", title: "Test Product", price: "49.99", quantity: 1 }],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });

      const { POST } = await import("./route");
      const req = makeShopifyWebhookRequest(orderBody, {
        "x-shopify-topic": "orders/create",
        "x-shopify-shop-domain": "test.myshopify.com",
      });
      const response = await POST(req);
      const data = await response.json();
      expect(data.received).toBe(true);
      expect(mockProcessIncomingWebhook).toHaveBeenCalledWith(expect.objectContaining({
        source: "shopify",
        event: "order.created",
      }));
    });

    it("processes product webhook successfully", async () => {
      const productBody = JSON.stringify({
        id: 2001,
        title: "New Product",
        body_html: "<p>Description</p>",
        vendor: "Test Vendor",
        product_type: "Shirt",
        status: "active",
        tags: ["sale", "new"],
        images: [{ src: "https://cdn.example.com/img.jpg", alt: "Product" }],
        variants: [{ id: "v1", title: "Large", price: "29.99", sku: "SKU-1", inventory_quantity: 10 }],
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      });

      const { POST } = await import("./route");
      const req = makeShopifyWebhookRequest(productBody, {
        "x-shopify-topic": "products/update",
        "x-shopify-shop-domain": "test.myshopify.com",
      });
      const response = await POST(req);
      const data = await response.json();
      expect(data.received).toBe(true);
      expect(mockProcessIncomingWebhook).toHaveBeenCalledWith(expect.objectContaining({
        event: "product.updated",
      }));
    });

    it("processes inventory webhook successfully", async () => {
      const inventoryBody = JSON.stringify({
        inventory_item_id: 3001,
        location_id: 4001,
        available: 25,
      });

      const { POST } = await import("./route");
      const req = makeShopifyWebhookRequest(inventoryBody, {
        "x-shopify-topic": "inventory_levels/update",
        "x-shopify-shop-domain": "test.myshopify.com",
      });
      const response = await POST(req);
      const data = await response.json();
      expect(data.received).toBe(true);
      expect(mockProcessIncomingWebhook).toHaveBeenCalledWith(expect.objectContaining({
        event: "inventory.updated",
      }));
    });

    it("processes refund webhook successfully", async () => {
      const refundBody = JSON.stringify({
        id: 5001,
        order: { id: 1001 },
        amount: "10.00",
        reason: "Customer changed mind",
        created_at: "2024-01-01T00:00:00Z",
      });

      const { POST } = await import("./route");
      const req = makeShopifyWebhookRequest(refundBody, {
        "x-shopify-topic": "refunds/create",
        "x-shopify-shop-domain": "test.myshopify.com",
      });
      const response = await POST(req);
      const data = await response.json();
      expect(data.received).toBe(true);
      expect(mockProcessIncomingWebhook).toHaveBeenCalledWith(expect.objectContaining({
        event: "refund.created",
      }));
    });

    it("returns 500 when processing throws", async () => {
      mockProcessIncomingWebhook.mockRejectedValue(new Error("DB write failed"));

      const { POST } = await import("./route");
      const req = makeShopifyWebhookRequest(JSON.stringify({ id: 1 }), {
        "x-shopify-topic": "orders/create",
        "x-shopify-shop-domain": "test.myshopify.com",
      });
      const response = await POST(req);
      expect(response.status).toBe(500);
    });

    it("returns 500 when uid cannot be determined", async () => {
      mockGetAdminDB.mockResolvedValue({
        collectionGroup: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({
                    empty: false,
                    docs: [{
                      ref: { parent: { parent: null } },
                    }],
                  }),
                }),
              }),
            }),
          }),
        }),
      });

      const { POST } = await import("./route");
      const req = makeShopifyWebhookRequest(JSON.stringify({ id: 1 }), {
        "x-shopify-topic": "orders/create",
        "x-shopify-shop-domain": "test.myshopify.com",
      });
      const response = await POST(req);
      expect(response.status).toBe(500);
    });
  });
});
