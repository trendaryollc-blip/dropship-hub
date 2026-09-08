import { z } from "zod";
import { createTool } from "./registry";
import { calculateProfit, calculateShipping, calculateLandedCost, calculateMargin, calculateAdROI, calculateOrderProfit, calculateAggregatedProfit } from "@/lib/calculations";

// ─── Calculate Profit ───────────────────────────────────────────────────────

export const calculateProfitTool = createTool({
  id: "calculate_profit",
  name: "Calculate Profit",
  description: "Calculate profit metrics for a product including net profit, margin, ROI, and break-even units",
  category: "financial",
  safetyLevel: "safe",
  inputSchema: z.object({
    productCost: z.number().min(0),
    sellingPrice: z.number().min(0),
    shippingCost: z.number().min(0).default(0),
    platformFeePercent: z.number().min(0).max(100).default(0),
    adSpendPerUnit: z.number().min(0).default(0),
    units: z.number().int().min(1).default(1),
  }),
  execute: async (input: Record<string, unknown>) => {
    const result = calculateProfit(
      input.productCost as number,
      input.sellingPrice as number,
      input.shippingCost as number,
      input.platformFeePercent as number,
      input.adSpendPerUnit as number,
      input.units as number
    );
    return {
      success: true,
      data: result,
      summary: `Profit: $${result.netProfit.toFixed(2)} (${result.profitMargin.toFixed(1)}% margin, ${result.roi.toFixed(1)}% ROI). Revenue: $${result.revenue.toFixed(2)}, Total Cost: $${result.totalCost.toFixed(2)}. Break-even: ${result.breakEvenUnits} units.`,
    };
  },
});

// ─── Calculate Shipping ─────────────────────────────────────────────────────

export const calculateShippingTool = createTool({
  id: "calculate_shipping",
  name: "Calculate Shipping",
  description: "Estimate shipping costs across multiple carriers based on weight, dimensions, and route",
  category: "shipping",
  safetyLevel: "safe",
  inputSchema: z.object({
    weight: z.number().min(0),
    length: z.number().min(0),
    width: z.number().min(0),
    height: z.number().min(0),
    originCountry: z.string().min(1),
    destinationCountry: z.string().min(1),
  }),
  execute: async (input: Record<string, unknown>) => {
    const result = calculateShipping(
      input.weight as number,
      input.length as number,
      input.width as number,
      input.height as number,
      input.originCountry as string,
      input.destinationCountry as string
    );
    const carrierList = result.carriers.map((c) => `${c.name}: $${c.cost} (${c.days} days, ${c.reliability}% reliable)`).join("\n");
    return {
      success: true,
      data: result,
      summary: `Estimated shipping: $${result.estimatedCost} (${result.deliveryDays.min}-${result.deliveryDays.max} days).\nCarriers:\n${carrierList}`,
    };
  },
});

// ─── Calculate Landed Cost ──────────────────────────────────────────────────

export const calculateLandedCostTool = createTool({
  id: "calculate_landed_cost",
  name: "Calculate Landed Cost",
  description: "Calculate total landed cost including product, shipping, tariffs, duties, insurance, and fees",
  category: "financial",
  safetyLevel: "safe",
  inputSchema: z.object({
    productCost: z.number().min(0),
    shippingCost: z.number().min(0),
    tariffPercent: z.number().min(0).max(100).default(0),
    customsDuty: z.number().min(0).default(0),
    insuranceCost: z.number().min(0).default(0),
    platformFeePercent: z.number().min(0).max(100).default(0),
    otherFees: z.number().min(0).default(0),
    quantity: z.number().int().min(1).default(1),
  }),
  execute: async (input: Record<string, unknown>) => {
    const result = calculateLandedCost(
      input.productCost as number,
      input.shippingCost as number,
      input.tariffPercent as number,
      input.customsDuty as number,
      input.insuranceCost as number,
      input.platformFeePercent as number,
      input.otherFees as number,
      input.quantity as number
    );
    return {
      success: true,
      data: result,
      summary: `Landed cost: $${result.landedCost} total ($${(result.landedCost / (input.quantity as number)).toFixed(2)}/unit). Suggested retail: $${result.suggestedRetail} (profit: $${result.profitAtSuggested}/unit). Duties: $${result.totalDuties}, Shipping: $${result.totalShipping}, Fees: $${result.totalFees}.`,
    };
  },
});

// ─── Calculate Margin ───────────────────────────────────────────────────────

