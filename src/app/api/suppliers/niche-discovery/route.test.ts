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

function buildMockDb(collectionMap: Record<string, any[]>) {
  const userDoc: any = {};
  userDoc.collection = vi.fn().mockImplementation((name: string) => buildQueryChain(collectionMap[name] || []));
  return { collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }) };
}

describe("GET /api/suppliers/niche-discovery", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns niche scores", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        supplierNicheScores: [
          { id: "n1", supplierId: "sup1", nicheScore: 85, saturationLevel: "low", opportunityScore: 90 },
        ],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/niche-discovery");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.scores).toBeDefined();
    expect(json.scores).toHaveLength(1);
  });

  it("returns empty scores when none exist", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({ supplierNicheScores: [] })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/niche-discovery");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.scores).toEqual([]);
  });
});
