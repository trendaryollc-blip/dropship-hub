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
  ProductAuthenticityInput,
  ProductAuthenticityResult,
  SupplierValidationInput,
  SupplierValidationResult,
  CompetitionAnalysisInput,
  CompetitionAnalysisResult,
  RiskAssessmentInput,
  RiskAssessmentResult,
  MarketIntelligenceInput,
  MarketIntelligenceResult,
  BundleAnalysisInput,
  BundleAnalysisResult,
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
      level: "unknown",
      sellerCount: 0,
      marketConcentration: 0,
      priceWarRisk: "low",
      barrierToEntry: "low",
      insight: "Seller count not provided — cannot assess saturation.",
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

// ── Product Authenticity Engine ──────────────────────────────────────────────

const KNOWN_BRANDS = [
  "apple", "samsung", "sony", "lg", "nike", "adidas", "puma", "reebok",
  "philips", "bosch", "dyson", "tesla", "microsoft", "google", "amazon",
  "hp", "dell", "lenovo", "asus", "canon", "nikon", "gopro", "dji",
  "lego", "hasbro", "mattel", "ikea", "westelm", "potterybarn",
  "louis vuitton", "gucci", "prada", "chanel", "hermes", "rolex",
  "visa", "mastercard", "paypal", "stripe", "shopify",
];

const COUNTERFEIT_RISK_CATEGORIES = [
  "luxury", "designer", "electronics", "watches", "jewelry",
  "handbags", "shoes", "sunglasses", "perfume", "cosmetics",
];

