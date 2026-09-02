import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeMonitoringMetrics, getMonitoringHealth } from "@/lib/monitoring/metrics";

const mockGetAdminDB = vi.fn();

vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: (...args: unknown[]) => mockGetAdminDB(...args),
}));

describe("metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("computeMonitoringMetrics", () => {
    it("returns zero metrics for empty collection", async () => {
      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
            }),
          }),
        }),
      });

      const metrics = await computeMonitoringMetrics("user1");
      expect(metrics.totalMonitored).toBe(0);
      expect(metrics.inStock).toBe(0);
      expect(metrics.outOfStock).toBe(0);
    });

    it("counts products by stock status", async () => {
      const docs = [
        { data: () => ({ stockStatus: "in_stock", alerts: [], priceHistory: [], lastChecked: "" }) },
        { data: () => ({ stockStatus: "in_stock", alerts: [], priceHistory: [], lastChecked: "" }) },
        { data: () => ({ stockStatus: "out_of_stock", alerts: [], priceHistory: [], lastChecked: "" }) },
        { data: () => ({ stockStatus: "unknown", alerts: [], priceHistory: [], lastChecked: "" }) },
      ];

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              get: vi.fn().mockResolvedValue({ empty: false, docs }),
            }),
          }),
        }),
      });

      const metrics = await computeMonitoringMetrics("user1");
      expect(metrics.totalMonitored).toBe(4);
      expect(metrics.inStock).toBe(2);
      expect(metrics.outOfStock).toBe(1);
      expect(metrics.unknown).toBe(1);
    });

    it("counts alerts correctly", async () => {
      const now = new Date().toISOString();
      const docs = [
        {
          data: () => ({
            stockStatus: "in_stock",
            lastChecked: now,
            alerts: [
              { type: "price_drop", read: false, createdAt: now },
              { type: "price_drop", read: true, createdAt: now },
              { type: "out_of_stock", read: false, createdAt: now },
            ],
            priceHistory: [],
          }),
        },
      ];

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              get: vi.fn().mockResolvedValue({ empty: false, docs }),
            }),
          }),
        }),
      });

      const metrics = await computeMonitoringMetrics("user1");
      expect(metrics.totalAlerts).toBe(3);
      expect(metrics.unreadAlerts).toBe(2);
      expect(metrics.priceDrops24h).toBe(2);
      expect(metrics.stockOutEvents24h).toBe(1);
    });

    it("tracks latest check time", async () => {
      const now = new Date().toISOString();
      const docs = [
        { data: () => ({ stockStatus: "in_stock", alerts: [], priceHistory: [], lastChecked: now }) },
        { data: () => ({ stockStatus: "in_stock", alerts: [], priceHistory: [], lastChecked: "" }) },
      ];

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              get: vi.fn().mockResolvedValue({ empty: false, docs }),
            }),
          }),
        }),
      });

      const metrics = await computeMonitoringMetrics("user1");
      expect(metrics.lastCheckTime).toBe(now);
    });
  });

  describe("getMonitoringHealth", () => {
    it("returns healthy status for recent checks", async () => {
      const recentTime = new Date(Date.now() - 3600000).toISOString();
      const docs = [
        {
          data: () => ({
            stockStatus: "in_stock",
            alerts: [],
            priceHistory: [],
            lastChecked: recentTime,
          }),
        },
      ];

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              get: vi.fn().mockResolvedValue({ empty: false, docs }),
            }),
          }),
        }),
      });

      const health = await getMonitoringHealth("user1");
      expect(health.status).toBe("healthy");
      expect(health.lastCheckAge).toBeLessThan(7200000);
    });

    it("returns degraded status for stale checks", async () => {
      const staleTime = new Date(Date.now() - 8 * 3600000).toISOString();
      const docs = [
        {
          data: () => ({
            stockStatus: "in_stock",
            alerts: [],
            priceHistory: [],
            lastChecked: staleTime,
          }),
        },
      ];

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              get: vi.fn().mockResolvedValue({ empty: false, docs }),
            }),
          }),
        }),
      });

      const health = await getMonitoringHealth("user1");
      expect(health.status).toBe("degraded");
      expect(health.recommendations.length).toBeGreaterThan(0);
    });

    it("returns critical status for very stale checks", async () => {
      const veryStaleTime = new Date(Date.now() - 24 * 3600000).toISOString();
      const docs = [
        {
          data: () => ({
            stockStatus: "in_stock",
            alerts: [],
            priceHistory: [],
            lastChecked: veryStaleTime,
          }),
        },
      ];

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              get: vi.fn().mockResolvedValue({ empty: false, docs }),
            }),
          }),
        }),
      });

      const health = await getMonitoringHealth("user1");
      expect(health.status).toBe("critical");
    });

    it("recommends action for out-of-stock products", async () => {
      const docs = [
        {
          data: () => ({
            stockStatus: "out_of_stock",
            alerts: [],
            priceHistory: [],
            lastChecked: new Date().toISOString(),
          }),
        },
      ];

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              get: vi.fn().mockResolvedValue({ empty: false, docs }),
            }),
          }),
        }),
      });

      const health = await getMonitoringHealth("user1");
      expect(health.productsNeedingAttention).toBe(1);
      expect(health.recommendations.some((r) => r.includes("out of stock"))).toBe(true);
    });
  });
});
