import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

import { POST } from "./route";
import { getAdminDB } from "@/lib/firebase-admin";

function buildMockDb(options: { storesSnap?: any; existingOrder?: any; supplierDoc?: any }) {
  const storesSnap = options.storesSnap || { empty: true, docs: [] };
  const existingOrderSnap = options.existingOrder || { empty: true, docs: [] };
  const supplierDoc = options.supplierDoc || { exists: false, data: () => ({}) };

  const fulfillmentOrdersCol: any = {
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue(existingOrderSnap),
    add: vi.fn().mockResolvedValue({ id: "order-1" }),
  };

  const productSuppliersDoc: any = {
    get: vi.fn().mockResolvedValue(supplierDoc),
  };

  const userDoc: any = {};
  userDoc.collection = vi.fn().mockImplementation((name: string) => {
    if (name === "fulfillmentOrders") return fulfillmentOrdersCol;
    if (name === "productSuppliers") return { doc: vi.fn().mockReturnValue(productSuppliersDoc) };
    return { add: vi.fn().mockResolvedValue({ id: "doc-1" }) };
  });

  return {
    collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }),
    collectionGroup: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(storesSnap),
    }),
  };
}

function makeShopifyRequest(body: string, headers: Record<string, string>) {
  return new Request("http://localhost/api/fulfillment/webhooks/shopify", {
    method: "POST",
    body,
    headers,
  }) as any;
}

describe("Shopify Webhook POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns skipped when topic is not orders/create", async () => {
    const req = makeShopifyRequest(JSON.stringify({ id: 1 }), {
      "x-shopify-topic": "orders/updated",
      "x-shopify-shop-domain": "test.myshopify.com",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json).toEqual({ received: true, skipped: true });
    expect(getAdminDB).not.toHaveBeenCalled();
  });

  it("returns 404 when no store found", async () => {
    const mockDb = buildMockDb({ storesSnap: { empty: true, docs: [] } });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const req = makeShopifyRequest(JSON.stringify({ id: 1, line_items: [] }), {
      "x-shopify-topic": "orders/create",
      "x-shopify-shop-domain": "unknown.myshopify.com",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({ error: "No connected store found" });
  });

  it("processes order and returns received", async () => {
    const storeDoc = {
      ref: { parent: { parent: { id: "user-1" } } },
    };
    const mockDb = buildMockDb({
      storesSnap: { empty: false, docs: [storeDoc] },
      existingOrder: { empty: true, docs: [] },
      supplierDoc: { exists: false, data: () => ({}) },
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const orderBody = {
      id: 1001,
      order_number: "1001",
      total_price: "29.99",
      email: "buyer@test.com",
      created_at: "2026-01-01T00:00:00Z",
      customer: { first_name: "John", last_name: "Doe", email: "buyer@test.com" },
      shipping_address: {
        first_name: "John",
        last_name: "Doe",
        phone: "555-1234",
        address1: "123 Main St",
        city: "Austin",
        province_code: "TX",
        zip: "78701",
        country_code: "US",
      },
      line_items: [
        {
          product_id: "prod-1",
          title: "Test Product",
          price: "29.99",
          quantity: 1,
          sku: "SKU-1",
        },
      ],
    };

    const req = makeShopifyRequest(JSON.stringify(orderBody), {
      "x-shopify-topic": "orders/create",
      "x-shopify-shop-domain": "test.myshopify.com",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json).toEqual({ received: true, orderId: 1001 });
    expect(mockDb.collectionGroup).toHaveBeenCalledWith("storeConnections");
    expect(mockDb.collection).toHaveBeenCalledWith("users");
  });

  it("returns duplicate when order already exists", async () => {
    const storeDoc = {
      ref: { parent: { parent: { id: "user-1" } } },
    };
    const existingOrder = {
      empty: false,
      docs: [{ id: "existing-order-1", data: () => ({ storeOrderId: "1001" }) }],
    };
    const mockDb = buildMockDb({
      storesSnap: { empty: false, docs: [storeDoc] },
      existingOrder,
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const orderBody = {
      id: 1001,
      line_items: [],
      total_price: "0",
      customer: {},
      shipping_address: {},
    };

    const req = makeShopifyRequest(JSON.stringify(orderBody), {
      "x-shopify-topic": "orders/create",
      "x-shopify-shop-domain": "test.myshopify.com",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json).toEqual({ received: true, duplicate: true });
  });
});
