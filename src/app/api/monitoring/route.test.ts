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
  getAdminDB: vi.fn(),
}));

vi.mock("@/lib/monitoring/metrics", () => ({
  computeMonitoringMetrics: vi.fn(),
  getMonitoringHealth: vi.fn(),
}));

vi.mock("@/lib/monitoring/reprice-audit", () => ({
  getRepriceStats: vi.fn(),
  getRepriceAuditLog: vi.fn(),
}));

import { POST, GET, PATCH } from "./route";
import { getAdminDB } from "@/lib/firebase-admin";
import { computeMonitoringMetrics, getMonitoringHealth } from "@/lib/monitoring/metrics";
import { getRepriceStats, getRepriceAuditLog } from "@/lib/monitoring/reprice-audit";

function buildMockDocs(data: any[]) {
  return data.map((d) => ({ id: d.id || "doc-1", data: () => d }));
}

function buildQueryChain(docs: any[]) {
  return {
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    get: vi.fn().mockResolvedValue({ docs: buildMockDocs(docs), empty: docs.length === 0 }),
  };
}

function buildMockDb(collectionMap: Record<string, any[]>) {
  const userDoc: any = {};
  userDoc.collection = vi.fn().mockImplementation((name: string) => buildQueryChain(collectionMap[name] || []));
  return {
    collection: vi.fn().mockReturnValue({ doc: vi.fn().mockReturnValue(userDoc) }),
  };
}

function makeReq(body?: any, method = "POST", url = "http://localhost/api/monitoring") {
  return {
    json: vi.fn().mockResolvedValue(body ?? {}),
    url,
    method,
    nextUrl: new URL(url),
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/monitoring", () => {
  it("adds a monitored product", async () => {
    const mockDb = buildMockDb({});
    mockDb.collection().doc().collection = vi.fn().mockReturnValue({
      add: vi.fn().mockResolvedValue({ id: "new-doc-1" }),
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const res = await POST(makeReq({
      action: "add",
      productId: "prod-1",
      productTitle: "Test Product",
      currentPrice: 29.99,
    }));

    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.id).toBe("new-doc-1");
  });

  it("returns 400 for missing required fields on add", async () => {
    const res = await POST(makeReq({ action: "add" }));
    const json = await res.json();
    expect(json.error).toContain("required");
  });

  it("returns 400 for invalid action", async () => {
    const res = await POST(makeReq({ action: "invalid" }));
    const json = await res.json();
    expect(json.error).toBe("Invalid action");
  });
});

describe("GET /api/monitoring", () => {
  it("returns monitored products list", async () => {
    const mockDb = buildMockDb({
      monitoredProducts: [
        { id: "p1", productTitle: "Widget", currentPrice: 10 },
      ],
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const res = await GET(makeReq(undefined, "GET", "http://localhost/api/monitoring?type=list"));
    const json = await res.json();
    expect(json.products).toBeDefined();
    expect(Array.isArray(json.products)).toBe(true);
  });

  it("returns alerts when type=alerts", async () => {
    const mockDb = buildMockDb({
      monitoredProducts: [{
        id: "p1",
        productTitle: "Widget",
        productId: "wid-1",
        alerts: [{ id: "a1", type: "price_drop", message: "dropped", createdAt: "2025-01-01T00:00:00Z", read: false }],
      }],
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const res = await GET(makeReq(undefined, "GET", "http://localhost/api/monitoring?type=alerts"));
    const json = await res.json();
    expect(json.alerts).toBeDefined();
    expect(json.alerts.length).toBe(1);
  });

  it("returns metrics when type=metrics", async () => {
    (computeMonitoringMetrics as any).mockResolvedValue({ total: 5 });
    (getMonitoringHealth as any).mockResolvedValue({ status: "ok" });
    (getRepriceStats as any).mockResolvedValue({ repriced: 2 });

    const res = await GET(makeReq(undefined, "GET", "http://localhost/api/monitoring?type=metrics"));
    const json = await res.json();
    expect(json.metrics).toEqual({ total: 5 });
    expect(json.health).toEqual({ status: "ok" });
    expect(json.repriceStats).toEqual({ repriced: 2 });
  });
});

describe("PATCH /api/monitoring", () => {
  it("marks alerts as read", async () => {
    const docRef: any = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          alerts: [
            { id: "a1", read: false },
            { id: "a2", read: false },
          ],
        }),
      }),
      update: vi.fn(),
    };
    const mockDb = {
      collection: vi.fn().mockReturnValue({
        doc: vi.fn().mockReturnValue({
          collection: vi.fn().mockReturnValue({
            doc: vi.fn().mockReturnValue(docRef),
          }),
        }),
      }),
      runTransaction: vi.fn((fn: any) => fn({ get: docRef.get, update: docRef.update })),
    };
    (getAdminDB as any).mockResolvedValue(mockDb);

    const res = await PATCH(makeReq({ monitoredId: "m1", alertIds: ["a1"] }));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(docRef.update).toHaveBeenCalled();
  });
});
