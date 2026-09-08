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

vi.mock("@/lib/product-validation", () => ({
  runFullValidation: vi.fn().mockReturnValue({
    goldenProduct: { score: 85, rank: "A" },
    trendVelocity: { score: 78 },
    saturation: { index: 35 },
    profitPotential: { score: 82 },
    seasonalDemand: { score: 70 },
  }),
}));

vi.mock("@/lib/data/product-validations", () => ({
  addProductValidation: vi.fn().mockResolvedValue("pv-1"),
  getProductValidations: vi.fn().mockResolvedValue([{ id: "pv-1", productTitle: "Test Product", goldenScore: 85 }]),
  deleteProductValidation: vi.fn().mockResolvedValue(undefined),
}));

describe("POST /api/product-validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when productTitle is missing", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/product-validation", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("productTitle is required");
  });

  it("returns validation result for valid input", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/product-validation", {
      method: "POST",
      body: JSON.stringify({
        productTitle: "Wireless Speaker",
        trendVelocity: { searchVolume: 1000, growth: 15 },
        saturation: { sellerCount: 50, topSellerShare: 30 },
        profitPotential: { avgPrice: 50, avgCost: 20 },
        seasonalDemand: { peakMonth: "December", index: 0.8 },
        goldenExtras: { reviewScore: 4.5, reviewCount: 200, supplierReliability: 0.9, shippingSpeed: 0.8, returnRate: 0.05, competitionLevel: "medium" },
      }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.result).toBeDefined();
    expect(json.result.goldenProduct.score).toBe(85);
  });
});

describe("GET /api/product-validation", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns saved validations", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/product-validation");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.validations).toHaveLength(1);
    expect(json.validations[0].productTitle).toBe("Test Product");
  });
});
