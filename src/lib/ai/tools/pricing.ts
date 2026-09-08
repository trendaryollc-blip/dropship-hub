import { z } from "zod";
import { createTool } from "./registry";
import { evaluatePriceRule, calculateMargin as priceWarMargin, calculateFloorPrice, calculateLandedPrice, getMarginStatus } from "@/lib/price-war-engine";
import type { PriceRule, CompetitorPrice } from "@/types/price-war";

// ─── Optimize Pricing ───────────────────────────────────────────────────────

export const optimizePricingTool = createTool({
  id: "optimize_pricing",
  name: "Optimize Pricing",
  description: "Evaluate a pricing rule against competitor prices and get a suggested price with margin analysis",
  category: "pricing",
  safetyLevel: "moderate",
  inputSchema: z.object({
    productTitle: z.string().min(1),
    myPrice: z.number().min(0),
    cost: z.number().min(0),
    floorPrice: z.number().min(0),
    minMargin: z.number().min(0).max(100),
    strategy: z.enum(["match_lowest", "stay_below", "maintain_margin", "undercut_percent", "fixed"]),
    strategyConfig: z.object({
      undercutPercent: z.number().min(0).max(50).optional(),
      belowPercent: z.number().min(0).max(50).optional(),
      targetMargin: z.number().min(0).max(100).optional(),
      maxIncrease: z.number().min(0).max(100).optional(),
      maxDecrease: z.number().min(0).max(100).optional(),
    }).optional().default({}),
    competitorPrices: z.array(z.object({
      seller: z.string(),
      price: z.number(),
      totalLanded: z.number(),
      inStock: z.boolean(),
      previousPrice: z.number().optional(),
    })).min(1),
  }),
  execute: async (input: Record<string, unknown>) => {
    const rule: PriceRule = {
      id: `rule_${Date.now()}`,
      productTitle: input.productTitle as string,
      productImage: "",
      myPrice: input.myPrice as number,
      cost: input.cost as number,
      floorPrice: input.floorPrice as number,
      minMargin: input.minMargin as number,
      strategy: input.strategy as PriceRule["strategy"],
      strategyConfig: input.strategyConfig as PriceRule["strategyConfig"],
      platforms: [],
      competitorUrls: [],
      status: "active",
      lastChecked: undefined,
      createdAt: new Date().toISOString(),
    };

    const competitors = input.competitorPrices as CompetitorPrice[];
    const result = evaluatePriceRule(rule, competitors);

    return {
      success: true,
      data: result,
      summary: result.shouldAdjust
        ? `Suggested price: $${result.suggestedPrice} (was $${result.currentPrice}). ${result.reason}. Margin: ${result.marginBefore.toFixed(1)}% → ${result.marginAfter.toFixed(1)}%. ${result.alerts.length} alerts.`
        : `No adjustment needed. Current: $${result.currentPrice}. ${result.reason}. Margin: ${result.marginBefore.toFixed(1)}%.`,
    };
  },
});

// ─── Evaluate Price Rule ────────────────────────────────────────────────────

export const evaluatePriceRuleTool = createTool({
  id: "evaluate_price_rule",
  name: "Evaluate Price Rule",
  description: "Quick price evaluation against a single competitor price",
  category: "pricing",
  safetyLevel: "safe",
  inputSchema: z.object({
    myPrice: z.number().min(0),
    cost: z.number().min(0),
    competitorPrice: z.number().min(0),
    strategy: z.enum(["match_lowest", "stay_below", "maintain_margin", "undercut_percent", "fixed"]),
    targetMargin: z.number().min(0).max(100).optional(),
    undercutPercent: z.number().min(0).max(50).optional(),
  }),
  execute: async (input: Record<string, unknown>) => {
    const myMargin = priceWarMargin(input.myPrice as number, input.cost as number);
    const compMargin = priceWarMargin(input.competitorPrice as number, input.cost as number);

    let suggestedPrice = input.myPrice as number;
    let reason = "";

    switch (input.strategy) {
      case "match_lowest":
        suggestedPrice = input.competitorPrice as number;
        reason = "Matching competitor price";
        break;
      case "stay_below":
        suggestedPrice = Math.round((input.competitorPrice as number) * 0.95 * 100) / 100;
        reason = "Staying 5% below competitor";
        break;
      case "undercut_percent": {
        const undercut = (input.undercutPercent as number) || 3;
        suggestedPrice = Math.round((input.competitorPrice as number) * (1 - undercut / 100) * 100) / 100;
        reason = `Undercutting by ${undercut}%`;
        break;
      }
      case "maintain_margin": {
        const targetMargin = (input.targetMargin as number) || 30;
        const minPrice = (input.cost as number) / (1 - targetMargin / 100);
        suggestedPrice = Math.round(Math.max(minPrice, (input.competitorPrice as number) * 0.99) * 100) / 100;
        reason = `Maintaining ${targetMargin}% margin`;
        break;
      }
      case "fixed":
        suggestedPrice = input.myPrice as number;
        reason = "Fixed price — no adjustment";
        break;
    }

    const marginAfter = priceWarMargin(suggestedPrice, input.cost as number);

    return {
      success: true,
      data: {
        currentPrice: input.myPrice,
        suggestedPrice,
        myMargin,
        competitorMargin: compMargin,
        marginAfter,
        reason,
        priceDifference: suggestedPrice - (input.myPrice as number),
      },
      summary: `Current: $${input.myPrice} (${myMargin}% margin). Suggested: $${suggestedPrice} (${marginAfter}% margin). ${reason}.`,
    };
  },
});

// ─── Calculate Floor Price ──────────────────────────────────────────────────

export const calculateFloorPriceTool = createTool({
  id: "calculate_floor_price",
  name: "Calculate Floor Price",
  description: "Calculate the minimum price to sell at given cost and desired minimum margin",
  category: "pricing",
  safetyLevel: "safe",
  inputSchema: z.object({
    cost: z.number().min(0),
    minMargin: z.number().min(0).max(99),
  }),
  execute: async (input: Record<string, unknown>) => {
    const floorPrice = calculateFloorPrice(input.cost as number, input.minMargin as number);
    const status = getMarginStatus(input.minMargin as number);
    const suggestedPrices = [20, 30, 40, 50].map((margin) => ({
      margin,
      price: Math.round((input.cost as number / (1 - margin / 100)) * 100) / 100,
    }));

    return {
      success: true,
      data: { floorPrice, marginStatus: status, suggestedPrices },
      summary: `Floor price: $${floorPrice} (${input.minMargin}% min margin). Status: ${status}. Suggested prices: ${suggestedPrices.map((s) => `$${s.price} at ${s.margin}%`).join(", ")}.`,
    };
  },
});
