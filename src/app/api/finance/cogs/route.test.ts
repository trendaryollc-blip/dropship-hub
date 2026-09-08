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

vi.mock("@/lib/finance/cogs-tracker", () => ({
  addCOGSEntry: vi.fn((entry: any) => ({ id: "cogs-1", ...entry })),
  getAllCOGSEntries: vi.fn(() => [{ id: "cogs-1", productId: "p1", unitCost: 5.99 }]),
  getCOGSByProduct: vi.fn((id: string) => (id === "p1" ? { id: "cogs-1", productId: "p1", unitCost: 5.99 } : null)),
  updateCOGSEntry: vi.fn((id: string, updates: any) => (id === "cogs-1" ? { id, ...updates } : null)),
  deleteCOGSEntry: vi.fn((id: string) => id === "cogs-1"),
  getCOGSSummary: vi.fn(() => ({ totalProducts: 10, avgCost: 8.5 })),
  bulkUpdateCOGS: vi.fn((entries: any[]) => ({ updated: entries.length })),
}));

import { GET, POST } from "./route";

function makeReq(url: string, body?: any) {
  return { json: async () => body || {}, url } as any;
}

describe("GET /api/finance/cogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all COGS entries by default", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/cogs"), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.entries).toBeDefined();
    expect(data.count).toBe(1);
  });

  it("returns a specific COGS entry by productId", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/cogs?action=get&productId=p1"), null as any);
    const data = await res.json();
    expect(data.entry).toBeDefined();
    expect(data.entry.productId).toBe("p1");
  });

  it("returns 404 for non-existent product", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/cogs?action=get&productId=nonexistent"), null as any);
    expect(res.status).toBe(404);
  });

  it("returns summary when action=summary", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/cogs?action=summary"), null as any);
    const data = await res.json();
    expect(data.summary).toBeDefined();
    expect(data.summary.totalProducts).toBe(10);
  });
});

describe("POST /api/finance/cogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a COGS entry", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/cogs", {
      action: "add",
      entry: { productId: "p2", unitCost: 12.99 },
    }), null as any);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("deletes a COGS entry", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/cogs", {
      action: "delete",
      entryId: "cogs-1",
    }), null as any);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("returns 404 when deleting non-existent entry", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/cogs", {
      action: "delete",
      entryId: "nonexistent",
    }), null as any);
    expect(res.status).toBe(404);
  });

  it("bulk updates COGS entries", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/cogs", {
      action: "bulk_update",
      entries: [{ id: "cogs-1", unitCost: 7.99 }],
    }), null as any);
    const data = await res.json();
    expect(data.result.updated).toBe(1);
  });
});
