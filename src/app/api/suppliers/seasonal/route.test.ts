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

describe("GET /api/suppliers/seasonal", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns seasonal insights", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({
              docs: [
                { data: () => ({ supplierId: "sup1", supplierName: "Alpha", reliabilityScore: 85, avgShippingDays: 7, refundRate: 2, totalOrders: 50 }) },
              ],
            }),
          }),
        }),
      }),
    });

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/seasonal");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.insights).toBeDefined();
    expect(json.insights.length).toBeGreaterThan(0);
  });

  it("filters by season", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnThis(),
            limit: vi.fn().mockReturnThis(),
            get: vi.fn().mockResolvedValue({ docs: [] }),
          }),
        }),
      }),
    });

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/seasonal?season=q4");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.insights).toHaveLength(1);
    expect(json.insights[0].season).toBe("q4");
  });
});
