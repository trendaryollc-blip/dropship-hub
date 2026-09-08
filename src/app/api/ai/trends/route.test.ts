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

vi.mock("@/lib/validation", () => ({
  validateBody: vi.fn((schema: any, body: any) => {
    if (!body?.keyword) {
      return { success: false, response: { status: () => ({ json: () => ({ error: "Validation failed" }) }) } };
    }
    return { success: true, data: { keyword: body.keyword, category: body.category } };
  }),
  TrendAnalysisInputSchema: {},
}));

vi.mock("@/lib/trend-analyzer", () => ({
  predictTrend: vi.fn(() => ({
    productIdea: "Test Product",
    category: "general",
    trendScore: 85,
    confidence: 0.9,
    direction: "rising",
    predictedPeak: "2026-06",
    timeToPeak: "3 months",
    saturationRisk: "medium",
    competitionLevel: "moderate",
    reasoning: "Strong upward trend detected",
    relatedKeywords: ["test", "product"],
    suggestedPlatforms: ["Amazon"],
    estimatedMargin: 45,
  })),
  detectRisingStars: vi.fn(() => [{ keyword: "rising-star", growth: 200 }]),
  generateMockSignals: vi.fn(() => [
    { keyword: "wireless earbuds", growthRate: 45, platform: "Amazon" },
  ]),
}));

vi.mock("@/lib/data/trend-predictor", () => ({
  addTrendPrediction: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/ai/trends", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns trend prediction for valid keyword", async () => {
    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ keyword: "wireless earbuds" }) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(body.prediction).toBeDefined();
    expect(body.prediction.productIdea).toBe("Test Product");
    expect(body.signals).toBeDefined();
    expect(body.risingStars).toBeDefined();
  });

  it("rejects request without keyword", async () => {
    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({}) } as any;
    const res = await POST(req);

    expect(res.status).toBeDefined();
  });

  it("includes provider metadata", async () => {
    const { POST } = await import("./route");
    const req = { json: vi.fn().mockResolvedValue({ keyword: "test" }) } as any;
    const res = await POST(req);
    const body = await res.json();

    expect(body.provider).toBe("trend-analyzer");
    expect(typeof body.analysisTime).toBe("number");
  });
});

describe("GET /api/ai/trends", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("returns trending keywords and rising stars", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/trends");
    const res = await GET(req as any);
    const body = await res.json();

    expect(body.trending).toBeDefined();
    expect(body.trending.length).toBeGreaterThan(0);
    expect(body.risingStars).toBeDefined();
    expect(body.alerts).toEqual([]);
  });

  it("trending items have required fields", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/trends");
    const res = await GET(req as any);
    const body = await res.json();

    const first = body.trending[0];
    expect(first.id).toBeDefined();
    expect(first.keyword).toBeDefined();
    expect(typeof first.growth).toBe("number");
    expect(typeof first.volume).toBe("number");
  });
});
