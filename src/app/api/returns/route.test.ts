import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { RETURNS: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet, set: mockSet, update: mockUpdate, id: "auto-id", collection: mockCollection }));
const mockCollection = vi.fn(() => ({ doc: mockDoc, orderBy: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ get: mockGet }) }), limit: vi.fn().mockReturnValue({ get: mockGet }) }) }));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection }),
}));

describe("/api/returns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ exists: false, data: () => null, docs: [] });
    mockSet.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
  });

  it("GET returns returns list", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/returns");
    (request as any).nextUrl = new URL("http://localhost/api/returns");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("POST create action creates a return request", async () => {
    const { POST } = await import("./route");
    const body = {
      action: "create",
      orderId: "ord-1",
      orderNumber: "ORD-001",
      customerId: "cust-1",
      customerName: "John",
      customerEmail: "j@e.com",
      items: [{ productId: "p1", productName: "W", quantity: 1, unitPrice: 5, imageUrl: "" }],
      reason: "defective",
      reasonDetails: "broken",
      supplierId: "sup-1",
      supplierName: "Supplier",
      platform: "shopify",
      storePlatform: "custom",
    };
    const request = new Request("http://localhost/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns");
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST updateStatus action updates status", async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ status: "pending" }) });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateStatus", returnId: "ret-1", status: "approved" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns");
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST updateStatus returns 404 for missing return", async () => {
    mockGet.mockResolvedValue({ exists: false });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateStatus", returnId: "nonexistent", status: "approved" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns");
    const response = await POST(request as any);
    expect(response.status).toBe(404);
  });

  it("POST updateStatus returns 400 without returnId", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "updateStatus", status: "approved" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns");
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST generateLabel creates a label", async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ supplierName: "Supplier" }) });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "generateLabel", returnId: "ret-1" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns");
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST detect action finds return candidates", async () => {
    mockGet.mockResolvedValue({
      docs: [],
      data: () => null,
      exists: false,
    });
    // Override to handle both fulfillmentOrders and returnRequests queries
    mockCollection.mockReturnValue({
      doc: mockDoc,
      get: mockGet,
      orderBy: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ get: mockGet }),
        }),
        limit: vi.fn().mockReturnValue({ get: mockGet }),
      }),
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({ get: mockGet }),
      }),
    } as any);

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "detect" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns");
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST returns 400 for invalid action", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invalid" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns");
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("PATCH updates a return request", async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({}) });
    const { PATCH } = await import("./route");
    const request = new Request("http://localhost/api/returns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnId: "ret-1", status: "approved" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns");
    const response = await PATCH(request as any);
    expect(response.status).toBe(200);
  });

  it("PATCH returns 404 for missing return", async () => {
    mockGet.mockResolvedValue({ exists: false });
    const { PATCH } = await import("./route");
    const request = new Request("http://localhost/api/returns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ returnId: "nonexistent", status: "approved" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns");
    const response = await PATCH(request as any);
    expect(response.status).toBe(404);
  });

  it("PATCH returns 400 without returnId", async () => {
    const { PATCH } = await import("./route");
    const request = new Request("http://localhost/api/returns", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "approved" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns");
    const response = await PATCH(request as any);
    expect(response.status).toBe(400);
  });
});
