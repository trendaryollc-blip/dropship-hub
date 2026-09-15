import { z } from "zod";
import { createTool } from "./registry";
import { evaluatePriceRule, calculateMargin as priceWarMargin, calculateFloorPrice, getMarginStatus } from "@/lib/price-war-engine";
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

// ─── Counter Strategy ──────────────────────────────────────────────────────

export const counterStrategyTool = createTool({
  id: "counter_strategy",
  name: "Counter-Strategy",
  description: "Generate a go-to-market plan against competitors based on market analysis data",
  category: "pricing",
  safetyLevel: "safe",
  inputSchema: z.object({
    query: z.string().min(1),
    avgPrice: z.number().min(0),
    minPrice: z.number().min(0),
    maxPrice: z.number().min(0),
    platforms: z.array(z.object({
      platform: z.string(),
      avgPrice: z.number(),
      minPrice: z.number(),
      maxPrice: z.number(),
      sellerCount: z.number(),
      trend: z.string(),
    })),
    topSellers: z.array(z.object({
      name: z.string(),
      price: z.number(),
      rating: z.number(),
      threatLevel: z.string(),
      isDropshipper: z.boolean(),
    })).optional().default([]),
    estimatedCost: z.number().min(0).optional(),
  }),
  execute: async (input: Record<string, unknown>) => {
    const query = input.query as string;
    const avgPrice = input.avgPrice as number;
    const minPrice = input.minPrice as number;
    const maxPrice = input.maxPrice as number;
    const platforms = input.platforms as { platform: string; avgPrice: number; minPrice: number; maxPrice: number; sellerCount: number; trend: string }[];
    const topSellers = (input.topSellers || []) as { name: string; price: number; rating: number; threatLevel: string; isDropshipper: boolean }[];
    const estimatedCost = (input.estimatedCost as number) || avgPrice * 0.35;

    const priceSpread = maxPrice - minPrice;
    const midTierPrice = Math.round(((minPrice + avgPrice) / 2) * 100) / 100;
    const competitivePrice = Math.round((avgPrice * 0.95) * 100) / 100;
    const premiumPrice = Math.round((avgPrice * 1.1) * 100) / 100;

    const estimatedMargin = Math.round(((competitivePrice - estimatedCost) / competitivePrice) * 100 * 100) / 100;

    const sortedPlatforms = [...platforms].sort((a, b) => {
      const aScore = (a.sellerCount > 0 ? 1 : 0) + (a.trend === "up" ? 2 : a.trend === "stable" ? 1 : 0);
      const bScore = (b.sellerCount > 0 ? 1 : 0) + (b.trend === "up" ? 2 : b.trend === "stable" ? 1 : 0);
      return bScore - aScore;
    });

    const primaryPlatform = sortedPlatforms[0]?.platform || "Unknown";
    const highThreatSellers = topSellers.filter((s) => s.threatLevel === "high");
    const dropshippers = topSellers.filter((s) => s.isDropshipper);

    const pricingStrategies = [
      {
        name: "Aggressive Entry",
        price: competitivePrice,
        margin: Math.round(((competitivePrice - estimatedCost) / competitivePrice) * 100 * 100) / 100,
        description: `Price at $${competitivePrice} (5% below avg) to capture market share quickly.`,
        tradeoff: "Lower margins but faster customer acquisition.",
        whenToUse: "Best for new entrants needing volume.",
      },
      {
        name: "Value Positioning",
        price: midTierPrice,
        margin: Math.round(((midTierPrice - estimatedCost) / midTierPrice) * 100 * 100) / 100,
        description: `Price at $${midTierPrice} in the mid-tier sweet spot between low and high clusters.`,
        tradeoff: "Balanced margins with broad appeal.",
        whenToUse: "Best for sustainable growth with decent margins.",
      },
      {
        name: "Premium Differentiation",
        price: premiumPrice,
        margin: Math.round(((premiumPrice - estimatedCost) / premiumPrice) * 100 * 100) / 100,
        description: `Price at $${premiumPrice} (10% above avg) with superior listing quality.`,
        tradeoff: "Higher margins but requires strong branding.",
        whenToUse: "Best if you can differentiate on quality/service.",
      },
    ];

    const recommendedStrategy = estimatedMargin < 20
      ? pricingStrategies[1]
      : estimatedMargin < 35
        ? pricingStrategies[0]
        : pricingStrategies[2];

    const platformStrategy = sortedPlatforms.slice(0, 3).map((p, i) => ({
      platform: p.platform,
      priority: i === 0 ? "Primary" : i === 1 ? "Secondary" : "Tertiary",
      reason: i === 0
        ? `Highest opportunity with ${p.sellerCount} sellers and ${p.trend} trend.`
        : i === 1
          ? `Good secondary market with ${p.sellerCount} sellers.`
          : `Tertiary option for additional reach.`,
      suggestedPrice: Math.round(p.avgPrice * 0.97 * 100) / 100,
    }));

    const competitiveActions = [
      {
        action: "Listing Optimization",
        priority: "High",
        description: `Most competitors have basic listings. Improve with better photos, detailed descriptions, and SEO titles targeting "${query}".`,
        expectedImpact: "+20-40% visibility",
      },
      {
        action: "Price Monitoring",
        priority: "High",
        description: `Set up automated price tracking across ${platforms.length} platforms. Price spread of $${priceSpread.toFixed(2)} creates arbitrage opportunities.`,
        expectedImpact: "Stay competitive in real-time",
      },
      {
        action: "Bundle Strategy",
        priority: "Medium",
        description: "Create product bundles with accessories. Most competitors sell single items — bundles increase AOV and differentiation.",
        expectedImpact: "+$5-15 average order value",
      },
      {
        action: "Target Dropshipper Weaknesses",
        priority: dropshippers.length > 0 ? "High" : "Low",
        description: dropshippers.length > 0
          ? `${dropshippers.length} identified dropshippers have longer shipping. Compete on speed and quality.`
          : "Market appears to have established sellers — focus on differentiation.",
        expectedImpact: "+15-25% conversion from quality focus",
      },
      {
        action: "Multi-Platform Expansion",
        priority: platforms.length > 2 ? "Medium" : "High",
        description: `List on ${platforms.length} platforms to maximize reach. Start with ${primaryPlatform} as primary channel.`,
        expectedImpact: "+30-50% total traffic",
      },
    ];

    const summary = [
      `Counter-Strategy for "${query}":`,
      `Market avg: $${avgPrice.toFixed(2)} | Range: $${minPrice.toFixed(2)}-$${maxPrice.toFixed(2)} | ${platforms.length} platforms | ${topSellers.length} top sellers.`,
      `Recommended: ${recommendedStrategy.name} at $${recommendedStrategy.price.toFixed(2)} (${recommendedStrategy.margin}% margin).`,
      `Primary platform: ${primaryPlatform}. ${highThreatSellers.length} high-threat sellers detected.`,
      `Key actions: Optimize listings, monitor prices across ${platforms.length} platforms, and target ${dropshippers.length} dropshippers on quality.`,
    ].join(" ");

    return {
      success: true,
      data: {
        query,
        marketOverview: {
          avgPrice,
          minPrice,
          maxPrice,
          priceSpread: priceSpread.toFixed(2),
          totalPlatforms: platforms.length,
          totalTopSellers: topSellers.length,
          highThreatSellers: highThreatSellers.length,
          dropshippersDetected: dropshippers.length,
        },
        recommendedStrategy,
        pricingStrategies,
        platformStrategy,
        competitiveActions,
        estimatedCost,
      },
      summary,
    };
  },
});
