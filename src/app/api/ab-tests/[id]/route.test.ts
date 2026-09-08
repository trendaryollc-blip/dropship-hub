import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/data/ab-tests", () => ({
  getABTests: vi.fn().mockResolvedValue([{ id: "t1", name: "Test A" }]),
  updateABTest: vi.fn().mockResolvedValue(undefined),
}));

function makeReq(pathname: string, method: string, body?: any) {
  const req = new Request(`http://localhost${pathname}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
  });
  (req as any).nextUrl = new URL(`http://localhost${pathname}`);
  return req;
}

describe("/api/ab-tests/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET returns test", async () => {
    const { GET } = await import("./route");
    const response = await GET(makeReq("/api/ab-tests/t1", "GET") as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.test.id).toBe("t1");
  });

  it("GET returns 404 when not found", async () => {
    const { getABTests } = await import("@/lib/data/ab-tests");
    (getABTests as any).mockResolvedValueOnce([]);
    const { GET } = await import("./route");
    const response = await GET(makeReq("/api/ab-tests/missing", "GET") as any);
    expect(response.status).toBe(404);
  });

  it("PATCH updates and returns success", async () => {
    const { PATCH } = await import("./route");
    const response = await PATCH(makeReq("/api/ab-tests/t1", "PATCH", { name: "Updated" }) as any);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });
});
