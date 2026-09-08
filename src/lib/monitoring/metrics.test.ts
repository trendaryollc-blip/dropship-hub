import { describe, it, expect, vi, beforeEach } from "vitest";
import type { MonitoredProduct } from "./types";

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { computeMonitoringMetrics, getMonitoringHealth } from "./metrics";
import { getAdminDB } from "@/lib/firebase-admin";

function createMockProduct(overrides: Partial<MonitoredProduct> = {}): MonitoredProduct {
  return {
    productId: "p1",
    productTitle: "Test",
    source: "amazon",
    sourceUrl: "https://amazon.com/dp/123",
    currentPrice: 29.99,
    lowestPrice: 25.99,
    highestPrice: 34.99,
    lastChecked: new Date().toISOString(),
    priceHistory: [],
    stockStatus: "in_stock",
    alerts: [],
    ...overrides,
  };
}

function createMockDb(products: MonitoredProduct[]) {
  const mockDocs = products.map((p, i) => ({
    id: `doc-${i}`,
    data: () => p,
  }));

  return {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue({
        collection: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            empty: products.length === 0,
            docs: mockDocs,
            size: products.length,
          }),
        }),
      }),
    }),
  };
}

describe("computeMonitoringMetrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns zero metrics for empty collection", async () => {
    const mockDb = createMockDb([]);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await computeMonitoringMetrics("uid-1");
    expect(result.totalMonitored).toBe(0);
    expect(result.inStock).toBe(0);
    expect(result.outOfStock).toBe(0);
    expect(result.unknown).toBe(0);
    expect(result.totalAlerts).toBe(0);
    expect(result.unreadAlerts).toBe(0);
    expect(result.lastCheckTime).toBeNull();
  });

  it("counts stock status correctly", async () => {
    const products = [
      createMockProduct({ stockStatus: "in_stock" }),
      createMockProduct({ stockStatus: "in_stock" }),
      createMockProduct({ stockStatus: "out_of_stock" }),
      createMockProduct({ stockStatus: "unknown" }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await computeMonitoringMetrics("uid-1");
    expect(result.totalMonitored).toBe(4);
    expect(result.inStock).toBe(2);
    expect(result.outOfStock).toBe(1);
    expect(result.unknown).toBe(1);
  });

  it("counts alerts correctly", async () => {
    const now = new Date().toISOString();
    const products = [
      createMockProduct({
        alerts: [
          { id: "a1", type: "price_drop", message: "Drop", createdAt: now, read: false },
          { id: "a2", type: "price_increase", message: "Increase", createdAt: now, read: true },
        ],
      }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await computeMonitoringMetrics("uid-1");
    expect(result.totalAlerts).toBe(2);
    expect(result.unreadAlerts).toBe(1);
  });

  it("counts 24h alerts correctly", async () => {
    const now = new Date().toISOString();
    const old = new Date(Date.now() - 2 * 86400000).toISOString();
    const products = [
      createMockProduct({
        alerts: [
          { id: "a1", type: "price_drop", message: "Drop", createdAt: now, read: false },
          { id: "a2", type: "price_increase", message: "Inc", createdAt: now, read: false },
          { id: "a3", type: "out_of_stock", message: "OOS", createdAt: old, read: false },
        ],
      }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await computeMonitoringMetrics("uid-1");
    expect(result.priceDrops24h).toBe(1);
    expect(result.priceIncreases24h).toBe(1);
    expect(result.stockOutEvents24h).toBe(0);
  });

  it("calculates average price change percent", async () => {
    const products = [
      createMockProduct({
        priceHistory: [
          { date: "2025-01-01", price: 100 },
          { date: "2025-01-02", price: 110 },
        ],
      }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await computeMonitoringMetrics("uid-1");
    expect(result.avgPriceChangePercent).toBeCloseTo(10, 0);
  });

  it("tracks latest check time", async () => {
    const now = new Date().toISOString();
    const products = [
      createMockProduct({ lastChecked: new Date(Date.now() - 100000).toISOString() }),
      createMockProduct({ lastChecked: now }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await computeMonitoringMetrics("uid-1");
    expect(result.lastCheckTime).toBe(now);
  });

  it("returns zero metrics on error", async () => {
    (getAdminDB as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("DB error"));

    const result = await computeMonitoringMetrics("uid-1");
    expect(result.totalMonitored).toBe(0);
  });
});

describe("getMonitoringHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns healthy status for recent checks with no issues", async () => {
    const products = [
      createMockProduct({
        stockStatus: "in_stock",
        lastChecked: new Date().toISOString(),
        alerts: [],
      }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await getMonitoringHealth("uid-1");
    expect(result.status).toBe("healthy");
    expect(result.recommendations).toHaveLength(0);
  });

  it("returns degraded for stale checks", async () => {
    const staleTime = new Date(Date.now() - 8 * 3600000).toISOString();
    const products = [
      createMockProduct({ lastChecked: staleTime, stockStatus: "in_stock" }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await getMonitoringHealth("uid-1");
    expect(result.status).toBe("degraded");
    expect(result.productsNeedingAttention).toBeGreaterThan(0);
  });

  it("returns critical for very stale checks", async () => {
    const staleTime = new Date(Date.now() - 15 * 3600000).toISOString();
    const products = [
      createMockProduct({ lastChecked: staleTime, stockStatus: "in_stock" }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await getMonitoringHealth("uid-1");
    expect(result.status).toBe("critical");
  });

  it("recommends action for out-of-stock products", async () => {
    const products = [
      createMockProduct({ stockStatus: "out_of_stock", lastChecked: new Date().toISOString() }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await getMonitoringHealth("uid-1");
    expect(result.recommendations.some((r) => r.includes("out of stock"))).toBe(true);
    expect(result.productsNeedingAttention).toBeGreaterThanOrEqual(1);
  });

  it("recommends action for many unread alerts", async () => {
    const now = new Date().toISOString();
    const alerts = Array.from({ length: 7 }, (_, i) => ({
      id: `a${i}`,
      type: "price_drop" as const,
      message: `Alert ${i}`,
      createdAt: now,
      read: false,
    }));
    const products = [
      createMockProduct({ alerts, lastChecked: new Date().toISOString() }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await getMonitoringHealth("uid-1");
    expect(result.recommendations.some((r) => r.includes("unread alerts"))).toBe(true);
  });

  it("returns degraded when no last check time", async () => {
    const products = [
      createMockProduct({ lastChecked: undefined as unknown as string }),
    ];
    const mockDb = createMockDb(products);
    (getAdminDB as ReturnType<typeof vi.fn>).mockResolvedValue(mockDb);

    const result = await getMonitoringHealth("uid-1");
    expect(result.status).toBe("degraded");
    expect(result.lastCheckAge).toBeNull();
  });
});
