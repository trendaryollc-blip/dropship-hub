import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, { uid: "test-user-123" });
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockGetSuppliers = vi.fn().mockResolvedValue([
  { id: "cj-dropshipping", name: "CJ Dropshipping", slug: "cj-dropshipping" },
]);
const mockSearchSuppliers = vi.fn().mockResolvedValue([
  { id: "cj-dropshipping", name: "CJ Dropshipping" },
]);
const mockGetSupplierById = vi.fn().mockResolvedValue({ id: "cj-dropshipping", name: "CJ Dropshipping" });

vi.mock("@/lib/supplier-service", () => ({
  getSuppliers: (...args: any[]) => mockGetSuppliers(...args),
  searchSuppliers: (...args: any[]) => mockSearchSuppliers(...args),
  getSupplierById: (...args: any[]) => mockGetSupplierById(...args),
}));

describe("/api/suppliers", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetSuppliers.mockResolvedValue([
      { id: "cj-dropshipping", name: "CJ Dropshipping", slug: "cj-dropshipping" },
    ]);
    mockSearchSuppliers.mockResolvedValue([
      { id: "cj-dropshipping", name: "CJ Dropshipping" },
    ]);
    mockGetSupplierById.mockResolvedValue({ id: "cj-dropshipping", name: "CJ Dropshipping" });
  });

  it("GET returns suppliers", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("GET returns JSON with suppliers array", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers");
    const response = await GET(request as any);
    const data = await response.json();
    expect(data).toHaveProperty("suppliers");
    expect(Array.isArray(data.suppliers)).toBe(true);
  });

  it("GET with search query searches suppliers", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers?q=cj");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
    expect(mockSearchSuppliers).toHaveBeenCalledWith("cj");
  });

  it("GET with id parameter returns supplier", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers?id=cj-dropshipping");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
    expect(mockGetSupplierById).toHaveBeenCalledWith("cj-dropshipping");
  });

  it("GET without params returns all suppliers", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers");
    await GET(request as any);
    expect(mockGetSuppliers).toHaveBeenCalled();
  });

  it("GET with empty query returns all suppliers", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers?q=");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("GET handles supplier service errors gracefully", async () => {
    mockGetSuppliers.mockRejectedValue(new Error("Service error"));
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers");
    const response = await GET(request as any);
    expect(response.status).toBe(500);
  });

  it("GET with id returns 404 for unknown supplier", async () => {
    mockGetSupplierById.mockResolvedValue(null);
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers?id=unknown");
    const response = await GET(request as any);
    expect(response.status).toBe(404);
  });

  it("GET returns supplier data with correct structure", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers?id=cj-dropshipping");
    const response = await GET(request as any);
    const data = await response.json();
    expect(data).toHaveProperty("supplier");
    expect(data.supplier).toHaveProperty("id");
    expect(data.supplier).toHaveProperty("name");
  });

  it("GET returns suppliers with live data source only", async () => {
    mockGetSuppliers.mockResolvedValue([
      { id: "cj", name: "CJ", dataSource: "live" },
    ]);
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers");
    const response = await GET(request as any);
    const data = await response.json();
    data.suppliers.forEach((s: any) => {
      expect(s.dataSource).not.toBe("sample");
    });
  });
});
