import { describe, it, expect, beforeEach } from "vitest";
import {
  addCOGSEntry,
  getCOGSEntry,
  getCOGSByProduct,
  getAllCOGSEntries,
  updateCOGSEntry,
  deleteCOGSEntry,
  calculateCOGSForOrder,
  getCOGSSummary,
  bulkUpdateCOGS,
} from "./cogs-tracker";

describe("COGS Tracker", () => {
  beforeEach(() => {
    const entries = getAllCOGSEntries();
    for (const entry of entries) {
      deleteCOGSEntry(entry.id);
    }
  });

  describe("addCOGSEntry", () => {
    it("adds a new COGS entry", () => {
      const entry = addCOGSEntry({
        productId: "P1",
        productTitle: "Product 1",
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        unitCost: 9.99,
        shippingCost: 3.99,
        packagingCost: 0.50,
        otherCosts: 0.25,
        effectiveDate: "2024-01-01",
        isActive: true,
        priceHistory: [],
      });

      expect(entry.id).toBeDefined();
      expect(entry.totalCOGS).toBe(14.73);
      expect(entry.priceHistory.length).toBe(1);
    });
  });

  describe("getCOGSByProduct", () => {
    it("retrieves COGS by product ID", () => {
      addCOGSEntry({
        productId: "P1",
        productTitle: "Product 1",
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        unitCost: 9.99,
        shippingCost: 3.99,
        packagingCost: 0.50,
        otherCosts: 0.25,
        effectiveDate: "2024-01-01",
        isActive: true,
        priceHistory: [],
      });

      const entry = getCOGSByProduct("P1");
      expect(entry).not.toBeNull();
      expect(entry!.productId).toBe("P1");
    });

    it("returns null for non-existent product", () => {
      const entry = getCOGSByProduct("NONEXISTENT");
      expect(entry).toBeNull();
    });
  });

  describe("updateCOGSEntry", () => {
    it("updates an entry", () => {
      const created = addCOGSEntry({
        productId: "P1",
        productTitle: "Product 1",
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        unitCost: 9.99,
        shippingCost: 3.99,
        packagingCost: 0.50,
        otherCosts: 0.25,
        effectiveDate: "2024-01-01",
        isActive: true,
        priceHistory: [],
      });

      const updated = updateCOGSEntry(created.id, { unitCost: 12.99 });
      expect(updated).not.toBeNull();
      expect(updated!.unitCost).toBe(12.99);
      expect(updated!.priceHistory.length).toBe(2);
    });

    it("returns null for non-existent entry", () => {
      const updated = updateCOGSEntry("non-existent", { unitCost: 12.99 });
      expect(updated).toBeNull();
    });
  });

  describe("deleteCOGSEntry", () => {
    it("soft deletes an entry", () => {
      const created = addCOGSEntry({
        productId: "P1",
        productTitle: "Product 1",
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        unitCost: 9.99,
        shippingCost: 3.99,
        packagingCost: 0.50,
        otherCosts: 0.25,
        effectiveDate: "2024-01-01",
        isActive: true,
        priceHistory: [],
      });

      const deleted = deleteCOGSEntry(created.id);
      expect(deleted).toBe(true);

      const entry = getCOGSEntry(created.id);
      expect(entry!.isActive).toBe(false);
    });
  });

  describe("calculateCOGSForOrder", () => {
    it("calculates COGS for order", () => {
      addCOGSEntry({
        productId: "P1",
        productTitle: "Product 1",
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        unitCost: 10,
        shippingCost: 5,
        packagingCost: 1,
        otherCosts: 0.5,
        effectiveDate: "2024-01-01",
        isActive: true,
        priceHistory: [],
      });

      const cogs = calculateCOGSForOrder("P1", 3);
      expect(cogs.unitCost).toBe(30);
      expect(cogs.shippingCost).toBe(15);
      expect(cogs.totalCOGS).toBe(49.5);
    });

    it("returns zeros for unknown product", () => {
      const cogs = calculateCOGSForOrder("UNKNOWN", 1);
      expect(cogs.unitCost).toBe(0);
      expect(cogs.totalCOGS).toBe(0);
    });
  });

  describe("getCOGSSummary", () => {
    it("returns summary stats", () => {
      addCOGSEntry({
        productId: "P1",
        productTitle: "Product 1",
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        unitCost: 10,
        shippingCost: 5,
        packagingCost: 1,
        otherCosts: 0.5,
        effectiveDate: "2024-01-01",
        isActive: true,
        priceHistory: [],
      });

      const summary = getCOGSSummary();
      expect(summary.totalProducts).toBe(1);
      expect(summary.avgUnitCost).toBe(10);
      expect(summary.avgShippingCost).toBe(5);
    });

    it("returns empty summary for no entries", () => {
      const summary = getCOGSSummary();
      expect(summary.totalProducts).toBe(0);
    });
  });

  describe("bulkUpdateCOGS", () => {
    it("updates multiple entries", () => {
      addCOGSEntry({
        productId: "P1",
        productTitle: "Product 1",
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        unitCost: 10,
        shippingCost: 5,
        packagingCost: 1,
        otherCosts: 0.5,
        effectiveDate: "2024-01-01",
        isActive: true,
        priceHistory: [],
      });

      addCOGSEntry({
        productId: "P2",
        productTitle: "Product 2",
        supplierId: "cj",
        supplierName: "CJ Dropshipping",
        unitCost: 20,
        shippingCost: 8,
        packagingCost: 2,
        otherCosts: 1,
        effectiveDate: "2024-01-01",
        isActive: true,
        priceHistory: [],
      });

      const result = bulkUpdateCOGS([
        { productId: "P1", unitCost: 12 },
        { productId: "P2", unitCost: 22 },
        { productId: "P3", unitCost: 5 },
      ]);

      expect(result.updated).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBe(1);
    });
  });
});
