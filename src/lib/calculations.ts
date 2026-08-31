export interface ProfitCalc {
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
  breakEvenUnits: number;
  revenue: number;
  costBreakdown: { name: string; value: number; pct: number; color: string }[];
}

export interface ShippingCalc {
  estimatedCost: number;
  deliveryDays: { min: number; max: number };
  carriers: { name: string; cost: number; days: number; reliability: number }[];
  costPerUnit: number;
}

export interface LandedCostCalc {
  landedCost: number;
  totalDuties: number;
  totalShipping: number;
  totalFees: number;
  breakdown: { name: string; value: number; color: string }[];
  suggestedRetail: number;
  profitAtSuggested: number;
}

export interface MarginCalc {
  recommendedPrice: number;
  competitiveRange: { min: number; max: number };
  marginAtPrice: number;
  priceBreakpoints: { price: number; margin: number; roi: number }[];
}

export interface AdROICalc {
  estimatedCAC: number;
  breakEvenROAS: number;
  projectedProfit: number;
  requiredSales: number;
  dailyBudget: number;
  monthlyRevenue: number;
  monthlyProfit: number;
  scenarios: { name: string; spend: number; revenue: number; profit: number; roas: number }[];
}

export function calculateProfit(
  productCost: number,
  sellingPrice: number,
  shippingCost: number,
  platformFeePercent: number,
  adSpendPerUnit: number,
  units: number = 1
): ProfitCalc {
  if (!sellingPrice || sellingPrice <= 0) {
    return {
      totalCost: 0, netProfit: 0, profitMargin: 0, roi: 0,
      breakEvenUnits: 0, revenue: 0,
      costBreakdown: [],
    };
  }
  const revenue = sellingPrice * units;
  const platformFee = (sellingPrice * platformFeePercent / 100) * units;
  const totalShipping = shippingCost * units;
  const totalAds = adSpendPerUnit * units;
  const totalCost = (productCost * units) + platformFee + totalShipping + totalAds;
  const netProfit = revenue - totalCost;
  const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
  const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;
  const breakEvenUnits = netProfit > 0 ? 1 : Math.ceil(Math.abs(netProfit) > 0 ? Math.abs(totalCost - revenue) / Math.max(sellingPrice - productCost - (sellingPrice * platformFeePercent / 100) - shippingCost - adSpendPerUnit, 0.01) : 0);

  const costBreakdown = [
    { name: "Product Cost", value: productCost * units, pct: totalCost > 0 ? ((productCost * units) / totalCost) * 100 : 0, color: "#3b82f6" },
    { name: "Platform Fees", value: platformFee, pct: totalCost > 0 ? (platformFee / totalCost) * 100 : 0, color: "#a855f7" },
    { name: "Shipping", value: totalShipping, pct: totalCost > 0 ? (totalShipping / totalCost) * 100 : 0, color: "#f97316" },
    { name: "Ad Spend", value: totalAds, pct: totalCost > 0 ? (totalAds / totalCost) * 100 : 0, color: "#ef4444" },
  ];

  return { totalCost, netProfit, profitMargin, roi, breakEvenUnits, revenue, costBreakdown };
}