export function calculateProductAuthenticity(input: ProductAuthenticityInput): ProductAuthenticityResult {
  const { productTitle, brand, materials, certifications, pricePoint, category } = input;

  if (!productTitle && !brand) {
    return {
      score: 0,
      authenticityLevel: "uncertain",
      brandVerification: { isKnown: false, riskLevel: "medium", notes: "No product or brand information provided." },
      priceAnalysis: { isReasonable: false, marketAvg: 0, deviation: 0, flag: "Insufficient data" },
      materialCheck: { verified: false, concerns: ["No material information provided"] },
      imageAnalysis: { isOriginal: false, matchScore: 0, concerns: ["No image provided for analysis"] },
      redFlags: ["Missing product information"],
      insight: "Insufficient data to verify product authenticity. Provide brand and product details.",
    };
  }

  const brandLower = brand.toLowerCase();
  const isKnownBrand = KNOWN_BRANDS.some(b => brandLower.includes(b));
  const isHighRiskCategory = COUNTERFEIT_RISK_CATEGORIES.some(c => category.toLowerCase().includes(c));

  let brandScore: number;
  let brandRisk: "low" | "medium" | "high";
  let brandNotes: string;

  if (isKnownBrand) {
    brandScore = 25;
    brandRisk = "low";
    brandNotes = `${brand} is a recognized brand with established quality standards.`;
  } else if (brand.length > 0) {
    brandScore = isHighRiskCategory ? 10 : 18;
    brandRisk = isHighRiskCategory ? "high" : "medium";
    brandNotes = `${brand} is not in our verified brand database. ${isHighRiskCategory ? "High-risk category for counterfeits." : "Proceed with caution."}`;
  } else {
    brandScore = 5;
    brandRisk = "high";
    brandNotes = "No brand specified — unbranded products require extra scrutiny.";
  }

  const avgMarketPrice = pricePoint > 0 ? +(pricePoint * 1.1).toFixed(2) : 0;
  const priceDeviation = avgMarketPrice > 0 ? Math.abs(pricePoint - avgMarketPrice) / avgMarketPrice : 0;
  const isReasonablePrice = avgMarketPrice === 0 ? false : priceDeviation < 0.4;
  let priceScore: number;
  let priceFlag: string | null = null;

  if (avgMarketPrice === 0) {
    priceScore = 10;
    priceFlag = "No market average available — price check skipped";
  } else if (isReasonablePrice) {
    priceScore = 25;
  } else if (priceDeviation < 0.7) {
    priceScore = 15;
    priceFlag = "Price deviates significantly from estimated market average";
  } else {
    priceScore = 5;
    priceFlag = "Price is far from estimated market average — verify legitimacy";
  }

  const verifiedMaterials = materials.filter(m => m.length > 0);
  const materialScore = verifiedMaterials.length > 0
    ? clamp(verifiedMaterials.length * 5, 0, 20)
    : 5;
  const materialConcerns: string[] = [];
  if (verifiedMaterials.length === 0) materialConcerns.push("No materials specified");
  if (verifiedMaterials.some(m => m.toLowerCase().includes("unknown"))) materialConcerns.push("Unknown materials detected");

  const verifiedCerts = certifications.filter(c => c.length > 0);
  const imageScore = input.productImage ? 15 : 5;
  const imageConcerns: string[] = [];
  if (!input.productImage) imageConcerns.push("No product image provided");
  else imageConcerns.push("Image provided — reverse image search not connected");

  const redFlags: string[] = [];
  if (isHighRiskCategory && !isKnownBrand) redFlags.push("Unbranded product in high-risk counterfeit category");
  if (avgMarketPrice > 0 && priceDeviation > 0.5) redFlags.push("Price far from estimated market average");
  if (verifiedMaterials.length === 0) redFlags.push("No material specifications provided");
  if (verifiedCerts.length === 0 && isHighRiskCategory) redFlags.push("No certifications in high-risk category");

  const totalScore = clamp(Math.round(brandScore + priceScore + materialScore + imageScore), 0, 100);

  let level: ProductAuthenticityResult["authenticityLevel"];
  if (totalScore >= 85) level = "verified";
  else if (totalScore >= 65) level = "likely-genuine";
  else if (totalScore >= 45) level = "uncertain";
  else if (totalScore >= 25) level = "likely-counterfeit";
  else level = "flagged";

  let insight: string;
  if (level === "verified") {
    insight = `Strong authenticity signals. ${brand} is a verified brand with reasonable pricing and proper specifications.`;
  } else if (level === "likely-genuine") {
    insight = `Product appears genuine with minor concerns. Verify supplier credentials before committing.`;
  } else if (level === "uncertain") {
    insight = `Mixed authenticity signals. Request samples and verify supplier documentation before purchasing.`;
  } else if (level === "likely-counterfeit") {
    insight = `Multiple red flags detected. This product may be counterfeit or misrepresented. Exercise extreme caution.`;
  } else {
    insight = `Critical authenticity concerns. Strongly recommend avoiding this product or supplier.`;
  }

  return {
    score: totalScore,
    authenticityLevel: level,
    brandVerification: { isKnown: isKnownBrand, riskLevel: brandRisk, notes: brandNotes },
    priceAnalysis: { isReasonable: isReasonablePrice, marketAvg: round(avgMarketPrice), deviation: round(priceDeviation * 100, 1), flag: priceFlag },
    materialCheck: { verified: verifiedMaterials.length > 0, concerns: materialConcerns },
    imageAnalysis: { isOriginal: !!input.productImage, matchScore: input.productImage ? 15 : 5, concerns: imageConcerns },
    redFlags,
    insight,
  };
}

// ── Supplier Validation Engine ───────────────────────────────────────────────

