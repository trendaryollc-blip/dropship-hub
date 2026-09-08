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

const mockExecuteBulkOrderPlacement = vi.fn();
const mockGetBulkOrderResult = vi.fn();
const mockValidateBulkOrderPlacementInput = vi.fn();
const mockGetBulkOrderStats = vi.fn();
const mockGetActiveBulkOperations = vi.fn();
const mockGetBulkOperationHistory = vi.fn();

vi.mock("@/lib/fulfillment/bulk-processor", () => ({
  executeBulkOrderPlacement: (...args: any[]) => mockExecuteBulkOrderPlacement(...args),
  getBulkOrderResult: (...args: any[]) => mockGetBulkOrderResult(...args),
  validateBulkOrderPlacementInput: (...args: any[]) => mockValidateBulkOrderPlacementInput(...args),
  getBulkOrderStats: (...args: any[]) => mockGetBulkOrderStats(...args),
  getActiveBulkOperations: (...args: any[]) => mockGetActiveBulkOperations(...args),
  getBulkOperationHistory: (...args: any[]) => mockGetBulkOperationHistory(...args),
}));

function makeRequest(method: string, url: string, body?: any) {
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init) as any;
}

describe("GET /api/fulfillment/bulk-orders", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetBulkOrderStats.mockReturnValue({ total: 10, completed: 5 });
    mockGetBulkOrderResult.mockReturnValue({ id: "op-1", status: "done" });
    mockGetActiveBulkOperations.mockReturnValue([]);
    mockGetBulkOperationHistory.mockReturnValue([]);
  });

  it("returns stats for action=stats", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/bulk-orders?action=stats");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.stats.total).toBe(10);
  });

  it("returns result for action=result", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/bulk-orders?action=result&operationId=op-1");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.result.status).toBe("done");
  });

  it("returns 404 for action=result unknown id", async () => {
    mockGetBulkOrderResult.mockReturnValue(null);
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/bulk-orders?action=result&operationId=unknown");
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("returns operations for action=active", async () => {
    mockGetActiveBulkOperations.mockReturnValue([{ id: "op-2" }]);
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/bulk-orders?action=active");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.operations).toHaveLength(1);
  });

  it("returns history for action=history", async () => {
    mockGetBulkOperationHistory.mockReturnValue([{ id: "op-3" }]);
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/bulk-orders?action=history");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.history).toHaveLength(1);
  });

  it("returns 400 for invalid action", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/bulk-orders?action=bad");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/fulfillment/bulk-orders", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockValidateBulkOrderPlacementInput.mockReturnValue({ valid: true, errors: [] });
    mockExecuteBulkOrderPlacement.mockResolvedValue({ id: "op-1", processed: 3 });
  });

  it("returns result for valid orders", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/bulk-orders", {
      orders: [{ productId: "p1", quantity: 2 }],
      supplierId: "sup-1",
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.result.processed).toBe(3);
  });

  it("returns 400 for missing orders", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/bulk-orders", {
      supplierId: "sup-1",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing supplierId", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/bulk-orders", {
      orders: [{ productId: "p1", quantity: 1 }],
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mockExecuteBulkOrderPlacement.mockRejectedValue(new Error("fail"));
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/bulk-orders", {
      orders: [{ productId: "p1", quantity: 1 }],
      supplierId: "sup-1",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
