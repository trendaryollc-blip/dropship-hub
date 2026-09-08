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
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const mockGetWebhookLogs = vi.fn().mockResolvedValue({ logs: [{ id: "log-1", event: "order.created" }], total: 1 });
const mockDeleteOldWebhookLogs = vi.fn().mockResolvedValue(5);

vi.mock("@/lib/webhooks/event-log", () => ({
  getWebhookLogs: (...args: any[]) => mockGetWebhookLogs(...args),
  getWebhookLogStats: vi.fn().mockResolvedValue({ total: 1, incoming: 1, outgoing: 0 }),
  deleteOldWebhookLogs: (...args: any[]) => mockDeleteOldWebhookLogs(...args),
}));

function makeReq(url: string, init?: RequestInit) {
  const req = new Request(url, init);
  (req as any).nextUrl = new URL(url);
  return req;
}

describe("GET /api/webhooks/logs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns webhook logs", async () => {
    const { GET } = await import("./route");
    const res = await GET(makeReq("http://localhost/api/webhooks/logs") as any);
    const json = await res.json();

    expect(json.logs).toHaveLength(1);
    expect(json.total).toBe(1);
  });

  it("passes direction and limit params", async () => {
    const { GET } = await import("./route");
    await GET(makeReq("http://localhost/api/webhooks/logs?direction=incoming&limit=10") as any);

    expect(mockGetWebhookLogs).toHaveBeenCalledWith("test-user-123", {
      direction: "incoming",
      webhookId: undefined,
      limit: 10,
      offset: 0,
    });
  });
});

describe("DELETE /api/webhooks/logs", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes old logs and returns count", async () => {
    const { DELETE } = await import("./route");
    const res = await DELETE(makeReq("http://localhost/api/webhooks/logs?olderThanDays=7", { method: "DELETE" }) as any);
    const json = await res.json();

    expect(json.deleted).toBe(5);
  });
});
