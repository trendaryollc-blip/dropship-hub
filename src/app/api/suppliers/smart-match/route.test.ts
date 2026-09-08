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

describe("POST /api/suppliers/smart-match", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns match results", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    const setMock = vi.fn().mockResolvedValue(undefined);
    const docMock = vi.fn().mockReturnValue({ id: "match-1", set: setMock });
    const colGroupMock = vi.fn().mockReturnValue(buildQueryChain([]));
    const userDoc: any = {};
    userDoc.collection = vi.fn().mockReturnValue({ doc: docMock });
    (getAdminDB as any).mockResolvedValue({
      collectionGroup: colGroupMock,
      collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }),
    });

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/smart-match", {
      method: "POST",
      body: JSON.stringify({
        niche: "Fashion",
        targetAudience: "Young adults",
        priorities: { speed: 50, price: 70, quality: 80, reliability: 90 },
      }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.result).toBeDefined();
    expect(json.result.recommendations).toBeDefined();
    expect(json.result.portfolioSummary).toBeDefined();
  });

  it("returns 400 for missing fields", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/smart-match", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.error).toContain("Missing");
  });
});
