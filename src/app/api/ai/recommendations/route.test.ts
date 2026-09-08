import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { AI_CHAT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/utils-helpers", () => ({
  safeNum: (v: unknown, fallback = 0) => (typeof v === "number" ? v : fallback),
  safeStr: (v: unknown, fallback = "") => (typeof v === "string" ? v : fallback),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ data: () => d }));
}

function buildQueryChain(docs: any[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs) }),
  };
}

function buildMockDb(collectionMap: Record<string, any[]>) {
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockImplementation((name: string) => {
          return buildQueryChain(collectionMap[name] || []);
        }),
      }),
    }),
  };
}

describe("/api/ai/recommendations", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("POST returns product recommendations", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          productLifecycle: [
            { productTitle: "Smart Health Device", profitMargin: 65 },
            { productTitle: "Kitchen Gadget", profitMargin: 40 },
          ],
          searchHistory: [
            { query: "fitness accessories", createdAt: "2026-09-01T00:00:00.000Z" },
            { query: "kitchen gadgets", createdAt: "2026-09-01T00:00:00.000Z" },
          ],
          favorites: [
            { title: "Smart Widget" },
          ],
        })
      ),
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/recommendations", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.recommendations).toBeDefined();
    expect(data.recommendations.length).toBeGreaterThan(0);
    expect(data.recommendations.length).toBeLessThanOrEqual(8);
    expect(data.userProfile).toBeDefined();
    expect(data.userProfile.productCount).toBe(2);
    expect(data.generatedAt).toBeDefined();

    const first = data.recommendations[0];
    expect(first.matchScore).toBeDefined();
    expect(first.reasoning).toBeDefined();
  });

  it("POST returns 500 on Firestore error", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockRejectedValue(new Error("DB connection failed")),
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/recommendations", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to generate recommendations");
  });
});
