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
  DeliveryPredictionInputSchema: {
    safeParse: vi.fn((data: any) => ({
      success: true,
      data: { ...data, weightKg: parseFloat(data.weightKg) },
    })),
  },
}));

vi.mock("@/lib/shipping/delivery-prediction", () => ({
  predictDelivery: vi.fn(),
  predictDeliveryForAllCarriers: vi.fn(),
}));

import { GET } from "./route";
import { predictDelivery, predictDeliveryForAllCarriers } from "@/lib/shipping/delivery-prediction";

function makeReq(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return {
    url: `http://localhost/api/shipping/predict?${searchParams}`,
    method: "GET",
    nextUrl: new URL(`http://localhost/api/shipping/predict?${searchParams}`),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/shipping/predict", () => {
  it("predicts delivery for a specific carrier", async () => {
    (predictDelivery as any).mockReturnValue({
      carrierId: "dhl",
      estimatedDays: 7,
      confidence: 0.85,
      range: { min: 5, max: 10 },
    });

    const res = await GET(makeReq({
      carrierId: "dhl",
      originCountry: "CN",
      destinationCountry: "US",
      weightKg: "2",
      serviceLevel: "express",
    }));

    const json = await res.json();
    expect(json.prediction).toBeDefined();
    expect(json.prediction.carrierId).toBe("dhl");
    expect(json.prediction.estimatedDays).toBe(7);
  });

  it("predicts delivery for all carriers when allCarriers=true", async () => {
    (predictDeliveryForAllCarriers as any).mockReturnValue([
      { carrierId: "dhl", estimatedDays: 7 },
      { carrierId: "fedex", estimatedDays: 5 },
    ]);

    const res = await GET(makeReq({
      originCountry: "CN",
      destinationCountry: "US",
      weightKg: "2",
      allCarriers: "true",
    }));

    const json = await res.json();
    expect(json.predictions).toBeDefined();
    expect(json.predictions.length).toBe(2);
  });

  it("returns 400 for missing required parameters", async () => {
    const res = await GET(makeReq({ originCountry: "CN" }));
    const json = await res.json();
    expect(json.error).toContain("Missing required parameters");
  });
});
