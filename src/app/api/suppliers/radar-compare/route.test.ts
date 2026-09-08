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
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}

describe("GET /api/suppliers/radar-compare", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns comparison with suppliers", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue({
      collectionGroup: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          docs: [
            { id: "sup1", data: () => ({ supplierId: "sup1", supplierName: "Alpha", reliabilityScore: 90, refundRate: 2, avgShippingDays: 7, totalOrders: 50 }) },
            { id: "sup2", data: () => ({ supplierId: "sup2", supplierName: "Beta", reliabilityScore: 75, refundRate: 5, avgShippingDays: 12, totalOrders: 30 }) },
          ],
        }),
      }),
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnThis(),
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({
              docs: [
                { data: () => ({ supplierId: "sup1", supplierName: "Alpha", reliabilityScore: 90 }) },
                { data: () => ({ supplierId: "sup2", supplierName: "Beta", reliabilityScore: 75 }) },
              ],
            }),
          }),
        }),
      }),
    });

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/radar-compare?ids=sup1,sup2");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.comparison).toBeDefined();
    expect(json.comparison.insights).toBeDefined();
  });

  it("returns empty comparison when no ids", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/radar-compare");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.comparison.suppliers).toEqual([]);
  });
});
