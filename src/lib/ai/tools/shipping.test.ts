import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("./registry", () => ({
  createTool: vi.fn((config) => ({ ...config, execute: config.execute })),
}));

vi.mock("@/lib/shipping/carrier-rates", () => ({
  compareRates: vi.fn(),
}));

vi.mock("@/lib/shipping/delivery-prediction", () => ({
  predictDelivery: vi.fn(),
}));

vi.mock("@/lib/shipping/auto-selector", () => ({
  autoSelectCarrier: vi.fn(),
}));

vi.mock("@/lib/shipping/customs-calculator", () => ({
  calculateCustoms: vi.fn(),
}));

import {
  compareShippingRatesTool,
  predictDeliveryTool,
  autoSelectShippingTool,
  calculateCustomsTool,
  getShippingOptionsTool,
} from "./shipping";
import { compareRates } from "@/lib/shipping/carrier-rates";
import { predictDelivery } from "@/lib/shipping/delivery-prediction";
import { autoSelectCarrier } from "@/lib/shipping/auto-selector";
import { calculateCustoms } from "@/lib/shipping/customs-calculator";

const mockRatesResult = {
  rates: [
    {
      carrierName: "CJ",
      serviceLevel: "standard",
      cost: 5.99,
      estimatedDays: { min: 5, max: 10 },
      reliabilityScore: 0.85,
    },
  ],
  cheapest: {
    carrierName: "CJ",
    serviceLevel: "standard",
    cost: 5.99,
    estimatedDays: { min: 5, max: 10 },
    reliabilityScore: 0.85,
  },
  fastest: {
    carrierName: "CJ",
    serviceLevel: "standard",
    cost: 5.99,
    estimatedDays: { min: 5, max: 10 },
    reliabilityScore: 0.85,
  },
  bestValue: {
    carrierName: "CJ",
    serviceLevel: "standard",
    cost: 5.99,
    estimatedDays: { min: 5, max: 10 },
    reliabilityScore: 0.85,
  },
};

const mockPredictionResult = {
  predictedDays: { average: 12 },
  confidence: 85,
  estimatedArrival: { average: "2025-01-20" },
  riskFactors: [],
};

const mockAutoSelectResult = {
  selected: {
    carrierName: "CJ",
    serviceLevel: "standard",
    cost: 5.99,
    estimatedDays: { max: 10 },
  },
  reasoning: "Best value",
};

const mockCustomsResult = {
  items: [{ name: "Widget", dutyAmount: 2.50, taxAmount: 1.50 }],
  summary: { totalDuties: 2.50, totalTaxes: 1.50, totalLandedCost: 45.00 },
  warnings: [],
};

const context = {
  uid: "test-user",
  executionId: "exec_test",
  trigger: "ai_chat" as const,
  mode: "ai_assist" as const,
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(compareRates).mockReturnValue(mockRatesResult);
  vi.mocked(predictDelivery).mockReturnValue(mockPredictionResult);
  vi.mocked(autoSelectCarrier).mockReturnValue(mockAutoSelectResult);
  vi.mocked(calculateCustoms).mockReturnValue(mockCustomsResult);
});

