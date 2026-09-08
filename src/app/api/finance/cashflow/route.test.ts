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

vi.mock("@/lib/finance/cashflow-projection", () => ({
  addCashFlowEntry: vi.fn((entry: any) => ({ id: "cf-1", ...entry })),
  getAllCashFlowEntries: vi.fn(() => [{ id: "cf-1", type: "income", amount: 1000 }]),
  getCashFlowEntriesByDateRange: vi.fn(() => [{ id: "cf-2", type: "expense", amount: 200 }]),
  updateCashFlowEntry: vi.fn((id: string, updates: any) => (id === "cf-1" ? { id, ...updates } : null)),
  deleteCashFlowEntry: vi.fn((id: string) => id === "cf-1"),
  generateCashFlowProjection: vi.fn(() => ({ projected: [{ month: "2025-01", amount: 5000 }] })),
  getCashFlowSummary: vi.fn(() => ({ totalIncome: 10000, totalExpense: 5000, net: 5000 })),
  getUpcomingPayments: vi.fn(() => [{ id: "p1", amount: 500, dueDate: "2025-02-01" }]),
  validateCashFlowInput: vi.fn(() => ({ valid: true, errors: [] })),
}));

import { GET, POST } from "./route";

function makeReq(url: string, body?: any) {
  return { json: async () => body || {}, url } as any;
}

describe("GET /api/finance/cashflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all cash flow entries by default", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/cashflow"), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.entries).toBeDefined();
    expect(data.count).toBe(1);
  });

  it("returns summary when action=summary with date range", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/cashflow?action=summary&startDate=2025-01-01&endDate=2025-01-31"), null as any);
    const data = await res.json();
    expect(data.summary).toBeDefined();
    expect(data.summary.totalIncome).toBe(10000);
  });

  it("returns upcoming payments when action=upcoming", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/cashflow?action=upcoming&days=30"), null as any);
    const data = await res.json();
    expect(data.payments).toBeDefined();
    expect(data.payments.length).toBe(1);
  });

  it("returns 400 for invalid action", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/cashflow?action=invalid"), null as any);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/finance/cashflow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a cash flow entry", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/cashflow", {
      action: "add",
      entry: { type: "income", amount: 500, description: "Sale" },
    }), null as any);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.entry.id).toBe("cf-1");
  });

  it("returns 400 when adding without entry data", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/cashflow", { action: "add" }), null as any);
    expect(res.status).toBe(400);
  });

  it("updates a cash flow entry", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/cashflow", {
      action: "update",
      entryId: "cf-1",
      updates: { amount: 750 },
    }), null as any);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("returns 404 when updating non-existent entry", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/cashflow", {
      action: "update",
      entryId: "nonexistent",
      updates: { amount: 750 },
    }), null as any);
    expect(res.status).toBe(404);
  });
});
