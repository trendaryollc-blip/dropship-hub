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

function buildCollectionRef(collectionMap: Record<string, any[]>) {
  return vi.fn().mockImplementation((name: string) => {
    const chain = buildQueryChain(collectionMap[name] || []);
    chain.doc = vi.fn().mockReturnValue({
      get: vi.fn().mockResolvedValue({ exists: false, id: name, data: () => ({}) }),
    });
    return chain;
  });
}

function buildMockDb(collectionMap: Record<string, any[]>) {
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: buildCollectionRef(collectionMap),
      }),
    }),
  };
}

describe("GET /api/suppliers/health-monitor", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns snapshots and alerts for dashboard view", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        supplierHealth: [
          { id: "sup1", supplierId: "sup1", overallHealth: 85, healthTrend: "stable", metrics: {}, prediction: null },
        ],
        supplierHealthAlerts: [
          { id: "alert1", type: "shipping_slowdown", severity: "warning", message: "Test alert" },
        ],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/health-monitor");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.snapshots).toBeDefined();
    expect(json.alerts).toBeDefined();
  });

  it("returns alerts when view=alerts", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        supplierHealthAlerts: [
          { id: "a1", type: "stock_low", severity: "critical", message: "Low stock" },
        ],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/health-monitor?view=alerts");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.alerts).toHaveLength(1);
  });

  it("returns error when getAdminDB fails", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockRejectedValue(new Error("DB connection failed"));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/health-monitor");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.error).toContain("DB connection failed");
  });
});
