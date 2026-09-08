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

vi.mock("@/lib/validation", () => ({
  SupplierPerformanceSchema: {},
  validateBody: vi.fn((schema: any, body: any) => ({ success: true, data: body })),
}));

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d }));
}

function buildQueryChain(docs: any[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
    add: vi.fn().mockResolvedValue({ id: "new-doc-id" }),
  };
}

function buildMockDb(collectionMap: Record<string, any[]>) {
  const userDoc: any = {};
  userDoc.collection = vi.fn().mockImplementation((name: string) => buildQueryChain(collectionMap[name] || []));
  return { collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }) };
}

describe("GET /api/suppliers/performance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns suppliers", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        supplierPerformance: [
          { id: "sp1", supplierId: "s1", supplierName: "Supplier One", reliabilityScore: 85, createdAt: "2025-01-01" },
          { id: "sp2", supplierId: "s2", supplierName: "Supplier Two", reliabilityScore: 70, createdAt: "2025-01-02" },
        ],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/performance");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.suppliers).toBeDefined();
    expect(json.suppliers.length).toBeGreaterThanOrEqual(1);
  });

  it("returns alerts when type=alerts", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        supplierAlerts: [
          { id: "a1", message: "Low stock", createdAt: "2025-01-01" },
        ],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/performance?type=alerts");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.alerts).toBeDefined();
    expect(json.alerts).toHaveLength(1);
  });

  it("returns comparison when type=comparison", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(
      buildMockDb({
        supplierPerformance: [
          { id: "sp1", supplierId: "s1", supplierName: "Supplier One", reliabilityScore: 85 },
        ],
      })
    );

    const { GET } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/performance?type=comparison");
    const res = await GET(req as any);
    const json = await res.json();

    expect(json.comparison).toBeDefined();
    expect(json.comparison).toHaveLength(1);
  });
});

describe("POST /api/suppliers/performance", () => {
  beforeEach(() => vi.clearAllMocks());

  it("saves performance entry", async () => {
    const { getAdminDB } = await import("@/lib/firebase-admin");
    (getAdminDB as any).mockResolvedValue(buildMockDb({}));

    const { POST } = await import("./route");
    const body = { supplierId: "s1", supplierName: "Supplier One", reliabilityScore: 90 };
    const req = new Request("http://localhost/api/suppliers/performance", {
      method: "POST",
      body: JSON.stringify(body),
    });
    const res = await POST(req as any);
    const json = await res.json();

    expect(json.success).toBe(true);
    expect(json.id).toBe("new-doc-id");
  });

  it("returns validation error when validation fails", async () => {
    const { validateBody } = await import("@/lib/validation");
    (validateBody as any).mockReturnValue({ success: false, response: new Response(JSON.stringify({ error: "Invalid" }), { status: 400 }) });

    const { POST } = await import("./route");
    const req = new Request("http://localhost/api/suppliers/performance", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req as any);

    expect(res.status).toBe(400);
  });
});