export function calculateSupplierValidation(input: SupplierValidationInput): SupplierValidationResult {
  const {
    supplierName,
    reliabilityScore,
    shippingSpeed,
    returnRate,
    orderFulfillmentRate,
    communicationScore,
    yearsInBusiness,
    certifications,
    paymentMethods,
    minOrderQuantity: _minOrderQuantity,
    sampleAvailable,
  } = input;

  if (!supplierName) {
    return {
      score: 0,
      tier: "unverified",
      trustSignals: [],
      riskAssessment: { overall: "high", factors: ["No supplier information provided"] },
      shippingAnalysis: { avgDays: 0, reliability: "Unknown", costTier: "medium" },
      paymentProtection: { isProtected: false, methods: [], notes: "No payment information available" },
      recommendation: "Provide supplier details for validation.",
      insight: "Insufficient supplier data for assessment.",
    };
  }

  const trustSignals: SupplierValidationResult["trustSignals"] = [];

  const reliabilityPts = clamp(reliabilityScore / 100, 0, 1) * 30;
  trustSignals.push({
    label: "Reliability Score",
    status: reliabilityScore >= 80 ? "pass" : reliabilityScore >= 50 ? "warn" : "fail",
    detail: `${reliabilityScore}/100 reliability rating`,
  });

  const shippingScore = clamp(shippingSpeed <= 3 ? 20 : shippingSpeed <= 7 ? 15 : shippingSpeed <= 14 ? 8 : 3, 0, 20);
  trustSignals.push({
    label: "Shipping Speed",
    status: shippingSpeed <= 7 ? "pass" : shippingSpeed <= 14 ? "warn" : "fail",
    detail: `${shippingSpeed} day average delivery`,
  });

  const fulfillmentPts = clamp(orderFulfillmentRate / 100, 0, 1) * 15;
  trustSignals.push({
    label: "Order Fulfillment",
    status: orderFulfillmentRate >= 95 ? "pass" : orderFulfillmentRate >= 80 ? "warn" : "fail",
    detail: `${orderFulfillmentRate}% fulfillment rate`,
  });

  const commPts = clamp(communicationScore / 100, 0, 1) * 15;
  trustSignals.push({
    label: "Communication",
    status: communicationScore >= 80 ? "pass" : communicationScore >= 50 ? "warn" : "fail",
    detail: `${communicationScore}/100 communication rating`,
  });

  const yearsScore = clamp(yearsInBusiness / 10, 0, 1) * 10;
  trustSignals.push({
    label: "Years in Business",
    status: yearsInBusiness >= 5 ? "pass" : yearsInBusiness >= 2 ? "warn" : "fail",
    detail: `${yearsInBusiness} years operating`,
  });

  const certScore = clamp(certifications.length * 3, 0, 5);
  trustSignals.push({
    label: "Certifications",
    status: certifications.length >= 2 ? "pass" : certifications.length >= 1 ? "warn" : "fail",
    detail: certifications.length > 0 ? certifications.join(", ") : "No certifications",
  });

  const sampleScore = sampleAvailable ? 5 : 0;
  trustSignals.push({
    label: "Sample Available",
    status: sampleAvailable ? "pass" : "warn",
    detail: sampleAvailable ? "Samples available for testing" : "No sample option",
  });

  const totalScore = clamp(Math.round(
    reliabilityPts + shippingScore + fulfillmentPts + commPts + yearsScore + certScore + sampleScore
  ), 0, 100);

  let tier: SupplierValidationResult["tier"];
  if (totalScore >= 90) tier = "platinum";
  else if (totalScore >= 75) tier = "gold";
  else if (totalScore >= 60) tier = "silver";
  else if (totalScore >= 40) tier = "bronze";
  else tier = "unverified";

  const riskFactors: string[] = [];
  if (reliabilityScore < 50) riskFactors.push("Low reliability score");
  if (shippingSpeed > 14) riskFactors.push("Slow shipping times");
  if (returnRate > 10) riskFactors.push("High return rate");
  if (yearsInBusiness < 2) riskFactors.push("New supplier — limited track record");
  if (certifications.length === 0) riskFactors.push("No verified certifications");

  const overallRisk: "low" | "medium" | "high" =
    riskFactors.length === 0 ? "low" :
    riskFactors.length <= 2 ? "medium" : "high";

  const costTier: "low" | "medium" | "high" =
    shippingSpeed <= 5 ? "high" : shippingSpeed <= 10 ? "medium" : "low";

  const paymentProtected = paymentMethods.some(m =>
    m.toLowerCase().includes("escrow") || m.toLowerCase().includes("paypal") || m.toLowerCase().includes("protection")
  );

  let recommendation: string;
  if (tier === "platinum" || tier === "gold") {
    recommendation = "Excellent supplier. Proceed with confidence. Consider establishing a long-term partnership.";
  } else if (tier === "silver") {
    recommendation = "Decent supplier with room for improvement. Start with small orders and monitor performance.";
  } else {
    recommendation = "Exercise caution. Request samples, verify credentials, and consider alternative suppliers.";
  }

  let insight: string;
  if (tier === "platinum") {
    insight = `Top-tier supplier (${supplierName}) with exceptional reliability. Highly recommended for partnership.`;
  } else if (tier === "gold") {
    insight = `Strong supplier with good track record. ${riskFactors.length > 0 ? "Minor concerns: " + riskFactors[0] : "No significant issues."}`;
  } else if (tier === "silver") {
    insight = `Average supplier performance. Verify credentials and start with small test orders.`;
  } else if (tier === "bronze") {
    insight = `Below-average supplier. Multiple risk factors identified. Consider alternatives.`;
  } else {
    insight = `Unverified supplier. Insufficient data to make a reliable assessment.`;
  }

  return {
    score: totalScore,
    tier,
    trustSignals,
    riskAssessment: { overall: overallRisk, factors: riskFactors },
    shippingAnalysis: {
      avgDays: shippingSpeed,
      reliability: orderFulfillmentRate >= 95 ? "Excellent" : orderFulfillmentRate >= 80 ? "Good" : "Poor",
      costTier,
    },
    paymentProtection: {
      isProtected: paymentProtected,
      methods: paymentMethods,
      notes: paymentProtected ? "Protected payment methods available" : "No verified payment protection",
    },
    recommendation,
    insight,
  };
}

