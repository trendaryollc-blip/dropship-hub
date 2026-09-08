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
  getNegotiations: vi.fn(),
  addNegotiation: vi.fn(),
  updateNegotiation: vi.fn(),
}));

import { GET, POST, PUT } from "./route";
import { getNegotiations, addNegotiation, updateNegotiation } from "@/lib/data/srm";

function makeReq(body?: any, method = "POST", url = "http://localhost/api/srm/negotiations") {
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

describe("GET /api/srm/negotiations", () => {
  it("returns negotiations for user", async () => {
    (getNegotiations as any).mockResolvedValue([
      { id: "n1", productTitle: "Widget", status: "active" },
    ]);

    const res = await GET(makeReq(undefined, "GET"));
    const json = await res.json();
    expect(json.negotiations).toBeDefined();
    expect(json.negotiations.length).toBe(1);
  });

  it("filters by supplierId", async () => {
    (getNegotiations as any).mockResolvedValue([]);

    const url = "http://localhost/api/srm/negotiations?supplierId=s1";
    const res = await GET(makeReq(undefined, "GET", url));
    expect(getNegotiations).toHaveBeenCalledWith("test-user-123", "s1");
  });
});

describe("POST /api/srm/negotiations", () => {
  it("creates a new negotiation", async () => {
    (addNegotiation as any).mockResolvedValue("neg-new-1");

    const res = await POST(makeReq({
      supplierId: "s1",
      supplierName: "Acme",
      productTitle: "Widget",
      initialPrice: 20,
      targetPrice: 15,
    }));

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.id).toBe("neg-new-1");
  });

  it("adds a round to existing negotiation", async () => {
    (getNegotiations as any).mockResolvedValue([{
      id: "n1",
      rounds: [{ roundNumber: 1, price: 20 }],
    }]);
    (updateNegotiation as any).mockResolvedValue(undefined);

    const res = await POST(makeReq({
      action: "add_round",
      negotiationId: "n1",
      round: { price: 18, message: "Counter offer" },
    }));

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(updateNegotiation).toHaveBeenCalled();
  });

  it("returns 404 for non-existent negotiation on add_round", async () => {
    (getNegotiations as any).mockResolvedValue([]);

    const res = await POST(makeReq({
      action: "add_round",
      negotiationId: "nonexistent",
      round: { price: 18 },
    }));

    const json = await res.json();
    expect(json.error).toContain("not found");
  });

  it("returns 400 for missing required fields", async () => {
    const res = await POST(makeReq({}));
    const json = await res.json();
    expect(json.error).toContain("Missing required fields");
  });
});

describe("PUT /api/srm/negotiations", () => {
  it("updates a negotiation", async () => {
    (updateNegotiation as any).mockResolvedValue(undefined);

    const res = await PUT(makeReq({ negotiationId: "n1", status: "concluded" }));
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 400 without negotiationId", async () => {
    const res = await PUT(makeReq({ status: "concluded" }));
    const json = await res.json();
    expect(json.error).toContain("negotiationId required");
  });
});
