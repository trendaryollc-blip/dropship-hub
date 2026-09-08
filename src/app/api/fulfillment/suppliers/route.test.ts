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

function makeRequest(method: string, url: string, body?: any) {
  const parsedUrl = new URL(url);
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  const req = new Request(url, init) as any;
  req.nextUrl = parsedUrl;
  return req;
}

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d, exists: true }));
}

describe("/api/fulfillment/suppliers", () => {
  let mockDb: any;
  let productSuppliersCol: any;
  let productSuppliersDoc: any;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    productSuppliersDoc = {
      get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
      set: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
    };

    productSuppliersCol = {
      get: vi.fn().mockResolvedValue({ docs: [] }),
      doc: vi.fn().mockReturnValue(productSuppliersDoc),
    };

    const mockUserDoc: any = {};
    mockUserDoc.collection = vi.fn().mockImplementation((name: string) => {
      if (name === "productSuppliers") return productSuppliersCol;
      return { get: vi.fn().mockResolvedValue({ docs: [] }) };
    });

    mockDb = {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue(mockUserDoc),
      }),
    };

    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue(mockDb),
    }));
  });

  describe("GET", () => {
    it("returns all assignments", async () => {
      productSuppliersCol.get.mockResolvedValue({
        docs: buildMockDocs([
          { id: "prod-1", productId: "prod-1", supplierId: "cj" },
          { id: "prod-2", productId: "prod-2", supplierId: "aliexpress" },
        ]),
      });

      const { GET } = await import("./route");
      const req = makeRequest("GET", "http://localhost/api/fulfillment/suppliers");
      const res = await GET(req);
      const json = await res.json();

      expect(json.assignments).toHaveLength(2);
      expect(json.assignments[0].supplierId).toBe("cj");
    });

    it("returns specific assignment when productId provided", async () => {
      productSuppliersDoc.get.mockResolvedValue({
        exists: true,
        data: () => ({ productId: "prod-1", supplierId: "cj" }),
      });

      const { GET } = await import("./route");
      const req = makeRequest("GET", "http://localhost/api/fulfillment/suppliers?productId=prod-1");
      const res = await GET(req);
      const json = await res.json();

      expect(json.assignment).toBeDefined();
      expect(json.assignment.supplierId).toBe("cj");
    });

    it("returns 500 on error", async () => {
      mockDb.collection.mockImplementation(() => {
        throw new Error("db error");
      });

      const { GET } = await import("./route");
      const req = makeRequest("GET", "http://localhost/api/fulfillment/suppliers");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  describe("POST", () => {
    it("saves assignment", async () => {
      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/suppliers", {
        productId: "prod-1",
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        unitCost: 5.99,
        shippingCost: 2.5,
      });
      const res = await POST(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(productSuppliersDoc.set).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: "prod-1",
          supplierId: "cj",
        }),
        { merge: true }
      );
    });

    it("returns 400 when productId missing", async () => {
      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/suppliers", {
        supplierId: "cj",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when supplierId missing", async () => {
      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/suppliers", {
        productId: "prod-1",
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("returns 500 on error", async () => {
      mockDb.collection.mockImplementation(() => {
        throw new Error("db error");
      });

      const { POST } = await import("./route");
      const req = makeRequest("POST", "http://localhost/api/fulfillment/suppliers", {
        productId: "prod-1",
        supplierId: "cj",
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE", () => {
    it("deletes assignment", async () => {
      const { DELETE } = await import("./route");
      const req = makeRequest("DELETE", "http://localhost/api/fulfillment/suppliers?productId=prod-1");
      const res = await DELETE(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(productSuppliersDoc.delete).toHaveBeenCalled();
    });

    it("returns 400 when productId missing", async () => {
      const { DELETE } = await import("./route");
      const req = makeRequest("DELETE", "http://localhost/api/fulfillment/suppliers");
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it("returns 500 on error", async () => {
      mockDb.collection.mockImplementation(() => {
        throw new Error("db error");
      });

      const { DELETE } = await import("./route");
      const req = makeRequest("DELETE", "http://localhost/api/fulfillment/suppliers?productId=prod-1");
      const res = await DELETE(req);
      expect(res.status).toBe(500);
    });
  });
});
