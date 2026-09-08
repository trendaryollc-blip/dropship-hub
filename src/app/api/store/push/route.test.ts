import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 }, STORE_PUSH: { windowMs: 60000, maxRequests: 10 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/jwt", () => ({
  signTrendaryoToken: vi.fn().mockReturnValue("token"),
}));

vi.mock("@/lib/validation", () => ({
  validateBody: vi.fn((schema: any, body: any) => ({ success: true, data: body })),
  StorePushInputSchema: {},
}));

function makeReq(url: string, init?: RequestInit) {
  const req = new Request(url, init);
  (req as any).nextUrl = new URL(url);
  return req;
}

describe("/api/store/push", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("GET returns pushed products", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  get: vi.fn().mockResolvedValue({ docs: [] }),
                }),
              }),
            }),
          }),
        }),
      }),
    }));

    const { GET } = await import("./route");
    const response = await GET(makeReq("http://localhost/api/store/push") as any);
    expect(response.status).toBe(200);
  });

  it("POST returns 404 when store not found", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockImplementation((name: string) => ({
              doc: vi.fn().mockReturnValue({
                get: vi.fn().mockResolvedValue({ exists: false, data: () => undefined }),
                delete: vi.fn().mockResolvedValue(undefined),
              }),
              orderBy: vi.fn().mockReturnThis(),
              limit: vi.fn().mockReturnThis(),
              get: vi.fn().mockResolvedValue({ docs: [] }),
              add: vi.fn().mockResolvedValue({ id: "new" }),
            })),
          }),
        }),
      }),
    }));

    const { POST } = await import("./route");
    const response = await POST(makeReq("http://localhost/api/store/push", {
      method: "POST",
      body: JSON.stringify({ storeId: "nonexistent", productTitle: "Widget", productPrice: 10, productUrl: "http://test.com" }),
    }) as any);
    expect(response.status).toBe(404);
  });

  it("DELETE requires productId", async () => {
    vi.doMock("@/lib/firebase-admin", () => ({
      getAdminDB: vi.fn().mockResolvedValue({
        collection: vi.fn().mockReturnValue({
          doc: vi.fn().mockReturnValue({
            collection: vi.fn().mockReturnValue({
              doc: vi.fn().mockReturnValue({ delete: vi.fn().mockResolvedValue(undefined) }),
            }),
          }),
        }),
      }),
    }));

    const { DELETE } = await import("./route");
    const response = await DELETE(makeReq("http://localhost/api/store/push") as any);
    expect(response.status).toBe(400);
  });
});
