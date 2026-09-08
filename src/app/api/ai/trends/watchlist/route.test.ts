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

vi.doMock("@/lib/validation", () => ({
  TrendWatchlistInputSchema: {},
  validateBody: vi.fn((schema: any, body: any) => ({ success: true, data: body })),
}));

vi.doMock("@/lib/data/trend-predictor", () => ({
  getTrendWatchlist: vi.fn().mockResolvedValue([{ id: "w1", keyword: "test" }]),
  addTrendWatchlistEntry: vi.fn().mockResolvedValue("w1"),
  deleteTrendWatchlistEntry: vi.fn().mockResolvedValue(true),
}));

describe("GET /api/ai/trends/watchlist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns entries", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/trends/watchlist");

    const res = await GET(req as any);
    const json = await res.json();

    expect(json.entries).toHaveLength(1);
    expect(json.entries[0].id).toBe("w1");
    expect(json.entries[0].keyword).toBe("test");
  });
});

describe("POST /api/ai/trends/watchlist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adds entry", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/ai/trends/watchlist", {
      method: "POST",
      body: JSON.stringify({ keyword: "test", category: "general" }),
    });

    const res = await POST(req as any);
    const json = await res.json();

    expect(json.id).toBe("w1");
    expect(json.success).toBe(true);
  });
});

describe("DELETE /api/ai/trends/watchlist", () => {
  beforeEach(() => vi.clearAllMocks());

  it("removes entry", async () => {
    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/ai/trends/watchlist?id=w1");

    const res = await DELETE(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
  });

  it("returns 400 when id missing", async () => {
    const { DELETE } = await import("./route");
    const req = new Request("http://localhost/api/ai/trends/watchlist");

    const res = await DELETE(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Missing entry ID");
  });
});