export function calculateShipping(
  weight: number,
  length: number,
  width: number,
  height: number,
  originCountry: string,
  destinationCountry: string
): ShippingCalc {
  const safeWeight = Math.max(0, weight) || 0;
  const safeLength = Math.max(0, length) || 0;
  const safeWidth = Math.max(0, width) || 0;
  const safeHeight = Math.max(0, height) || 0;

  const volumetricWeight = (safeLength * safeWidth * safeHeight) / 5000;
  const chargeableWeight = Math.max(safeWeight, volumetricWeight);

  const baseRate = originCountry === destinationCountry ? 3.5 : 8.0;
  const carriers = [
    { name: "Standard Air", cost: +(chargeableWeight * baseRate).toFixed(2), days: originCountry === destinationCountry ? 3 : 12, reliability: 92 },
    { name: "Express", cost: +(chargeableWeight * baseRate * 1.8).toFixed(2), days: originCountry === destinationCountry ? 1 : 7, reliability: 97 },
    { name: "Economy Sea", cost: +(chargeableWeight * baseRate * 0.5).toFixed(2), days: originCountry === destinationCountry ? 5 : 30, reliability: 85 },
    { name: "Premium Courier", cost: +(chargeableWeight * baseRate * 2.5).toFixed(2), days: originCountry === destinationCountry ? 1 : 5, reliability: 99 },
  ];

  const estimatedCost = carriers[0].cost;
  const deliveryDays = { min: Math.min(...carriers.map((c) => c.days)), max: Math.max(...carriers.map((c) => c.days)) };

  return { estimatedCost, deliveryDays, carriers, costPerUnit: estimatedCost };
}

export function calculateLandedCost(
  productCost: number,
  shippingCost: number,
  tariffPercent: number,
  customsDuty: number,
  insuranceCost: number,
  platformFeePercent: number,
  otherFees: number,
  quantity: number = 1
): LandedCostCalc {
  if (!quantity || quantity <= 0) quantity = 1;
  const safeProductCost = Math.max(0, productCost) || 0;
  const safeShippingCost = Math.max(0, shippingCost) || 0;
  const safeTariffPercent = Math.max(0, tariffPercent) || 0;
  const safeCustomsDuty = Math.max(0, customsDuty) || 0;
  const safeInsuranceCost = Math.max(0, insuranceCost) || 0;
  const safePlatformFeePercent = Math.max(0, platformFeePercent) || 0;
  const safeOtherFees = Math.max(0, otherFees) || 0;

  const totalProductCost = safeProductCost * quantity;
  const totalShipping = safeShippingCost * quantity;
  const tariffAmount = (totalProductCost * safeTariffPercent) / 100;
  const totalDuties = tariffAmount + safeCustomsDuty;
  const totalFees = ((totalProductCost * safePlatformFeePercent) / 100) + safeInsuranceCost + safeOtherFees;
  const landedCost = totalProductCost + totalShipping + totalDuties + totalFees;
  const landedCostPerUnit = landedCost / quantity;

  const suggestedRetail = +(landedCostPerUnit * 2.5).toFixed(2);
  const profitAtSuggested = +(suggestedRetail - landedCostPerUnit).toFixed(2);

  const breakdown = [
    { name: "Product Cost", value: +totalProductCost.toFixed(2), color: "#3b82f6" },
    { name: "Shipping", value: +totalShipping.toFixed(2), color: "#f97316" },
    { name: "Tariffs & Duties", value: +totalDuties.toFixed(2), color: "#ef4444" },
    { name: "Platform Fees", value: +((totalProductCost * safePlatformFeePercent) / 100).toFixed(2), color: "#a855f7" },
    { name: "Insurance", value: +safeInsuranceCost.toFixed(2), color: "#eab308" },
    { name: "Other Fees", value: +safeOtherFees.toFixed(2), color: "#6b7280" },
  ];

  return { landedCost: +landedCost.toFixed(2), totalDuties: +totalDuties.toFixed(2), totalShipping, totalFees: +totalFees.toFixed(2), breakdown, suggestedRetail, profitAtSuggested };
}

