import { describe, it, expect } from "vitest";
import {
  calculateTrendVelocity,
  calculateSaturation,
  calculateProfitPotential,
  calculateSeasonalDemand,
  calculateGoldenProduct,
  runFullValidation,
} from "@/lib/product-validation";
import type {
  TrendVelocityInput,
  SaturationInput,
  ProfitPotentialInput,
  SeasonalDemandInput,
  GoldenProductInput,
} from "@/types/product-validation";

// ── Trend Velocity Tests ─────────────────────────────────────────────────────

describe("calculateTrendVelocity", () => {
  const baseInput: TrendVelocityInput = {
    currentSearchVolume: 50000,
    historicalSearchVolumes: [10000, 15000, 22000, 30000, 40000, 50000],
    currentSellerCount: 20,
    historicalSellerCounts: [5, 8, 10, 14, 17, 20],
    currentPrice: 29.99,
    historicalPrices: [34.99, 32.99, 31.99, 30.99, 30.49, 29.99],
  };

  it("returns 0 score for empty historical data", () => {
    const result = calculateTrendVelocity({
      ...baseInput,
      historicalSearchVolumes: [],
      historicalSellerCounts: [],
      historicalPrices: [],
    });
    expect(result.score).toBe(0);
    expect(result.phase).toBe("mature");
    expect(result.velocity).toBe(0);
    expect(result.weeklyGrowthRates).toEqual([]);
  });

  it("detects emerging phase for high growth", () => {
    const result = calculateTrendVelocity({
      ...baseInput,
      historicalSearchVolumes: [500, 2000, 8000, 30000, 80000, 200000],
      historicalSellerCounts: [2, 2, 3, 3, 3, 4],
      historicalPrices: [35, 35, 35, 34, 34, 34],
    });
    expect(["emerging", "growth"]).toContain(result.phase);
    expect(result.velocity).toBeGreaterThan(10);
  });

  it("detects growth phase for moderate growth", () => {
    const result = calculateTrendVelocity({
      ...baseInput,
      historicalSearchVolumes: [30000, 32000, 34000, 36500, 39000, 42000],
      historicalSellerCounts: [15, 15, 15, 16, 16, 16],
    });
    expect(result.phase).toBe("growth");
    expect(result.velocity).toBeGreaterThan(3);
  });

  it("detects mature phase for stable data", () => {
    const result = calculateTrendVelocity({
      ...baseInput,
      historicalSearchVolumes: [30000, 30500, 29800, 30200, 30100, 30000],
      historicalSellerCounts: [20, 20, 20, 20, 20, 20],
    });
    expect(result.phase).toBe("mature");
    expect(Math.abs(result.velocity)).toBeLessThanOrEqual(5);
  });

  it("detects declining phase for falling demand", () => {
    const result = calculateTrendVelocity({
      ...baseInput,
      historicalSearchVolumes: [80000, 65000, 50000, 38000, 28000, 20000],
    });
    expect(result.phase).toBe("declining");
    expect(result.velocity).toBeLessThan(0);
  });

  it("returns positive acceleration for speeding-up trends", () => {
    const result = calculateTrendVelocity({
      ...baseInput,
      historicalSearchVolumes: [5000, 7000, 11000, 18000, 30000, 55000],
    });
    expect(result.acceleration).toBeGreaterThan(0);
  });

  it("returns negative acceleration for slowing trends", () => {
    const result = calculateTrendVelocity({
      ...baseInput,
      historicalSearchVolumes: [5000, 12000, 20000, 25000, 27000, 28000],
    });
    expect(result.acceleration).toBeLessThan(0);
  });

  it("generates weekly growth rates", () => {
    const result = calculateTrendVelocity(baseInput);
    expect(result.weeklyGrowthRates.length).toBeGreaterThan(0);
    result.weeklyGrowthRates.forEach((rate) => {
      expect(typeof rate).toBe("number");
    });
  });

  it("returns score between 0 and 100", () => {
    const result = calculateTrendVelocity(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns meaningful insight text", () => {
    const result = calculateTrendVelocity(baseInput);
    expect(result.insight.length).toBeGreaterThan(10);
    expect(typeof result.insight).toBe("string");
  });
});

// ── Saturation Index Tests ───────────────────────────────────────────────────

describe("calculateSaturation", () => {
  const baseInput: SaturationInput = {
    totalSellers: 150,
    topSellerMarketShare: 25,
    avgSellerRating: 4.3,
    avgSellerReviews: 3000,
    priceRange: { min: 15, max: 45 },
    uniqueVariants: 20,
    platformCount: 4,
  };

  it("returns 0 index for zero sellers", () => {
    const result = calculateSaturation({ ...baseInput, totalSellers: 0 });
    expect(result.index).toBe(0);
    expect(result.level).toBe("unsaturated");
    expect(result.priceWarRisk).toBe("low");
  });

  it("returns unsaturated level for very few sellers", () => {
    const result = calculateSaturation({ ...baseInput, totalSellers: 2, avgSellerReviews: 50, platformCount: 1 });
    expect(result.level).toBe("unsaturated");
    expect(result.index).toBeLessThan(15);
  });

  it("returns low level for moderate seller count", () => {
    const result = calculateSaturation({ ...baseInput, totalSellers: 30 });
    expect(result.level).toBe("low");
  });

  it("returns moderate level for higher seller count", () => {
    const result = calculateSaturation({ ...baseInput, totalSellers: 200, topSellerMarketShare: 30, avgSellerReviews: 5000, platformCount: 6 });
    expect(result.level).toBe("moderate");
  });

  it("returns saturated level for many sellers", () => {
    const result = calculateSaturation({ ...baseInput, totalSellers: 400, topSellerMarketShare: 40, avgSellerReviews: 8000, platformCount: 8 });
    expect(result.level).toBe("saturated");
  });

  it("returns hyper-saturated for extreme seller count", () => {
    const result = calculateSaturation({
      ...baseInput,
      totalSellers: 500,
      topSellerMarketShare: 60,
      avgSellerReviews: 20000,
      platformCount: 10,
      priceRange: { min: 28, max: 30 },
    });
    expect(result.level).toBe("hyper-saturated");
    expect(result.index).toBeGreaterThanOrEqual(85);
  });

  it("detects high price war risk for narrow range + many sellers", () => {
    const result = calculateSaturation({
      ...baseInput,
      priceRange: { min: 28, max: 32 },
      totalSellers: 200,
    });
    expect(result.priceWarRisk).toBe("high");
  });

  it("detects high barrier to entry when top sellers dominate", () => {
    const result = calculateSaturation({
      ...baseInput,
      topSellerMarketShare: 45,
      avgSellerReviews: 8000,
    });
    expect(result.barrierToEntry).toBe("high");
  });

  it("calculates market concentration correctly", () => {
    const result = calculateSaturation({ ...baseInput, topSellerMarketShare: 30 });
    expect(result.marketConcentration).toBe(30);
  });

  it("returns index between 0 and 100", () => {
    const result = calculateSaturation(baseInput);
    expect(result.index).toBeGreaterThanOrEqual(0);
    expect(result.index).toBeLessThanOrEqual(100);
  });

  it("returns insight text", () => {
    const result = calculateSaturation(baseInput);
    expect(result.insight.length).toBeGreaterThan(10);
  });
});

// ── Profit Potential Tests ───────────────────────────────────────────────────

describe("calculateProfitPotential", () => {
  const baseInput: ProfitPotentialInput = {
    productCost: 8,
    sellingPrice: 29.99,
    shippingCost: 4.5,
    platformFeePercent: 13,
    adCostPerClick: 0.8,
    conversionRate: 3,
    returnRate: 5,
    averageOrderValue: 29.99,
    monthlyAdBudget: 500,
    estimatedMonthlySales: 100,
  };

  it("returns 0 for zero selling price", () => {
    const result = calculateProfitPotential({ ...baseInput, sellingPrice: 0 });
    expect(result.score).toBe(0);
    expect(result.netProfitPerUnit).toBe(0);
  });

  it("returns 0 for zero product cost", () => {
    const result = calculateProfitPotential({ ...baseInput, productCost: 0 });
    expect(result.score).toBe(0);
  });

  it("calculates net profit per unit correctly", () => {
    const result = calculateProfitPotential(baseInput);
    const platformFee = 29.99 * 0.13;
    const adCostPerSale = 0.8 / 0.03;
    const returnCost = 29.99 * 0.05;
    const expectedCost = 8 + 4.5 + platformFee + adCostPerSale + returnCost;
    expect(result.netProfitPerUnit).toBeCloseTo(29.99 - expectedCost, 0);
  });

  it("calculates profit margin correctly", () => {
    const result = calculateProfitPotential(baseInput);
    expect(result.profitMargin).toBeCloseTo((result.netProfitPerUnit / 29.99) * 100, 0);
  });

  it("calculates ROI correctly", () => {
    const result = calculateProfitPotential(baseInput);
    const totalCost = result.costBreakdown.reduce((sum, c) => sum + c.value, 0);
    expect(result.roi).toBeCloseTo((result.netProfitPerUnit / totalCost) * 100, 0);
  });

  it("calculates break-even ROAS correctly", () => {
    const result = calculateProfitPotential(baseInput);
    if (result.netProfitPerUnit > 0) {
      expect(result.breakEvenROAS).toBeCloseTo(29.99 / result.netProfitPerUnit, 0);
    } else {
      expect(result.breakEvenROAS).toBe(0);
    }
  });

  it("calculates monthly projections correctly", () => {
    const result = calculateProfitPotential(baseInput);
    expect(result.monthlyNetProfit).toBeCloseTo(result.netProfitPerUnit * 100, 0);
  });

  it("return rate reduces risk-adjusted return", () => {
    const result = calculateProfitPotential(baseInput);
    if (result.monthlyNetProfit > 0) {
      expect(result.riskAdjustedReturn).toBeLessThanOrEqual(result.monthlyNetProfit);
    } else {
      expect(result.riskAdjustedReturn).toBeGreaterThanOrEqual(result.monthlyNetProfit);
    }
  });

  it("cost breakdown includes all cost types", () => {
    const result = calculateProfitPotential(baseInput);
    const names = result.costBreakdown.map((c) => c.name);
    expect(names).toContain("Product Cost");
    expect(names).toContain("Shipping");
    expect(names).toContain("Platform Fees");
  });

  it("returns score between 0 and 100", () => {
    const result = calculateProfitPotential(baseInput);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns insight text", () => {
    const result = calculateProfitPotential(baseInput);
    expect(result.insight.length).toBeGreaterThan(10);
  });

  it("handles selling price equal to cost", () => {
    const result = calculateProfitPotential({
      ...baseInput,
      sellingPrice: 8,
      productCost: 8,
    });
    expect(result.netProfitPerUnit).toBeLessThan(0);
    expect(result.score).toBeLessThan(50);
  });
});

// ── Seasonal Demand Tests ────────────────────────────────────────────────────

describe("calculateSeasonalDemand", () => {
  const flatInput: SeasonalDemandInput = {
    monthlySearchVolumes: [10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000, 10000],
    monthlySalesData: [500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500, 500],
    monthlyRevenue: [5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000, 5000],
    category: "Electronics",
  };

  const seasonalInput: SeasonalDemandInput = {
    monthlySearchVolumes: [5000, 4000, 3000, 2000, 2000, 3000, 5000, 8000, 12000, 18000, 25000, 30000],
    monthlySalesData: [300, 250, 200, 100, 100, 200, 300, 500, 800, 1200, 1500, 2000],
    monthlyRevenue: [3000, 2500, 2000, 1000, 1000, 2000, 3000, 5000, 8000, 12000, 15000, 20000],
    category: "Toys & Games",
  };

  it("returns 0 score for empty data", () => {
    const result = calculateSeasonalDemand({
      monthlySearchVolumes: [],
      monthlySalesData: [],
      monthlyRevenue: [],
      category: "",
    });
    expect(result.score).toBe(0);
    expect(result.forecast).toEqual([]);
  });

  it("returns high score for flat demand", () => {
    const result = calculateSeasonalDemand(flatInput);
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.seasonalityIndex).toBeLessThan(0.1);
  });

  it("returns low score for highly seasonal products", () => {
    const result = calculateSeasonalDemand(seasonalInput);
    expect(result.score).toBeLessThan(60);
    expect(result.seasonalityIndex).toBeGreaterThan(0.3);
  });

  it("correctly identifies peak month", () => {
    const result = calculateSeasonalDemand(seasonalInput);
    expect(result.peakMonth).toBe(12);
  });

  it("correctly identifies low month", () => {
    const result = calculateSeasonalDemand(seasonalInput);
    expect(result.lowMonth).toBe(4);
  });

  it("calculates seasonality index between 0 and 1", () => {
    const result = calculateSeasonalDemand(seasonalInput);
    expect(result.seasonalityIndex).toBeGreaterThanOrEqual(0);
    expect(result.seasonalityIndex).toBeLessThanOrEqual(1);
  });

  it("generates 6-month forecast", () => {
    const result = calculateSeasonalDemand(flatInput);
    expect(result.forecast.length).toBe(6);
    result.forecast.forEach((f) => {
      expect(f.month.length).toBeGreaterThan(0);
      expect(f.predicted).toBeGreaterThanOrEqual(0);
      expect(f.confidence).toBeGreaterThan(0);
      expect(f.confidence).toBeLessThanOrEqual(1);
    });
  });

  it("returns correct month labels", () => {
    const result = calculateSeasonalDemand(flatInput);
    expect(result.monthLabels).toEqual([
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ]);
  });

  it("returns insight text", () => {
    const result = calculateSeasonalDemand(flatInput);
    expect(result.insight.length).toBeGreaterThan(10);
  });

  it("adds category-specific insight for fitness products", () => {
    const result = calculateSeasonalDemand({ ...flatInput, category: "Fitness" });
    expect(result.insight).toContain("January");
  });

  it("adds category-specific insight for toy products", () => {
    const result = calculateSeasonalDemand({ ...flatInput, category: "Toys" });
    expect(result.insight).toContain("Q4");
  });

  it("adds category-specific insight for outdoor products", () => {
    const result = calculateSeasonalDemand({ ...flatInput, category: "Outdoor" });
    expect(result.insight).toContain("spring");
  });
});

