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

vi.mock("@/lib/finance/tax-estimator", () => ({
  addTaxRate: vi.fn((rate: any) => ({ id: "tax-1", ...rate })),
  getTaxRatesByCountry: vi.fn(() => [{ id: "tax-1", country: "US", rate: 0.08 }]),
  getTaxRatesByState: vi.fn(() => [{ id: "tax-1", country: "US", state: "CA", rate: 0.0725 }]),
  getAllTaxRates: vi.fn(() => [{ id: "tax-1", country: "US", rate: 0.08 }]),
  updateTaxRate: vi.fn((id: string, updates: any) => (id === "tax-1" ? { id, ...updates } : null)),
  deleteTaxRate: vi.fn((id: string) => id === "tax-1"),
  calculateTax: vi.fn(() => ({ taxAmount: 8.00, effectiveRate: 0.08 })),
  estimateTaxForOrder: vi.fn(() => ({ estimatedTax: 12.50, breakdown: [] })),
  generateTaxReport: vi.fn(() => ({ totalTax: 5000, period: "2025-Q1" })),
  getTaxCalculationHistory: vi.fn(() => [{ id: "calc-1", taxAmount: 8.00 }]),
  initializeDefaultTaxRates: vi.fn(),
}));

import { GET, POST } from "./route";

function makeReq(url: string, body?: any) {
  return { json: async () => body || {}, url } as any;
}

describe("GET /api/finance/tax", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all tax rates by default", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/tax"), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.rates).toBeDefined();
    expect(data.count).toBe(1);
  });

  it("filters tax rates by country", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/tax?action=list&country=US"), null as any);
    const data = await res.json();
    expect(data.rates).toBeDefined();
  });

  it("returns calculation history", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/tax?action=history&limit=10"), null as any);
    const data = await res.json();
    expect(data.history).toBeDefined();
    expect(data.history.length).toBe(1);
  });

  it("returns 400 for invalid action", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/tax?action=invalid"), null as any);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/finance/tax", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adds a tax rate", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/tax", {
      action: "add_rate",
      rate: { country: "US", state: "NY", rate: 0.08 },
    }), null as any);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.rate.id).toBe("tax-1");
  });

  it("calculates tax", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/tax", {
      action: "calculate",
      input: { amount: 100, country: "US", state: "CA" },
    }), null as any);
    const data = await res.json();
    expect(data.result).toBeDefined();
    expect(data.result.taxAmount).toBe(8.00);
  });

  it("estimates tax for an order", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/tax", {
      action: "estimate_order",
      order: { subtotal: 100, shipping: 10, country: "US" },
    }), null as any);
    const data = await res.json();
    expect(data.result).toBeDefined();
    expect(data.result.estimatedTax).toBe(12.50);
  });

  it("generates a tax report", async () => {
    const res = await POST(makeReq("http://localhost/api/finance/tax", {
      action: "generate_report",
      reportInput: { startDate: "2025-01-01", endDate: "2025-03-31" },
    }), null as any);
    const data = await res.json();
    expect(data.report).toBeDefined();
    expect(data.report.totalTax).toBe(5000);
  });
});