// ── Competition Analysis Engine ──────────────────────────────────────────────

export function calculateCompetitionAnalysis(input: CompetitionAnalysisInput): CompetitionAnalysisResult {
  const { currentPrice, topCompetitors, averageMarketPrice, marketShareData } = input;

  if (!topCompetitors.length) {
    return {
      score: 0,
      competitivePosition: "unknown",
      pricePosition: "average",
      competitorCount: 0,
      topCompetitor: { name: "None provided", price: 0, rating: 0, threat: "low" },
      priceGap: { vsLowest: 0, vsHighest: 0, vsAverage: 0 },
      reviewGap: { vsBest: 0, vsAverage: 0 },
      differentiationOpportunities: [],
      threats: [],
      marketPositioning: "No competitor data provided — market position cannot be assessed.",
      insight: "No competitor names/prices provided. Enrich a product or enter competitors manually to assess market position.",
    };
  }

  const sortedByPrice = [...topCompetitors].sort((a, b) => a.price - b.price);
  const lowestPrice = sortedByPrice[0].price;
  const highestPrice = sortedByPrice[sortedByPrice.length - 1].price;

  const priceVsLowest = currentPrice - lowestPrice;
  const priceVsHighest = currentPrice - highestPrice;
  const priceVsAverage = currentPrice - averageMarketPrice;

  let pricePosition: CompetitionAnalysisResult["pricePosition"];
  const priceRatio = averageMarketPrice > 0 ? currentPrice / averageMarketPrice : 1;
  if (priceRatio > 1.2) pricePosition = "premium";
  else if (priceRatio > 1.05) pricePosition = "above-average";
  else if (priceRatio >= 0.95) pricePosition = "average";
  else if (priceRatio >= 0.8) pricePosition = "below-average";
  else pricePosition = "budget";

  const topComp = topCompetitors.reduce((best, c) => c.reviewCount > best.reviewCount ? c : best, topCompetitors[0]);
  const avgReviews = topCompetitors.reduce((s, c) => s + c.reviewCount, 0) / topCompetitors.length;
  const _avgRating = topCompetitors.reduce((s, c) => s + c.rating, 0) / topCompetitors.length;

  const priceScore = clamp(
    pricePosition === "average" ? 30 :
    pricePosition === "above-average" || pricePosition === "below-average" ? 22 :
    pricePosition === "premium" ? 15 : 18,
    0, 30
  );

  const reviewAdvantage = avgReviews > 0 ? clamp((1 - avgReviews / 10000) * 25, 0, 25) : 25;

  const marketShareGap = marketShareData.length > 0
    ? clamp((1 - Math.max(...marketShareData.map(m => m.share))) * 20, 0, 20)
    : 20;

  const diffScore = clamp(topCompetitors.length * 3, 0, 15);

  const threatLevel: "low" | "medium" | "high" =
    topComp.rating >= 4.5 && topComp.reviewCount > 5000 ? "high" :
    topComp.rating >= 4.0 && topComp.reviewCount > 1000 ? "medium" : "low";

  const threatScore = threatLevel === "low" ? 10 : threatLevel === "medium" ? 6 : 2;

  const totalScore = clamp(Math.round(priceScore + reviewAdvantage + marketShareGap + diffScore + threatScore), 0, 100);

  let position: CompetitionAnalysisResult["competitivePosition"];
  if (totalScore >= 85) position = "dominant";
  else if (totalScore >= 70) position = "strong";
  else if (totalScore >= 50) position = "competitive";
  else if (totalScore >= 30) position = "weak";
  else position = "struggling";

  const opportunities: string[] = [];
  if (pricePosition === "budget") opportunities.push("Compete on value — offer premium features at budget price");
  if (pricePosition === "premium") opportunities.push("Justify premium with superior quality and branding");
  if (avgReviews < 1000) opportunities.push("Build review volume through launch promotions");
  if (topCompetitors.length < 5) opportunities.push("Limited competition — establish presence quickly");

  const threats: string[] = [];
  if (threatLevel === "high") threats.push("Dominant competitor with strong reviews and ratings");
  if (topCompetitors.length > 20) threats.push("Highly crowded market with many sellers");
  if (priceVsAverage < -10) threats.push("Price war risk — competitors may undercut further");

  const positioning = pricePosition === "premium"
    ? "Position as premium alternative with superior quality"
    : pricePosition === "budget"
    ? "Compete aggressively on price with volume strategy"
    : "Differentiate through unique value proposition and branding";

  let insight: string;
  if (position === "dominant") {
    insight = `Strong competitive position. You're well-placed against ${topCompetitors.length} competitors with favorable pricing.`;
  } else if (position === "strong") {
    insight = `Good positioning in the market. ${opportunities[0] || "Focus on differentiation to maintain advantage."}`;
  } else if (position === "competitive") {
    insight = `Moderately competitive landscape. ${threats[0] || "Differentiation is key to standing out."}`;
  } else if (position === "weak") {
    insight = `Challenging competitive position. Consider repositioning or finding a niche angle.`;
  } else {
    insight = `Very weak competitive position. Significant barriers — consider alternative products or heavy differentiation.`;
  }

  return {
    score: totalScore,
    competitivePosition: position,
    pricePosition,
    competitorCount: topCompetitors.length,
    topCompetitor: { name: topComp.name, price: topComp.price, rating: topComp.rating, threat: threatLevel },
    priceGap: { vsLowest: round(priceVsLowest), vsHighest: round(priceVsHighest), vsAverage: round(priceVsAverage) },
    reviewGap: { vsBest: topComp.reviewCount, vsAverage: round(avgReviews) },
    differentiationOpportunities: opportunities,
    threats,
    marketPositioning: positioning,
    insight,
  };
}

