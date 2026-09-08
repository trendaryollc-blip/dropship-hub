import { describe, it, expect } from "vitest";
import {
  calculateChargeableWeight,
  calculateCarrierRate,
  compareRates,
  getCarrierRate,
  getCarrierRatesByService,
} from "@/lib/shipping/carrier-rates";
import type { CarrierRateRequest, RateComparisonRequest } from "@/types/shipping";

describe("Carrier Rates", () => {
  describe("calculateChargeableWeight", () => {
    it("returns actual weight when greater than volumetric", () => {
      const result = calculateChargeableWeight(5, 10, 10, 10);
      expect(result).toBe(5);
    });

    it("returns volumetric weight when greater than actual", () => {
      const result = calculateChargeableWeight(0.5, 50, 40, 30);
      expect(result).toBe(12);
    });

    it("handles zero weight", () => {
      const result = calculateChargeableWeight(0, 10, 10, 10);
      expect(result).toBe(0.2);
    });

    it("handles small package", () => {
      const result = calculateChargeableWeight(0.1, 5, 5, 5);
      expect(result).toBe(0.1);
    });

    it("handles large package", () => {
      const result = calculateChargeableWeight(1, 100, 80, 60);
      expect(result).toBe(96);
    });
  });

  describe("calculateCarrierRate", () => {
    const baseRequest: CarrierRateRequest = {
      carrierId: "cj",
      originCountry: "CN",
      destinationCountry: "US",
      weightKg: 0.5,
      lengthCm: 15,
      widthCm: 10,
      heightCm: 5,
      declaredValue: 25,
      currency: "USD",
    };

    it("returns valid rate for CJ standard", () => {
      const result = calculateCarrierRate(baseRequest, {
        carrierId: "cj",
        serviceLevel: "standard",
        baseCost: 3.50,
        costPerKg: 2.50,
        minDays: 10,
        maxDays: 18,
        reliability: 85,
        trackingIncluded: true,
        insuranceIncluded: false,
        insuranceCostRate: 0.02,
        guaranteedDelivery: false,
        customsHandled: false,
      });

      expect(result.carrierId).toBe("cj");
      expect(result.cost).toBeGreaterThan(0);
      expect(result.estimatedDays.min).toBeGreaterThan(0);
      expect(result.estimatedDays.max).toBeGreaterThan(result.estimatedDays.min);
      expect(result.trackingIncluded).toBe(true);
    });

    it("calculates higher cost for express service", () => {
      const economy = calculateCarrierRate(baseRequest, {
        carrierId: "cj",
        serviceLevel: "economy",
        baseCost: 2.50,
        costPerKg: 1.80,
        minDays: 15,
        maxDays: 25,
        reliability: 82,
        trackingIncluded: true,
        insuranceIncluded: false,
        insuranceCostRate: 0.02,
        guaranteedDelivery: false,
        customsHandled: false,
      });

      const express = calculateCarrierRate(baseRequest, {
        carrierId: "cj",
        serviceLevel: "express",
        baseCost: 5.00,
        costPerKg: 3.50,
        minDays: 7,
        maxDays: 12,
        reliability: 88,
        trackingIncluded: true,
        insuranceIncluded: true,
        insuranceCostRate: 0.01,
        guaranteedDelivery: false,
        customsHandled: false,
      });

      expect(express.cost).toBeGreaterThan(economy.cost);
    });

    it("applies zone multiplier for international shipping", () => {
      const domestic = calculateCarrierRate(
        { ...baseRequest, originCountry: "US", destinationCountry: "US" },
        { carrierId: "cj", serviceLevel: "standard", baseCost: 3.50, costPerKg: 2.50, minDays: 10, maxDays: 18, reliability: 85, trackingIncluded: true, insuranceIncluded: false, insuranceCostRate: 0.02, guaranteedDelivery: false, customsHandled: false }
      );

      const international = calculateCarrierRate(baseRequest, {
        carrierId: "cj",
        serviceLevel: "standard",
        baseCost: 3.50,
        costPerKg: 2.50,
        minDays: 10,
        maxDays: 18,
        reliability: 85,
        trackingIncluded: true,
        insuranceIncluded: false,
        insuranceCostRate: 0.02,
        guaranteedDelivery: false,
        customsHandled: false,
      });

      expect(international.cost).toBeGreaterThan(domestic.cost);
    });

    it("handles invalid carrier gracefully", () => {
      const result = calculateCarrierRate(
        { ...baseRequest, carrierId: "unknown" as "cj" },
        { carrierId: "cj", serviceLevel: "standard", baseCost: 3.50, costPerKg: 2.50, minDays: 10, maxDays: 18, reliability: 85, trackingIncluded: true, insuranceIncluded: false, insuranceCostRate: 0.02, guaranteedDelivery: false, customsHandled: false }
      );

      expect(result.error).toContain("Unknown carrier");
    });
  });

  describe("compareRates", () => {
    const baseRequest: RateComparisonRequest = {
      originCountry: "CN",
      destinationCountry: "US",
      weightKg: 0.5,
      lengthCm: 15,
      widthCm: 10,
      heightCm: 5,
      declaredValue: 25,
      currency: "USD",
    };

    it("returns rates from multiple carriers", () => {
      const result = compareRates(baseRequest);
      expect(result.rates.length).toBeGreaterThan(0);
      expect(result.requestId).toBeDefined();
    });

    it("identifies cheapest rate", () => {
      const result = compareRates(baseRequest);
      expect(result.cheapest).toBeDefined();
      if (result.cheapest) {
        const allValid = result.rates.filter((r) => !r.error && r.cost > 0);
        expect(result.cheapest.cost).toBeLessThanOrEqual(Math.max(...allValid.map((r) => r.cost)));
      }
    });

    it("identifies fastest rate", () => {
      const result = compareRates(baseRequest);
      expect(result.fastest).toBeDefined();
      if (result.fastest) {
        expect(result.fastest.estimatedDays.min).toBeGreaterThan(0);
      }
    });

    it("identifies best value rate", () => {
      const result = compareRates(baseRequest);
      expect(result.bestValue).toBeDefined();
    });

    it("provides optimization recommendations", () => {
      const result = compareRates(baseRequest);
      expect(result.recommendedByOptimization.cost).toBeDefined();
      expect(result.recommendedByOptimization.speed).toBeDefined();
      expect(result.recommendedByOptimization.balanced).toBeDefined();
    });

    it("filters by specific carriers", () => {
      const result = compareRates({
        ...baseRequest,
        carriers: ["cj", "dhl"],
      });
      const carrierIds = result.rates.map((r) => r.carrierId);
      expect(carrierIds.every((id) => ["cj", "dhl"].includes(id))).toBe(true);
    });

    it("excludes oversized packages", () => {
      const result = compareRates({
        ...baseRequest,
        weightKg: 100,
        lengthCm: 200,
        widthCm: 200,
        heightCm: 200,
      });
      // ePacket has 5kg max, should be excluded
      const epacketRates = result.rates.filter((r) => r.carrierId === "epacket");
      expect(epacketRates.length).toBe(0);
    });

    it("includes chargeable weight in result", () => {
      const result = compareRates(baseRequest);
      expect(result.chargeableWeight).toBeGreaterThan(0);
    });

    it("sets comparedAt timestamp", () => {
      const result = compareRates(baseRequest);
      expect(new Date(result.comparedAt).getTime()).toBeGreaterThan(0);
    });

    it("handles domestic shipping", () => {
      const result = compareRates({
        ...baseRequest,
        originCountry: "US",
        destinationCountry: "US",
      });
      expect(result.rates.length).toBeGreaterThan(0);
    });

    it("uses default currency when not specified", () => {
      const result = compareRates({
        ...baseRequest,
        currency: undefined,
      });
      expect(result.rates[0]?.currency).toBe("USD");
    });
  });

  describe("getCarrierRate", () => {
    it("returns rate for specific carrier", () => {
      const result = getCarrierRate({
        carrierId: "dhl",
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 5,
        declaredValue: 25,
        currency: "USD",
      });

      expect(result.carrierId).toBe("dhl");
      expect(result.cost).toBeGreaterThan(0);
    });

    it("returns error for unknown carrier", () => {
      const result = getCarrierRate({
        carrierId: "unknown" as "cj",
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 5,
        declaredValue: 25,
        currency: "USD",
      });

      expect(result.error).toBeDefined();
    });
  });

  describe("getCarrierRatesByService", () => {
    it("returns all service levels for CJ", () => {
      const rates = getCarrierRatesByService("cj");
      expect(rates.length).toBeGreaterThan(0);
      expect(rates.every((r) => r.carrierId === "cj")).toBe(true);
    });

    it("returns all service levels for DHL", () => {
      const rates = getCarrierRatesByService("dhl");
      expect(rates.length).toBeGreaterThan(0);
      expect(rates.every((r) => r.carrierId === "dhl")).toBe(true);
    });

    it("returns empty for unknown carrier", () => {
      const rates = getCarrierRatesByService("unknown" as "cj");
      expect(rates.length).toBe(0);
    });
  });
});
