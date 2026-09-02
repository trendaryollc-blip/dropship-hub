import type {
  TrendVelocityInput,
  TrendVelocityResult,
  SaturationInput,
  SaturationResult,
  ProfitPotentialInput,
  ProfitPotentialResult,
  SeasonalDemandInput,
  SeasonalDemandResult,
  GoldenProductInput,
  GoldenProductResult,
  ProductValidationResult,
} from "@/types/product-validation";

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, decimals: number = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function calcGrowthRates(data: number[]): number[] {
  if (data.length < 2) return [];
  const rates: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i - 1] === 0) {
      rates.push(data[i] > 0 ? 100 : 0);
    } else {
      rates.push(((data[i] - data[i - 1]) / data[i - 1]) * 100);
    }
  }
  return rates;
}

function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumX2 += i * i;
  }
  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return 0;
  return (n * sumXY - sumX * sumY) / denominator;
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1));
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ── Trend Velocity Engine ────────────────────────────────────────────────────

export function calculateTrendVelocity(input: TrendVelocityInput): TrendVelocityResult {
  const {
    currentSearchVolume,
    historicalSearchVolumes,
    historicalSellerCounts,
    historicalPrices,
  } = input;

  if (
    !historicalSearchVolumes.length &&
    !historicalSellerCounts.length &&
    !historicalPrices.length
  ) {
    return {
      score: 0,
      velocity: 0,
      acceleration: 0,
      phase: "mature",
      weeklyGrowthRates: [],
      insight: "Insufficient historical data to calculate trend velocity.",
    };
  }

  const searchGrowthRates = calcGrowthRates(historicalSearchVolumes);
  const sellerGrowthRates = calcGrowthRates(historicalSellerCounts);
  const priceGrowthRates = calcGrowthRates(historicalPrices);

  const avgSearchGrowth = mean(searchGrowthRates);
  const avgSellerGrowth = mean(sellerGrowthRates);
  const avgPriceChange = mean(priceGrowthRates);

  const velocity = round(avgSearchGrowth - avgSellerGrowth * 0.3 + avgPriceChange * 0.1, 1);

  const accelerationSearch = searchGrowthRates.length >= 2
    ? searchGrowthRates[searchGrowthRates.length - 1] - searchGrowthRates[searchGrowthRates.length - 2]
    : 0;
  const accelerationSeller = sellerGrowthRates.length >= 2
    ? sellerGrowthRates[sellerGrowthRates.length - 1] - sellerGrowthRates[sellerGrowthRates.length - 2]
    : 0;
  const acceleration = round(accelerationSearch - accelerationSeller * 0.3, 1);

  let phase: TrendVelocityResult["phase"];
  if (velocity > 10 && acceleration >= 0) {
    phase = "emerging";
  } else if (velocity > 3) {
    phase = "growth";
  } else if (velocity >= -3) {
    phase = "mature";
  } else {
    phase = "declining";
  }

  const growthScore = clamp((velocity + 20) * 2.5, 0, 40);
  const accelerationScore = clamp((acceleration + 20) * 1.5, 0, 30);
  const consistencyScore = searchGrowthRates.length > 0
    ? clamp(100 - standardDeviation(searchGrowthRates) * 2, 0, 20)
    : 10;
  const volumeScore = clamp(currentSearchVolume / 5000, 0, 10);

  const score = clamp(Math.round(growthScore + accelerationScore + consistencyScore + volumeScore), 0, 100);

  let insight: string;
  if (phase === "emerging") {
    insight = `This product is in the emerging phase with ${round(velocity)}% velocity. Search demand is accelerating — strong early-mover advantage.`;
  } else if (phase === "growth") {
    insight = `Growing at ${round(velocity)}% velocity. Market is expanding but competition is likely increasing too.`;
  } else if (phase === "mature") {
    insight = `Stable growth at ${round(velocity)}%. The market is mature — differentiation is key to stand out.`;
  } else {
    insight = `Declining at ${round(Math.abs(velocity))}%. Consider whether the product has reached end-of-life or if this is seasonal.`;
  }

  const weeklyGrowthRates = searchGrowthRates.map((r) => round(r / 4, 1));

  return {
    score,
    velocity: round(velocity),
    acceleration,
    phase,
    weeklyGrowthRates,
    insight,
  };
}

// ── Saturation Index Engine ──────────────────────────────────────────────────

