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

describe("POST /api/ai/integrations", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns integration statuses including stores, AI, Firebase, and email", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockImplementation((name: string) => {
              const data: Record<string, any[]> = {
                storeConnections: [{ id: "s1", name: "My Store", platform: "Shopify", status: "connected" }],
                pushedProducts: [{ storeId: "s1", status: "live", pushedAt: "2026-09-01" }],
              };
              return buildQueryChain(data[name] || []);
            }),
            get: vi.fn().mockResolvedValue({ data: () => ({ notifications: true }) }),
          }),
        }),
      }),
    }));

    const { POST } = await import("./route");
    const req = {} as any;
    const res = await POST(req);
    const body = await res.json();
    expect(body.integrations).toBeDefined();
    expect(body.integrations.length).toBeGreaterThanOrEqual(4);
    expect(body.summary).toBeDefined();
    expect(body.insights).toBeDefined();
  });

  it("reports disconnected store with low health score", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockImplementation((name: string) => {
              const data: Record<string, any[]> = {
                storeConnections: [{ id: "s1", name: "Bad Store", platform: "WooCommerce", status: "disconnected" }],
                pushedProducts: [],
              };
              return buildQueryChain(data[name] || []);
            }),
            get: vi.fn().mockResolvedValue({ data: () => ({}) }),
          }),
        }),
      }),
    }));

    const { POST } = await import("./route");
    const req = {} as any;
    const res = await POST(req);
    const body = await res.json();
    const store = body.integrations.find((i: any) => i.type === "store");
    expect(store).toBeDefined();
    expect(store.status).toBe("error");
  });

  it("returns 500 on Firestore error", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockRejectedValue(new Error("DB error")),
    }));

    const { POST } = await import("./route");
    const req = {} as any;
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
