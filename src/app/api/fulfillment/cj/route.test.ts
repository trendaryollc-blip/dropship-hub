import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { FULFILLMENT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockPlaceCJOrder = vi.fn();
const mockGetCJOrderStatus = vi.fn();

vi.mock("@/lib/fulfillment/cj-adapter", () => ({
  placeCJOrder: (...args: any[]) => mockPlaceCJOrder(...args),
  getCJOrderStatus: (...args: any[]) => mockGetCJOrderStatus(...args),
}));

function makeRequest(method: string, url: string, body?: any) {
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init) as any;
}

describe("POST /api/fulfillment/cj", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockPlaceCJOrder.mockResolvedValue({ success: true, orderId: "cj-123" });
    mockGetCJOrderStatus.mockResolvedValue({ status: "shipped" });
  });

  it("returns result for action=placeOrder", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/cj", {
      action: "placeOrder",
      productId: "prod-1",
      quantity: 2,
      shippingAddress: { name: "Test", address: "123 St" },
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.orderId).toBe("cj-123");
  });

  it("returns 400 for placeOrder missing fields", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/cj", {
      action: "placeOrder",
      productId: "prod-1",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns status for action=getStatus", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/cj", {
      action: "getStatus",
      orderId: "cj-123",
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.status).toBe("shipped");
  });

  it("returns 400 for getStatus missing orderId", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/cj", {
      action: "getStatus",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid action", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/cj", {
      action: "bad",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mockPlaceCJOrder.mockRejectedValue(new Error("CJ API down"));
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/cj", {
      action: "placeOrder",
      productId: "prod-1",
      quantity: 1,
      shippingAddress: { name: "Test" },
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
