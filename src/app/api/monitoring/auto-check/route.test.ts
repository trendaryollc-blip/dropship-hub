import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/auth", () => ({
  withAuth: vi.fn((handler: any) => async (req: any) => {
    return handler(req, "test-user-123");
  }),
}));

vi.mock("@/lib/rate-limit", () => ({
  LIMITS: { DEFAULT: { windowMs: 60000, maxRequests: 60 }, FULFILLMENT: { windowMs: 60000, maxRequests: 30 } },
  rateLimitByUser: vi.fn(() => ({ allowed: true })),
}));

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

vi.mock("@/lib/monitoring/scheduler", () => ({
  runPriceCheckForUser: vi.fn(),
  runPriceCheckForProduct: vi.fn(),
}));

import { POST, GET } from "./route";
import { getAdminDB } from "@/lib/firebase-admin";
import { runPriceCheckForUser, runPriceCheckForProduct } from "@/lib/monitoring/scheduler";

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

function makeReq(body?: any, method = "POST", url = "http://localhost/api/monitoring/auto-check") {
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

describe("POST /api/monitoring/auto-check", () => {
  it("runs auto-check for all products", async () => {
    (runPriceCheckForUser as any).mockResolvedValue({
      checked: 5,
      priceChanged: 2,
      stockChanged: 1,
      alerts: 3,
      errors: 0,
    });

    const res = await POST(makeReq({}));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.checked).toBe(5);
    expect(json.priceChanged).toBe(2);
  });

  it("runs auto-check for a specific product", async () => {
    (runPriceCheckForProduct as any).mockResolvedValue({
      priceChanged: true,
      stockChanged: false,
      newAlerts: 1,
    });

    const res = await POST(makeReq({ monitoredId: "m1" }));
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.priceChanged).toBe(true);
    expect(json.message).toContain("Price changed");
  });

  it("returns 500 on failure", async () => {
    (runPriceCheckForUser as any).mockRejectedValue(new Error("check failed"));

    const res = await POST(makeReq({}));
    const json = await res.json();
    expect(json.error).toBe("Auto-check failed");
  });
});

describe("GET /api/monitoring/auto-check", () => {
  it("returns monitoring status with products", async () => {
    const mockDb = buildMockDb({
      monitoredProducts: [{
        id: "p1",
        productTitle: "Widget",
        currentPrice: 10,
        stockStatus: "in_stock",
        lastChecked: "2025-01-01",
        alerts: [{ read: false }],
        priceDropThreshold: 5,
        autoDelist: false,
        competitorUrls: [],
      }],
    });
    (getAdminDB as any).mockResolvedValue(mockDb);

    const res = await GET(makeReq(undefined, "GET"));
    const json = await res.json();
    expect(json.totalMonitored).toBe(1);
    expect(json.totalAlerts).toBe(1);
    expect(json.outOfStock).toBe(0);
  });
});
