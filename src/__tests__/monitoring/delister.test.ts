import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
  silentCatch: vi.fn(),
}));

const mockGetAdminDB = vi.fn();
vi.mock("@/lib/firebase-admin", () => ({
  getAdminDB: (...args: unknown[]) => mockGetAdminDB(...args),
}));

import { autoDelistProduct, reListProduct } from "@/lib/monitoring/delister";
import type { MonitoredProduct } from "@/lib/monitoring/types";

describe("delister", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  const productWithShopify: MonitoredProduct = {
    productId: "shopify-123",
    productTitle: "Test Product",
    source: "cj",
    sourceUrl: "https://cj.com/product-p-12345",
    currentPrice: 29.99,
    lowestPrice: 25.99,
    highestPrice: 34.99,
    lastChecked: new Date().toISOString(),
    priceHistory: [],
    stockStatus: "out_of_stock",
    alerts: [],
    storeConnections: [
      {
        storeId: "store1",
        platform: "shopify",
        storeUrl: "https://my-store.myshopify.com",
        apiKey: "key",
        apiSecret: "secret",
      },
    ],
  };

  const productWithWooCommerce: MonitoredProduct = {
    ...productWithShopify,
    productId: "woo-123",
    storeConnections: [
      {
        storeId: "store1",
        platform: "woocommerce",
        storeUrl: "https://my-store.com",
        apiKey: "key",
        apiSecret: "secret",
      },
    ],
  };

  const productWithoutConnections: MonitoredProduct = {
    ...productWithShopify,
    storeConnections: [],
  };

  describe("autoDelistProduct", () => {
    it("returns false when no store connections", async () => {
      const result = await autoDelistProduct("user1", "doc1", productWithoutConnections);
      expect(result).toBe(false);
    });

    it("delists product on Shopify", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response);

      const updateFn = vi.fn().mockResolvedValue(undefined);
      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({
                update: updateFn,
              }),
            }),
          }),
        }),
      });

      const result = await autoDelistProduct("user1", "doc1", productWithShopify);
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalled();
    });

    it("delists product on WooCommerce", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response);

      const updateFn = vi.fn().mockResolvedValue(undefined);
      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({
                update: updateFn,
              }),
            }),
          }),
        }),
      });

      const result = await autoDelistProduct("user1", "doc1", productWithWooCommerce);
      expect(result).toBe(true);
    });

    it("returns false when fetch fails", async () => {
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

      const result = await autoDelistProduct("user1", "doc1", productWithShopify);
      expect(result).toBe(false);
    });
  });

  describe("reListProduct", () => {
    it("returns false when no store connections", async () => {
      const result = await reListProduct("user1", "doc1", productWithoutConnections);
      expect(result).toBe(false);
    });

    it("relists product on Shopify", async () => {
      vi.spyOn(global, "fetch").mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({}),
      } as unknown as Response);

      const updateFn = vi.fn().mockResolvedValue(undefined);
      mockGetAdminDB.mockResolvedValue({
        collection: () => ({
          doc: () => ({
            collection: () => ({
              doc: () => ({
                update: updateFn,
              }),
            }),
          }),
        }),
      });

      const result = await reListProduct("user1", "doc1", productWithShopify);
      expect(result).toBe(true);
    });

    it("returns false when relist fetch fails", async () => {
      vi.spyOn(global, "fetch").mockRejectedValue(new Error("Network error"));

      const result = await reListProduct("user1", "doc1", productWithShopify);
      expect(result).toBe(false);
    });
  });
});
