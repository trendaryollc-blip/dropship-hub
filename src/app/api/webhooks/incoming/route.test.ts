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

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

const mockGetIncomingWebhooks = vi.fn().mockResolvedValue({ webhooks: [], total: 0 });

vi.mock("@/lib/webhooks/incoming", () => ({
  getIncomingWebhooks: (...args: any[]) => mockGetIncomingWebhooks(...args),
}));

function makeReq(url: string) {
  const req = new Request(url);
  (req as any).nextUrl = new URL(url);
  return req;
}

describe("/api/webhooks/incoming", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetIncomingWebhooks.mockResolvedValue({ webhooks: [], total: 0 });
  });

  it("GET returns incoming webhooks", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeReq("http://localhost/api/webhooks/incoming") as any);
    expect(response.status).toBe(200);
  });

  it("GET returns 500 on error", async () => {
    mockGetIncomingWebhooks.mockRejectedValue(new Error("fail"));
    const { GET } = await import("./route");
    const response = await GET(makeReq("http://localhost/api/webhooks/incoming") as any);
    expect(response.status).toBe(500);
  });

  it("GET returns webhooks with status filter", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeReq("http://localhost/api/webhooks/incoming?status=active&limit=10") as any);
    expect(response.status).toBe(200);
    expect(mockGetIncomingWebhooks).toHaveBeenCalledWith("test-user-123", expect.objectContaining({ status: "active", limit: 10 }));
  });
});
