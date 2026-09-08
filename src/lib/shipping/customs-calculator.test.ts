import { describe, it, expect } from "vitest";
import {
  calculateCustoms,
  getDeMinimisInfo,
  lookupHSCode,
  estimateCustomsValue,
  calculateEffectiveTaxRate,
  formatCurrency,
} from "@/lib/shipping/customs-calculator";
import { getCountryData } from "@/lib/shipping/country-data";
import type { CustomsItem } from "@/types/shipping";

describe("Customs Calculator", () => {
  const sampleItems: CustomsItem[] = [
    {
      name: "Wireless Earbuds",
      hsCode: "8518",
      quantity: 2,
      unitValue: 25,
      weightKg: 0.2,
      originCountry: "CN",
    },
  ];

  describe("calculateCustoms", () => {
    it("calculates duties for US import", () => {
      const result = calculateCustoms("CN", "US", sampleItems, "USD", 5);
      expect(result.summary.subtotal).toBe(50);
      expect(result.summary.shippingCost).toBe(5);
      expect(result.summary.totalLandedCost).toBeGreaterThan(50);
      expect(result.items.length).toBe(1);
    });

    it("calculates VAT for UK import", () => {
      const result = calculateCustoms("CN", "GB", sampleItems, "USD", 5);
      expect(result.summary.totalVAT).toBeGreaterThan(0);
      expect(result.items[0].vatRate).toBe(0.20);
    });

    it("calculates higher duties for Brazil", () => {
      const result = calculateCustoms("CN", "BR", [{
        name: "T-Shirt",
        hsCode: "6110",
        quantity: 1,
        unitValue: 20,
        weightKg: 0.3,
        originCountry: "CN",
      }], "USD", 5);
      expect(result.summary.totalDuties).toBeGreaterThan(0);
      expect(result.summary.totalVAT).toBeGreaterThan(0);
    });

    it("handles zero shipping cost", () => {
      const result = calculateCustoms("CN", "US", sampleItems, "USD", 0);
      expect(result.summary.shippingCost).toBe(0);
    });

    it("handles multiple items", () => {
      const items: CustomsItem[] = [
        { name: "Earbuds", hsCode: "8518", quantity: 1, unitValue: 25, weightKg: 0.2, originCountry: "CN" },
        { name: "T-Shirt", hsCode: "6110", quantity: 2, unitValue: 15, weightKg: 0.3, originCountry: "CN" },
      ];
      const result = calculateCustoms("CN", "US", items, "USD", 5);
      expect(result.items.length).toBe(2);
      expect(result.summary.subtotal).toBe(55);
    });

    it("generates warnings for prohibited items", () => {
      const items: CustomsItem[] = [
        { name: "Narcotics substance", hsCode: "3004", quantity: 1, unitValue: 10, weightKg: 0.1, originCountry: "CN" },
      ];
      const result = calculateCustoms("CN", "US", items);
      expect(result.warnings.some((w) => w.type === "prohibited")).toBe(true);
    });

    it("generates warnings for restricted items", () => {
      const items: CustomsItem[] = [
        { name: "Food supplement", hsCode: "3004", quantity: 1, unitValue: 10, weightKg: 0.1, originCountry: "CN" },
      ];
      const result = calculateCustoms("CN", "US", items);
      expect(result.warnings.some((w) => w.type === "restricted")).toBe(true);
    });

    it("includes de minimis info", () => {
      const result = calculateCustoms("CN", "US", sampleItems);
      expect(result.deMinimis.threshold).toBe(800);
      expect(result.deMinimis.currency).toBe("USD");
    });

    it("generates tips for low-value orders", () => {
      const items: CustomsItem[] = [
        { name: "Sticker", hsCode: "3926", quantity: 1, unitValue: 5, weightKg: 0.01, originCountry: "CN" },
      ];
      const result = calculateCustoms("CN", "US", items);
      expect(result.tips.length).toBeGreaterThan(0);
    });

    it("calculates correct breakdown", () => {
      const result = calculateCustoms("CN", "US", sampleItems, "USD", 5);
      expect(result.summary.breakdown.length).toBeGreaterThan(0);
      expect(result.summary.breakdown.some((b) => b.name === "Product Value")).toBe(true);
    });

    it("handles Singapore (zero duty)", () => {
      const result = calculateCustoms("CN", "SG", sampleItems);
      expect(result.summary.totalDuties).toBe(0);
    });

    it("uses default currency when not specified", () => {
      const result = calculateCustoms("CN", "US", sampleItems);
      expect(result.summary.subtotal).toBe(50);
    });

    it("sets calculatedAt timestamp", () => {
      const result = calculateCustoms("CN", "US", sampleItems);
      expect(result.summary.totalLandedCost).toBeGreaterThan(0);
    });
  });

  describe("getDeMinimisInfo", () => {
    it("returns US de minimis info", () => {
      const data = getCountryData("US");
      const info = getDeMinimisInfo("US", data);
      expect(info.threshold).toBe(800);
      expect(info.currency).toBe("USD");
      expect(info.applies).toBe(true);
      expect(info.explanation).toContain("$800");
    });

    it("returns UK de minimis info", () => {
      const data = getCountryData("GB");
      const info = getDeMinimisInfo("GB", data);
      expect(info.threshold).toBe(135);
      expect(info.currency).toBe("GBP");
    });

    it("returns default info for unknown country", () => {
      const data = getCountryData("XX");
      const info = getDeMinimisInfo("XX", data);
      expect(info.threshold).toBe(200);
    });
  });

  describe("lookupHSCode", () => {
    it("finds HS code for earbuds", () => {
      const result = lookupHSCode("Wireless Earbuds");
      expect(result).toBeDefined();
      expect(result?.hsCode).toBe("8518");
    });

    it("finds HS code for t-shirt", () => {
      const result = lookupHSCode("Cotton T-Shirt");
      expect(result).toBeDefined();
      expect(result?.hsCode).toBe("6110");
    });

    it("finds HS code for shoes", () => {
      const result = lookupHSCode("Running Sneakers");
      expect(result).toBeDefined();
      expect(result?.hsCode).toBe("6402");
    });

    it("finds HS code for bag", () => {
      const result = lookupHSCode("Leather Handbag");
      expect(result).toBeDefined();
      expect(result?.hsCode).toBe("4202");
    });

    it("finds HS code for laptop", () => {
      const result = lookupHSCode("MacBook Pro Laptop");
      expect(result).toBeDefined();
      expect(result?.hsCode).toBe("8471");
    });

    it("returns null for unrecognizable item", () => {
      const result = lookupHSCode("xyz123unknown");
      expect(result).toBeNull();
    });

    it("provides confidence score", () => {
      const result = lookupHSCode("Bluetooth Speaker");
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("estimateCustomsValue", () => {
    it("calculates total customs value", () => {
      const value = estimateCustomsValue(25, 2, 5);
      expect(value).toBe(55);
    });

    it("handles zero quantity", () => {
      const value = estimateCustomsValue(25, 0, 5);
      expect(value).toBe(5);
    });
  });

  describe("calculateEffectiveTaxRate", () => {
    it("calculates tax rate percentage", () => {
      const rate = calculateEffectiveTaxRate(10, 100);
      expect(rate).toBe(10);
    });

    it("returns 0 for zero declared value", () => {
      const rate = calculateEffectiveTaxRate(10, 0);
      expect(rate).toBe(0);
    });
  });

  describe("formatCurrency", () => {
    it("formats USD currency", () => {
      const formatted = formatCurrency(25.5, "USD");
      expect(formatted).toContain("25.50");
    });

    it("formats EUR currency", () => {
      const formatted = formatCurrency(25.5, "EUR");
      expect(formatted).toContain("25.50");
    });
  });
});
