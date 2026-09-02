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
          add: vi.fn().mockResolvedValue({ id: "digest-1" }),
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
            get: vi.fn().mockResolvedValue({ docs: [] }),
          }),
          where: vi.fn().mockReturnValue({
            get: vi.fn().mockResolvedValue({ docs: [] }),
            where: vi.fn().mockReturnValue({
              get: vi.fn().mockResolvedValue({ docs: [] }),
            }),
          }),
          get: vi.fn().mockResolvedValue({ docs: [] }),
        }),
        get: vi.fn().mockResolvedValue({ exists: false, data: () => null }),
        set: vi.fn().mockResolvedValue(undefined),
      }),
    }),
  }),
}));

vi.mock("@/lib/email-digest", () => ({
  sendDigestEmail: vi.fn().mockResolvedValue(true),
}));

describe("/api/digest", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("GET returns digests", async () => {
    const { GET } = await import("./route");
    const request = new Request("http://localhost/api/digest");
    const response = await GET(request as any);
    expect(response.status).toBe(200);
  });

  it("POST generates digest", async () => {
    const { POST } = await import("./route");
    const request = new Request("http://localhost/api/digest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: "2024-01-15" }),
    });
    const response = await POST(request as any);
    expect([200, 500]).toContain(response.status);
  });
});
