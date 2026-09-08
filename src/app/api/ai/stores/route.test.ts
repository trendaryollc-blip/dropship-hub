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

describe("POST /api/ai/stores", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns empty result when no stores connected", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockImplementation((name: string) => {
              const data: Record<string, any[]> = {
                storeConnections: [],
                pushedProducts: [],
                revenue: [],
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
    expect(body.stores).toEqual([]);
    expect(body.insights[0]).toContain("No stores connected");
  });

  it("returns store performance with health scores", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockImplementation((name: string) => {
              const data: Record<string, any[]> = {
                storeConnections: [
                  { id: "s1", name: "Shop Store", platform: "Shopify", status: "connected" },
                ],
                pushedProducts: [
                  { storeId: "s1", status: "live", pushedAt: "2026-09-01" },
                  { storeId: "s1", status: "error", pushedAt: "2026-09-01" },
                ],
                revenue: [{ platform: "Shopify", amount: 500, orders: 5 }],
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
    expect(body.stores.length).toBe(1);
    expect(body.stores[0].healthScore).toBeGreaterThan(0);
    expect(body.comparison).toBeDefined();
  });

  it("returns 500 on Firestore error", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockRejectedValue(new Error("Connection refused")),
    }));

    const { POST } = await import("./route");
    const req = {} as any;
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