// ── Risk Assessment Engine ───────────────────────────────────────────────────

const HAZARDOUS_MATERIALS = ["lithium", "battery", "chemical", "flammable", "liquid", "gas", "acid"];
const RESTRICTED_CATEGORIES = ["weapons", "firearms", "ammunition", "drugs", "pharmaceutical", "tobacco", "alcohol"];
const HEAVY_ITEMS_THRESHOLD = 50;
const OVERSIZED_DIMENSIONS = 48;

export function calculateRiskAssessment(input: RiskAssessmentInput): RiskAssessmentResult {
  const { productTitle: _productTitle, category, materials, targetMarkets, shippingMethods: _shippingMethods, pricePoint, isBranded, weight, dimensions } = input;

  const legalRisks: RiskAssessmentResult["legalRisks"] = [];
  const complianceIssues: RiskAssessmentResult["complianceIssues"] = [];
  const shippingRestrictions: RiskAssessmentResult["shippingRestrictions"] = [];
  const platformRisks: RiskAssessmentResult["platformRisks"] = [];

  const categoryLower = category.toLowerCase();
  const isRestricted = RESTRICTED_CATEGORIES.some(r => categoryLower.includes(r));
  if (isRestricted) {
    legalRisks.push({
      type: "Restricted Category",
      severity: "high",
      description: `Product in restricted category: ${category}`,
      mitigation: "Verify legal compliance in all target markets before selling",
    });
  }

  const materialStr = materials.join(" ").toLowerCase();
  const isHazardous = HAZARDOUS_MATERIALS.some(h => materialStr.includes(h));
  if (isHazardous) {
    legalRisks.push({
      type: "Hazardous Materials",
      severity: "high",
      description: "Product contains materials that may require special handling",
      mitigation: "Ensure proper shipping labels and compliance with hazardous material regulations",
    });
    shippingRestrictions.push(
      ...targetMarkets.map(m => ({
        region: m,
        restricted: true,
        reason: "Hazardous material shipping restrictions may apply",
      }))
    );
  }

  if (pricePoint > 500 && !isBranded) {
    legalRisks.push({
      type: "High-Value Unbranded",
      severity: "medium",
      description: "High-value unbranded products increase counterfeit risk",
      mitigation: "Obtain authenticity certificates and detailed product documentation",
    });
  }

  complianceIssues.push(
    { area: "Compliance checks", status: "warning", details: "Not run — no marketplace policy or compliance API is connected. Treat as unverified." }
  );

  const platforms = ["shopify", "amazon", "ebay", "woocommerce"];
  platforms.forEach(p => {
    const issues: string[] = [];
    if (isRestricted) issues.push("Restricted category on most platforms");
    if (pricePoint > 1000) issues.push("High-value items may require additional verification");
    if (issues.length > 0) {
      platformRisks.push({
        platform: p,
        compliant: false,
        issues,
      });
    }
  });

  if (weight > HEAVY_ITEMS_THRESHOLD) {
    shippingRestrictions.push(
      ...targetMarkets.map(m => ({
        region: m,
        restricted: false,
        reason: `Heavy item (${weight}lbs) — additional shipping costs apply`,
      }))
    );
  }

  const oversized = dimensions.length > OVERSIZED_DIMENSIONS || dimensions.width > OVERSIZED_DIMENSIONS || dimensions.height > OVERSIZED_DIMENSIONS;
  if (oversized) {
    shippingRestrictions.push(
      ...targetMarkets.map(m => ({
        region: m,
        restricted: false,
        reason: "Oversized dimensions — special shipping rates apply",
      }))
    );
  }

  const insuranceNeeded = pricePoint > 200 || isHazardous || weight > 30;

  let riskScore = 100;
  legalRisks.forEach(r => { riskScore -= r.severity === "high" ? 20 : r.severity === "medium" ? 10 : 5; });
  complianceIssues.forEach(c => { if (c.status === "violation") riskScore -= 15; else if (c.status === "warning") riskScore -= 5; });
  shippingRestrictions.forEach(s => { if (s.restricted) riskScore -= 10; });
  platformRisks.forEach(p => { if (!p.compliant) riskScore -= 5; });
  if (insuranceNeeded) riskScore -= 5;
  riskScore = clamp(riskScore, 0, 100);

  let overallRisk: RiskAssessmentResult["overallRisk"];
  if (riskScore >= 85) overallRisk = "minimal";
  else if (riskScore >= 70) overallRisk = "low";
  else if (riskScore >= 50) overallRisk = "moderate";
  else if (riskScore >= 30) overallRisk = "high";
  else overallRisk = "critical";

  let insight: string;
  if (overallRisk === "minimal") {
    insight = "Minimal risk profile. Standard compliance measures are sufficient.";
  } else if (overallRisk === "low") {
    insight = "Low risk with minor considerations. Standard business practices apply.";
  } else if (overallRisk === "moderate") {
    insight = "Moderate risk factors present. Review legal and shipping requirements before proceeding.";
  } else if (overallRisk === "high") {
    insight = "Significant risk factors identified. Thorough due diligence required before investing.";
  } else {
    insight = "Critical risk level. Strongly recommend reconsidering this product or consulting legal counsel.";
  }

  return {
    score: riskScore,
    overallRisk,
    legalRisks,
    complianceIssues,
    shippingRestrictions,
    platformRisks,
    insuranceRecommendation: { needed: insuranceNeeded, reason: insuranceNeeded ? "High value or hazardous materials" : "Standard coverage sufficient" },
    totalRiskScore: 100 - riskScore,
    insight,
  };
}

