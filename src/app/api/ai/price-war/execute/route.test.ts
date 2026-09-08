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

vi.doMock("@/lib/data/price-war", () => ({
  getPriceRules: vi.fn().mockResolvedValue([
    {
      id: "r1",
      productTitle: "Widget",
      myPrice: 30,
      platforms: ["amazon"],
      competitorUrls: [],
      lastChecked: null,
      shouldCheckRule: true,
    },
  ]),
  updatePriceRule: vi.fn().mockResolvedValue(undefined),
  addPriceAdjustmentLog: vi.fn().mockResolvedValue(undefined),
}));

vi.doMock("@/lib/price-war-engine", () => ({
  evaluatePriceRule: vi.fn().mockReturnValue({
    shouldAdjust: true,
    suggestedPrice: 28,
    reason: "Undercut",
    strategy: "match",
    competitorPrice: 29,
    marginBefore: 20,
    marginAfter: 18,
  }),
  shouldCheckRule: vi.fn().mockReturnValue(true),
  calculateMargin: vi.fn().mockReturnValue(20),
}));

describe("POST /api/ai/price-war/execute", () => {
  beforeEach(() => vi.clearAllMocks());

  it("executes price check and returns results", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/ai/price-war/execute", {
      method: "POST",
      body: JSON.stringify({ ruleId: "r1", dryRun: false }),
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(json.checked).toBe(1);
    expect(json.adjusted).toBe(1);
    expect(json.dryRun).toBe(false);
    expect(json.results).toHaveLength(1);
    expect(json.results[0].ruleId).toBe("r1");
    expect(json.results[0].applied).toBe(true);
    expect(json.executedAt).toBeDefined();
  });
});