export function calculateSaturation(input: SaturationInput): SaturationResult {
  const {
    totalSellers,
    topSellerMarketShare,
    avgSellerReviews,
    priceRange,
    platformCount,
  } = input;

  if (totalSellers === 0) {
    return {
      index: 0,
      level: "unsaturated",
      sellerCount: 0,
      marketConcentration: 0,
      priceWarRisk: "low",
      barrierToEntry: "low",
      insight: "No sellers detected — this is a completely untapped market.",
    };
  }

  const sellerDensity = clamp(totalSellers / 500, 0, 1) * 30;

  const concentration = clamp(topSellerMarketShare / 100, 0, 1);
  const concentrationScore = concentration * 25;

  const priceSpread = priceRange.max > 0
    ? ((priceRange.max - priceRange.min) / priceRange.max) * 100
    : 0;
  const priceCompetitionScore = clamp((100 - priceSpread) / 100, 0, 1) * 20;

  const reviewBarrier = clamp(avgSellerReviews / 10000, 0, 1) * 15;

  const platformSpread = clamp(platformCount / 10, 0, 1) * 10;

  const index = clamp(
    Math.round(sellerDensity + concentrationScore + priceCompetitionScore + reviewBarrier + platformSpread),
    0,
    100
  );

  let level: SaturationResult["level"];
  if (index < 15) level = "unsaturated";
  else if (index < 35) level = "low";
  else if (index < 60) level = "moderate";
  else if (index < 85) level = "saturated";
  else level = "hyper-saturated";

  const priceWarRisk: "low" | "medium" | "high" =
    priceSpread < 20 && totalSellers > 100 ? "high" :
    priceSpread < 40 && totalSellers > 50 ? "medium" : "low";

  const barrierToEntry: "low" | "medium" | "high" =
    avgSellerReviews > 5000 && concentration > 0.3 ? "high" :
    avgSellerReviews > 1000 || concentration > 0.15 ? "medium" : "low";

  const marketConcentration = round(concentration * 100, 1);

  let insight: string;
  if (level === "unsaturated") {
    insight = "Virtually no competition. Excellent opportunity to establish market presence before others arrive.";
  } else if (level === "low") {
    insight = "Low seller density with room to grow. Good window to capture market share.";
  } else if (level === "moderate") {
    insight = "Moderate competition. You'll need strong differentiation and marketing to compete.";
  } else if (level === "saturated") {
    insight = "Heavy competition. Consider unique value propositions or niche sub-categories.";
  } else {
    insight = "Hyper-saturated market. Very difficult to enter without significant differentiation or budget.";
  }

  return {
    index,
    level,
    sellerCount: totalSellers,
    marketConcentration,
    priceWarRisk,
    barrierToEntry,
    insight,
  };
}

// ── Profit Potential Engine ──────────────────────────────────────────────────

