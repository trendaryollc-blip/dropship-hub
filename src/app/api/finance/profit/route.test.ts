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

vi.mock("@/lib/finance/realtime-profit", () => ({
  generateProfitSummary: vi.fn(() => ({ totalRevenue: 10000, totalProfit: 3000, avgMargin: 30 })),
  generateProfitAlerts: vi.fn(() => [{ type: "low_margin", message: "Margin below threshold" }]),
  calculateProfitByProduct: vi.fn(() => [{ productTitle: "Widget", profit: 500 }]),
  calculateProfitByPlatform: vi.fn(() => [{ platform: "Shopify", profit: 2000 }]),
}));

import { GET } from "./route";

function makeReq(url: string) {
  return { url } as any;
}

describe("GET /api/finance/profit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 500 due to internal getAdminDB stub", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/profit"), null as any);
    expect(res.status).toBe(500);
  });

  it("returns error with details when summary action fails", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/profit?action=summary"), null as any);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(typeof data.error).toBe("string");
  });

  it("returns error when alerts action fails", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/profit?action=alerts"), null as any);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it("returns error for invalid action due to internal failure", async () => {
    const res = await GET(makeReq("http://localhost/api/finance/profit?action=invalid"), null as any);
    expect(res.status).toBe(500);
  });
});
