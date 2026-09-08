import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => handler(req, "test-user-123")),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { BILLING: { windowMs: 60000, maxRequests: 10 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockGet = vi.fn();
const mockSet = vi.fn();
const mockSubDoc = vi.fn(() => ({ get: mockGet, set: mockSet }));
const mockSubCollection = vi.fn(() => ({ doc: mockSubDoc }));
const mockDoc = vi.fn(() => ({ collection: mockSubCollection }));
const mockCollection = vi.fn(() => ({ doc: mockDoc }));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({ collection: mockCollection }),
}));

describe("/api/settings/notifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockGet.mockResolvedValue({ exists: false, data: () => null });
    mockSet.mockResolvedValue(undefined);
  });

  it("GET returns notification preferences", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/settings/notifications");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("GET returns saved preferences when they exist", async () => {
    mockGet.mockResolvedValue({ exists: true, data: () => ({ priceAlerts: false, stockAlerts: true }) });
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/settings/notifications");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("POST saves notification preferences", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/settings/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences: { priceAlerts: true, stockAlerts: false } }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });

  it("POST returns 400 without preferences", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/settings/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(400);
  });

  it("GET returns 500 on error", async () => {
    mockGet.mockRejectedValue(new Error("DB error"));
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/settings/notifications");
    const response = await GET(request as any);
    expect(response.status).toBe(500);
  });
});