export function calculateProfitPotential(input: ProfitPotentialInput): ProfitPotentialResult {
  const {
    productCost,
    sellingPrice,
    shippingCost,
    platformFeePercent,
    adCostPerClick,
    conversionRate,
    returnRate,
    monthlyAdBudget,
    estimatedMonthlySales,
  } = input;

  if (!sellingPrice || sellingPrice <= 0 || !productCost || productCost <= 0) {
    return {
      score: 0,
      netProfitPerUnit: 0,
      profitMargin: 0,
      roi: 0,
      breakEvenROAS: 0,
      monthlyNetProfit: 0,
      monthlyROI: 0,
      costBreakdown: [],
      riskAdjustedReturn: 0,
      insight: "Invalid input — selling price and product cost must be positive.",
    };
  }

  const platformFee = (sellingPrice * platformFeePercent) / 100;
  const adCostPerSale = conversionRate > 0 ? adCostPerClick / (conversionRate / 100) : 0;
  const returnCost = sellingPrice * (returnRate / 100);

  const totalCostPerUnit = productCost + shippingCost + platformFee + adCostPerSale + returnCost;
  const netProfitPerUnit = round(sellingPrice - totalCostPerUnit, 2);
  const profitMargin = round(sellingPrice > 0 ? (netProfitPerUnit / sellingPrice) * 100 : 0, 1);
  const roi = totalCostPerUnit > 0 ? round((netProfitPerUnit / totalCostPerUnit) * 100, 1) : 0;
  const breakEvenROAS = netProfitPerUnit > 0 ? round(sellingPrice / netProfitPerUnit, 2) : 0;

  const monthlyNetProfit = round(netProfitPerUnit * estimatedMonthlySales, 2);
  const monthlyCosts = totalCostPerUnit * estimatedMonthlySales + monthlyAdBudget;
  const monthlyROI = monthlyCosts > 0 ? round((monthlyNetProfit / monthlyCosts) * 100, 1) : 0;
  const riskAdjustedReturn = round(monthlyNetProfit * (1 - returnRate / 100), 2);

  const totalCosts = totalCostPerUnit;
  const costBreakdown = [
    { name: "Product Cost", value: round(productCost, 2), pct: totalCosts > 0 ? round((productCost / totalCosts) * 100, 1) : 0, color: "#3b82f6" },
    { name: "Shipping", value: round(shippingCost, 2), pct: totalCosts > 0 ? round((shippingCost / totalCosts) * 100, 1) : 0, color: "#f97316" },
    { name: "Platform Fees", value: round(platformFee, 2), pct: totalCosts > 0 ? round((platformFee / totalCosts) * 100, 1) : 0, color: "#a855f7" },
    { name: "Ad Cost", value: round(adCostPerSale, 2), pct: totalCosts > 0 ? round((adCostPerSale / totalCosts) * 100, 1) : 0, color: "#ef4444" },
    { name: "Returns", value: round(returnCost, 2), pct: totalCosts > 0 ? round((returnCost / totalCosts) * 100, 1) : 0, color: "#eab308" },
  ].filter((c) => c.value > 0);

  const marginScore = clamp(profitMargin * 2, 0, 35);
  const roiScore = clamp(roi / 5, 0, 25);
  const monthlyProfitScore = clamp(monthlyNetProfit / 200, 0, 25);
  const breakEvenScore = breakEvenROAS > 0 && breakEvenROAS < 5
    ? clamp((5 - breakEvenROAS) * 5, 0, 15)
    : breakEvenROAS >= 5 ? 2 : 0;

  const score = clamp(Math.round(marginScore + roiScore + monthlyProfitScore + breakEvenScore), 0, 100);

  let insight: string;
  if (profitMargin > 40) {
    insight = `Excellent ${round(profitMargin)}% margin with ${round(roi)}% ROI. This product has strong profit potential.`;
  } else if (profitMargin > 25) {
    insight = `Good ${round(profitMargin)}% margin. Optimize ad spend and reduce returns to improve profitability.`;
  } else if (profitMargin > 10) {
    insight = `Tight ${round(profitMargin)}% margin. Focus on volume or find ways to reduce costs.`;
  } else {
    insight = `Low ${round(profitMargin)}% margin. This product may not be profitable after all costs.`;
  }

  return {
    score,
    netProfitPerUnit,
    profitMargin,
    roi,
    breakEvenROAS,
    monthlyNetProfit,
    monthlyROI,
    costBreakdown,
    riskAdjustedReturn,
    insight,
  };
}

// ── Seasonal Demand Engine ───────────────────────────────────────────────────