export const calculateMarginTool = createTool({
  id: "calculate_margin",
  name: "Calculate Margin",
  description: "Calculate recommended pricing based on cost and desired margin, with competitive range analysis",
  category: "pricing",
  safetyLevel: "safe",
  inputSchema: z.object({
    costPrice: z.number().min(0),
    desiredMarginPercent: z.number().min(0).max(99),
    competitorPrices: z.array(z.number().min(0)).optional().default([]),
  }),
  execute: async (input: Record<string, unknown>) => {
    const result = calculateMargin(
      input.costPrice as number,
      input.desiredMarginPercent as number,
      input.competitorPrices as number[]
    );
    const breakpoints = result.priceBreakpoints.map((bp) => `$${bp.price} (${bp.margin}% margin, ${bp.roi}% ROI)`).join(", ");
    return {
      success: true,
      data: result,
      summary: `Recommended price: $${result.recommendedPrice} (${result.marginAtPrice}% margin). Competitive range: $${result.competitiveRange.min}-$${result.competitiveRange.max}. Breakpoints: ${breakpoints}.`,
    };
  },
});

// ─── Calculate Ad ROI ───────────────────────────────────────────────────────

export const calculateAdROITool = createTool({
  id: "calculate_ad_roi",
  name: "Calculate Ad ROI",
  description: "Calculate advertising ROI including CAC, break-even ROAS, and profit projections across scenarios",
  category: "financial",
  safetyLevel: "safe",
  inputSchema: z.object({
    productCost: z.number().min(0),
    sellingPrice: z.number().min(0),
    shippingCost: z.number().min(0).default(0),
    platformFeePercent: z.number().min(0).max(100).default(0),
    estimatedCTR: z.number().min(0).max(100),
    estimatedCVR: z.number().min(0).max(100),
    dailyBudget: z.number().min(0),
  }),
  execute: async (input: Record<string, unknown>) => {
    const result = calculateAdROI(
      input.productCost as number,
      input.sellingPrice as number,
      input.shippingCost as number,
      input.platformFeePercent as number,
      input.estimatedCTR as number,
      input.estimatedCVR as number,
      input.dailyBudget as number
    );
    const scenarios = result.scenarios.map((s) => `${s.name}: $${s.spend} spend → $${s.revenue} revenue ($${s.profit} profit, ${s.roas}x ROAS)`).join("\n");
    return {
      success: true,
      data: result,
      summary: `CAC: $${result.estimatedCAC}, Break-even ROAS: ${result.breakEvenROAS}x. Monthly projection: $${result.monthlyRevenue} revenue, $${result.monthlyProfit} profit.\nScenarios:\n${scenarios}`,
    };
  },
});

// ─── Calculate Order Profit ─────────────────────────────────────────────────

export const calculateOrderProfitTool = createTool({
  id: "calculate_order_profit",
  name: "Calculate Order Profit",
  description: "Calculate profit for a single order with full cost breakdown",
  category: "financial",
  safetyLevel: "safe",
  inputSchema: z.object({
    revenue: z.number().min(0),
    cogs: z.number().min(0),
    shippingCost: z.number().min(0).default(0),
    platformFeePercent: z.number().min(0).max(100).default(0),
    paymentProcessingPercent: z.number().min(0).max(100).default(0),
    refunds: z.number().min(0).default(0),
    adSpend: z.number().min(0).default(0),
    otherCosts: z.number().min(0).default(0),
  }),
  execute: async (input: Record<string, unknown>) => {
    const result = calculateOrderProfit(
      input.revenue as number,
      input.cogs as number,
      input.shippingCost as number,
      input.platformFeePercent as number,
      input.paymentProcessingPercent as number,
      input.refunds as number,
      input.adSpend as number,
      input.otherCosts as number
    );
    const breakdown = result.breakdown.map((b) => `${b.name}: $${b.value.toFixed(2)} (${b.pct}%)`).join(", ");
    return {
      success: true,
      data: result,
      summary: `Net profit: $${result.netProfit} (${result.profitMargin}% margin). Total costs: $${result.totalCosts}. Breakdown: ${breakdown}.`,
    };
  },
});

// ─── Calculate Aggregated Profit ────────────────────────────────────────────

export const calculateAggregatedProfitTool = createTool({
  id: "calculate_aggregated_profit",
  name: "Calculate Aggregated Profit",
  description: "Calculate total profit across multiple orders with averages",
  category: "financial",
  safetyLevel: "safe",
  inputSchema: z.object({
    orders: z.array(z.object({
      revenue: z.number(),
      cogs: z.number(),
      shippingCost: z.number(),
      platformFee: z.number(),
      paymentProcessing: z.number(),
      refunds: z.number(),
      adSpend: z.number(),
      otherCosts: z.number(),
      netProfit: z.number(),
    })).min(1),
  }),
  execute: async (input: Record<string, unknown>) => {
    const result = calculateAggregatedProfit(input.orders as Array<{
      revenue: number; cogs: number; shippingCost: number; platformFee: number;
      paymentProcessing: number; refunds: number; adSpend: number; otherCosts: number; netProfit: number;
    }>);
    return {
      success: true,
      data: result,
      summary: `${result.totalOrders} orders: $${result.totalRevenue} revenue, $${result.totalProfit} profit (${result.profitMargin}% margin). Avg order: $${result.avgOrderValue} revenue, $${result.avgOrderProfit} profit.`,
    };
  },
});