// ── Market Intelligence Engine ───────────────────────────────────────────────

const CATEGORY_BENCHMARKS: Record<string, { tam: number; growth: number; maturity: MarketIntelligenceResult["marketMaturity"] }> = {
  electronics: { tam: 500000000, growth: 8, maturity: "mature" },
  fashion: { tam: 300000000, growth: 12, maturity: "growth" },
  "home & garden": { tam: 200000000, growth: 6, maturity: "mature" },
  "health & beauty": { tam: 250000000, growth: 15, maturity: "growth" },
  toys: { tam: 100000000, growth: 4, maturity: "mature" },
  "sports & outdoors": { tam: 150000000, growth: 10, maturity: "growth" },
  "pet supplies": { tam: 120000000, growth: 18, maturity: "growth" },
  automotive: { tam: 200000000, growth: 5, maturity: "mature" },
  "baby products": { tam: 80000000, growth: 7, maturity: "mature" },
};

const DEFAULT_BENCHMARK = { tam: 150000000, growth: 8, maturity: "growth" as const };

export function calculateMarketIntelligence(input: MarketIntelligenceInput): MarketIntelligenceResult {
  const { productTitle: _productTitle, category, targetAudience, pricePoint, monthlySalesEstimate } = input;

  const benchmark = CATEGORY_BENCHMARKS[category.toLowerCase()] || DEFAULT_BENCHMARK;

  const tam = benchmark.tam;
  const sam = Math.round(tam * 0.15);
  const som = monthlySalesEstimate > 0 ? Math.round(monthlySalesEstimate * pricePoint * 12) : Math.round(sam * 0.01);

  const marketSizeScore = clamp(som / (tam * 0.001) * 25, 0, 25);

  const growthRate = benchmark.growth + (monthlySalesEstimate > 100 ? 2 : 0);
  const growthScore = clamp(growthRate * 2, 0, 25);

  const audienceDefined = targetAudience.length > 10;
  const audienceScore = audienceDefined ? 15 : 5;

  const demandScore = clamp(monthlySalesEstimate / 100, 0, 1) * 20;

  const maturityScore = benchmark.maturity === "growth" ? 15 : benchmark.maturity === "nascent" ? 12 : benchmark.maturity === "mature" ? 8 : 2;

  const totalScore = clamp(Math.round(marketSizeScore + growthScore + audienceScore + demandScore + maturityScore), 0, 100);

  const primaryAge = targetAudience.match(/\d{2}-\d{2}/)?.[0] || "—";

  let insight: string;
  if (totalScore >= 80) {
    insight = `Strong market opportunity (estimated from category benchmarks). ${category} TAM ~$${(tam / 1000000).toFixed(0)}M with ~${growthRate}% growth — benchmark, not measured.`;
  } else if (totalScore >= 60) {
    insight = `Good market potential (estimated). ${category} is in ${benchmark.maturity} phase with steady demand.`;
  } else if (totalScore >= 40) {
    insight = `Moderate market opportunity. Consider niche positioning within ${category}.`;
  } else {
    insight = `Limited market potential for this product in ${category}. Consider alternative categories.`;
  }

  return {
    score: totalScore,
    marketSize: { tam, sam, som, currency: "USD" },
    growthRate: { current: growthRate, projected: Math.round(growthRate * 1.2), trend: growthRate > 10 ? "accelerating" : growthRate > 5 ? "stable" : "decelerating" },
    audienceDemographics: {
      primaryAge,
      genderSplit: "—",
      topLocations: [],
      buyingBehavior: pricePoint < 25 ? "Impulse purchase" : pricePoint < 100 ? "Considered purchase" : "Research-heavy purchase",
    },
    demandIndicators: {
      searchTrend: growthRate > 10 ? "Rising" : growthRate > 5 ? "Stable" : "Declining",
      socialBuzz: monthlySalesEstimate > 200 ? "high" : monthlySalesEstimate > 50 ? "medium" : "low",
      seasonalFactor: 0.3,
    },
    priceElasticity: pricePoint < 30 ? "elastic" : pricePoint < 100 ? "unit-elastic" : "inelastic",
    marketMaturity: benchmark.maturity,
    insight,
  };
}

