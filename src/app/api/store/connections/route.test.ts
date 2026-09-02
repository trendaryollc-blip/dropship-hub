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
  getAdminDB: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          add: vi.fn().mockResolvedValue({ id: "conn-1" }),
          orderBy: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ docs: [] }),
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }),
        }),
        delete: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

describe("/api/store/connections", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("GET returns connections", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/store/connections");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.connections).toBeDefined();
    expect(Array.isArray(data.connections)).toBe(true);
  });

  it("POST creates a connection", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/store/connections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        platform: "shopify",
        name: "My Store",
        url: "https://store.myshopify.com",
        accessToken: "shpat_xxx",
      }),
    });
    const response = await POST(request as any);
    expect(response.status).toBe(200);
  });
});
