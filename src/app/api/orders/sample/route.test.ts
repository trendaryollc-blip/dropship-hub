import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/fulfillment/cj-adapter", () => ({
  placeCJOrder: vi.fn().mockResolvedValue({ success: true, orderId: "CJ-12345" }),
  getCJOrderStatus: vi.fn().mockResolvedValue({ status: "shipped" }),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d }));
}
function buildQueryChain(docs: any[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}
function buildMockDb(collectionMap: Record<string, any[]>) {
  const userDoc: any = {};
  userDoc.collection = vi.fn().mockImplementation((name: string) => buildQueryChain(collectionMap[name] || []));
  return { collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }) };
}

import { POST, GET } from "./route";
import { placeCJOrder } from "@/lib/fulfillment/cj-adapter";

function makeReq(url: string, body?: any) {
  return { json: async () => body || {}, url } as any;
}

const validShippingAddress = {
  fullName: "John Doe",
  phone: "555-0123",
  street: "123 Main St",
  city: "Anytown",
  state: "CA",
  zipCode: "90210",
  country: "US",
};

describe("POST /api/orders/sample", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns 400 for empty products array", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));
    const { POST } = await import("./route");
    const res = await POST(makeReq("http://localhost/api/orders/sample", { products: [] }), null as any);
    expect(res.status).toBe(400);
  });

  it("places a single sample order", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              add: vi.fn().mockResolvedValue({ id: "sample-1" }),
            }),
          }),
        }),
      }),
    }));
    const { POST } = await import("./route");
    const res = await POST(makeReq("http://localhost/api/orders/sample", {
      productId: "prod-1",
      productTitle: "Test Product",
      productPrice: 25.00,
      source: "cj",
      shippingAddress: validShippingAddress,
    }), null as any);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(placeCJOrder).toHaveBeenCalled();
  });

  it("returns 400 when required fields missing", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));
    const { POST } = await import("./route");
    const res = await POST(makeReq("http://localhost/api/orders/sample", { productId: "p1" }), null as any);
    expect(res.status).toBe(400);
  });
});

describe("GET /api/orders/sample", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns all sample orders", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({ sampleOrders: [{ id: "s1", productTitle: "Sample" }] })
      ),
    }));
    const { GET } = await import("./route");
    const res = await GET(makeReq("http://localhost/api/orders/sample"), null as any);
    const data = await res.json();
    expect(data.orders).toBeDefined();
    expect(data.orders.length).toBe(1);
  });
});
