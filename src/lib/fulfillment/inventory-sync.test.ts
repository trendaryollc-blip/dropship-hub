import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchCJInventory,
  syncInventoryForStore,
  detectInventoryChanges,
  calculateReorderRecommendation,
  generateInventoryAlerts,
} from "./inventory-sync";
import type { CJInventoryItem, InventoryChange } from "./inventory-sync";

vi.mock("@/lib/cj-auth", () => ({
  getCJAccessToken: vi.fn().mockResolvedValue("cj-access-token"),
}));

describe("Inventory Sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("fetchCJInventory", () => {
    it("fetches inventory for specific product IDs", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              result: true,
              data: {
                productName: "Test Product",
                sku: "SKU001",
                stock: 100,
                sellPrice: 9.99,
              },
            }),
        })
      );

      const inventory = await fetchCJInventory(["PROD001"]);
      expect(inventory.length).toBe(1);
      expect(inventory[0].productId).toBe("PROD001");
      expect(inventory[0].stockLevel).toBe(100);
      expect(inventory[0].inStock).toBe(true);
    });

    it("fetches all inventory when no product IDs provided", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              result: true,
              data: {
                list: [
                  { pid: "PROD001", productNameEn: "Product 1", sku: "SKU1", stock: 50, sellPrice: 9.99 },
                  { pid: "PROD002", productNameEn: "Product 2", sku: "SKU2", stock: 0, sellPrice: 19.99 },
                ],
              },
            }),
        })
      );

      const inventory = await fetchCJInventory();
      expect(inventory.length).toBe(2);
      expect(inventory[0].inStock).toBe(true);
      expect(inventory[1].inStock).toBe(false);
    });

    it("handles API errors gracefully", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockRejectedValue(new Error("API Error"))
      );

      const inventory = await fetchCJInventory(["PROD001"]);
      expect(inventory.length).toBe(0);
    });
  });

  describe("detectInventoryChanges", () => {
    it("detects stock increases", () => {
      const previous: CJInventoryItem[] = [
        { productId: "P1", productName: "Product 1", sku: "S1", stockLevel: 50, inStock: true, lastUpdated: "" },
      ];
      const current: CJInventoryItem[] = [
        { productId: "P1", productName: "Product 1", sku: "S1", stockLevel: 100, inStock: true, lastUpdated: "" },
      ];

      const changes = detectInventoryChanges(previous, current);
      expect(changes.length).toBe(1);
      expect(changes[0].changeType).toBe("increase");
      expect(changes[0].previousStock).toBe(50);
      expect(changes[0].currentStock).toBe(100);
    });

    it("detects stock decreases", () => {
      const previous: CJInventoryItem[] = [
        { productId: "P1", productName: "Product 1", sku: "S1", stockLevel: 100, inStock: true, lastUpdated: "" },
      ];
      const current: CJInventoryItem[] = [
        { productId: "P1", productName: "Product 1", sku: "S1", stockLevel: 30, inStock: true, lastUpdated: "" },
      ];

      const changes = detectInventoryChanges(previous, current);
      expect(changes.length).toBe(1);
      expect(changes[0].changeType).toBe("decrease");
    });

    it("detects out of stock", () => {
      const previous: CJInventoryItem[] = [
        { productId: "P1", productName: "Product 1", sku: "S1", stockLevel: 50, inStock: true, lastUpdated: "" },
      ];
      const current: CJInventoryItem[] = [
        { productId: "P1", productName: "Product 1", sku: "S1", stockLevel: 0, inStock: false, lastUpdated: "" },
      ];

      const changes = detectInventoryChanges(previous, current);
      expect(changes.length).toBe(1);
      expect(changes[0].changeType).toBe("out_of_stock");
    });

    it("detects back in stock", () => {
      const previous: CJInventoryItem[] = [
        { productId: "P1", productName: "Product 1", sku: "S1", stockLevel: 0, inStock: false, lastUpdated: "" },
      ];
      const current: CJInventoryItem[] = [
        { productId: "P1", productName: "Product 1", sku: "S1", stockLevel: 25, inStock: true, lastUpdated: "" },
      ];

      const changes = detectInventoryChanges(previous, current);
      expect(changes.length).toBe(1);
      expect(changes[0].changeType).toBe("back_in_stock");
    });

    it("returns empty array when no changes", () => {
      const previous: CJInventoryItem[] = [
        { productId: "P1", productName: "Product 1", sku: "S1", stockLevel: 50, inStock: true, lastUpdated: "" },
      ];
      const current: CJInventoryItem[] = [
        { productId: "P1", productName: "Product 1", sku: "S1", stockLevel: 50, inStock: true, lastUpdated: "" },
      ];

      const changes = detectInventoryChanges(previous, current);
      expect(changes.length).toBe(0);
    });
  });

  describe("calculateReorderRecommendation", () => {
    it("recommends reorder when stock is low", () => {
      const item: CJInventoryItem = {
        productId: "P1",
        productName: "Product 1",
        sku: "S1",
        stockLevel: 10,
        inStock: true,
        lastUpdated: "",
      };

      const result = calculateReorderRecommendation(item, 5, 7, 3);
      expect(result.needsReorder).toBe(true);
      expect(result.recommendedQuantity).toBeGreaterThan(0);
    });

    it("does not recommend reorder when stock is sufficient", () => {
      const item: CJInventoryItem = {
        productId: "P1",
        productName: "Product 1",
        sku: "S1",
        stockLevel: 1000,
        inStock: true,
        lastUpdated: "",
      };

      const result = calculateReorderRecommendation(item, 5, 7, 3);
      expect(result.needsReorder).toBe(false);
    });

    it("calculates correct urgency levels", () => {
      const criticalItem: CJInventoryItem = {
        productId: "P1",
        productName: "Product 1",
        sku: "S1",
        stockLevel: 4,
        inStock: true,
        lastUpdated: "",
      };

      const result = calculateReorderRecommendation(criticalItem, 5, 7, 3);
      expect(result.urgency).toBe("critical");
    });
  });

  describe("generateInventoryAlerts", () => {
    it("generates alerts for out of stock", () => {
      const changes: InventoryChange[] = [
        {
          productId: "P1",
          productName: "Product 1",
          previousStock: 50,
          currentStock: 0,
          changeType: "out_of_stock",
          timestamp: "",
        },
      ];

      const alerts = generateInventoryAlerts(changes);
      expect(alerts.length).toBe(1);
      expect(alerts[0].type).toBe("out_of_stock");
      expect(alerts[0].severity).toBe("critical");
    });

    it("generates alerts for back in stock", () => {
      const changes: InventoryChange[] = [
        {
          productId: "P1",
          productName: "Product 1",
          previousStock: 0,
          currentStock: 25,
          changeType: "back_in_stock",
          timestamp: "",
        },
      ];

      const alerts = generateInventoryAlerts(changes);
      expect(alerts.length).toBe(1);
      expect(alerts[0].type).toBe("back_in_stock");
      expect(alerts[0].severity).toBe("info");
    });

    it("generates alerts for low stock", () => {
      const changes: InventoryChange[] = [
        {
          productId: "P1",
          productName: "Product 1",
          previousStock: 100,
          currentStock: 20,
          changeType: "decrease",
          timestamp: "",
        },
      ];

      const alerts = generateInventoryAlerts(changes);
      expect(alerts.length).toBe(1);
      expect(alerts[0].type).toBe("low_stock");
      expect(alerts[0].severity).toBe("warning");
    });
  });
});
