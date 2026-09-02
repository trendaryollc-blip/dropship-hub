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

vi.mock("@/lib/supplier-service", () => ({
  getSuppliers: vi.fn().mockResolvedValue([
    { id: "cj", name: "CJ Dropshipping" },
  ]),
  searchSuppliers: vi.fn().mockResolvedValue([]),
  getSupplierById: vi.fn().mockResolvedValue({ id: "cj", name: "CJ Dropshipping" }),
}));

describe("/api/suppliers", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("GET returns suppliers", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("GET with search query searches suppliers", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers?q=cj");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("GET with id parameter returns supplier", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/suppliers?id=cj");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });
});
