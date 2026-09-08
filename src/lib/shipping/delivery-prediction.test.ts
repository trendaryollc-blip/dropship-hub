import { describe, it, expect } from "vitest";
import {
  predictDelivery,
  predictDeliveryForAllCarriers,
} from "@/lib/shipping/delivery-prediction";
import type { DeliveryPredictionRequest } from "@/types/shipping";

describe("Delivery Prediction", () => {
  describe("predictDelivery", () => {
    const baseRequest: DeliveryPredictionRequest = {
      carrierId: "cj",
      originCountry: "CN",
      destinationCountry: "US",
      weightKg: 0.5,
      serviceLevel: "standard",
    };

    it("returns prediction for CJ standard", () => {
      const result = predictDelivery(baseRequest);
      expect(result.carrierId).toBe("cj");
      expect(result.predictedDays.min).toBeGreaterThan(0);
      expect(result.predictedDays.max).toBeGreaterThan(result.predictedDays.min);
      expect(result.predictedDays.average).toBeGreaterThan(0);
    });

    it("returns prediction for DHL express", () => {
      const result = predictDelivery({
        ...baseRequest,
        carrierId: "dhl",
        serviceLevel: "express",
      });
      expect(result.carrierId).toBe("dhl");
      expect(result.predictedDays.max).toBeLessThan(10);
    });

    it("returns higher confidence for popular routes", () => {
      const result = predictDelivery(baseRequest);
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.confidence).toBeLessThanOrEqual(0.98);
    });

    it("includes risk factors", () => {
      const result = predictDelivery(baseRequest);
      expect(Array.isArray(result.riskFactors)).toBe(true);
    });

    it("provides estimated arrival dates", () => {
      const result = predictDelivery(baseRequest);
      expect(result.estimatedArrival.earliest).toBeTruthy();
      expect(result.estimatedArrival.latest).toBeTruthy();
      expect(result.estimatedArrival.average).toBeTruthy();
    });

    it("sets shipByDate to today when not specified", () => {
      const result = predictDelivery(baseRequest);
      const today = new Date().toISOString().split("T")[0];
      expect(result.shipByDate).toBe(today);
    });

    it("uses custom ship date", () => {
      const result = predictDelivery({
        ...baseRequest,
        shipDate: "2026-03-15",
      });
      expect(result.shipByDate).toBe("2026-03-15");
    });

    it("includes historical accuracy", () => {
      const result = predictDelivery(baseRequest);
      expect(result.historicalAccuracy).toBeGreaterThan(0);
      expect(result.historicalAccuracy).toBeLessThanOrEqual(1);
    });

    it("calculates delay risks", () => {
      const result = predictDelivery(baseRequest);
      expect(result.weatherDelayRisk).toBeGreaterThanOrEqual(0);
      expect(result.customsDelayRisk).toBeGreaterThanOrEqual(0);
      expect(result.holidayDelayRisk).toBeGreaterThanOrEqual(0);
    });

    it("handles economy service level", () => {
      const result = predictDelivery({
        ...baseRequest,
        serviceLevel: "economy",
      });
      expect(result.serviceLevel).toBe("economy");
      expect(result.predictedDays.max).toBeGreaterThan(result.predictedDays.min);
    });

    it("handles priority service level", () => {
      const result = predictDelivery({
        ...baseRequest,
        carrierId: "dhl",
        serviceLevel: "priority",
      });
      expect(result.serviceLevel).toBe("priority");
    });

    it("predicts faster for express than economy", () => {
      const economy = predictDelivery({
        ...baseRequest,
        carrierId: "dhl",
        serviceLevel: "economy",
      });
      const express = predictDelivery({
        ...baseRequest,
        carrierId: "dhl",
        serviceLevel: "express",
      });
      expect(express.predictedDays.average).toBeLessThanOrEqual(economy.predictedDays.average);
    });

    it("handles CN to GB route", () => {
      const result = predictDelivery({
        ...baseRequest,
        destinationCountry: "GB",
      });
      expect(result.predictedDays.min).toBeGreaterThan(0);
    });

    it("handles CN to DE route", () => {
      const result = predictDelivery({
        ...baseRequest,
        destinationCountry: "DE",
      });
      expect(result.predictedDays.min).toBeGreaterThan(0);
    });

    it("handles CN to AU route", () => {
      const result = predictDelivery({
        ...baseRequest,
        destinationCountry: "AU",
      });
      expect(result.predictedDays.min).toBeGreaterThan(0);
    });

    it("handles CN to BR route", () => {
      const result = predictDelivery({
        ...baseRequest,
        destinationCountry: "BR",
      });
      expect(result.predictedDays.min).toBeGreaterThan(0);
    });

    it("returns carrier name", () => {
      const result = predictDelivery(baseRequest);
      expect(result.carrierName).toBeTruthy();
    });

    it("handles heavy packages", () => {
      const result = predictDelivery({
        ...baseRequest,
        weightKg: 15,
      });
      expect(result.riskFactors.length).toBeGreaterThan(0);
    });
  });

  describe("predictDeliveryForAllCarriers", () => {
    it("returns predictions for all carrier/service combinations", () => {
      const results = predictDeliveryForAllCarriers("CN", "US", 0.5);
      expect(results.length).toBeGreaterThan(10);
    });

    it("includes CJ predictions", () => {
      const results = predictDeliveryForAllCarriers("CN", "US", 0.5);
      const cjResults = results.filter((r) => r.carrierId === "cj");
      expect(cjResults.length).toBeGreaterThan(0);
    });

    it("includes DHL predictions", () => {
      const results = predictDeliveryForAllCarriers("CN", "US", 0.5);
      const dhlResults = results.filter((r) => r.carrierId === "dhl");
      expect(dhlResults.length).toBeGreaterThan(0);
    });

    it("includes FedEx predictions", () => {
      const results = predictDeliveryForAllCarriers("CN", "US", 0.5);
      const fedexResults = results.filter((r) => r.carrierId === "fedex");
      expect(fedexResults.length).toBeGreaterThan(0);
    });

    it("each prediction has valid data", () => {
      const results = predictDeliveryForAllCarriers("CN", "US", 0.5);
      for (const result of results) {
        expect(result.predictedDays.min).toBeGreaterThan(0);
        expect(result.predictedDays.max).toBeGreaterThanOrEqual(result.predictedDays.min);
        expect(result.confidence).toBeGreaterThan(0);
      }
    });

    it("accepts custom ship date", () => {
      const results = predictDeliveryForAllCarriers("CN", "US", 0.5, "2026-12-15");
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].shipByDate).toBe("2026-12-15");
    });

    it("DHL is faster than CJ on average", () => {
      const results = predictDeliveryForAllCarriers("CN", "US", 0.5);
      const cjStandard = results.find((r) => r.carrierId === "cj" && r.serviceLevel === "standard");
      const dhlStandard = results.find((r) => r.carrierId === "dhl" && r.serviceLevel === "standard");
      if (cjStandard && dhlStandard) {
        expect(dhlStandard.predictedDays.average).toBeLessThan(cjStandard.predictedDays.average);
      }
    });
  });
});
