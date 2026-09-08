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

vi.mock("@/lib/shipping/auto-selector", () => ({
  autoSelectCarrier: vi.fn(),
}));

vi.mock("@/types/shipping", () => ({
  AutoSelectInputSchema: {
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

import { GET } from "./route";
import { autoSelectCarrier } from "@/lib/shipping/auto-selector";

function makeReq(params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  return {
    url: `http://localhost/api/shipping/auto-select?${searchParams}`,
    method: "GET",
    nextUrl: new URL(`http://localhost/api/shipping/auto-select?${searchParams}`),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/shipping/auto-select", () => {
  it("returns auto-selected carrier for valid params", async () => {
    (autoSelectCarrier as any).mockReturnValue({
      carrierId: "dhl",
      estimatedCost: 12.5,
      estimatedDays: 5,
      reason: "Best value for weight and destination",
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
    expect(json.result).toBeDefined();
    expect(json.result.carrierId).toBe("dhl");
  });

  it("returns 400 for missing required parameters", async () => {
    const res = await GET(makeReq({ originCountry: "CN" }));
    const json = await res.json();
    expect(json.error).toContain("Missing required parameters");
  });

  it("returns 400 for invalid schema", async () => {
    const { AutoSelectInputSchema } = await import("@/types/shipping");
    (AutoSelectInputSchema.safeParse as any).mockReturnValue({
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