// ── Golden Product Tests ─────────────────────────────────────────────────────

describe("calculateGoldenProduct", () => {
  const baseInput: GoldenProductInput = {
    trendVelocity: {
      score: 75,
      velocity: 12,
      acceleration: 3,
      phase: "growth",
      weeklyGrowthRates: [2.5, 3.0, 3.2],
      insight: "Growing steadily",
    },
    saturation: {
      index: 30,
      level: "low",
      sellerCount: 50,
      marketConcentration: 15,
      priceWarRisk: "low",
      barrierToEntry: "low",
      insight: "Low competition",
    },
    profitPotential: {
      score: 80,
      netProfitPerUnit: 12,
      profitMargin: 40,
      roi: 67,
      breakEvenROAS: 2.5,
      monthlyNetProfit: 1200,
      monthlyROI: 55,
      costBreakdown: [],
      riskAdjustedReturn: 1140,
      insight: "Strong margins",
    },
    seasonalDemand: {
      score: 70,
      peakMonth: 12,
      lowMonth: 4,
      seasonalityIndex: 0.3,
      currentPhase: "building",
      forecast: [],
      monthLabels: [],
      insight: "Moderate seasonality",
    },
    reviewScore: 4.5,
    reviewCount: 3000,
    supplierReliability: 90,
    shippingSpeed: 5,
    returnRate: 3,
    competitionLevel: "medium",
  };

  it("returns S rank for high scores", () => {
    const input: GoldenProductInput = {
      ...baseInput,
      trendVelocity: { ...baseInput.trendVelocity, score: 90 },
      saturation: { ...baseInput.saturation, index: 15 },
      profitPotential: { ...baseInput.profitPotential, score: 95 },
      seasonalDemand: { ...baseInput.seasonalDemand, score: 90 },
      reviewScore: 4.8,
      reviewCount: 5000,
      supplierReliability: 95,
      shippingSpeed: 2,
      returnRate: 1,
      competitionLevel: "low",
    };
    const result = calculateGoldenProduct(input);
    expect(result.rank).toBe("S");
    expect(result.score).toBeGreaterThanOrEqual(90);
  });

  it("returns A rank for good scores", () => {
    const input: GoldenProductInput = {
      ...baseInput,
      trendVelocity: { ...baseInput.trendVelocity, score: 75 },
      profitPotential: { ...baseInput.profitPotential, score: 80 },
      seasonalDemand: { ...baseInput.seasonalDemand, score: 70 },
      supplierReliability: 90,
      shippingSpeed: 5,
    };
    const result = calculateGoldenProduct(input);
    expect(result.rank).toBe("A");
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.score).toBeLessThan(90);
  });

  it("returns B rank for moderate scores", () => {
    const input: GoldenProductInput = {
      ...baseInput,
      trendVelocity: { ...baseInput.trendVelocity, score: 60 },
      saturation: { ...baseInput.saturation, index: 40 },
      profitPotential: { ...baseInput.profitPotential, score: 65 },
      seasonalDemand: { ...baseInput.seasonalDemand, score: 60 },
      reviewScore: 4.0,
      reviewCount: 2500,
      supplierReliability: 70,
      shippingSpeed: 7,
      returnRate: 5,
      competitionLevel: "medium",
    };
    const result = calculateGoldenProduct(input);
    expect(result.rank).toBe("B");
    expect(result.score).toBeGreaterThanOrEqual(60);
    expect(result.score).toBeLessThan(75);
  });

  it("returns C rank for below-average scores", () => {
    const input: GoldenProductInput = {
      trendVelocity: { ...baseInput.trendVelocity, score: 20 },
      saturation: { ...baseInput.saturation, index: 75 },
      profitPotential: { ...baseInput.profitPotential, score: 25 },
      seasonalDemand: { ...baseInput.seasonalDemand, score: 20 },
      reviewScore: 2.5,
      reviewCount: 100,
      supplierReliability: 30,
      shippingSpeed: 21,
      returnRate: 15,
      competitionLevel: "very-high",
    };
    const result = calculateGoldenProduct(input);
    expect(["C", "D"]).toContain(result.rank);
  });

  it("returns D rank for poor scores", () => {
    const input: GoldenProductInput = {
      trendVelocity: { ...baseInput.trendVelocity, score: 10 },
      saturation: { ...baseInput.saturation, index: 90 },
      profitPotential: { ...baseInput.profitPotential, score: 10 },
      seasonalDemand: { ...baseInput.seasonalDemand, score: 10 },
      reviewScore: 1.5,
      reviewCount: 50,
      supplierReliability: 20,
      shippingSpeed: 30,
      returnRate: 25,
      competitionLevel: "very-high",
    };
    const result = calculateGoldenProduct(input);
    expect(result.rank).toBe("D");
    expect(result.score).toBeLessThan(40);
  });

  it("all 10 criteria are present", () => {
    const result = calculateGoldenProduct(baseInput);
    expect(result.criteria.length).toBe(10);
    const names = result.criteria.map((c) => c.name);
    expect(names).toContain("Profit Potential");
    expect(names).toContain("Trend Velocity");
    expect(names).toContain("Low Saturation");
    expect(names).toContain("Seasonal Consistency");
    expect(names).toContain("Review Score");
    expect(names).toContain("Review Volume");
    expect(names).toContain("Supplier Reliability");
    expect(names).toContain("Shipping Speed");
    expect(names).toContain("Low Return Rate");
    expect(names).toContain("Competition Level");
  });

  it("weighted sum matches expected score", () => {
    const result = calculateGoldenProduct(baseInput);
    const expectedSum = result.criteria.reduce((sum, c) => sum + c.contribution, 0);
    expect(result.score).toBeCloseTo(Math.round(expectedSum), 0);
  });

  it("weakest criteria generate action items", () => {
    const input: GoldenProductInput = {
      ...baseInput,
      profitPotential: { ...baseInput.profitPotential, score: 10 },
      trendVelocity: { ...baseInput.trendVelocity, score: 15 },
    };
    const result = calculateGoldenProduct(input);
    expect(result.actionItems.length).toBeGreaterThan(0);
  });

  it("returns verdict text", () => {
    const result = calculateGoldenProduct(baseInput);
    expect(result.verdict.length).toBeGreaterThan(10);
  });

  it("returns overall insight", () => {
    const result = calculateGoldenProduct(baseInput);
    expect(result.overallInsight).toContain("Golden Score");
    expect(result.overallInsight).toContain(result.rank.toString());
  });

  it("normalizes low competition as high score", () => {
    const result = calculateGoldenProduct(baseInput);
    const compCriteria = result.criteria.find((c) => c.name === "Competition Level");
    expect(compCriteria?.score).toBe(65);
  });

  it("normalizes very-high competition as low score", () => {
    const input = { ...baseInput, competitionLevel: "very-high" as const };
    const result = calculateGoldenProduct(input);
    const compCriteria = result.criteria.find((c) => c.name === "Competition Level");
    expect(compCriteria?.score).toBe(10);
  });

  it("high supplier reliability gets excellent status", () => {
    const result = calculateGoldenProduct(baseInput);
    const supCriteria = result.criteria.find((c) => c.name === "Supplier Reliability");
    expect(supCriteria?.status).toBe("excellent");
  });

  it("fast shipping gets high score", () => {
    const result = calculateGoldenProduct(baseInput);
    const shipCriteria = result.criteria.find((c) => c.name === "Shipping Speed");
    expect(shipCriteria?.score).toBe(75);
  });

  it("slow shipping gets low score", () => {
    const input = { ...baseInput, shippingSpeed: 25 };
    const result = calculateGoldenProduct(input);
    const shipCriteria = result.criteria.find((c) => c.name === "Shipping Speed");
    expect(shipCriteria?.score).toBe(25);
  });
});

