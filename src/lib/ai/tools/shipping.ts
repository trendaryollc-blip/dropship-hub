import { z } from "zod";
import { createTool } from "./registry";
import { compareRates } from "@/lib/shipping/carrier-rates";
import { predictDelivery } from "@/lib/shipping/delivery-prediction";
import { autoSelectCarrier } from "@/lib/shipping/auto-selector";
import { calculateCustoms } from "@/lib/shipping/customs-calculator";

// ─── Compare Shipping Rates ──────────────────────────────────────────────────

export const compareShippingRatesTool = createTool({
  id: "compare_shipping_rates",
  name: "Compare Shipping Rates",
  description: "Compare shipping rates across multiple carriers (CJ, ePacket, DHL, FedEx) for a package",
  category: "shipping",
  safetyLevel: "safe",
  inputSchema: z.object({
    originCountry: z.string().min(1),
    destinationCountry: z.string().min(1),
    weightKg: z.number().min(0.01),
    lengthCm: z.number().min(1),
    widthCm: z.number().min(1),
    heightCm: z.number().min(1),
    declaredValue: z.number().min(0).default(0),
    currency: z.string().length(3).default("USD"),
  }),
  execute: async (input) => {
    const result = compareRates({
      originCountry: input.originCountry as string,
      destinationCountry: input.destinationCountry as string,
      weightKg: input.weightKg as number,
      lengthCm: input.lengthCm as number,
      widthCm: input.widthCm as number,
      heightCm: input.heightCm as number,
      declaredValue: input.declaredValue as number,
      currency: input.currency as string,
    });

    const cheapestName = result.cheapest?.carrierName ?? "N/A";
    const fastestName = result.fastest?.carrierName ?? "N/A";
    const bestValueName = result.bestValue?.carrierName ?? "N/A";

    return {
      success: true,
      data: result,
      summary: `Found ${result.rates.length} rates. Cheapest: $${result.cheapest?.cost.toFixed(2) ?? "N/A"} (${cheapestName}). Fastest: ${result.fastest?.estimatedDays.max ?? "N/A"} days (${fastestName}). Best value: ${bestValueName}.`,
    };
  },
});

// ─── Predict Delivery ────────────────────────────────────────────────────────

export const predictDeliveryTool = createTool({
  id: "predict_delivery",
  name: "Predict Delivery",
  description: "Predict delivery time with risk assessment (weather, customs, holidays)",
  category: "shipping",
  safetyLevel: "safe",
  inputSchema: z.object({
    originCountry: z.string().min(1),
    destinationCountry: z.string().min(1),
    weightKg: z.number().min(0.01),
    carrierId: z.string().optional(),
    shipDate: z.string().optional(),
  }),
  execute: async (input) => {
    const prediction = predictDelivery({
      carrierId: (input.carrierId as "cj" | "aliexpress_standard" | "epacket" | "dhl" | "fedex") || "cj",
      originCountry: input.originCountry as string,
      destinationCountry: input.destinationCountry as string,
      weightKg: input.weightKg as number,
      serviceLevel: "standard",
      shipDate: input.shipDate as string | undefined,
    });

    const riskFactors = prediction.riskFactors.map((r) => `${r.type}: ${r.severity} risk`).join(", ");
    return {
      success: true,
      data: prediction,
      summary: `Predicted delivery: ${prediction.predictedDays.average} days (${prediction.confidence}% confidence). Estimated arrival: ${prediction.estimatedArrival.average}. Risks: ${riskFactors || "minimal"}.`,
    };
  },
});

// ─── Auto Select Shipping ────────────────────────────────────────────────────

export const autoSelectShippingTool = createTool({
  id: "auto_select_shipping",
  name: "Auto Select Shipping",
  description: "Automatically select the best carrier based on optimization preference (speed/cost/balanced)",
  category: "shipping",
  safetyLevel: "safe",
  inputSchema: z.object({
    originCountry: z.string().min(1),
    destinationCountry: z.string().min(1),
    weightKg: z.number().min(0.01),
    lengthCm: z.number().min(1),
    widthCm: z.number().min(1),
    heightCm: z.number().min(1),
    declaredValue: z.number().min(0).default(0),
    optimization: z.enum(["speed", "cost", "balanced"]).default("balanced"),
    maxDeliveryDays: z.number().int().min(1).optional(),
  }),
  execute: async (input) => {
    const result = autoSelectCarrier({
      originCountry: input.originCountry as string,
      destinationCountry: input.destinationCountry as string,
      weightKg: input.weightKg as number,
      lengthCm: input.lengthCm as number,
      widthCm: input.widthCm as number,
      heightCm: input.heightCm as number,
      declaredValue: input.declaredValue as number,
      optimization: input.optimization as "speed" | "cost" | "balanced",
      maxDeliveryDays: input.maxDeliveryDays as number | undefined,
    });

    const selectedName = result.selected?.carrierName ?? "N/A";
    const selectedService = result.selected?.serviceLevel ?? "N/A";
    const selectedCost = result.selected?.cost.toFixed(2) ?? "N/A";
    const selectedDays = result.selected?.estimatedDays.max ?? "N/A";

    return {
      success: true,
      data: result,
      summary: `Selected: ${selectedName} (${selectedService}) at $${selectedCost}, ${selectedDays} days. Reasoning: ${result.reasoning}.`,
    };
  },
});

