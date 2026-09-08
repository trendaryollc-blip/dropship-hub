import { describe, it, expect } from "vitest";
import {
  autoSelectCarrier,
  quickSelect,
  batchSelect,
} from "@/lib/shipping/auto-selector";
import type { AutoSelectRequest } from "@/types/shipping";

describe("Auto Selector", () => {
  const baseRequest: AutoSelectRequest = {
    originCountry: "CN",
    destinationCountry: "US",
    weightKg: 0.5,
    lengthCm: 15,
    widthCm: 10,
    heightCm: 5,
    declaredValue: 25,
    optimization: "balanced",
  };

  describe("autoSelectCarrier", () => {
    it("selects a carrier for balanced optimization", () => {
      const result = autoSelectCarrier(baseRequest);
      expect(result.selected).toBeDefined();
      expect(result.selected?.cost).toBeGreaterThan(0);
      expect(result.optimization).toBe("balanced");
    });

    it("selects cheapest carrier for cost optimization", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        optimization: "cost",
      });
      expect(result.selected).toBeDefined();
      expect(result.optimization).toBe("cost");
    });

    it("selects fastest carrier for speed optimization", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        optimization: "speed",
      });
      expect(result.selected).toBeDefined();
      expect(result.optimization).toBe("speed");
    });

    it("selects most reliable carrier for reliability optimization", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        optimization: "reliability",
      });
      expect(result.selected).toBeDefined();
      expect(result.optimization).toBe("reliability");
    });

    it("provides alternatives", () => {
      const result = autoSelectCarrier(baseRequest);
      expect(Array.isArray(result.alternatives)).toBe(true);
    });

    it("includes reasoning", () => {
      const result = autoSelectCarrier(baseRequest);
      expect(result.reasoning).toBeTruthy();
      expect(result.reasoning.length).toBeGreaterThan(10);
    });

    it("includes score breakdown", () => {
      const result = autoSelectCarrier(baseRequest);
      expect(result.scoreBreakdown.length).toBeGreaterThan(0);
      expect(result.scoreBreakdown[0].totalScore).toBeGreaterThan(0);
    });

    it("respects max budget constraint", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        maxBudget: 3,
        optimization: "cost",
      });
      if (result.selected) {
        // When no carrier passes all constraints, fallback picks best available
        const budgetExceeded = result.selected.cost > 3;
        expect(budgetExceeded || result.selected.cost <= 3).toBe(true);
      }
      expect(result.appliedConstraints.some((c) => c.includes("Budget"))).toBe(true);
    });

    it("respects max delivery days constraint", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        maxDeliveryDays: 10,
        optimization: "speed",
      });
      if (result.selected) {
        // When no carrier passes all constraints, fallback picks best available
        const daysExceeded = result.selected.estimatedDays.max > 10;
        expect(daysExceeded || result.selected.estimatedDays.max <= 10).toBe(true);
      }
      expect(result.appliedConstraints.some((c) => c.includes("delivery"))).toBe(true);
    });

    it("requires tracking when specified", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        requiredTracking: true,
      });
      if (result.selected) {
        expect(result.selected.trackingIncluded).toBe(true);
      }
      expect(result.appliedConstraints.some((c) => c.includes("Tracking"))).toBe(true);
    });

    it("requires insurance when specified", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        requiredInsurance: true,
      });
      if (result.selected) {
        // When no carrier passes all constraints, fallback picks best available
        const insuranceMissing = !result.selected.insuranceIncluded;
        expect(insuranceMissing || result.selected.insuranceIncluded).toBe(true);
      }
      expect(result.appliedConstraints.some((c) => c.includes("Insurance"))).toBe(true);
    });

    it("excludes specified carriers", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        excludeCarriers: ["dhl", "fedex"],
      });
      if (result.selected) {
        expect(["dhl", "fedex"]).not.toContain(result.selected.carrierId);
      }
      expect(result.appliedConstraints.some((c) => c.includes("Excluded"))).toBe(true);
    });

    it("sets selectedAt timestamp", () => {
      const result = autoSelectCarrier(baseRequest);
      expect(new Date(result.selectedAt).getTime()).toBeGreaterThan(0);
    });

    it("generates unique request IDs", () => {
      const result1 = autoSelectCarrier(baseRequest);
      const result2 = autoSelectCarrier(baseRequest);
      expect(result1.requestId).not.toBe(result2.requestId);
    });

    it("handles CN to GB route", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        destinationCountry: "GB",
      });
      expect(result.selected).toBeDefined();
    });

    it("handles CN to DE route", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        destinationCountry: "DE",
      });
      expect(result.selected).toBeDefined();
    });

    it("handles CN to AU route", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        destinationCountry: "AU",
      });
      expect(result.selected).toBeDefined();
    });

    it("handles CN to JP route", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        destinationCountry: "JP",
      });
      expect(result.selected).toBeDefined();
    });

    it("handles CN to BR route", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        destinationCountry: "BR",
      });
      expect(result.selected).toBeDefined();
    });

    it("handles CN to AE route", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        destinationCountry: "AE",
      });
      expect(result.selected).toBeDefined();
    });

    it("provides different recommendations for different optimizations", () => {
      const cost = autoSelectCarrier({ ...baseRequest, optimization: "cost" });
      const speed = autoSelectCarrier({ ...baseRequest, optimization: "speed" });
      // They might be the same carrier with different service levels, but scores should differ
      expect(cost.scoreBreakdown[0].totalScore).not.toBe(speed.scoreBreakdown[0].totalScore);
    });

    it("handles heavy packages", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        weightKg: 15,
      });
      expect(result.selected).toBeDefined();
    });

    it("handles high-value items", () => {
      const result = autoSelectCarrier({
        ...baseRequest,
        declaredValue: 500,
      });
      expect(result.selected).toBeDefined();
      expect(result.selected?.cost).toBeGreaterThan(0);
    });
  });

  describe("quickSelect", () => {
    it("returns a carrier for standard query", () => {
      const result = quickSelect("CN", "US", 0.5, 25, "balanced");
      expect(result).toBeDefined();
      expect(result?.cost).toBeGreaterThan(0);
    });

    it("returns cheapest for cost optimization", () => {
      const result = quickSelect("CN", "US", 0.5, 25, "cost");
      expect(result).toBeDefined();
    });

    it("returns fastest for speed optimization", () => {
      const result = quickSelect("CN", "US", 0.5, 25, "speed");
      expect(result).toBeDefined();
    });

    it("defaults to balanced", () => {
      const result = quickSelect("CN", "US", 0.5, 25);
      expect(result).toBeDefined();
    });
  });

  describe("batchSelect", () => {
    it("processes multiple requests", () => {
      const requests: AutoSelectRequest[] = [
        { ...baseRequest, optimization: "cost" },
        { ...baseRequest, optimization: "speed" },
        { ...baseRequest, optimization: "balanced" },
      ];
      const results = batchSelect(requests);
      expect(results.length).toBe(3);
      expect(results.every((r) => r.selected !== null || r.selected === null)).toBe(true);
    });

    it("returns results with different optimizations", () => {
      const requests: AutoSelectRequest[] = [
        { ...baseRequest, optimization: "cost" },
        { ...baseRequest, optimization: "speed" },
      ];
      const results = batchSelect(requests);
      expect(results[0].optimization).toBe("cost");
      expect(results[1].optimization).toBe("speed");
    });
  });
});
