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

function makeWooRequest(body: string, headers: Record<string, string>) {
  return new Request("http://localhost/api/fulfillment/webhooks/woocommerce", {
    method: "POST",
    body,
    headers,
  }) as any;
}

describe("WooCommerce Webhook POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns skipped when topic is not order.created", async () => {
    const req = makeWooRequest(JSON.stringify({ id: 1 }), {
      "x-wc-webhook-topic": "order.updated",
      "x-wc-webhook-source": "https://woo.test.com",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json).toEqual({ received: true, skipped: true });
    expect(getAdminDB).not.toHaveBeenCalled();
  });

  it("returns 404 when no store found", async () => {
    const mockDb = buildMockDb({ storesSnap: { empty: true, docs: [] } });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const req = makeWooRequest(JSON.stringify({ id: 1, line_items: [] }), {
      "x-wc-webhook-topic": "order.created",
      "x-wc-webhook-source": "https://unknown-woo.test.com",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({ error: "No connected store found" });
  });

  it("processes order and returns received", async () => {
    const storeDoc = {
      data: () => ({ url: "https://woo.test.com", name: "My Woo Store" }),
      ref: { parent: { parent: { id: "user-1" } } },
    };
    const mockDb = buildMockDb({
      storesSnap: { empty: false, docs: [storeDoc] },
      existingOrder: { empty: true, docs: [] },
      supplierDoc: { exists: false, data: () => ({}) },
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const orderBody = {
      id: 2001,
      number: "2001",
      total: "45.00",
      date_created: "2026-01-01T00:00:00",
      billing: {
        first_name: "Bob",
        last_name: "Jones",
        email: "bob@test.com",
      },
      shipping: {
        first_name: "Bob",
        last_name: "Jones",
        phone: "555-9999",
        address_1: "789 Pine Rd",
        city: "Seattle",
        state: "WA",
        postcode: "98101",
        country: "US",
      },
      line_items: [
        {
          product_id: "woo-prod-1",
          name: "Woo Product",
          price: "45.00",
          quantity: 1,
          sku: "WOO-SKU-1",
        },
      ],
    };

    const req = makeWooRequest(JSON.stringify(orderBody), {
      "x-wc-webhook-topic": "order.created",
      "x-wc-webhook-source": "https://woo.test.com",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json).toEqual({ received: true, orderId: 2001 });
    expect(mockDb.collectionGroup).toHaveBeenCalledWith("storeConnections");
    expect(mockDb.collection).toHaveBeenCalledWith("users");
  });
});
