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

function buildMockDb(collectionMap: Record<string, any[]>) {
  const userDoc: any = {};
  userDoc.collection = vi.fn().mockImplementation((name: string) => {
    const chain = buildQueryChain(collectionMap[name] || []);
    chain.add = vi.fn().mockResolvedValue({ id: "new-doc-1" });
    return chain;
  });
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(userDoc),
    }),
  };
}

describe("GET /api/profit/engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("returns empty summary when no profit entries exist", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/profit/engine?days=30");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.summary).toBeDefined();
    expect(json.summary.totalRevenue).toBe(0);
    expect(json.summary.totalOrders).toBe(0);
  });

  it("calculates summary from profit entries", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(
        buildMockDb({
          profitEntries: [
            { revenue: 100, cogs: 30, shippingCost: 5, platformFee: 10, paymentProcessing: 3, netProfit: 52, productTitle: "Widget", platform: "Shopify", date: "2025-01-01" },
          ],
          expenses: [{ amount: 20, category: "adSpend" }],
        })
      ),
    }));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/profit/engine?days=30");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.summary.totalOrders).toBe(1);
    expect(json.summary.expenses.adSpend).toBe(20);
  });
});

describe("POST /api/profit/engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("adds a profit entry", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/profit/engine", {
      method: "POST",
      body: JSON.stringify({ action: "addEntry", productTitle: "Gadget", revenue: 80, cogs: 25 }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.netProfit).toBe(55);
  });

  it("returns 400 for invalid action", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(buildMockDb({})),
    }));

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/profit/engine", {
      method: "POST",
      body: JSON.stringify({ action: "invalidAction" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid action");
  });
});