// ─── Calculate Customs ───────────────────────────────────────────────────────

export const calculateCustomsTool = createTool({
  id: "calculate_customs",
  name: "Calculate Customs",
  description: "Calculate customs duties, taxes, and import fees for international shipments",
  category: "shipping",
  safetyLevel: "safe",
  inputSchema: z.object({
    originCountry: z.string().min(1),
    destinationCountry: z.string().min(1),
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number().int().min(1),
      unitPrice: z.number().min(0),
      weightKg: z.number().min(0),
      hsCode: z.string().optional(),
    })).min(1).max(10),
    currency: z.string().length(3).default("USD"),
    shippingCost: z.number().min(0).default(0),
  }),
  execute: async (input) => {
    const items = (input.items as Array<{
      name: string;
      quantity: number;
      unitPrice: number;
      weightKg: number;
      hsCode?: string;
    }>).map((item) => ({
      name: item.name,
      hsCode: item.hsCode || "9999.99.99",
      quantity: item.quantity,
      unitValue: item.unitPrice,
      weightKg: item.weightKg,
      originCountry: input.originCountry as string,
    }));

    const result = calculateCustoms(
      input.originCountry as string,
      input.destinationCountry as string,
      items,
      input.currency as string,
      input.shippingCost as number
    );

    const itemSummary = result.items.map((i) => `${i.name}: duty $${i.dutyAmount.toFixed(2)}, tax $${i.taxAmount.toFixed(2)}`).join("\n");
    const warnings = result.warnings.length > 0 ? `\nWarnings: ${result.warnings.join(", ")}` : "";
    return {
      success: true,
      data: result,
      summary: `Customs total: $${result.summary.totalDuties.toFixed(2)} duties + $${result.summary.totalTaxes.toFixed(2)} taxes = $${result.summary.totalLandedCost.toFixed(2)} landed cost.\n${itemSummary}${warnings}`,
    };
  },
});

// ─── Get Shipping Options ────────────────────────────────────────────────────

export const getShippingOptionsTool = createTool({
  id: "get_shipping_options",
  name: "Get Shipping Options",
  description: "Get all available shipping options with rates, delivery times, and recommendations",
  category: "shipping",
  safetyLevel: "safe",
  inputSchema: z.object({
    originCountry: z.string().min(1),
    destinationCountry: z.string().min(1),
    weightKg: z.number().min(0.01),
    lengthCm: z.number().min(1),
    widthCm: z.number().min(1),
    heightCm: z.number().min(1),
    declaredValue: z.number().min(0).default(0),
  }),
  execute: async (input) => {
    const rates = compareRates({
      originCountry: input.originCountry as string,
      destinationCountry: input.destinationCountry as string,
      weightKg: input.weightKg as number,
      lengthCm: input.lengthCm as number,
      widthCm: input.widthCm as number,
      heightCm: input.heightCm as number,
      declaredValue: input.declaredValue as number,
    });

    const options = rates.rates.map((rate) => ({
      carrier: rate.carrierName,
      service: rate.serviceLevel,
      cost: rate.cost,
      estimatedDays: rate.estimatedDays,
      reliability: rate.reliabilityScore,
    }));

    return {
      success: true,
      data: { options, cheapest: rates.cheapest, fastest: rates.fastest, bestValue: rates.bestValue },
      summary: `${options.length} shipping options from ${input.originCountry} to ${input.destinationCountry}. Cheapest: $${rates.cheapest?.cost.toFixed(2) ?? "N/A"} (${rates.cheapest?.carrierName ?? "N/A"}). Fastest: ${rates.fastest?.estimatedDays.max ?? "N/A"} days. Best value: ${rates.bestValue?.carrierName ?? "N/A"} ($${rates.bestValue?.cost.toFixed(2) ?? "N/A"}).`,
    };
  },
});
