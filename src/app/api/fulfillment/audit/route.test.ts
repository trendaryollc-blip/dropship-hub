import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { FULFILLMENT: { windowMs: 60000, maxRequests: 30 }, DEFAULT: { windowMs: 60000, maxRequests: 60 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

const mockGetAuditLogs = vi.fn();
const mockGetAuditLogCount = vi.fn();
const mockGetAuditStats = vi.fn();
const mockClearAuditLogs = vi.fn();

vi.mock("@/lib/fulfillment/audit-logger", () => ({
  getAuditLogs: (...args: any[]) => mockGetAuditLogs(...args),
  getAuditLogCount: (...args: any[]) => mockGetAuditLogCount(...args),
  getAuditStats: (...args: any[]) => mockGetAuditStats(...args),
  clearAuditLogs: (...args: any[]) => mockClearAuditLogs(...args),
}));

function makeRequest(method: string, url: string, body?: any) {
  const parsedUrl = new URL(url);
  const init: RequestInit = { method };
  if (body) init.body = JSON.stringify(body);
  const req = new Request(url, init) as any;
  req.nextUrl = parsedUrl;
  return req;
}

const mockLogs = [
  { id: "audit-1", orderId: "order-1", action: "order_detected", details: "New order", metadata: {}, timestamp: "2026-01-01T00:00:00.000Z" },
  { id: "audit-2", orderId: "order-2", action: "order_placed", details: "Order placed", metadata: {}, timestamp: "2026-01-01T01:00:00.000Z" },
];

describe("/api/fulfillment/audit", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGetAuditLogs.mockReturnValue(mockLogs);
    mockGetAuditLogCount.mockReturnValue(2);
    mockGetAuditStats.mockReturnValue({
      totalEvents: 2,
      eventsByAction: { order_detected: 1, order_placed: 1 },
      recentErrors: [],
      ordersProcessed: 2,
    });
    mockClearAuditLogs.mockReturnValue(2);
  });

  describe("GET", () => {
    it("returns audit logs", async () => {
      const { GET } = await import("./route");
      const req = makeRequest("GET", "http://localhost/api/fulfillment/audit");
      const res = await GET(req);
      const json = await res.json();

      expect(json.logs).toEqual(mockLogs);
      expect(json.total).toBe(2);
      expect(json.offset).toBe(0);
      expect(json.limit).toBe(50);
    });

    it("returns stats when stats=true", async () => {
      const { GET } = await import("./route");
      const req = makeRequest("GET", "http://localhost/api/fulfillment/audit?stats=true");
      const res = await GET(req);
      const json = await res.json();

      expect(json.stats).toBeDefined();
      expect(json.stats.totalEvents).toBe(2);
      expect(json.stats.ordersProcessed).toBe(2);
    });

    it("returns 500 on error", async () => {
      mockGetAuditLogs.mockImplementation(() => {
        throw new Error("audit error");
      });

      const { GET } = await import("./route");
      const req = makeRequest("GET", "http://localhost/api/fulfillment/audit");
      const res = await GET(req);
      expect(res.status).toBe(500);
    });
  });

  describe("DELETE", () => {
    it("clears audit logs", async () => {
      const { DELETE } = await import("./route");
      const req = makeRequest("DELETE", "http://localhost/api/fulfillment/audit");
      const res = await DELETE(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(json.cleared).toBe(2);
    });

    it("clears audit logs for specific orderId", async () => {
      const { DELETE } = await import("./route");
      const req = makeRequest("DELETE", "http://localhost/api/fulfillment/audit?orderId=order-1");
      const res = await DELETE(req);
      const json = await res.json();

      expect(json.success).toBe(true);
      expect(mockClearAuditLogs).toHaveBeenCalledWith("test-user-123", "order-1");
    });

    it("returns 500 on error", async () => {
      mockClearAuditLogs.mockImplementation(() => {
        throw new Error("clear error");
      });

      const { DELETE } = await import("./route");
      const req = makeRequest("DELETE", "http://localhost/api/fulfillment/audit");
      const res = await DELETE(req);
      expect(res.status).toBe(500);
    });
  });
});
