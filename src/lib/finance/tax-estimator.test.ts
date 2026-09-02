import { describe, it, expect, beforeEach } from "vitest";
import {
  addTaxRate,
  getTaxRate,
  getTaxRatesByCountry,
  getTaxRatesByState,
  getAllTaxRates,
  updateTaxRate,
  deleteTaxRate,
  calculateTax,
  estimateTaxForOrder,
  generateTaxReport,
  validateTaxInput,
  initializeDefaultTaxRates,
  clearAllTaxRates,
} from "./tax-estimator";

describe("Tax Estimator", () => {
  beforeEach(() => {
    clearAllTaxRates();
    initializeDefaultTaxRates();
  });

  describe("addTaxRate", () => {
    it("adds a new tax rate", () => {
      const rate = addTaxRate({
        country: "US",
        state: "CA",
        taxType: "sales_tax",
        rate: 0.0725,
        effectiveDate: "2024-01-01",
        isActive: true,
        description: "California Sales Tax",
      });

      expect(rate.id).toBeDefined();
      expect(rate.rate).toBe(0.0725);
    });
  });

  describe("getTaxRatesByCountry", () => {
    it("returns rates for a country", () => {
      const rates = getTaxRatesByCountry("US");
      expect(rates.length).toBeGreaterThan(0);
      expect(rates.every((r) => r.country === "US")).toBe(true);
    });

    it("returns empty array for unknown country", () => {
      const rates = getTaxRatesByCountry("ZZ");
      expect(rates.length).toBe(0);
    });
  });

  describe("getTaxRatesByState", () => {
    it("returns rates for a state", () => {
      const rates = getTaxRatesByState("US", "CA");
      expect(rates.length).toBeGreaterThan(0);
      expect(rates.every((r) => r.state === "CA")).toBe(true);
    });
  });

  describe("calculateTax", () => {
    it("calculates tax correctly", () => {
      const result = calculateTax({
        amount: 100,
        country: "US",
        state: "CA",
      });

      expect(result.subtotal).toBe(100);
      expect(result.taxAmount).toBe(7.25);
      expect(result.totalWithTax).toBe(107.25);
      expect(result.effectiveTaxRate).toBe(7.25);
      expect(result.taxBreakdown.length).toBe(1);
    });

    it("calculates VAT for UK", () => {
      const result = calculateTax({
        amount: 100,
        country: "UK",
      });

      expect(result.taxAmount).toBe(20);
      expect(result.totalWithTax).toBe(120);
    });

    it("returns zero tax for unknown location", () => {
      const result = calculateTax({
        amount: 100,
        country: "ZZ",
      });

      expect(result.taxAmount).toBe(0);
      expect(result.totalWithTax).toBe(100);
    });
  });

  describe("estimateTaxForOrder", () => {
    it("estimates tax including shipping", () => {
      const result = estimateTaxForOrder({
        subtotal: 100,
        shippingCost: 10,
        country: "US",
        state: "CA",
      });

      expect(result.subtotal).toBe(110);
      expect(result.taxBreakdown.length).toBe(1);
      expect(result.taxBreakdown[0].rate).toBe(0.0725);
    });
  });

  describe("generateTaxReport", () => {
    it("generates tax report", () => {
      const report = generateTaxReport({
        startDate: "2024-01-01",
        endDate: "2024-01-31",
        sales: [
          { amount: 100, taxAmount: 7.25, country: "US", state: "CA", taxType: "sales_tax" },
          { amount: 200, taxAmount: 40, country: "UK", taxType: "vat" },
        ],
      });

      expect(report.totalSales).toBe(300);
      expect(report.totalTaxCollected).toBe(47.25);
      expect(report.taxByJurisdiction.length).toBe(2);
      expect(report.taxByType.length).toBe(2);
    });
  });

  describe("validateTaxInput", () => {
    it("validates correct input", () => {
      const result = validateTaxInput({
        amount: 100,
        country: "US",
      });

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it("rejects invalid amount", () => {
      const result = validateTaxInput({
        amount: -100,
        country: "US",
      });

      expect(result.valid).toBe(false);
    });

    it("rejects invalid country code", () => {
      const result = validateTaxInput({
        amount: 100,
        country: "USA",
      });

      expect(result.valid).toBe(false);
    });
  });

  describe("updateTaxRate", () => {
    it("updates a tax rate", () => {
      const rates = getAllTaxRates();
      const firstRate = rates[0];

      const updated = updateTaxRate(firstRate.id, { rate: 0.10 });
      expect(updated).not.toBeNull();
      expect(updated!.rate).toBe(0.10);
    });

    it("returns null for non-existent rate", () => {
      const updated = updateTaxRate("non-existent", { rate: 0.10 });
      expect(updated).toBeNull();
    });
  });

  describe("deleteTaxRate", () => {
    it("soft deletes a tax rate", () => {
      const rates = getAllTaxRates();
      const firstRate = rates[0];

      const deleted = deleteTaxRate(firstRate.id);
      expect(deleted).toBe(true);

      const rate = getTaxRate(firstRate.id);
      expect(rate!.isActive).toBe(false);
    });
  });
});
