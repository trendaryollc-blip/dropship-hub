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

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d }));
}

function buildQueryChain(docs: any[]) {
  return {
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}

function buildMockDb(collectionMap: Record<string, any[]>) {
  const userDoc: any = {};
  userDoc.collection = vi.fn().mockImplementation((name: string) => buildQueryChain(collectionMap[name] || []));
  return { collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }) };
}

describe("GET /api/suppliers/samples", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns sample orders", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        sampleOrders: [
          { id: "s1", productName: "Test Product", status: "delivered", samplePrice: 25 },
        ],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/samples");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.orders).toBeDefined();
    expect(json.orders).toHaveLength(1);
    expect(json.orders[0].productName).toBe("Test Product");
  });

  it("returns empty orders when none exist", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({ sampleOrders: [] })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/samples");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.orders).toEqual([]);
  });
});

describe("POST /api/suppliers/samples", () => {
  beforeEach(() => vi.clearAllMocks());

  it("creates a sample order", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    const setMock = vi.fn().mockResolvedValue(undefined);
    const innerDocMock = vi.fn().mockReturnValue({ id: "new-order-id", set: setMock });
    const innerColMock = vi.fn().mockReturnValue({ doc: innerDocMock });
    const docRefMock = vi.fn().mockReturnValue({ collection: innerColMock });
    const colRefMock = vi.fn().mockReturnValue({ doc: docRefMock });
    (getAdminDB as any).mockResolvedValue({
      collection: colRefMock,
    });

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/samples", {
      method: "POST",
      body: JSON.stringify({
        supplierId: "sup1",
        supplierName: "Test Supplier",
        productName: "Test Product",
        samplePrice: 15,
      }),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.order).toBeDefined();
    expect(json.order.supplierId).toBe("sup1");
  });

  it("returns 400 for missing fields", async () => {
    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/samples", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.error).toContain("Missing");
  });
});