// ── Bundle Analysis Engine ───────────────────────────────────────────────────

const CATEGORY_BUNDLES: Record<string, string[]> = {
  electronics: ["case", "charger", "screen protector", "cable", "adapter", "stand"],
  fashion: ["matching accessory", "complementary item", "care kit", "storage bag"],
  "home & garden": ["cleaning kit", "maintenance tools", "storage solution", "replacement parts"],
  "health & beauty": ["travel size", "complementary product", "application tool", "storage case"],
  toys: ["batteries", "extra pieces", "display stand", "carrying case"],
  "pet supplies": ["treats", "toys", "grooming tools", "storage"],
  "sports & outdoors": ["accessories", "maintenance kit", "carrying case", "replacement parts"],
};

export function calculateBundleAnalysis(input: BundleAnalysisInput): BundleAnalysisResult {
  const { productTitle, category, pricePoint, averageOrderValue, customerSegment } = input;

  const categoryBundles = CATEGORY_BUNDLES[category.toLowerCase()] || ["accessories", "care kit", "storage"];

  const bundleOpportunities = categoryBundles.slice(0, 5).map((item, i) => {
    const expectedLift = round(Math.min(35, Math.max(12, 12 + i * 3 + (pricePoint >= 50 ? 4 : 0))), 1);
    const confidence = averageOrderValue > 0 ? 0.7 : 0.5;
    return {
      name: `${productTitle} ${item}`,
      type: (i % 4 === 0 ? "upsell" : i % 3 === 0 ? "bundle" : i % 2 === 0 ? "cross-sell" : "accessory") as "cross-sell" | "upsell" | "bundle" | "accessory",
      expectedLift,
      confidence,
      rationale: `${item} naturally complements ${productTitle} for ${customerSegment || "typical"} customers (rule-based heuristic)`,
    };
  });

  const avgLift = bundleOpportunities.reduce((s, o) => s + o.expectedLift, 0) / bundleOpportunities.length;
  const aovPotential = Math.round(averageOrderValue * (1 + avgLift / 100));

  const totalScore = clamp(Math.round(
    bundleOpportunities.length * 6 +
    (avgLift * 0.5) +
    (aovPotential / averageOrderValue * 10) +
    (bundleOpportunities.reduce((s, o) => s + o.confidence, 0) / bundleOpportunities.length * 20)
  ), 0, 100);

  let insight: string;
  if (totalScore >= 80) {
    insight = `Excellent bundle potential. ${bundleOpportunities.length} opportunities identified with ${avgLift.toFixed(0)}% average AOV lift.`;
  } else if (totalScore >= 60) {
    insight = `Good bundle potential. Consider implementing top ${Math.min(3, bundleOpportunities.length)} opportunities.`;
  } else if (totalScore >= 40) {
    insight = `Moderate bundle potential. Focus on the highest-confidence opportunities.`;
  } else {
    insight = `Limited bundle opportunities. This product may be a standalone purchase.`;
  }

  return {
    score: totalScore,
    bundleOpportunities,
    avgOrderValuePotential: { current: averageOrderValue, potential: aovPotential, lift: round(avgLift, 1) },
    customerLifetimeImpact: { oneTime: pricePoint, withBundles: Math.round(pricePoint * 1.5) },
    recommendations: [
      `Start with top ${Math.min(3, bundleOpportunities.length)} bundle opportunities`,
      "Test bundle pricing with 10-15% discount vs individual purchase",
      "Monitor bundle attach rate and adjust offerings based on data",
    ],
    insight,
  };
}

