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
  getStoreInventory: vi.fn().mockResolvedValue([{ id: "inv-1", productId: "p1", stock: 10 }]),
  upsertStoreInventory: vi.fn().mockResolvedValue(undefined),
  syncInventoryAcrossStores: vi.fn().mockResolvedValue(undefined),
  addInventorySyncLog: vi.fn().mockResolvedValue(undefined),
  getInventorySyncLogs: vi.fn().mockResolvedValue([{ id: "log-1", action: "sync", status: "success" }]),
}));

describe("GET /api/multi-store/inventory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns inventory by default", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/multi-store/inventory");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.inventory).toHaveLength(1);
    expect(json.inventory[0].stock).toBe(10);
  });

  it("returns sync logs when type=logs", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/multi-store/inventory?type=logs");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.logs).toHaveLength(1);
    expect(json.logs[0].action).toBe("sync");
  });
});

describe("POST /api/multi-store/inventory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("syncs inventory across stores", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/multi-store/inventory", {
      method: "POST",
      body: JSON.stringify({
        action: "sync",
        productId: "p1",
        sourceStoreId: "store-1",
        newStock: 25,
      }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
  });

  it("returns 400 when sync fields are missing", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/multi-store/inventory", {
      method: "POST",
      body: JSON.stringify({ action: "sync" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Missing required fields");
  });

  it("returns 400 for invalid action", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/multi-store/inventory", {
      method: "POST",
      body: JSON.stringify({ action: "delete" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Invalid action");
  });
});
