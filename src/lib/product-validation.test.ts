import { describe, it, expect } from "vitest";
import {
  calculateTrendVelocity,
  calculateSaturation,
  calculateProfitPotential,
  calculateSeasonalDemand,
  calculateGoldenProduct,
  runFullValidation,
} from "./product-validation";
import type {
  TrendVelocityInput,
  SaturationInput,
  ProfitPotentialInput,
  SeasonalDemandInput,
} from "@/types/product-validation";

describe("calculateTrendVelocity", () => {
  const baseInput: TrendVelocityInput = {
    currentSearchVolume: 5000,
    historicalSearchVolumes: [1000, 2000, 3000, 4000, 5000],
    currentSellerCount: 50,
    historicalSellerCounts: [20, 30, 40, 45, 50],
    currentPrice: 29.99,
    historicalPrices: [29.99, 29.99, 28.99, 29.99, 30.99],
  };

  it("returns zero score with insufficient data", () => {
    const input: TrendVelocityInput = {
      ...baseInput,
      historicalSearchVolumes: [],
      historicalSellerCounts: [],
      historicalPrices: [],
    };
    const result = calculateTrendVelocity(input);
    expect(result.score).toBe(0);
    expect(result.phase).toBe("mature");
    expect(result.insight).toContain("Insufficient");
  });

  it("calculates positive velocity for growing demand", () => {
    const result = calculateTrendVelocity(baseInput);
    expect(result.velocity).toBeGreaterThan(0);
    expect(result.score).toBeGreaterThan(0);
    expect(["emerging", "growth"]).toContain(result.phase);
  });

  it("identifies emerging phase for high velocity", () => {
    const input: TrendVelocityInput = {
      ...baseInput,
      historicalSearchVolumes: [200, 1000, 3000, 8000, 20000],
    };
    const result = calculateTrendVelocity(input);
    expect(["emerging", "growth"]).toContain(result.phase);
    expect(result.velocity).toBeGreaterThan(3);
  });

  it("identifies declining phase for negative velocity", () => {
    const input: TrendVelocityInput = {
      ...baseInput,
      historicalSearchVolumes: [10000, 8000, 6000, 4000, 2000],
      historicalSellerCounts: [100, 90, 80, 70, 60],
    };
    const result = calculateTrendVelocity(input);
    expect(result.phase).toBe("declining");
    expect(result.velocity).toBeLessThan(-3);
  });

  it("calculates acceleration", () => {
    const result = calculateTrendVelocity(baseInput);
    expect(typeof result.acceleration).toBe("number");
  });

  it("returns weeklyGrowthRates array", () => {
    const result = calculateTrendVelocity(baseInput);
    expect(Array.isArray(result.weeklyGrowthRates)).toBe(true);
    expect(result.weeklyGrowthRates.length).toBeGreaterThan(0);
  });

  it("score is between 0 and 100", () => {
    const result = calculateTrendVelocity(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe("calculateSaturation", () => {
  const baseInput: SaturationInput = {
    totalSellers: 100,
    topSellerMarketShare: 30,
    avgSellerRating: 4.2,
    avgSellerReviews: 500,
    priceRange: { min: 15, max: 45 },
    uniqueVariants: 10,
    platformCount: 3,
  };

  it("returns unsaturated for zero sellers", () => {
    const result = calculateSaturation({ ...baseInput, totalSellers: 0 });
    expect(result.index).toBe(0);
    expect(result.level).toBe("unsaturated");
    expect(result.insight).toContain("untapped");
  });

  it("returns low saturation for few sellers", () => {
    const result = calculateSaturation({ ...baseInput, totalSellers: 10 });
    expect(["unsaturated", "low"]).toContain(result.level);
  });

  it("returns higher saturation for many sellers", () => {
    const result = calculateSaturation({ ...baseInput, totalSellers: 500 });
    expect(["moderate", "saturated"]).toContain(result.level);
  });

  it("returns saturated for many sellers with high concentration", () => {
    const result = calculateSaturation({
      ...baseInput,
      totalSellers: 600,
      topSellerMarketShare: 50,
      avgSellerReviews: 7000,
      platformCount: 8,
    });
    expect(["saturated", "hyper-saturated"]).toContain(result.level);
  });

  it("calculates price war risk correctly", () => {
    const highRisk = calculateSaturation({
      ...baseInput,
      totalSellers: 150,
      priceRange: { min: 20, max: 24 },
    });
    expect(highRisk.priceWarRisk).toBe("high");

    const lowRisk = calculateSaturation({
      ...baseInput,
      totalSellers: 10,
      priceRange: { min: 10, max: 50 },
    });
    expect(lowRisk.priceWarRisk).toBe("low");
  });

  it("calculates barrier to entry", () => {
    const highBarrier = calculateSaturation({
      ...baseInput,
      avgSellerReviews: 8000,
      topSellerMarketShare: 50,
    });
    expect(highBarrier.barrierToEntry).toBe("high");

    const lowBarrier = calculateSaturation({
      ...baseInput,
      avgSellerReviews: 100,
      topSellerMarketShare: 5,
    });
    expect(lowBarrier.barrierToEntry).toBe("low");
  });

  it("index is between 0 and 100", () => {
    const result = calculateSaturation(baseInput);
    expect(result.index).toBeGreaterThanOrEqual(0);
    expect(result.index).toBeLessThanOrEqual(100);
  });
});

describe("calculateProfitPotential", () => {
  const baseInput: ProfitPotentialInput = {
    productCost: 5,
    sellingPrice: 30,
    shippingCost: 3,
    platformFeePercent: 15,
    adCostPerClick: 0.3,
    conversionRate: 3,
    returnRate: 3,
    averageOrderValue: 30,
    monthlyAdBudget: 300,
    estimatedMonthlySales: 100,
  };

  it("returns zero for invalid selling price", () => {
    const result = calculateProfitPotential({ ...baseInput, sellingPrice: 0 });
    expect(result.score).toBe(0);
    expect(result.netProfitPerUnit).toBe(0);
    expect(result.insight).toContain("Invalid");
  });

  it("returns zero for invalid product cost", () => {
    const result = calculateProfitPotential({ ...baseInput, productCost: 0 });
    expect(result.score).toBe(0);
    expect(result.insight).toContain("Invalid");
  });

  it("calculates positive profit for good margins", () => {
    const result = calculateProfitPotential(baseInput);
    expect(result.netProfitPerUnit).toBeGreaterThan(0);
    expect(result.profitMargin).toBeGreaterThan(0);
    expect(result.roi).toBeGreaterThan(0);
  });

  it("calculates cost breakdown", () => {
    const result = calculateProfitPotential(baseInput);
    expect(result.costBreakdown.length).toBeGreaterThan(0);
    const names = result.costBreakdown.map((c) => c.name);
    expect(names).toContain("Product Cost");
    expect(names).toContain("Shipping");
  });

  it("cost breakdown percentages sum to 100", () => {
    const result = calculateProfitPotential(baseInput);
    const totalPct = result.costBreakdown.reduce((sum, c) => sum + c.pct, 0);
    expect(totalPct).toBeCloseTo(100, 0);
  });

  it("calculates break-even ROAS", () => {
    const result = calculateProfitPotential(baseInput);
    expect(result.breakEvenROAS).toBeGreaterThan(0);
  });

  it("calculates monthly projections", () => {
    const result = calculateProfitPotential(baseInput);
    expect(result.monthlyNetProfit).toBeGreaterThan(0);
    expect(result.monthlyROI).toBeGreaterThanOrEqual(0);
  });

  it("calculates risk-adjusted return", () => {
    const result = calculateProfitPotential(baseInput);
    expect(result.riskAdjustedReturn).toBeGreaterThan(0);
  });

  it("returns excellent insight for high margin", () => {
    const input: ProfitPotentialInput = {
      ...baseInput,
      productCost: 3,
      sellingPrice: 50,
      shippingCost: 2,
      platformFeePercent: 10,
      adCostPerClick: 0.2,
      conversionRate: 4,
      returnRate: 1,
    };
    const result = calculateProfitPotential(input);
    expect(result.insight).toContain("Excellent");
  });

  it("returns low margin insight for tight margins", () => {
    const input: ProfitPotentialInput = {
      ...baseInput,
      productCost: 22,
      sellingPrice: 30,
    };
    const result = calculateProfitPotential(input);
    expect(result.insight).toMatch(/low|tight/i);
  });

  it("score is between 0 and 100", () => {
    const result = calculateProfitPotential(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe("calculateSeasonalDemand", () => {
  const baseInput: SeasonalDemandInput = {
    monthlySearchVolumes: [100, 120, 150, 200, 300, 400, 350, 250, 180, 140, 110, 100],
    monthlySalesData: [80, 100, 130, 170, 260, 350, 300, 220, 150, 120, 90, 80],
    monthlyRevenue: [2400, 3000, 3900, 5100, 7800, 10500, 9000, 6600, 4500, 3600, 2700, 2400],
    category: "outdoor",
  };

  it("returns zero score with no data", () => {
    const input: SeasonalDemandInput = {
      monthlySearchVolumes: [],
      monthlySalesData: [],
      monthlyRevenue: [],
      category: "",
    };
    const result = calculateSeasonalDemand(input);
    expect(result.score).toBe(0);
    expect(result.insight).toContain("No historical data");
  });

  it("identifies peak month", () => {
    const result = calculateSeasonalDemand(baseInput);
    expect(result.peakMonth).toBe(6);
  });

  it("identifies low month", () => {
    const result = calculateSeasonalDemand(baseInput);
    expect(result.lowMonth).toBe(1);
  });

  it("returns 12 month labels", () => {
    const result = calculateSeasonalDemand(baseInput);
    expect(result.monthLabels).toHaveLength(12);
    expect(result.monthLabels[0]).toBe("Jan");
    expect(result.monthLabels[11]).toBe("Dec");
  });

  it("calculates seasonality index", () => {
    const result = calculateSeasonalDemand(baseInput);
    expect(result.seasonalityIndex).toBeGreaterThanOrEqual(0);
    expect(result.seasonalityIndex).toBeLessThanOrEqual(1);
  });

  it("generates 6-month forecast", () => {
    const result = calculateSeasonalDemand(baseInput);
    expect(result.forecast).toHaveLength(6);
    for (const f of result.forecast) {
      expect(f.month).toBeDefined();
      expect(typeof f.predicted).toBe("number");
      expect(f.confidence).toBeGreaterThanOrEqual(0.3);
      expect(f.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("adds category-specific insight for fitness", () => {
    const input: SeasonalDemandInput = { ...baseInput, category: "fitness equipment" };
    const result = calculateSeasonalDemand(input);
    expect(result.insight).toContain("Fitness");
  });

  it("adds category-specific insight for toys", () => {
    const input: SeasonalDemandInput = { ...baseInput, category: "toys and gifts" };
    const result = calculateSeasonalDemand(input);
    expect(result.insight).toContain("Gift/toy");
  });

  it("adds category-specific insight for outdoor", () => {
    const result = calculateSeasonalDemand(baseInput);
    expect(result.insight).toContain("Outdoor");
  });

  it("score is between 0 and 100", () => {
    const result = calculateSeasonalDemand(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});

describe("calculateGoldenProduct", () => {
  const baseExtras = {
    reviewScore: 4.5,
    reviewCount: 2000,
    supplierReliability: 85,
    shippingSpeed: 5,
    returnRate: 3,
    competitionLevel: "medium" as const,
  };

  const excellentResults = {
    trendVelocity: { score: 85, velocity: 12, acceleration: 3, phase: "emerging" as const, weeklyGrowthRates: [3, 4, 5], insight: "test" },
    saturation: { index: 10, level: "unsaturated" as const, sellerCount: 5, marketConcentration: 5, priceWarRisk: "low" as const, barrierToEntry: "low" as const, insight: "test" },
    profitPotential: { score: 80, netProfitPerUnit: 15, profitMargin: 50, roi: 100, breakEvenROAS: 2, monthlyNetProfit: 1500, monthlyROI: 80, costBreakdown: [], riskAdjustedReturn: 1400, insight: "test" },
    seasonalDemand: { score: 85, peakMonth: 6, lowMonth: 1, seasonalityIndex: 0.1, currentPhase: "building" as const, forecast: [], monthLabels: [], insight: "test" },
  };

  it("assigns high rank for excellent scores", () => {
    const result = calculateGoldenProduct({ ...baseExtras, ...excellentResults });
    expect(["S", "A"]).toContain(result.rank);
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  it("assigns D rank for poor scores", () => {
    const poorResults = {
      trendVelocity: { score: 10, velocity: -10, acceleration: -5, phase: "declining" as const, weeklyGrowthRates: [], insight: "test" },
      saturation: { index: 90, level: "hyper-saturated" as const, sellerCount: 1000, marketConcentration: 60, priceWarRisk: "high" as const, barrierToEntry: "high" as const, insight: "test" },
      profitPotential: { score: 5, netProfitPerUnit: -2, profitMargin: -10, roi: -20, breakEvenROAS: 0, monthlyNetProfit: -200, monthlyROI: -15, costBreakdown: [], riskAdjustedReturn: -250, insight: "test" },
      seasonalDemand: { score: 20, peakMonth: 12, lowMonth: 6, seasonalityIndex: 0.8, currentPhase: "off-peak" as const, forecast: [], monthLabels: [], insight: "test" },
    };
    const result = calculateGoldenProduct({ ...baseExtras, ...poorResults });
    expect(result.rank).toBe("D");
    expect(result.score).toBeLessThan(40);
  });

  it("returns 10 criteria", () => {
    const result = calculateGoldenProduct({ ...baseExtras, ...excellentResults });
    expect(result.criteria).toHaveLength(10);
  });

  it("criteria have correct structure", () => {
    const result = calculateGoldenProduct({ ...baseExtras, ...excellentResults });
    for (const c of result.criteria) {
      expect(c.name).toBeDefined();
      expect(c.score).toBeGreaterThanOrEqual(0);
      expect(c.score).toBeLessThanOrEqual(100);
      expect(c.weight).toBeGreaterThan(0);
      expect(c.contribution).toBeGreaterThanOrEqual(0);
      expect(["excellent", "good", "average", "poor"]).toContain(c.status);
    }
  });

  it("generates action items for weak criteria", () => {
    const poorResults = {
      trendVelocity: { score: 5, velocity: -15, acceleration: -10, phase: "declining" as const, weeklyGrowthRates: [], insight: "test" },
      saturation: { index: 95, level: "hyper-saturated" as const, sellerCount: 1000, marketConcentration: 70, priceWarRisk: "high" as const, barrierToEntry: "high" as const, insight: "test" },
      profitPotential: { score: 3, netProfitPerUnit: -5, profitMargin: -20, roi: -50, breakEvenROAS: 0, monthlyNetProfit: -500, monthlyROI: -30, costBreakdown: [], riskAdjustedReturn: -600, insight: "test" },
      seasonalDemand: { score: 10, peakMonth: 12, lowMonth: 6, seasonalityIndex: 0.9, currentPhase: "off-peak" as const, forecast: [], monthLabels: [], insight: "test" },
    };
    const result = calculateGoldenProduct({ ...baseExtras, ...poorResults });
    expect(result.actionItems.length).toBeGreaterThan(0);
  });

  it("generates default action items for high rank", () => {
    const result = calculateGoldenProduct({ ...baseExtras, ...excellentResults });
    expect(result.actionItems.length).toBeGreaterThan(0);
  });

  it("overallInsight contains score and rank", () => {
    const result = calculateGoldenProduct({ ...baseExtras, ...excellentResults });
    expect(result.overallInsight).toContain("Golden Score:");
    expect(result.overallInsight).toContain("Rank");
  });

  it("competition level affects score", () => {
    const low = calculateGoldenProduct({ ...baseExtras, competitionLevel: "low", ...excellentResults });
    const high = calculateGoldenProduct({ ...baseExtras, competitionLevel: "very-high", ...excellentResults });
    expect(low.score).toBeGreaterThan(high.score);
  });

  it("returns valid rank enum", () => {
    const result = calculateGoldenProduct({ ...baseExtras, ...excellentResults });
    expect(["S", "A", "B", "C", "D"]).toContain(result.rank);
  });
});

describe("runFullValidation", () => {
  it("runs all engines and returns combined result", () => {
    const trendInput: TrendVelocityInput = {
      currentSearchVolume: 3000,
      historicalSearchVolumes: [1000, 1500, 2000, 2500, 3000],
      currentSellerCount: 30,
      historicalSellerCounts: [10, 15, 20, 25, 30],
      currentPrice: 25,
      historicalPrices: [25, 25, 24, 25, 26],
    };

    const saturationInput: SaturationInput = {
      totalSellers: 50,
      topSellerMarketShare: 20,
      avgSellerRating: 4.0,
      avgSellerReviews: 300,
      priceRange: { min: 15, max: 35 },
      uniqueVariants: 8,
      platformCount: 3,
    };

    const profitInput: ProfitPotentialInput = {
      productCost: 5,
      sellingPrice: 25,
      shippingCost: 3,
      platformFeePercent: 15,
      adCostPerClick: 0.3,
      conversionRate: 3,
      returnRate: 3,
      averageOrderValue: 25,
      monthlyAdBudget: 300,
      estimatedMonthlySales: 80,
    };

    const seasonalInput: SeasonalDemandInput = {
      monthlySearchVolumes: [100, 120, 150, 200, 250, 300, 280, 220, 170, 130, 110, 100],
      monthlySalesData: [80, 100, 130, 170, 220, 270, 250, 200, 150, 110, 90, 80],
      monthlyRevenue: [2000, 2500, 3250, 4250, 5500, 6750, 6250, 5000, 3750, 2750, 2250, 2000],
      category: "electronics",
    };

    const goldenExtras = {
      reviewScore: 4.2,
      reviewCount: 1500,
      supplierReliability: 80,
      shippingSpeed: 7,
      returnRate: 4,
      competitionLevel: "medium" as const,
    };

    const result = runFullValidation(trendInput, saturationInput, profitInput, seasonalInput, goldenExtras);

    expect(result.trendVelocity).toBeDefined();
    expect(result.saturation).toBeDefined();
    expect(result.profitPotential).toBeDefined();
    expect(result.seasonalDemand).toBeDefined();
    expect(result.goldenProduct).toBeDefined();

    expect(result.trendVelocity.score).toBeGreaterThanOrEqual(0);
    expect(result.saturation.index).toBeGreaterThanOrEqual(0);
    expect(result.profitPotential.score).toBeGreaterThanOrEqual(0);
    expect(result.seasonalDemand.score).toBeGreaterThanOrEqual(0);
    expect(result.goldenProduct.score).toBeGreaterThanOrEqual(0);
    expect(result.goldenProduct.rank).toBeDefined();
  });
});
