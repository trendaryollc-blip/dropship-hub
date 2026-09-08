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

describe("/api/ai/pricing", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("POST returns pricing suggestions from profit/cost data", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          profitEntries: [
            { productTitle: "Smart Widget", revenue: 39.99, profitMargin: 12 },
            { productTitle: "Smart Widget", revenue: 42.00, profitMargin: 14 },
            { productTitle: "Pro Gadget", revenue: 89.99, profitMargin: 55 },
            { productTitle: "Basic Tool", revenue: 19.99, profitMargin: 30 },
          ],
          costProfiles: [
            { productTitle: "Smart Widget", cogs: 25 },
          ],
          productLifecycle: [
            { productTitle: "Smart Widget", profitMargin: 13 },
          ],
        })
      ),
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/pricing", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.suggestions).toBeDefined();
    expect(data.suggestions.length).toBeGreaterThan(0);
    expect(data.summary).toBeDefined();
    expect(data.summary.totalProducts).toBeGreaterThan(0);
    expect(data.generatedAt).toBeDefined();
  });

  it("POST returns 500 on Firestore error", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockRejectedValue(new Error("DB connection failed")),
    }));

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/ai/pricing", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe("Failed to generate price suggestions");
  });
});
