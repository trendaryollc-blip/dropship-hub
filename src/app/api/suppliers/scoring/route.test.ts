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

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d }));
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
  return { collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }) };
}

describe("GET /api/suppliers/scoring", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns suppliers with scores", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        fulfillmentOrders: [
          { id: "o1", selectedSupplier: "supplier-A", status: "delivered", shippingDays: 10, createdAt: "2025-01-01" },
          { id: "o2", selectedSupplier: "supplier-A", status: "delivered", shippingDays: 12, createdAt: "2025-01-02" },
        ],
        sampleOrders: [],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/scoring");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.suppliers).toBeDefined();
    expect(json.suppliers).toHaveLength(1);
    expect(json.suppliers[0].supplierId).toBe("supplier-A");
    expect(json.suppliers[0].totalOrders).toBe(2);
    expect(json.suppliers[0].overallReliability).toBeGreaterThan(0);
    expect(json.suppliers[0].grade).toBeDefined();
  });

  it("returns empty message when no orders", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        fulfillmentOrders: [],
        sampleOrders: [],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/scoring");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.suppliers).toEqual([]);
    expect(json.message).toContain("No order data yet");
  });

  it("handles multiple suppliers with comparisons", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        fulfillmentOrders: [
          { id: "o1", selectedSupplier: "supplier-A", status: "delivered", shippingDays: 8, createdAt: "2025-01-01" },
          { id: "o2", selectedSupplier: "supplier-B", status: "delivered", shippingDays: 15, createdAt: "2025-01-02" },
        ],
        sampleOrders: [],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/scoring");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.suppliers).toHaveLength(2);
    expect(json.suppliers[0].comparedTo.length).toBeGreaterThan(0);
    expect(json.suppliers[1].comparedTo.length).toBeGreaterThan(0);
  });
});
