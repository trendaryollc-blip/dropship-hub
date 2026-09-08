import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { AI: { windowMs: 60000, maxRequests: 30 }, AI_CHAT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockGetPriceRules = vi.fn();
const mockAddPriceRule = vi.fn();
const mockDeletePriceRule = vi.fn();
const mockGetPriceWarStats = vi.fn();

vi.mock("@/lib/data/price-war", () => ({
  addPriceRule: mockAddPriceRule,
  getPriceRules: mockGetPriceRules,
  updatePriceRule: vi.fn(),
  deletePriceRule: mockDeletePriceRule,
  getPriceWarStats: mockGetPriceWarStats,
}));

vi.mock("@/lib/validation", () => ({
  validateBody: vi.fn((schema: any, body: any) => {
    if (!body?.productUrl) {
      return { success: false, response: { status: () => ({ json: () => ({ error: "Validation failed" }) }) } };
    }
    return { success: true, data: body };
  }),
  PriceRuleInputSchema: {},
}));

describe("GET /api/ai/price-war", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns price rules by default", async () => {
    mockGetPriceRules.mockResolvedValue([{ id: "r1", productUrl: "https://example.com", targetPrice: 25 }]);

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/price-war");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.rules).toHaveLength(1);
    expect(body.rules[0].id).toBe("r1");
  });

  it("returns stats when type=stats", async () => {
    mockGetPriceWarStats.mockResolvedValue({ activeRules: 3, priceChanges: 12 });

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/price-war?type=stats");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.stats.activeRules).toBe(3);
  });

  it("returns error on failure", async () => {
    mockGetPriceRules.mockRejectedValue(new Error("DB error"));

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/price-war");
    const res = await GET(req as any);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Failed to fetch");
  });
});

describe("POST /api/ai/price-war", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a new price rule", async () => {
    mockAddPriceRule.mockResolvedValue("rule-new-1");

    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ productUrl: "https://example.com", targetPrice: 25 }) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(body.id).toBe("rule-new-1");
    expect(body.success).toBe(true);
  });

  it("returns 500 when rule creation fails", async () => {
    mockAddPriceRule.mockResolvedValue(null);

    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ productUrl: "https://example.com", targetPrice: 25 }) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toContain("Failed to create");
  });
});

describe("DELETE /api/ai/price-war", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deletes a price rule", async () => {
    mockDeletePriceRule.mockResolvedValue(true);

    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/ai/price-war?id=rule-1", { method: "DELETE" });
    const res = await DELETE(req as any);
    const body = await res.json();

    expect(body.success).toBe(true);
  });

  it("returns 400 when id missing", async () => {
    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/ai/price-war", { method: "DELETE" });
    const res = await DELETE(req as any);
    const body = await res.json();

    expect(body.error).toContain("Missing");
  });
});