export function calculateMargin(
  costPrice: number,
  desiredMarginPercent: number,
  competitorPrices: number[] = []
): MarginCalc {
  const recommendedPrice = +(costPrice / (1 - desiredMarginPercent / 100)).toFixed(2);
  const marginAtPrice = desiredMarginPercent;

  const minCompetitor = competitorPrices.length > 0 ? Math.min(...competitorPrices) : recommendedPrice * 0.8;
  const maxCompetitor = competitorPrices.length > 0 ? Math.max(...competitorPrices) : recommendedPrice * 1.3;

  const competitiveRange = {
    min: +Math.max(minCompetitor * 0.95, costPrice * 1.1).toFixed(2),
    max: +(maxCompetitor * 1.05).toFixed(2),
  };

  const priceBreakpoints = [20, 30, 40, 50, 60].map((margin) => {
    const price = +(costPrice / (1 - margin / 100)).toFixed(2);
    const profit = price - costPrice;
    const roi = costPrice > 0 ? (profit / costPrice) * 100 : 0;
    return { price, margin, roi: +roi.toFixed(1) };
  });

  return { recommendedPrice, competitiveRange, marginAtPrice, priceBreakpoints };
}

export function calculateAdROI(
  productCost: number,
  sellingPrice: number,
  shippingCost: number,
  platformFeePercent: number,
  estimatedCTR: number,
  estimatedCVR: number,
  dailyBudget: number
): AdROICalc {
  if (!dailyBudget || dailyBudget <= 0) {
    return {
      estimatedCAC: 0, breakEvenROAS: 0, projectedProfit: 0,
      requiredSales: 0, dailyBudget: 0, monthlyRevenue: 0,
      monthlyProfit: 0, scenarios: [],
    };
  }
  const safeCTR = Math.max(0, estimatedCTR) || 0;
  const safeCVR = Math.max(0, estimatedCVR) || 0;
  const revenuePerUnit = sellingPrice;
  const costPerUnit = productCost + shippingCost + (sellingPrice * platformFeePercent / 100);
  const profitPerUnit = revenuePerUnit - costPerUnit;

  const clicksPerDay = dailyBudget > 0 && safeCTR > 0 ? (dailyBudget / (safeCTR / 100)) / 100 : 0;
  const salesPerDay = clicksPerDay * (safeCVR / 100);
  const revenuePerDay = salesPerDay * sellingPrice;
  const profitPerDay = (salesPerDay * profitPerUnit) - dailyBudget;

  const estimatedCAC = salesPerDay > 0 ? dailyBudget / salesPerDay : 0;
  const breakEvenROAS = profitPerUnit > 0 ? sellingPrice / profitPerUnit : 0;
  const requiredSales = estimatedCAC > 0 ? Math.ceil(dailyBudget / profitPerUnit) : 0;

  const monthlyRevenue = +revenuePerDay * 30;
  const monthlyProfit = +profitPerDay * 30;

  const scenarios = [
    { name: "Conservative", spend: dailyBudget * 0.5, revenue: 0, profit: 0, roas: 0 },
    { name: "Expected", spend: dailyBudget, revenue: 0, profit: 0, roas: 0 },
    { name: "Aggressive", spend: dailyBudget * 2, revenue: 0, profit: 0, roas: 0 },
  ].map((s) => {
    const clicks = s.spend > 0 && safeCTR > 0 ? (s.spend / (safeCTR / 100)) / 100 : 0;
    const sales = clicks * (safeCVR / 100);
    const rev = sales * sellingPrice;
    const prof = (sales * profitPerUnit) - s.spend;
    return { ...s, revenue: +rev.toFixed(2), profit: +prof.toFixed(2), roas: s.spend > 0 ? +(rev / s.spend).toFixed(2) : 0 };
  });

  return {
    estimatedCAC: +estimatedCAC.toFixed(2),
    breakEvenROAS: +breakEvenROAS.toFixed(2),
    projectedProfit: +profitPerDay.toFixed(2),
    requiredSales,
    dailyBudget,
    monthlyRevenue: +monthlyRevenue.toFixed(2),
    monthlyProfit: +monthlyProfit.toFixed(2),
    scenarios,
  };
}

// ── Real-Time Profit Tracker ─────────────────────────────────────

export interface OrderProfitResult {
  netProfit: number;
  profitMargin: number;
  totalCosts: number;
  breakdown: { name: string; value: number; pct: number; color: string }[];
}

