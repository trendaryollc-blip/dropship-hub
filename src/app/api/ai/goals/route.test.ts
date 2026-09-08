import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: {
    AI: { windowMs: 60000, maxRequests: 30 },
    AI_CHAT: { windowMs: 60000, maxRequests: 30 },
    DEFAULT: { windowMs: 60000, maxRequests: 60 },
  },
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

describe("POST /api/ai/goals", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns goals computed from Firestore data", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockImplementation((name: string) => {
              const data: Record<string, any[]> = {
                revenue: [{ amount: 500, date: "2026-09-01" }],
                productLifecycle: [{ currentStage: "winning" }],
                profitEntries: [{ netProfit: 100, revenue: 500 }],
                csConversations: [{ status: "resolved" }],
              };
              return buildQueryChain(data[name] || []);
            }),
          }),
        }),
      }),
    }));

    const { POST } = await import("./route");
    const req = {} as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.goals).toBeDefined();
    expect(body.goals.length).toBeGreaterThan(0);
    expect(body.summary).toBeDefined();
    expect(body.generatedAt).toBeDefined();
  });

  it("returns empty goals when no data exists", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue(buildQueryChain([])),
          }),
        }),
      }),
    }));

    const { POST } = await import("./route");
    const req = {} as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.goals).toBeDefined();
    expect(body.goals.length).toBe(4);
  });

  it("returns 500 on Firestore error", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockRejectedValue(new Error("DB down")),
    }));

    const { POST } = await import("./route");
    const req = {} as any;
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
