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
  orderBy: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockReturnValue({ get: mockGet }) }), limit: vi.fn().mockReturnValue({ get: mockGet }) }),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection }),
}));

describe("/api/returns/refund", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGet.mockResolvedValue({ exists: false, data: () => null, docs: [] });
    mockSet.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
  });

  it("GET returns refund calculations", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/returns/refund");
    (request as any).nextUrl = new URL("http://localhost/api/returns/refund");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("GET filters by returnRequestId", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/returns/refund?returnRequestId=ret-1");
    (request as any).nextUrl = new URL("http://localhost/api/returns/refund?returnRequestId=ret-1");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("POST calculate action creates refund calculation", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        items: [{ unitPrice: 29.99, quantity: 1 }],
        orderId: "ord-1",
      }),
    });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "calculate", returnRequestId: "ret-1", refundMethod: "original" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/refund");
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST calculate returns 404 for missing return", async () => {
    mockGet.mockResolvedValue({ exists: false });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "calculate", returnRequestId: "nonexistent" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/refund");
    const response = await POST(request as any);
    expect(response.status).toBe(404);
  });

  it("POST calculate returns 400 without returnRequestId", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "calculate" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/refund");
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST process action marks refund as processed", async () => {
    mockGet.mockResolvedValue({
      exists: true,
      data: () => ({
        returnRequestId: "ret-1",
        totalRefund: 29.99,
      }),
    });
    // Second mock call for the return request lookup
    mockGet
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ returnRequestId: "ret-1", totalRefund: 29.99 }),
      })
      .mockResolvedValueOnce({
        exists: true,
        data: () => ({ status: "label_generated" }),
      });

    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "process", refundId: "ref-1" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/refund");
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST process returns 404 for missing refund", async () => {
    mockGet.mockResolvedValue({ exists: false });
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "process", refundId: "nonexistent" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/refund");
    const response = await POST(request as any);
    expect(response.status).toBe(404);
  });

  it("POST process returns 400 without refundId", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "process" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/refund");
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("POST returns 400 for invalid action", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/returns/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "invalid" }),
    });
    (request as any).nextUrl = new URL("http://localhost/api/returns/refund");
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });
});
