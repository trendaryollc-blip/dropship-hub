import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, { uid: "test-user-123" });
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          add: vi.fn().mockResolvedValue({ id: "new-doc-id" }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }),
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ docs: [] }),
              }),
            }),
          }),
        }),
      }),
    }),
  }),
}));

function mockDb(docs: Array<Record<string, unknown>>) {
  const rows = docs.map((d) => ({ id: String(d.id), data: () => d }));
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: rows }),
            }),
          }),
        }),
      }),
    }),
  };
}

describe("/api/profit", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("GET returns profit entries", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/profit");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("marks averages as untracked when there are no orders", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    vi.mocked(getAdminDB).mockResolvedValue(mockDb([]) as never);
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/profit") as any);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.summary.profitMargin).toBeNull();
    expect(data.summary.avgOrderValue).toBeNull();
    expect(data.summary.avgOrderProfit).toBeNull();
    expect(data.summary.avgMargin).toBe(0);
  });

  it("computes product trend from the prior period and leaves it null without prior data", async () => {
    const now = Date.now();
    const day = (offset: number) => new Date(now - offset * 86400000).toISOString().split("T")[0];
    const { getAdminDB } = await import("@/lib/firebase-admin");
    vi.mocked(getAdminDB).mockResolvedValue(mockDb([
      { id: "cur-widget", date: day(2), productTitle: "Widget", revenue: 200, netProfit: 40, status: "completed" },
      { id: "prior-widget", date: day(40), productTitle: "Widget", revenue: 100, netProfit: 10, status: "completed" },
      { id: "cur-gadget", date: day(1), productTitle: "Gadget", revenue: 50, netProfit: 5, status: "completed" },
    ]) as never);
    const { GET } = await import("./route");
    const response = await GET(new Request("http://localhost/api/profit?timeframe=30d") as any);
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.summary.profitMargin).toBeCloseTo(18, 1);
    expect(data.summary.avgOrderValue).toBe(125);
    expect(data.summary.avgOrderProfit).toBe(22.5);
    const widget = data.topProducts.find((p: any) => p.productTitle === "Widget");
    const gadget = data.topProducts.find((p: any) => p.productTitle === "Gadget");
    expect(widget.trend).toBe(100);
    expect(gadget.trend).toBeNull();
  });
});
