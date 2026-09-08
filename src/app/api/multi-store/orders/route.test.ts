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

vi.mock("@/lib/data/multi-store", () => ({
  getUnifiedOrders: vi.fn().mockResolvedValue([]),
  addUnifiedOrder: vi.fn().mockResolvedValue("ord-1"),
  updateUnifiedOrder: vi.fn().mockResolvedValue(undefined),
}));

describe("/api/multi-store/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("GET returns orders", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/multi-store/orders");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("POST creates order", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/multi-store/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: "s1", orderNumber: "ORD-1", customerName: "John", items: [{ qty: 1 }] }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST returns 400 for missing fields", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/multi-store/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storeId: "s1" }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });
});
