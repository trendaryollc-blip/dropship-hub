import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  compareShippingRatesTool,
  predictDeliveryTool,
  autoSelectShippingTool,
  calculateCustomsTool,
  getShippingOptionsTool,
} from "./shipping";

vi.mock("@/lib/shipping/carrier-rates", () => ({
  compareRates: vi.fn().mockReturnValue({
    rates: [
      { carrierName: "CJ", serviceLevel: "standard", cost: 5.99, estimatedDays: { min: 7, max: 15 }, reliabilityScore: 85 },
      { carrierName: "ePacket", serviceLevel: "economy", cost: 3.99, estimatedDays: { min: 10, max: 20 }, reliabilityScore: 75 },
    ],
    cheapest: { carrierName: "ePacket", cost: 3.99 },
    fastest: { carrierName: "CJ", estimatedDays: { max: 15 } },
    bestValue: { carrierName: "CJ", cost: 5.99 },
  }),
}));

vi.mock("@/lib/shipping/delivery-prediction", () => ({
  predictDelivery: vi.fn().mockReturnValue({
    carrierId: "cj",
    carrierName: "CJ Dropshipping",
    predictedDays: { min: 7, max: 15, average: 11 },
    confidence: 85,
    riskFactors: [],
    estimatedArrival: { earliest: "2024-01-15", latest: "2024-01-23", average: "2024-01-19" },
    historicalAccuracy: 90,
    weatherDelayRisk: 0.1,
    customsDelayRisk: 0.2,
    holidayDelayRisk: 0.05,
  }),
}));

vi.mock("@/lib/shipping/auto-selector", () => ({
  autoSelectCarrier: vi.fn().mockReturnValue({
    selected: { carrierName: "CJ", serviceLevel: "standard", cost: 5.99, estimatedDays: { max: 15 } },
    alternatives: [],
    reasoning: "Best balance of cost and speed",
    scoreBreakdown: [],
  }),
}));

vi.mock("@/lib/shipping/customs-calculator", () => ({
  calculateCustoms: vi.fn().mockReturnValue({
    items: [
      { name: "Wireless Earbuds", dutyAmount: 2.50, taxAmount: 1.50 },
    ],
    summary: {
      totalDuties: 2.50,
      totalTaxes: 1.50,
      totalLandedCost: 34.99,
    },
    deMinimis: { isBelowThreshold: false },
    warnings: [],
    tips: [],
  }),
}));

const context = {
  uid: "test-user",
  executionId: "exec_test",
  trigger: "ai_chat" as const,
  mode: "ai_assist" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Shipping Tools", () => {
  describe("compareShippingRatesTool", () => {
    it("compares shipping rates", async () => {
      const result = await compareShippingRatesTool.execute({
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        declaredValue: 25,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("rates");
    });
  });

  describe("predictDeliveryTool", () => {
    it("predicts delivery time", async () => {
      const result = await predictDeliveryTool.execute({
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        carrierId: "cj",
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Predicted delivery");
    });
  });

  describe("autoSelectShippingTool", () => {
    it("auto selects best carrier", async () => {
      const result = await autoSelectShippingTool.execute({
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        declaredValue: 25,
        optimization: "balanced",
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Selected");
    });
  });

  describe("calculateCustomsTool", () => {
    it("calculates customs duties and taxes", async () => {
      const result = await calculateCustomsTool.execute({
        originCountry: "CN",
        destinationCountry: "US",
        items: [
          { name: "Wireless Earbuds", quantity: 1, unitPrice: 25, weightKg: 0.2 },
        ],
        currency: "USD",
        shippingCost: 5,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("Customs total");
    });
  });

  describe("getShippingOptionsTool", () => {
    it("gets all shipping options", async () => {
      const result = await getShippingOptionsTool.execute({
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 0.5,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        declaredValue: 25,
      }, context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.summary).toContain("shipping options");
    });
  });
});
