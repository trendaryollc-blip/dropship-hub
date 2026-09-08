import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.doMock("@/lib/trend-analyzer", () => ({
  generateMockSignals: vi.fn().mockReturnValue([{ keyword: "test", score: 50 }]),
  detectRisingStars: vi.fn().mockReturnValue([{ keyword: "test", score: 80 }]),
  predictTrend: vi.fn(),
}));

describe("GET /api/ai/trends/rising-stars", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns rising stars", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/trends/rising-stars");

    const res = await GET(req as any);
    const json = await res.json();

    expect(json.risingStars).toHaveLength(1);
    expect(json.risingStars[0].keyword).toBe("test");
    expect(json.risingStars[0].score).toBe(80);
  });
});
