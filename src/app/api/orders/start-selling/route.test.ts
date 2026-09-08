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

import { POST } from "./route";

function makeReq(body: any) {
  return { json: async () => body } as any;
}

const baseBody = {
  productTitle: "Test Product",
  productImage: "https://img.test/img.jpg",
  productPrice: 29.99,
  productUrl: "https://product.test",
  productDescription: "A test product",
  storeId: "store-1",
};

describe("POST /api/orders/start-selling", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("returns 400 when productTitle or storeId missing", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ exists: true, data: () => ({ platform: "shopify", name: "Store" }) }),
              }),
            }),
          }),
        }),
      }),
    }));
    const { POST } = await import("./route");
    const res = await POST(makeReq({ productTitle: "X" }), null as any);
    expect(res.status).toBe(400);
  });

  it("returns 404 when store not found", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ exists: false }),
              }),
            }),
          }),
        }),
      }),
    }));
    const { POST } = await import("./route");
    const res = await POST(makeReq(baseBody), null as any);
    expect(res.status).toBe(404);
  });

  it("pushes product to shopify store", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ product: { id: 999 } }),
    });
    global.fetch = fetchMock;

    const addMock = vi.fn().mockResolvedValue({ id: "pushed-1" });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const getMock = vi.fn().mockResolvedValue({
      exists: true,
      data: () => ({ platform: "shopify", storeDomain: "my-store.myshopify.com", accessToken: "tok123", name: "My Store" }),
    });

    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockImplementation((name: string) => {
              if (name === "storeConnections") {
                return { doc: vi.fn().mockReturnValue({ get: getMock, update: updateMock }) };
              }
              if (name === "pushedProducts") {
                return { add: addMock };
              }
              if (name === "fulfillmentOrders") {
                return { add: vi.fn().mockResolvedValue({ id: "ful-1" }) };
              }
              return { add: vi.fn() };
            }),
          }),
        }),
      }),
    }));
    const { POST } = await import("./route");
    const res = await POST(makeReq(baseBody), null as any);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.pushedProduct).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("my-store.myshopify.com"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("returns 400 when unsupported platform", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({
                  exists: true,
                  data: () => ({ platform: "etsy", name: "Etsy Store" }),
                }),
              }),
            }),
          }),
        }),
      }),
    }));
    const { POST } = await import("./route");
    const res = await POST(makeReq(baseBody), null as any);
    expect(res.status).toBe(400);
  });
});
