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

vi.mock("@/lib/platform-search", () => ({
  searchCJCategories: vi.fn().mockResolvedValue([
    { id: "1", name: "Electronics" },
    { id: "2", name: "Fashion" },
  ]),
}));

describe("/api/products/categories", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("GET returns categories", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/products/categories");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });
});
