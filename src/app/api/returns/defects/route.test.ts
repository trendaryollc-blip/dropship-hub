import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { RETURNS: { windowMs: 60000, maxRequests: 30 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockUpdate = vi.fn();
const mockDoc = vi.fn(() => ({ get: mockGet, set: mockSet, update: mockUpdate, id: "auto-id", collection: mockCollection }));
const mockCollection = vi.fn(() => ({
  doc: mockDoc,
  orderBy: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ get: mockGet }) }),
    limit: vi.fn().mockReturnValue({ get: mockGet }),
  }),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection }),
}));

describe("/api/returns/defects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ exists: false, data: () => null, docs: [] });
    mockSet.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
  });

  it("GET returns defect list", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/returns/defects");
    (request as any).nextUrl = new URL("http://localhost/api/returns/defects");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("GET filters by supplierId", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/returns/defects?supplierId=sup-1");
    (request as any).nextUrl = new URL("http://localhost/api/returns/defects?supplierId=sup-1");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("GET analytics type returns analytics", async () => {
    mockGet.mockResolvedValue({ docs: [] });
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/returns/defects?type=analytics");
    (request as any).nextUrl = new URL("http://localhost/api/returns/defects?type=analytics");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("POST report action creates defect report", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/defects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "report",
        productId: "prod-1",
        productName: "Widget",
        supplierId: "sup-1",
        supplierName: "Supplier",
        orderId: "ord-1",
        defectType: "broken",
        description: "Arrived broken",
        severity: "high",
        reportedBy: "customer",
      }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/defects");
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST report returns 400 without required fields", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/defects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "report", productId: "" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/defects");
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST resolve action resolves defect", async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({}) });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/defects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", defectId: "def-1", resolution: "replacement_sent" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/defects");
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST resolve returns 404 for missing defect", async () => {
    mockGet.mockResolvedValue({ exists: false });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/defects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", defectId: "nonexistent", resolution: "replacement_sent" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/defects");
    const response = await POST(request as any);
    expect(response.status).toBe(404);
  });

  it("POST resolve returns 400 for invalid resolution", async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({}) });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/defects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "resolve", defectId: "def-1", resolution: "invalid_resolution" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/defects");
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST returns 400 for invalid action", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/defects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invalid" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/defects");
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("PATCH updates a defect report", async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({}) });
    const { PATCH } = await import("./route");
    const request = new Request("http://localhost/api/returns/defects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defectId: "def-1", severity: "critical" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/defects");
    const response = await PATCH(request as any);
    expect(response.status).toBe(200);
  });

  it("PATCH returns 404 for missing defect", async () => {
    mockGet.mockResolvedValue({ exists: false });
    const { PATCH } = await import("./route");
    const request = new Request("http://localhost/api/returns/defects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ defectId: "nonexistent", severity: "critical" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/defects");
    const response = await PATCH(request as any);
    expect(response.status).toBe(404);
  });

  it("PATCH returns 400 without defectId", async () => {
    const { PATCH } = await import("./route");
    const request = new Request("http://localhost/api/returns/defects", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ severity: "critical" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/defects");
    const response = await PATCH(request as any);
    expect(response.status).toBe(400);
  });
});
