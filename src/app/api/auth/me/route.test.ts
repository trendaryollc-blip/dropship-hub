import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
  isOwner: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

describe("/api/auth/me", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("GET returns user info", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/auth/me");
    const response = await GET(request as any);
    const data = await response.json();
    expect(data.uid).toBe("test-user-123");
  });
});
