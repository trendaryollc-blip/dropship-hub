import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 }, STORE_PUSH: { windowMs: 60000, maxRequests: 20 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/data/multi-store", () => ({
  getBulkPushJobs: vi.fn().mockResolvedValue([{ id: "job-1", productTitle: "Test Product", status: "pending" }]),
  addBulkPushJob: vi.fn().mockResolvedValue("job-new-1"),
  updateBulkPushJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d, exists: true }));
}

function buildMockDb(storeSnapData: any) {
  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: true, data: () => storeSnapData }),
        collection: vi.fn().mockImplementation((name: string) => ({
          doc: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ exists: true, data: () => storeSnapData }),
            set: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
          }),
          add: vi.fn().mockResolvedValue({ id: "new-doc-1" }),
          get: vi.fn().mockResolvedValue({ docs: [], empty: true }),
          orderBy: vi.fn().mockReturnThis(),
          limit: vi.fn().mockReturnThis(),
        })),
      }),
    }),
  };
}

describe("GET /api/multi-store/bulk-push", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns list of bulk push jobs", async () => {
    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/multi-store/bulk-push");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.jobs).toHaveLength(1);
    expect(json.jobs[0].productTitle).toBe("Test Product");
  });
});

describe("POST /api/multi-store/bulk-push", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when required fields are missing", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/multi-store/bulk-push", {
      method: "POST",
      body: JSON.stringify({ productTitle: "Widget" }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain("Missing required fields");
  });

  it("creates a bulk push job with valid data", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(buildMockDb({ name: "Store 1", platform: "shopify" }));

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/multi-store/bulk-push", {
      method: "POST",
      body: JSON.stringify({
        productTitle: "Wireless Speaker",
        productPrice: 49.99,
        targetStoreIds: ["store-1"],
      }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.jobId).toBe("job-new-1");
  });
});

describe("PUT /api/multi-store/bulk-push", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 when jobId is missing", async () => {
    const { PUT } = await import("./route");
    const req = new Request("http://localhost/api/multi-store/bulk-push", {
      method: "PUT",
      body: JSON.stringify({ status: "completed" }),
    });
    const res = await PUT(req as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("jobId required");
  });
});
