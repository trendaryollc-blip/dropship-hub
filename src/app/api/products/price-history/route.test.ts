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

vi.mock("@/lib/products/price-tracker", () => ({
  recordProductPriceSnapshot: vi.fn(),
  getProductPriceHistory: vi.fn(),
}));

import { GET, POST } from "./route";
import { recordProductPriceSnapshot, getProductPriceHistory } from "@/lib/products/price-tracker";

function makeReq(body?: any, url = "http://localhost/api/products/price-history") {
  return {
    json: vi.fn().mockResolvedValue(body ?? {}),
    url,
    method: body ? "POST" : "GET",
    nextUrl: new URL(url),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/products/price-history", () => {
  it("returns the recorded history for a key", async () => {
    (getProductPriceHistory as any).mockResolvedValue([{ date: "2026-01-01", prices: { amazon: 10 } }]);
    const res = await GET(makeReq(undefined, "http://localhost/api/products/price-history?key=abc"));
    const json = await res.json();
    expect(json.key).toBe("abc");
    expect(json.history.length).toBe(1);
    expect(getProductPriceHistory).toHaveBeenCalledWith("test-user-123", "abc", 90);
  });

  it("returns 400 without a key", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(400);
  });
});

describe("POST /api/products/price-history", () => {
  it("records a snapshot", async () => {
    const res = await POST(makeReq({ key: "abc", title: "Widget", prices: { amazon: 10 } }));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(recordProductPriceSnapshot).toHaveBeenCalledWith("test-user-123", "abc", "Widget", { amazon: 10 });
  });

  it("returns 400 for missing fields", async () => {
    const res = await POST(makeReq({ key: "abc" }));
    expect(res.status).toBe(400);
  });
});
