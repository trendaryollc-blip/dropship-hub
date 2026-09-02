import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, { uid: "test-user-123" });
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { FULFILLMENT: { windowMs: 60000, maxRequests: 10 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn().mockResolvedValue({
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          add: vi.fn().mockResolvedValue({ id: "order-1" }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }),
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ docs: [] }),
          }),
        }),
        get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
        update: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

describe("/api/fulfillment", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("GET returns fulfillment orders", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/fulfillment");
    (request as any).nextUrl = new URL("http://localhost/api/fulfillment");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });
});
