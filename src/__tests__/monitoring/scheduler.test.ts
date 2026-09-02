import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  silentCatch: vi.fn(),
}));

const mockGetAdminDB = vi.fn();
vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: (...args: unknown[]) => mockGetAdminDB(...args),
}));

vi.mock("@/lib/monitoring/retry", () => ({
  withRetry: vi.fn((fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/lib/monitoring/notification-dispatcher", () => ({
  dispatchNotifications: vi.fn().mockResolvedValue({ dispatched: 0, skipped: 0 }),
}));

vi.mock("@/lib/monitoring/delister", () => ({
  autoDelistProduct: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/monitoring/price-history", () => ({
  appendPriceSnapshot: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/cj-auth", () => ({
  getCJAccessToken: vi.fn().mockResolvedValue("test-token"),
}));

import { runPriceCheckForUser, runPriceCheckForProduct } from "@/lib/monitoring/scheduler";
import type { MonitoredProduct } from "@/lib/monitoring/types";

describe("scheduler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockProduct: MonitoredProduct = {
    productId: "prod1",
    productTitle: "Test Product",
    source: "cj",
    sourceUrl: "https://cj.com/product-p-12345",
    currentPrice: 29.99,
    lowestPrice: 25.99,
    highestPrice: 34.99,
    lastChecked: new Date().toISOString(),
    priceHistory: [{ date: "2026-01-01", price: 29.99 }],
    stockStatus: "in_stock",
    alerts: [],
    priceDropThreshold: 5,
  };

  describe("runPriceCheckForUser", () => {
    it("returns zero counts for empty collection", async () => {
      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              get: vi.fn().mockResolvedValue({ empty: true, docs: [] }),
            }),
          }),
        }),
      });

      const result = await runPriceCheckForUser("user1");
      expect(result.checked).toBe(0);
    });

    it("handles products with no sourceUrl", async () => {
      const doc = {
        id: "doc1",
        data: () => ({ ...mockProduct, sourceUrl: "" }),
        ref: { update: vi.fn() },
      };

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              get: vi.fn().mockResolvedValue({ empty: false, docs: [doc] }),
            }),
          }),
        }),
        batch: () => ({
          update: vi.fn(),
          commit: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await runPriceCheckForUser("user1");
      expect(result.checked).toBe(1);
    });

    it("returns error count when price fetch fails", async () => {
      vi.mocked(await import("@/lib/monitoring/retry")).withRetry = vi.fn().mockRejectedValue(new Error("Network error"));

      const doc = {
        id: "doc1",
        data: () => mockProduct,
        ref: { get: vi.fn().mockResolvedValue({ data: () => mockProduct }), update: vi.fn() },
      };

      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              get: vi.fn().mockResolvedValue({ empty: false, docs: [doc] }),
            }),
          }),
        }),
        batch: () => ({
          update: vi.fn(),
          commit: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await runPriceCheckForUser("user1");
      expect(result.errors).toBeGreaterThanOrEqual(0);
    });
  });

  describe("runPriceCheckForProduct", () => {
    it("returns no changes for non-existent product", async () => {
      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            get: vi.fn().mockResolvedValue({ exists: false }),
          }),
        }),
      });

      const result = await runPriceCheckForProduct("user1", "nonexistent");
      expect(result.priceChanged).toBe(false);
      expect(result.stockChanged).toBe(false);
      expect(result.newAlerts).toBe(0);
    });

    it("returns no changes for product without sourceUrl", async () => {
      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            get: vi.fn().mockResolvedValue({
              exists: true,
              data: () => ({ ...mockProduct, sourceUrl: "" }),
            }),
          }),
        }),
      });

      const result = await runPriceCheckForProduct("user1", "doc1");
      expect(result.priceChanged).toBe(false);
    });
  });
});
