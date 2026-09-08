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

const mockGetShipmentStatus = vi.fn();
const mockSyncTrackingToStore = vi.fn();
const mockPollAllShipments = vi.fn();

vi.mock("@/lib/fulfillment/shipment-tracker", () => ({
  getShipmentStatus: (...args: any[]) => mockGetShipmentStatus(...args),
  syncTrackingToStore: (...args: any[]) => mockSyncTrackingToStore(...args),
  pollAllShipments: (...args: any[]) => mockPollAllShipments(...args),
}));

function makeRequest(method: string, url: string, body?: any) {
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init) as any;
}

describe("GET /api/fulfillment/tracking", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetShipmentStatus.mockResolvedValue({ carrier: "DHL", trackingNo: "T1" });
    mockPollAllShipments.mockResolvedValue([{ orderId: "o1", status: "delivered" }]);
  });

  it("returns status for action=status", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/tracking?action=status&cjOrderNumber=CJ-1");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status.carrier).toBe("DHL");
  });

  it("returns 400 for action=status missing cjOrderNumber", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/tracking?action=status");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns updates for action=poll_all", async () => {
    const { GET } = await import("./route");
    const orders = encodeURIComponent(JSON.stringify([{ orderId: "o1" }]));
    const req = makeRequest("GET", `http://localhost/api/fulfillment/tracking?action=poll_all&orders=${orders}`);
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.updates).toHaveLength(1);
  });

  it("returns 400 for action=poll_all missing orders", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/tracking?action=poll_all");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid action", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/tracking?action=bad");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mockGetShipmentStatus.mockRejectedValue(new Error("fail"));
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/tracking?action=status&cjOrderNumber=CJ-1");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe("POST /api/fulfillment/tracking", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSyncTrackingToStore.mockResolvedValue({ synced: true });
    mockPollAllShipments.mockResolvedValue([{ orderId: "o1", status: "shipped" }]);
  });

  it("returns result for action=sync_to_store", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/tracking", {
      action: "sync_to_store",
      storeId: "s1",
      storePlatform: "shopify",
      platformOrderId: "po-1",
      trackingNumber: "T123",
      carrier: "DHL",
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 400 for sync_to_store missing fields", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/tracking", {
      action: "sync_to_store",
      storeId: "s1",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns updates for action=poll_bulk", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/tracking", {
      action: "poll_bulk",
      orders: [{ orderId: "o1" }],
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.updates).toHaveLength(1);
  });

  it("returns 400 for invalid action", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/tracking", {
      action: "bad",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
