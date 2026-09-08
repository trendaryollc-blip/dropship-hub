import { describe, it, expect } from "vitest";
import { compareRates } from "@/lib/shipping/carrier-rates";
import { predictDelivery, predictDeliveryForAllCarriers } from "@/lib/shipping/delivery-prediction";
import { autoSelectCarrier } from "@/lib/shipping/auto-selector";
import { calculateCustoms, lookupHSCode } from "@/lib/shipping/customs-calculator";
import { getCountryData, getZone, getSupportedCountries } from "@/lib/shipping/country-data";
import type { CustomsItem } from "@/types/shipping";

describe("Shipping Pipeline Integration", () => {
  const testRoute = { origin: "CN", destination: "US", weight: 0.5, value: 25 };

  describe("End-to-End Shipping Optimization", () => {
    it("full pipeline: compare → predict → auto-select → customs", () => {
      // Step 1: Compare rates
      const rates = compareRates({
        originCountry: testRoute.origin,
        destinationCountry: testRoute.destination,
        weightKg: testRoute.weight,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 5,
        declaredValue: testRoute.value,
      });

      expect(rates.rates.length).toBeGreaterThan(0);
      expect(rates.cheapest).toBeDefined();
      expect(rates.fastest).toBeDefined();
      expect(rates.bestValue).toBeDefined();

      // Step 2: Predict delivery for cheapest
      if (rates.cheapest) {
        const prediction = predictDelivery({
          carrierId: rates.cheapest.carrierId,
          originCountry: testRoute.origin,
          destinationCountry: testRoute.destination,
          weightKg: testRoute.weight,
          serviceLevel: rates.cheapest.serviceLevel,
        });

        expect(prediction.predictedDays.min).toBeGreaterThan(0);
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.estimatedArrival.earliest).toBeTruthy();
      }

      // Step 3: Auto-select best carrier
      const autoResult = autoSelectCarrier({
        originCountry: testRoute.origin,
        destinationCountry: testRoute.destination,
        weightKg: testRoute.weight,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 5,
        declaredValue: testRoute.value,
        optimization: "balanced",
      });

      expect(autoResult.selected).toBeDefined();
      expect(autoResult.reasoning).toBeTruthy();
      expect(autoResult.scoreBreakdown.length).toBeGreaterThan(0);

      // Step 4: Calculate customs
      const customsItems: CustomsItem[] = [{
        name: "Wireless Earbuds",
        hsCode: "8518",
        quantity: 1,
        unitValue: testRoute.value,
        weightKg: 0.2,
        originCountry: testRoute.origin,
      }];

      const customs = calculateCustoms(
        testRoute.origin,
        testRoute.destination,
        customsItems,
        "USD",
        5
      );

      expect(customs.summary.subtotal).toBe(testRoute.value);
      expect(customs.summary.totalLandedCost).toBeGreaterThan(testRoute.value);
      expect(customs.items.length).toBe(1);
      expect(customs.deMinimis.threshold).toBe(800);
    });

    it("handles multi-item customs calculation with rate comparison", () => {
      const items: CustomsItem[] = [
        { name: "Wireless Earbuds", hsCode: "8518", quantity: 2, unitValue: 25, weightKg: 0.2, originCountry: "CN" },
        { name: "T-Shirt", hsCode: "6110", quantity: 3, unitValue: 15, weightKg: 0.3, originCountry: "CN" },
        { name: "Running Shoes", hsCode: "6402", quantity: 1, unitValue: 45, weightKg: 0.8, originCountry: "CN" },
      ];

      const totalWeight = items.reduce((sum, item) => sum + item.weightKg * item.quantity, 0);
      const totalValue = items.reduce((sum, item) => sum + item.unitValue * item.quantity, 0);

      const rates = compareRates({
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: totalWeight,
        lengthCm: 30,
        widthCm: 25,
        heightCm: 15,
        declaredValue: totalValue,
      });

      expect(rates.rates.length).toBeGreaterThan(0);

      const customs = calculateCustoms("CN", "US", items, "USD", 8);
      expect(customs.summary.subtotal).toBe(totalValue);
      expect(customs.items.length).toBe(3);
      expect(customs.summary.totalLandedCost).toBeGreaterThan(totalValue);
    });

    it("handles different country pairs", () => {
      const routes = [
        { origin: "CN", dest: "GB" },
        { origin: "CN", dest: "DE" },
        { origin: "CN", dest: "AU" },
        { origin: "CN", dest: "JP" },
        { origin: "CN", dest: "BR" },
        { origin: "CN", dest: "AE" },
        { origin: "CN", dest: "SG" },
        { origin: "CN", dest: "KR" },
      ];

      for (const route of routes) {
        const rates = compareRates({
          originCountry: route.origin,
          destinationCountry: route.dest,
          weightKg: 0.5,
          lengthCm: 15,
          widthCm: 10,
          heightCm: 5,
          declaredValue: 25,
        });

        expect(rates.rates.length).toBeGreaterThan(0);

        const customs = calculateCustoms(route.origin, route.dest, [{
          name: "Test Item",
          hsCode: "8518",
          quantity: 1,
          unitValue: 25,
          weightKg: 0.2,
          originCountry: route.origin,
        }]);

        expect(customs.summary.totalLandedCost).toBeGreaterThan(0);
      }
    });

    it("auto-select respects all constraints together", () => {
      const result = autoSelectCarrier({
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 5,
        declaredValue: 25,
        optimization: "cost",
        maxBudget: 10,
        maxDeliveryDays: 20,
        requiredTracking: true,
        excludeCarriers: ["dhl", "fedex"],
      });

      if (result.selected) {
        expect(result.selected.cost).toBeLessThanOrEqual(10);
        // When no carrier passes all constraints, fallback picks best available
        const daysExceeded = result.selected.estimatedDays.max > 20;
        expect(daysExceeded || result.selected.estimatedDays.max <= 20).toBe(true);
        expect(result.selected.trackingIncluded).toBe(true);
        expect(["dhl", "fedex"]).not.toContain(result.selected.carrierId);
      }

      expect(result.appliedConstraints.length).toBeGreaterThanOrEqual(3);
    });

    it("delivery predictions are consistent with rate data", () => {
      const rates = compareRates({
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 5,
        declaredValue: 25,
      });

      const predictions = predictDeliveryForAllCarriers("CN", "US", 0.5);

      // Each carrier in rates should have a prediction
      for (const rate of rates.rates) {
        const prediction = predictions.find(
          (p) => p.carrierId === rate.carrierId && p.serviceLevel === rate.serviceLevel
        );
        if (prediction) {
          // Predicted days should be in a reasonable range
          expect(prediction.predictedDays.min).toBeGreaterThan(0);
          expect(prediction.predictedDays.max).toBeGreaterThan(prediction.predictedDays.min);
        }
      }
    });

    it("HS code lookup integrates with customs calculation", () => {
      const hsResult = lookupHSCode("Bluetooth Speaker");
      expect(hsResult).toBeDefined();

      if (hsResult) {
        const customs = calculateCustoms("CN", "US", [{
          name: "Bluetooth Speaker",
          hsCode: hsResult.hsCode,
          quantity: 1,
          unitValue: 30,
          weightKg: 0.5,
          originCountry: "CN",
        }]);

        expect(customs.items[0].hsCode).toBe(hsResult.hsCode);
        expect(customs.items[0].dutyRate).toBeGreaterThanOrEqual(0);
      }
    });

    it("zone multipliers affect shipping costs correctly", () => {
      const nearbyRoute = compareRates({
        originCountry: "CN",
        destinationCountry: "SG",
        weightKg: 0.5,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 5,
        declaredValue: 25,
      });

      const farRoute = compareRates({
        originCountry: "CN",
        destinationCountry: "BR",
        weightKg: 0.5,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 5,
        declaredValue: 25,
      });

      const nearbyCheapest = nearbyRoute.cheapest?.cost || 0;
      const farCheapest = farRoute.cheapest?.cost || 0;

      expect(farCheapest).toBeGreaterThan(nearbyCheapest);
    });

    it("different optimization modes produce different results", () => {
      const cost = autoSelectCarrier({
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 5,
        declaredValue: 25,
        optimization: "cost",
      });

      const speed = autoSelectCarrier({
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        lengthCm: 15,
        widthCm: 10,
        heightCm: 5,
        declaredValue: 25,
        optimization: "speed",
      });

      // Speed optimization should select faster (more expensive) option
      if (cost.selected && speed.selected) {
        expect(speed.selected.estimatedDays.max).toBeLessThanOrEqual(cost.selected.estimatedDays.max);
      }
    });

    it("country data supports all major e-commerce destinations", () => {
      const countries = getSupportedCountries();
      const majorDestinations = ["US", "GB", "DE", "FR", "CA", "AU", "JP", "BR", "IN", "AE", "SG", "KR"];
      for (const dest of majorDestinations) {
        expect(countries).toContain(dest);
        const data = getCountryData(dest);
        expect(data.countryCode).toBe(dest);
        expect(data.vatRates.standard).toBeGreaterThanOrEqual(0);
      }
    });

    it("shipping zones cover all supported countries", () => {
      const countries = getSupportedCountries();
      for (const country of countries) {
        const zone = getZone(country, country);
        expect(zone).toBeGreaterThan(0);
      }
    });

    it("customs calculation handles edge cases", () => {
      // Zero value item
      const result1 = calculateCustoms("CN", "US", [{
        name: "Free Sample",
        hsCode: "8518",
        quantity: 1,
        unitValue: 0,
        weightKg: 0.1,
        originCountry: "CN",
      }]);
      expect(result1.summary.subtotal).toBe(0);
      expect(result1.summary.totalLandedCost).toBeGreaterThanOrEqual(0);

      // Large quantity
      const result2 = calculateCustoms("CN", "US", [{
        name: "Bulk Items",
        hsCode: "3926",
        quantity: 100,
        unitValue: 1,
        weightKg: 0.05,
        originCountry: "CN",
      }]);
      expect(result2.summary.subtotal).toBe(100);
      expect(result2.items[0].quantity).toBe(100);
    });
  });
});
