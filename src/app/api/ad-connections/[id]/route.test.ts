import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/data/ad-connections", () => ({
  deleteAdConnection: vi.fn().mockResolvedValue(undefined),
}));

function makeReq(pathname: string, method: string, body?: any) {
  const req = new Request(`http://localhost${pathname}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
  (req as any).nextUrl = new URL(`http://localhost${pathname}`);
  return req;
}

describe("/api/ad-connections/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DELETE returns success", async () => {
    const { DELETE } = await import("./route");
    const response = await DELETE(makeReq("/api/ad-connections/conn1", "DELETE") as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
