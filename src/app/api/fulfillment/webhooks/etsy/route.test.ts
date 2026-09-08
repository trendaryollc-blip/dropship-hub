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

function makeEtsyRequest(body: string, headers: Record<string, string>) {
  return new Request("http://localhost/api/fulfillment/webhooks/etsy", {
    method: "POST",
    body,
    headers,
  }) as any;
}

describe("Etsy Webhook POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns skipped when topic doesn't include receipt", async () => {
    const req = makeEtsyRequest(JSON.stringify({}), {
      "x-etsy-topic": "listing/updated",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json).toEqual({ received: true, skipped: true });
    expect(getAdminDB).not.toHaveBeenCalled();
  });

  it("returns 404 when no store found", async () => {
    const mockDb = buildMockDb({ storesSnap: { empty: true, docs: [] } });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const req = makeEtsyRequest(JSON.stringify({ receipt_id: 999, transactions: [] }), {
      "x-etsy-topic": "receipt/paid",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json).toEqual({ error: "No connected store found" });
  });

  it("processes receipt and returns received", async () => {
    const storeDoc = {
      ref: { parent: { parent: { id: "user-1" } } },
    };
    const mockDb = buildMockDb({
      storesSnap: { empty: false, docs: [storeDoc] },
      existingOrder: { empty: true, docs: [] },
      supplierDoc: { exists: false, data: () => ({}) },
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const receiptBody = {
      receipt_id: 5551,
      buyer_email: "etsybuyer@test.com",
      create_timestamp: 1735689600,
      grandtotal: { amount: "3500" },
      address: {
        first_name: "Jane",
        last_name: "Smith",
        phone: "555-5678",
        line1: "456 Oak Ave",
        city: "Portland",
        state: "OR",
        zip: "97201",
        country_id: 209,
      },
      transactions: [
        {
          product_id: "etsy-prod-1",
          title: "Etsy Item",
          price: { amount: "3500" },
          quantity: 1,
        },
      ],
    };

    const req = makeEtsyRequest(JSON.stringify(receiptBody), {
      "x-etsy-topic": "receipt/paid",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(json).toEqual({ received: true, receiptId: "5551" });
    expect(mockDb.collectionGroup).toHaveBeenCalledWith("storeConnections");
    expect(mockDb.collection).toHaveBeenCalledWith("users");
  });
});