export function calculateOrderProfit(
  revenue: number,
  cogs: number,
  shippingCost: number,
  platformFeePercent: number,
  paymentProcessingPercent: number,
  refunds: number = 0,
  adSpend: number = 0,
  otherCosts: number = 0
): OrderProfitResult {
  if (!revenue || revenue <= 0) {
    return { netProfit: 0, profitMargin: 0, totalCosts: 0, breakdown: [] };
  }
  const platformFee = +(revenue * platformFeePercent / 100).toFixed(2);
  const paymentProcessing = +(revenue * paymentProcessingPercent / 100).toFixed(2);
  const totalCosts = +(cogs + shippingCost + platformFee + paymentProcessing + refunds + adSpend + otherCosts).toFixed(2);
  const netProfit = +(revenue - totalCosts).toFixed(2);
  const profitMargin = revenue > 0 ? +((netProfit / revenue) * 100).toFixed(1) : 0;

  const breakdown = [
    { name: "COGS", value: cogs, pct: totalCosts > 0 ? +((cogs / totalCosts) * 100).toFixed(1) : 0, color: "#3b82f6" },
    { name: "Shipping", value: shippingCost, pct: totalCosts > 0 ? +((shippingCost / totalCosts) * 100).toFixed(1) : 0, color: "#f97316" },
    { name: "Platform Fees", value: platformFee, pct: totalCosts > 0 ? +((platformFee / totalCosts) * 100).toFixed(1) : 0, color: "#a855f7" },
    { name: "Payment Processing", value: paymentProcessing, pct: totalCosts > 0 ? +((paymentProcessing / totalCosts) * 100).toFixed(1) : 0, color: "#eab308" },
    { name: "Refunds", value: refunds, pct: totalCosts > 0 ? +((refunds / totalCosts) * 100).toFixed(1) : 0, color: "#ef4444" },
    { name: "Ad Spend", value: adSpend, pct: totalCosts > 0 ? +((adSpend / totalCosts) * 100).toFixed(1) : 0, color: "#ec4899" },
    { name: "Other", value: otherCosts, pct: totalCosts > 0 ? +((otherCosts / totalCosts) * 100).toFixed(1) : 0, color: "#6b7280" },
  ].filter((item) => item.value > 0);

  return { netProfit, profitMargin, totalCosts, breakdown };
}

export interface AggregatedProfitResult {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
  avgOrderProfit: number;
  avgOrderValue: number;
}

export function calculateAggregatedProfit(
  orders: { revenue: number; cogs: number; shippingCost: number; platformFee: number; paymentProcessing: number; refunds: number; adSpend: number; otherCosts: number; netProfit: number }[]
): AggregatedProfitResult {
  if (!orders || orders.length === 0) {
    return {
      totalRevenue: 0, totalCosts: 0, totalProfit: 0, profitMargin: 0,
      totalOrders: 0, avgOrderProfit: 0, avgOrderValue: 0,
    };
  }
  const totalRevenue = orders.reduce((sum, o) => sum + o.revenue, 0);
  const totalCosts = orders.reduce((sum, o) => sum + o.cogs + o.shippingCost + o.platformFee + o.paymentProcessing + o.refunds + o.adSpend + o.otherCosts, 0);
  const totalProfit = orders.reduce((sum, o) => sum + o.netProfit, 0);
  const totalOrders = orders.length;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  const avgOrderProfit = totalOrders > 0 ? totalProfit / totalOrders : 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  return {
    totalRevenue: +totalRevenue.toFixed(2),
    totalCosts: +totalCosts.toFixed(2),
    totalProfit: +totalProfit.toFixed(2),
    profitMargin: +profitMargin.toFixed(1),
    totalOrders,
    avgOrderProfit: +avgOrderProfit.toFixed(2),
    avgOrderValue: +avgOrderValue.toFixed(2),
  };
}
