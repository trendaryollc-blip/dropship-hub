import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.doMock("@/lib/data/price-war", () => ({
  getPriceAdjustmentLogs: vi.fn().mockResolvedValue([{ ruleId: "r1", newPrice: 28 }]),
}));

describe("GET /api/ai/price-war/history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns logs", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/price-war/history?ruleId=r1&limit=10");

    const res = await GET(req as any);
    const json = await res.json();

    expect(json.logs).toHaveLength(1);
    expect(json.logs[0].ruleId).toBe("r1");
    expect(json.logs[0].newPrice).toBe(28);
  });
});
