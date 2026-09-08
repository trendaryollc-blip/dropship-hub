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

const mockFetchCJInventory = vi.fn();
const mockSyncInventoryForStore = vi.fn();
const mockDetectInventoryChanges = vi.fn();
const mockGenerateInventoryAlerts = vi.fn();

vi.mock("@/lib/fulfillment/inventory-sync", () => ({
  fetchCJInventory: (...args: any[]) => mockFetchCJInventory(...args),
  syncInventoryForStore: (...args: any[]) => mockSyncInventoryForStore(...args),
  detectInventoryChanges: (...args: any[]) => mockDetectInventoryChanges(...args),
  generateInventoryAlerts: (...args: any[]) => mockGenerateInventoryAlerts(...args),
}));

function makeRequest(method: string, url: string, body?: any) {
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  return new Request(url, init) as any;
}

describe("GET /api/fulfillment/inventory", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFetchCJInventory.mockResolvedValue([{ id: "p1", stock: 100 }]);
    mockGenerateInventoryAlerts.mockReturnValue([]);
  });

  it("returns inventory for action=list", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/inventory?action=list");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.inventory).toEqual([{ id: "p1", stock: 100 }]);
    expect(json.count).toBe(1);
  });

  it("returns alerts for action=alerts", async () => {
    mockGenerateInventoryAlerts.mockReturnValue([{ type: "low_stock", productId: "p1" }]);
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/inventory?action=alerts");
    const res = await GET(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.alerts).toHaveLength(1);
  });

  it("returns 400 for invalid action", async () => {
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/inventory?action=bad");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 on error", async () => {
    mockFetchCJInventory.mockRejectedValue(new Error("boom"));
    const { GET } = await import("./route");
    const req = makeRequest("GET", "http://localhost/api/fulfillment/inventory?action=list");
    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});

describe("POST /api/fulfillment/inventory", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockSyncInventoryForStore.mockResolvedValue({ synced: 1 });
    mockDetectInventoryChanges.mockReturnValue([{ productId: "p1", change: "stock_change" }]);
    mockGenerateInventoryAlerts.mockReturnValue([]);
  });

  it("returns result for action=sync", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/inventory", {
      action: "sync",
      storeId: "s1",
      storePlatform: "shopify",
      productMappings: [{ cjId: "p1", storeVariantId: "v1" }],
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 400 for action=sync missing fields", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/inventory", {
      action: "sync",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns changes for action=detect_changes", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/inventory", {
      action: "detect_changes",
      previousInventory: [{ id: "p1", stock: 100 }],
      currentInventory: [{ id: "p1", stock: 50 }],
    });
    const res = await POST(req);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.changes).toHaveLength(1);
  });

  it("returns 400 for invalid action", async () => {
    const { POST } = await import("./route");
    const req = makeRequest("POST", "http://localhost/api/fulfillment/inventory", {
      action: "bad",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
