import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

import { POST } from "./route";

function makeReq(body: any) {
  return { json: async () => body } as any;
}

describe("POST /api/products/market-intel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 400 when title is missing", async () => {
    const res = await POST(makeReq({}), null as any);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("title");
  });

  it("returns market intel for a valid product", async () => {
    const res = await POST(makeReq({ title: "Wireless Earbuds", price: 29.99, rating: 4.5, reviews: 500 }), null as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.searchVolume).toBeDefined();
    expect(data.trendDirection).toBeDefined();
    expect(data.competitionLevel).toBeDefined();
    expect(data.riskScore).toBeDefined();
    expect(data.riskFactors).toBeDefined();
    expect(Array.isArray(data.riskFactors)).toBe(true);
  });

  it("uses defaults when price/rating/reviews not provided", async () => {
    const res = await POST(makeReq({ title: "Generic Item" }), null as any);
    const data = await res.json();
    expect(data.searchVolume).toBeDefined();
    expect(data.trendSparkline).toBeDefined();
    expect(Array.isArray(data.trendSparkline)).toBe(true);
  });

  it("includes canCompete assessment", async () => {
    const res = await POST(makeReq({ title: "Product", price: 50, rating: 4.0, reviews: 200 }), null as any);
    const data = await res.json();
    expect(data.canCompete).toBeDefined();
    expect(typeof data.canCompete).toBe("string");
  });
});
