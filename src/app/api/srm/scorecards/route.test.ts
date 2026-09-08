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

vi.mock("@/lib/data/srm", () => ({
  getSupplierScorecards: vi.fn(),
  saveSupplierScorecard: vi.fn(),
}));

import { GET, POST } from "./route";
import { getSupplierScorecards, saveSupplierScorecard } from "@/lib/data/srm";

function makeReq(body?: any, method = "POST", url = "http://localhost/api/srm/scorecards") {
  return {
    json: vi.fn().mockResolvedValue(body ?? {}),
    url,
    method,
    nextUrl: new URL(url),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/srm/scorecards", () => {
  it("returns supplier scorecards", async () => {
    (getSupplierScorecards as any).mockResolvedValue([
      { supplierId: "s1", supplierName: "Acme", overallScore: 90, grade: "A-" },
    ]);

    const res = await GET(makeReq(undefined, "GET"));
    const json = await res.json();
    expect(json.scorecards).toBeDefined();
    expect(json.scorecards.length).toBe(1);
    expect(json.scorecards[0].grade).toBe("A-");
  });
});

describe("POST /api/srm/scorecards", () => {
  it("creates a scorecard with correct weighted scores", async () => {
    (getSupplierScorecards as any).mockResolvedValue([]);
    (saveSupplierScorecard as any).mockResolvedValue(undefined);

    const res = await POST(makeReq({
      supplierId: "s1",
      supplierName: "Acme",
      criteria: {
        speed: { score: 80, weight: 0.2 },
        quality: { score: 90, weight: 0.3 },
        communication: { score: 70, weight: 0.2 },
        price: { score: 85, weight: 0.15 },
        reliability: { score: 95, weight: 0.15 },
      },
    }));

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.scorecard).toBeDefined();
    expect(json.scorecard.overallScore).toBe(84);
    expect(json.scorecard.grade).toBe("B");
  });

  it("calculates improving trend when recent scores are higher", async () => {
    (getSupplierScorecards as any).mockResolvedValue([{
      supplierId: "s1",
      history: [
        { date: "2025-03-01", overallScore: 95 },
        { date: "2025-02-01", overallScore: 94 },
        { date: "2025-01-01", overallScore: 93 },
        { date: "2024-12-01", overallScore: 80 },
        { date: "2024-11-01", overallScore: 80 },
        { date: "2024-10-01", overallScore: 80 },
      ],
    }]);
    (saveSupplierScorecard as any).mockResolvedValue(undefined);

    const res = await POST(makeReq({
      supplierId: "s1",
      supplierName: "Acme",
      criteria: {
        speed: { score: 95, weight: 0.2 },
        quality: { score: 95, weight: 0.3 },
        communication: { score: 95, weight: 0.2 },
        price: { score: 95, weight: 0.15 },
        reliability: { score: 95, weight: 0.15 },
      },
    }));

    const json = await res.json();
    expect(json.scorecard.trend).toBe("improving");
  });

  it("returns 400 for missing required fields", async () => {
    const res = await POST(makeReq({ supplierId: "s1" }));
    const json = await res.json();
    expect(json.error).toContain("Missing required fields");
  });
});
