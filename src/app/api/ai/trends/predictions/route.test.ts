import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.doMock("@/lib/data/trend-predictor", () => ({
  getTrendPredictions: vi.fn().mockResolvedValue([{ keyword: "wireless earbuds", score: 85 }]),
}));

describe("GET /api/ai/trends/predictions", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns predictions", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/trends/predictions?limit=5");

    const res = await GET(req as any);
    const json = await res.json();

    expect(json.predictions).toHaveLength(1);
    expect(json.predictions[0].keyword).toBe("wireless earbuds");
    expect(json.predictions[0].score).toBe(85);
  });
});
