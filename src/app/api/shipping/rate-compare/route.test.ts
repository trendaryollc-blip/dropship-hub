import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 }, FULFILLMENT: { windowMs: 60000, maxRequests: 30 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/types/shipping", () => ({
  RateComparisonInputSchema: {
    safeParse: vi.fn((data: any) => ({
      success: true,
      data: {
        ...data,
        weightKg: parseFloat(data.weightKg),
        lengthCm: parseFloat(data.lengthCm),
        widthCm: parseFloat(data.widthCm),
        heightCm: parseFloat(data.heightCm),
        declaredValue: parseFloat(data.declaredValue),
      },
    })),
  },
}));

vi.mock("@/lib/shipping/carrier-rates", () => ({
  compareRates: vi.fn(),
}));

vi.mock("@/lib/data/shipping-rates", () => ({
  saveRateComparison: vi.fn().mockResolvedValue(undefined),
}));

import { GET } from "./route";
import { compareRates } from "@/lib/shipping/carrier-rates";

function makeReq(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return {
    url: `http://localhost/api/shipping/rate-compare?${searchParams}`,
    method: "GET",
    nextUrl: new URL(`http://localhost/api/shipping/rate-compare?${searchParams}`),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/shipping/rate-compare", () => {
  it("returns rate comparison results", async () => {
    (compareRates as any).mockReturnValue({
      rates: [
        { carrierId: "dhl", cost: 15, days: 5 },
        { carrierId: "fedex", cost: 20, days: 3 },
      ],
      cheapest: { carrierId: "dhl", cost: 15 },
      bestValue: { carrierId: "dhl", cost: 15 },
    });

    const res = await GET(makeReq({
      originCountry: "CN",
      destinationCountry: "US",
      weightKg: "2",
      lengthCm: "30",
      widthCm: "20",
      heightCm: "15",
      declaredValue: "50",
    }));

    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.result).toBeDefined();
    expect(json.result.rates).toHaveLength(2);
    expect(json.result.cheapest.carrierId).toBe("dhl");
  });

  it("returns 400 for missing required parameters", async () => {
    const res = await GET(makeReq({ originCountry: "CN" }));
    const json = await res.json();
    expect(json.error).toContain("Missing required parameters");
  });

  it("returns 400 for invalid schema", async () => {
    const { RateComparisonInputSchema } = await import("@/types/shipping");
    (RateComparisonInputSchema.safeParse as any).mockReturnValue({
      success: false,
      error: { flatten: () => ({ fieldErrors: { weightKg: ["Required"] } }) },
    });

    const res = await GET(makeReq({
      originCountry: "CN",
      destinationCountry: "US",
      weightKg: "abc",
      lengthCm: "30",
      widthCm: "20",
      heightCm: "15",
      declaredValue: "50",
    }));

    const json = await res.json();
    expect(json.error).toBe("Invalid parameters");
  });
});