// ── Combined Validation ──────────────────────────────────────────────────────

export function runFullValidation(
  trendInput: TrendVelocityInput,
  saturationInput: SaturationInput,
  profitInput: ProfitPotentialInput,
  seasonalInput: SeasonalDemandInput,
  goldenExtras: Omit<GoldenProductInput, "trendVelocity" | "saturation" | "profitPotential" | "seasonalDemand">,
  authenticityInput?: ProductAuthenticityInput,
  supplierInput?: SupplierValidationInput,
  competitionInput?: CompetitionAnalysisInput,
  riskInput?: RiskAssessmentInput,
  marketInput?: MarketIntelligenceInput,
  bundleInput?: BundleAnalysisInput,
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

  const productAuthenticity = authenticityInput ? calculateProductAuthenticity(authenticityInput) : undefined;
  const supplierValidation = supplierInput ? calculateSupplierValidation(supplierInput) : undefined;
  const competitionAnalysis = competitionInput ? calculateCompetitionAnalysis(competitionInput) : undefined;
  const riskAssessment = riskInput ? calculateRiskAssessment(riskInput) : undefined;
  const marketIntelligence = marketInput ? calculateMarketIntelligence(marketInput) : undefined;
  const bundleAnalysis = bundleInput ? calculateBundleAnalysis(bundleInput) : undefined;

  return {
    trendVelocity,
    saturation,
    profitPotential,
    seasonalDemand,
    goldenProduct,
    productAuthenticity,
    supplierValidation,
    competitionAnalysis,
    riskAssessment,
    marketIntelligence,
    bundleAnalysis,
  };
}