// ── Full Validation Tests ────────────────────────────────────────────────────

describe("runFullValidation", () => {
  it("runs all engines and returns combined result", () => {
    const result = runFullValidation(
      {
        currentSearchVolume: 50000,
        historicalSearchVolumes: [10000, 20000, 30000, 40000, 50000],
        currentSellerCount: 30,
        historicalSellerCounts: [10, 15, 20, 25, 30],
        currentPrice: 29.99,
        historicalPrices: [34.99, 32.99, 31.99, 30.99, 29.99],
      },
      {
        totalSellers: 80,
        topSellerMarketShare: 20,
        avgSellerRating: 4.2,
        avgSellerReviews: 2000,
        priceRange: { min: 18, max: 40 },
        uniqueVariants: 15,
        platformCount: 3,
      },
      {
        productCost: 8,
        sellingPrice: 29.99,
        shippingCost: 4.5,
        platformFeePercent: 13,
        adCostPerClick: 0.7,
        conversionRate: 3.5,
        returnRate: 4,
        averageOrderValue: 29.99,
        monthlyAdBudget: 500,
        estimatedMonthlySales: 120,
      },
      {
        monthlySearchVolumes: [30000, 32000, 35000, 38000, 40000, 42000, 45000, 48000, 50000, 52000, 54000, 55000],
        monthlySalesData: [200, 210, 220, 240, 250, 260, 280, 300, 320, 330, 340, 350],
        monthlyRevenue: [2000, 2100, 2200, 2400, 2500, 2600, 2800, 3000, 3200, 3300, 3400, 3500],
        category: "Electronics",
      },
      {
        reviewScore: 4.3,
        reviewCount: 2500,
        supplierReliability: 88,
        shippingSpeed: 7,
        returnRate: 4,
        competitionLevel: "medium",
      }
    );

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
    expect(result.goldenProduct.score).toBeLessThanOrEqual(100);
    expect(["S", "A", "B", "C", "D"]).toContain(result.goldenProduct.rank);
  });
});