describe("Shipping Tools", () => {
  describe("compareShippingRatesTool", () => {
    it("has correct id and name", () => {
      expect(compareShippingRatesTool.id).toBe("compare_shipping_rates");
      expect(compareShippingRatesTool.name).toBe("Compare Shipping Rates");
    });

    it("returns success with correct summary", async () => {
      const result = await compareShippingRatesTool.execute(
        {
          originCountry: "CN",
          destinationCountry: "US",
          weightKg: 0.5,
          lengthCm: 15,
          widthCm: 10,
          heightCm: 5,
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRatesResult);
      expect(result.summary).toContain("Found 1 rates");
      expect(result.summary).toContain("Cheapest: $5.99 (CJ)");
      expect(result.summary).toContain("Fastest: 10 days (CJ)");
      expect(result.summary).toContain("Best value: CJ");
    });

    it("passes input to compareRates correctly", async () => {
      await compareShippingRatesTool.execute(
        {
          originCountry: "CN",
          destinationCountry: "GB",
          weightKg: 1.2,
          lengthCm: 20,
          widthCm: 15,
          heightCm: 10,
          declaredValue: 50,
          currency: "EUR",
        },
        context
      );

      expect(compareRates).toHaveBeenCalledWith({
        originCountry: "CN",
        destinationCountry: "GB",
        weightKg: 1.2,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        declaredValue: 50,
        currency: "EUR",
      });
    });
  });

  describe("predictDeliveryTool", () => {
    it("has correct id and name", () => {
      expect(predictDeliveryTool.id).toBe("predict_delivery");
      expect(predictDeliveryTool.name).toBe("Predict Delivery");
    });

    it("returns success with correct summary", async () => {
      const result = await predictDeliveryTool.execute(
        {
          originCountry: "CN",
          destinationCountry: "US",
          weightKg: 0.5,
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockPredictionResult);
      expect(result.summary).toContain("Predicted delivery: 12 days");
      expect(result.summary).toContain("85% confidence");
      expect(result.summary).toContain("2025-01-20");
      expect(result.summary).toContain("minimal");
    });

    it("passes input to predictDelivery correctly", async () => {
      await predictDeliveryTool.execute(
        {
          originCountry: "CN",
          destinationCountry: "DE",
          weightKg: 2.0,
          carrierId: "dhl",
          shipDate: "2025-01-10",
        },
        context
      );

      expect(predictDelivery).toHaveBeenCalledWith({
        carrierId: "dhl",
        originCountry: "CN",
        destinationCountry: "DE",
        weightKg: 2.0,
        serviceLevel: "standard",
        shipDate: "2025-01-10",
      });
    });

    it("defaults carrierId to cj when not provided", async () => {
      await predictDeliveryTool.execute(
        {
          originCountry: "CN",
          destinationCountry: "US",
          weightKg: 0.5,
        },
        context
      );

      expect(predictDelivery).toHaveBeenCalledWith(
        expect.objectContaining({ carrierId: "cj" })
      );
    });
  });

  describe("autoSelectShippingTool", () => {
    it("has correct id and name", () => {
      expect(autoSelectShippingTool.id).toBe("auto_select_shipping");
      expect(autoSelectShippingTool.name).toBe("Auto Select Shipping");
    });

    it("returns success with correct summary", async () => {
      const result = await autoSelectShippingTool.execute(
        {
          originCountry: "CN",
          destinationCountry: "US",
          weightKg: 0.5,
          lengthCm: 15,
          widthCm: 10,
          heightCm: 5,
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAutoSelectResult);
      expect(result.summary).toContain("Selected: CJ (standard)");
      expect(result.summary).toContain("$5.99");
      expect(result.summary).toContain("10 days");
      expect(result.summary).toContain("Best value");
    });

    it("passes input to autoSelectCarrier correctly", async () => {
      await autoSelectShippingTool.execute(
        {
          originCountry: "CN",
          destinationCountry: "US",
          weightKg: 1.0,
          lengthCm: 20,
          widthCm: 15,
          heightCm: 10,
          declaredValue: 100,
          optimization: "speed",
          maxDeliveryDays: 7,
        },
        context
      );

      expect(autoSelectCarrier).toHaveBeenCalledWith({
        originCountry: "CN",
        destinationCountry: "US",
        weightKg: 1.0,
        lengthCm: 20,
        widthCm: 15,
        heightCm: 10,
        declaredValue: 100,
        optimization: "speed",
        maxDeliveryDays: 7,
      });
    });
  });

  describe("calculateCustomsTool", () => {
    it("has correct id and name", () => {
      expect(calculateCustomsTool.id).toBe("calculate_customs");
      expect(calculateCustomsTool.name).toBe("Calculate Customs");
    });

    it("returns success with correct summary", async () => {
      const result = await calculateCustomsTool.execute(
        {
          originCountry: "CN",
          destinationCountry: "US",
          items: [{ name: "Widget", quantity: 1, unitPrice: 40, weightKg: 0.3 }],
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCustomsResult);
      expect(result.summary).toContain("$2.50 duties");
      expect(result.summary).toContain("$1.50 taxes");
      expect(result.summary).toContain("$45.00 landed cost");
      expect(result.summary).toContain("Widget: duty $2.50, tax $1.50");
    });

    it("passes input to calculateCustoms correctly", async () => {
      await calculateCustomsTool.execute(
        {
          originCountry: "CN",
          destinationCountry: "GB",
          items: [
            { name: "Gadget", quantity: 2, unitPrice: 25, weightKg: 0.5, hsCode: "8517.62" },
          ],
          currency: "GBP",
          shippingCost: 10,
        },
        context
      );

      expect(calculateCustoms).toHaveBeenCalledWith(
        "CN",
        "GB",
        [
          {
            name: "Gadget",
            hsCode: "8517.62",
            quantity: 2,
            unitValue: 25,
            weightKg: 0.5,
            originCountry: "CN",
          },
        ],
        "GBP",
        10
      );
    });

    it("defaults hsCode to 9999.99.99 when not provided", async () => {
      await calculateCustomsTool.execute(
        {
          originCountry: "CN",
          destinationCountry: "US",
          items: [{ name: "Item", quantity: 1, unitPrice: 10, weightKg: 0.1 }],
        },
        context
      );

      expect(calculateCustoms).toHaveBeenCalledWith(
        "CN",
        "US",
        [
          expect.objectContaining({ hsCode: "9999.99.99" }),
        ],
        undefined,
        undefined
      );
    });
  });

  describe("getShippingOptionsTool", () => {
    it("has correct id and name", () => {
      expect(getShippingOptionsTool.id).toBe("get_shipping_options");
      expect(getShippingOptionsTool.name).toBe("Get Shipping Options");
    });

    it("returns success with correct summary", async () => {
      const result = await getShippingOptionsTool.execute(
        {
          originCountry: "CN",
          destinationCountry: "US",
          weightKg: 0.5,
          lengthCm: 15,
          widthCm: 10,
          heightCm: 5,
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        options: [
          {
            carrier: "CJ",
            service: "standard",
            cost: 5.99,
            estimatedDays: { min: 5, max: 10 },
            reliability: 0.85,
          },
        ],
        cheapest: mockRatesResult.cheapest,
        fastest: mockRatesResult.fastest,
        bestValue: mockRatesResult.bestValue,
      });
      expect(result.summary).toContain("1 shipping options from CN to US");
      expect(result.summary).toContain("Cheapest: $5.99 (CJ)");
      expect(result.summary).toContain("Fastest: 10 days");
      expect(result.summary).toContain("Best value: CJ ($5.99)");
    });

    it("passes input to compareRates correctly", async () => {
      await getShippingOptionsTool.execute(
        {
          originCountry: "CN",
          destinationCountry: "JP",
          weightKg: 0.8,
          lengthCm: 12,
          widthCm: 8,
          heightCm: 4,
          declaredValue: 30,
        },
        context
      );

      expect(compareRates).toHaveBeenCalledWith({
        originCountry: "CN",
        destinationCountry: "JP",
        weightKg: 0.8,
        lengthCm: 12,
        widthCm: 8,
        heightCm: 4,
        declaredValue: 30,
      });
    });
  });
});
