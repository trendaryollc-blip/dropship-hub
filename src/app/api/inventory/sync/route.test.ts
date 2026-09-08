import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { FULFILLMENT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

vi.mock("@/lib/monitoring/retry", () => ({
  withRetry: vi.fn((fn: any) => fn()),
}));

vi.mock("@/lib/monitoring/delister", () => ({
  autoDelistProduct: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/monitoring/price-history", () => ({
  appendPriceSnapshot: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/monitoring/notification-dispatcher", () => ({
  dispatchNotifications: vi.fn().mockResolvedValue(undefined),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d, ref: { update: vi.fn() } }));
}

function buildQueryChain(docs: any[]) {
  return {
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}

function buildMockDb(collectionMap: Record<string, any[]>) {
  const userDoc: any = {};
  userDoc.collection = vi.fn().mockImplementation((name: string) => buildQueryChain(collectionMap[name] || []));
  return {
    collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }),
    batch: vi.fn(() => ({ update: vi.fn(), commit: vi.fn().mockResolvedValue(undefined) })),
  };
}

describe("GET /api/inventory/sync", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns product status counts", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        monitoredProducts: [
          { id: "p1", productTitle: "Widget", stockStatus: "in_stock", currentPrice: 10, lastChecked: "2025-01-01" },
          { id: "p2", productTitle: "Gadget", stockStatus: "out_of_stock", currentPrice: 20, lastChecked: "2025-01-01" },
          { id: "p3", productTitle: "Thingy", stockStatus: "unknown", currentPrice: 5, lastChecked: "2025-01-01" },
        ],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/inventory/sync");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.total).toBe(3);
    expect(json.inStock).toBe(1);
    expect(json.outOfStock).toBe(1);
    expect(json.unknown).toBe(1);
    expect(json.products).toHaveLength(3);
  });

  it("returns empty when no products", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(buildMockDb({}));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/inventory/sync");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.total).toBe(0);
    expect(json.products).toEqual([]);
  });
});