export function calculateSeasonalDemand(input: SeasonalDemandInput): SeasonalDemandResult {
  const { monthlySearchVolumes, monthlySalesData, monthlyRevenue, category } = input;

  const monthLabels = [...MONTH_NAMES];

  if (!monthlySearchVolumes.length && !monthlySalesData.length && !monthlyRevenue.length) {
    return {
      score: 0,
      peakMonth: 1,
      lowMonth: 1,
      seasonalityIndex: 0,
      currentPhase: "building",
      forecast: [],
      monthLabels,
      insight: "No historical data available for seasonal analysis.",
    };
  }

  const combined = monthlySearchVolumes.map((s, i) =>
    s * 0.4 + (monthlySalesData[i] || 0) * 0.35 + (monthlyRevenue[i] || 0) * 0.25
  );

  const maxVal = Math.max(...combined);
  const minVal = Math.min(...combined);
  const peakMonth = combined.indexOf(maxVal) + 1;
  const lowMonth = combined.indexOf(minVal) + 1;

  const avg = mean(combined);
  const stdDev = standardDeviation(combined);
  const seasonalityIndex = avg > 0 ? round(clamp(stdDev / avg, 0, 1), 2) : 0;

  const currentMonth = new Date().getMonth() + 1;
  let currentPhase: SeasonalDemandResult["currentPhase"];
  if (currentMonth === peakMonth) {
    currentPhase = "peak";
  } else if (currentMonth === lowMonth) {
    currentPhase = "off-peak";
  } else if (currentMonth > lowMonth && currentMonth < peakMonth) {
    currentPhase = "building";
  } else {
    currentPhase = "declining";
  }

  const forecast: SeasonalDemandResult["forecast"] = [];
  for (let i = 0; i < 6; i++) {
    const futureMonth = ((currentMonth + i - 1) % 12) + 1;
    const seasonalFactor = combined[futureMonth - 1] / (avg || 1);
    const trendFactor = linearRegressionSlope(combined);
    const predicted = Math.max(0, round(avg * seasonalFactor + trendFactor * (i + 1), 0));
    const distance = Math.abs(futureMonth - peakMonth);
    const confidence = Math.max(0.3, round(1 - distance * 0.06, 2));
    forecast.push({
      month: MONTH_NAMES[futureMonth - 1],
      predicted,
      confidence,
    });
  }

  const score = round(clamp((1 - seasonalityIndex) * 100, 0, 100), 0);

  let insight: string;
  if (seasonalityIndex < 0.2) {
    insight = "Very consistent year-round demand. Ideal for steady, predictable revenue.";
  } else if (seasonalityIndex < 0.4) {
    insight = "Moderate seasonality. Plan inventory and ad spend around peak periods.";
  } else if (seasonalityIndex < 0.6) {
    insight = "Noticeable seasonal swings. Diversify with complementary products for off-peak months.";
  } else {
    insight = "Highly seasonal product. Ensure you have a plan for off-peak months.";
  }

  if (category) {
    const lower = category.toLowerCase();
    if (lower.includes("fitness") || lower.includes("health")) {
      insight += " Fitness products typically peak in January — align marketing accordingly.";
    } else if (lower.includes("toy") || lower.includes("gift")) {
      insight += " Gift/toy products peak in Q4 — plan inventory early.";
    } else if (lower.includes("outdoor") || lower.includes("garden")) {
      insight += " Outdoor products peak in spring/summer — capitalize on warm months.";
    }
  }

  return {
    score,
    peakMonth,
    lowMonth,
    seasonalityIndex,
    currentPhase,
    forecast,
    monthLabels,
    insight,
  };
}

// ── Golden Product Algorithm ─────────────────────────────────────────────────

const CRITERIA_WEIGHTS = [
  { name: "Profit Potential", weight: 0.20 },
  { name: "Trend Velocity", weight: 0.15 },
  { name: "Low Saturation", weight: 0.15 },
  { name: "Seasonal Consistency", weight: 0.10 },
  { name: "Review Score", weight: 0.10 },
  { name: "Review Volume", weight: 0.05 },
  { name: "Supplier Reliability", weight: 0.08 },
  { name: "Shipping Speed", weight: 0.05 },
  { name: "Low Return Rate", weight: 0.07 },
  { name: "Competition Level", weight: 0.05 },
];

function getCriterionStatus(score: number): "excellent" | "good" | "average" | "poor" {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "average";
  return "poor";
}

function competitionToScore(level: "low" | "medium" | "high" | "very-high"): number {
  switch (level) {
    case "low": return 95;
    case "medium": return 65;
    case "high": return 35;
    case "very-high": return 10;
  }
}

