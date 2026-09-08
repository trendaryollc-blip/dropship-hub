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
  CustomsCalculationInputSchema: {
    safeParse: vi.fn((data: any) => ({
      success: true,
      data: {
        ...data,
        shippingCost: parseFloat(data.shippingCost || "0"),
      },
    })),
  },
}));

vi.mock("@/lib/shipping/customs-calculator", () => ({
  calculateCustoms: vi.fn(),
  lookupHSCode: vi.fn(),
}));

vi.mock("@/lib/data/shipping-rates", () => ({
  saveCustomsEstimate: vi.fn(),
  getCustomsEstimateHistory: vi.fn(),
}));

import { GET } from "./route";
import { calculateCustoms, lookupHSCode } from "@/lib/shipping/customs-calculator";
import { getCustomsEstimateHistory, saveCustomsEstimate } from "@/lib/data/shipping-rates";

function makeReq(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return {
    url: `http://localhost/api/shipping/customs?${searchParams}`,
    method: "GET",
    nextUrl: new URL(`http://localhost/api/shipping/customs?${searchParams}`),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/shipping/customs", () => {
  it("calculates customs for valid input", async () => {
    (calculateCustoms as any).mockReturnValue({
      items: [{ name: "Widget", duty: 5, vat: 2 }],
      summary: { totalDuties: 5, totalVAT: 2, totalTaxes: 7 },
      deMinimis: false,
      warnings: [],
      tips: ["Consider de minimis threshold"],
    });
    (saveCustomsEstimate as any).mockResolvedValue(undefined);

    const res = await GET(makeReq({
      originCountry: "CN",
      destinationCountry: "US",
      items: JSON.stringify([{ name: "Widget", unitValue: 25, weightKg: 1, quantity: 2, hsCode: "8471" }]),
    }));

    const json = await res.json();
    expect(json.requestId).toBeDefined();
    expect(json.items).toBeDefined();
    expect(json.summary.totalDuties).toBe(5);
  });

  it("returns history when action=history", async () => {
    (getCustomsEstimateHistory as any).mockResolvedValue([
      { originCountry: "CN", destinationCountry: "US", totalTaxes: 10 },
    ]);

    const res = await GET(makeReq({ action: "history" }));
    const json = await res.json();
    expect(json.history).toBeDefined();
    expect(json.history.length).toBe(1);
  });

  it("looks up HS code when action=lookup", async () => {
    (lookupHSCode as any).mockReturnValue({ code: "8471", description: "Computer parts" });

    const res = await GET(makeReq({ action: "lookup", itemName: "laptop" }));
    const json = await res.json();
    expect(json.result.code).toBe("8471");
  });

  it("returns 400 when itemName is missing for lookup", async () => {
    const res = await GET(makeReq({ action: "lookup" }));
    const json = await res.json();
    expect(json.error).toContain("itemName required");
  });

  it("returns 400 for missing required parameters", async () => {
    const res = await GET(makeReq({ originCountry: "CN" }));
    const json = await res.json();
    expect(json.error).toContain("Missing required parameters");
  });
});
