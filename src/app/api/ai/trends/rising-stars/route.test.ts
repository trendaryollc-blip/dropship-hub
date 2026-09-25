import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TrendSignal } from "@/types/trend-predictor";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/data-sources/aggregator", () => ({
  fetchRealSignals: vi.fn(),
}));

vi.doMock("@/lib/trend-analyzer", () => ({
  detectRisingStars: vi.fn().mockReturnValue([{ keyword: "test", score: 80 }]),
  predictTrend: vi.fn(),
}));

import { fetchRealSignals } from "@/lib/data-sources/aggregator";

const liveSignal: TrendSignal = {
  id: "sig-1",
  platform: "google_trends",
  keyword: "wireless earbuds",
  category: "general",
  volume: 5000,
  previousVolume: 3000,
  growthRate: 66.7,
  direction: "rising",
  velocity: 60,
  acceleration: 30,
  saturationLevel: 20,
  fetchedAt: new Date().toISOString(),
};

describe("GET /api/ai/trends/rising-stars", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns rising stars derived from live signals", async () => {
    vi.mocked(fetchRealSignals).mockResolvedValue([liveSignal]);

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/trends/rising-stars");

    const res = await GET(req as any);
    const json = await res.json();

    expect(json.risingStars).toHaveLength(1);
    expect(json.risingStars[0].keyword).toBe("test");
    expect(json.risingStars[0].score).toBe(80);
  });

  it("returns an empty list when no source produced signals", async () => {
    vi.mocked(fetchRealSignals).mockResolvedValue([]);

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/ai/trends/rising-stars");

    const res = await GET(req as any);
    const json = await res.json();

    expect(json.risingStars).toEqual([]);
  });
});