export function calculateGoldenProduct(input: GoldenProductInput): GoldenProductResult {
  const {
    trendVelocity,
    saturation,
    profitPotential,
    seasonalDemand,
    reviewScore,
    reviewCount,
    supplierReliability,
    shippingSpeed,
    returnRate,
    competitionLevel,
  } = input;

  const reviewScoreNorm = clamp((reviewScore / 5) * 100, 0, 100);
  const reviewVolumeScore = clamp(reviewCount / 5000, 0, 1) * 100;
  const shippingScore = clamp(shippingSpeed <= 3 ? 95 : shippingSpeed <= 7 ? 75 : shippingSpeed <= 14 ? 50 : 25, 0, 100);
  const returnRateScore = clamp(100 - returnRate * 10, 0, 100);
  const competitionScore = competitionToScore(competitionLevel);
  const lowSaturationScore = clamp(100 - saturation.index, 0, 100);

  const rawScores = [
    profitPotential.score,
    trendVelocity.score,
    lowSaturationScore,
    seasonalDemand.score,
    reviewScoreNorm,
    reviewVolumeScore,
    supplierReliability,
    shippingScore,
    returnRateScore,
    competitionScore,
  ];

  const criteria = CRITERIA_WEIGHTS.map((c, i) => {
    const score = clamp(Math.round(rawScores[i]), 0, 100);
    const contribution = round(score * c.weight, 1);
    return {
      name: c.name,
      score,
      weight: c.weight,
      contribution,
      status: getCriterionStatus(score),
    };
  });

  const totalScore = clamp(Math.round(criteria.reduce((sum, c) => sum + c.contribution, 0)), 0, 100);

  let rank: GoldenProductResult["rank"];
  if (totalScore >= 90) rank = "S";
  else if (totalScore >= 75) rank = "A";
  else if (totalScore >= 60) rank = "B";
  else if (totalScore >= 40) rank = "C";
  else rank = "D";

  const sortedCriteria = [...criteria].sort((a, b) => a.score - b.score);
  const weakest = sortedCriteria.slice(0, 3);
  const actionItems: string[] = [];

  for (const c of weakest) {
    if (c.status === "poor") {
      if (c.name === "Profit Potential") actionItems.push("Negotiate better supplier pricing or increase selling price to improve margins.");
      else if (c.name === "Trend Velocity") actionItems.push("Consider timing — the trend may be past its peak.");
      else if (c.name === "Low Saturation") actionItems.push("Find a unique angle or sub-niche to differentiate from competitors.");
      else if (c.name === "Seasonal Consistency") actionItems.push("Plan inventory and marketing around seasonal peaks to maximize off-season revenue.");
      else if (c.name === "Review Score") actionItems.push("Source from suppliers with better product quality to improve customer satisfaction.");
      else if (c.name === "Review Volume") actionItems.push("Focus on building initial review volume through launch promotions.");
      else if (c.name === "Supplier Reliability") actionItems.push("Switch to a more reliable supplier with higher ratings.");
      else if (c.name === "Shipping Speed") actionItems.push("Use a fulfillment center closer to your target market for faster delivery.");
      else if (c.name === "Low Return Rate") actionItems.push("Improve product descriptions and sizing guides to reduce returns.");
      else if (c.name === "Competition Level") actionItems.push("Differentiate through branding, bundling, or unique value propositions.");
    } else if (c.status === "average") {
      if (c.name === "Profit Potential") actionItems.push("Test a slightly higher price point to see if conversion holds.");
      else if (c.name === "Trend Velocity") actionItems.push("Monitor trend closely — invest in marketing while momentum builds.");
      else if (c.name === "Low Saturation") actionItems.push("Move quickly to establish market position before more competitors arrive.");
    }
  }

  if (actionItems.length === 0) {
    if (rank === "S") actionItems.push("This is a top-tier product. Execute fast and scale aggressively.");
    else if (rank === "A") actionItems.push("Strong product with minor improvements possible. Proceed with confidence.");
    else actionItems.push("Solid product with room for optimization. Focus on the weakest criteria.");
  }

  let verdict: string;
  if (rank === "S") verdict = "Elite product — rare find with exceptional scores across all dimensions.";
  else if (rank === "A") verdict = "High-quality product with strong fundamentals. Ready to launch.";
  else if (rank === "B") verdict = "Good product with clear improvement areas. Viable with optimization.";
  else if (rank === "C") verdict = "Average product. Significant improvements needed before investing heavily.";
  else verdict = "Below-average product. Consider alternative products with better fundamentals.";

  const overallInsight = `Golden Score: ${totalScore}/100 (Rank ${rank}). ${verdict}`;

  return {
    score: totalScore,
    rank,
    criteria,
    verdict,
    actionItems,
    overallInsight,
  };
}

// ── Combined Validation ──────────────────────────────────────────────────────

export function runFullValidation(
  trendInput: TrendVelocityInput,
  saturationInput: SaturationInput,
  profitInput: ProfitPotentialInput,
  seasonalInput: SeasonalDemandInput,
  goldenExtras: Omit<GoldenProductInput, "trendVelocity" | "saturation" | "profitPotential" | "seasonalDemand">
): ProductValidationResult {
  const trendVelocity = calculateTrendVelocity(trendInput);
  const saturation = calculateSaturation(saturationInput);
  const profitPotential = calculateProfitPotential(profitInput);
  const seasonalDemand = calculateSeasonalDemand(seasonalInput);

  const goldenProduct = calculateGoldenProduct({
    trendVelocity,
    saturation,
    profitPotential,
    seasonalDemand,
    ...goldenExtras,
  });

  return {
    trendVelocity,
    saturation,
    profitPotential,
    seasonalDemand,
    goldenProduct,
  };
}
