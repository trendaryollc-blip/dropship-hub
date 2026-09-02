import type { ProfitGuardConfig } from "@/types/automation";
import { DEFAULT_PROFIT_GUARD_CONFIG } from "@/types/automation";

interface ProfitCheckInput {
  revenue: number;
  unitCost: number;
  shippingCost: number;
  quantity: number;
  platformFeePercent?: number;
  paymentProcessingPercent?: number;
}

interface ProfitCheckResult {
  passed: boolean;
  profit: number;
  profitMargin: number;
  reason: string;
  details: {
    revenue: number;
    totalCost: number;
    platformFee: number;
    paymentProcessing: number;
    netProfit: number;
    netMargin: number;
  };
}

export function checkProfitMargin(
  input: ProfitCheckInput,
  config: ProfitGuardConfig = DEFAULT_PROFIT_GUARD_CONFIG
): ProfitCheckResult {
  if (!config.enabled) {
    return {
      passed: true,
      profit: 0,
      profitMargin: 100,
      reason: "Profit guard disabled",
      details: { revenue: 0, totalCost: 0, platformFee: 0, paymentProcessing: 0, netProfit: 0, netMargin: 100 },
    };
  }

  const quantity = Math.max(input.quantity, 1);
  const totalCost = (input.unitCost + input.shippingCost) * quantity;
  const platformFee = input.revenue * ((input.platformFeePercent ?? 15) / 100);
  const paymentProcessing = input.revenue * ((input.paymentProcessingPercent ?? 2.9) / 100);
  const totalExpenses = totalCost + platformFee + paymentProcessing;
  const netProfit = input.revenue - totalExpenses;
  const profitMargin = input.revenue > 0 ? (netProfit / input.revenue) * 100 : 0;

  const details = {
    revenue: input.revenue,
    totalCost,
    platformFee,
    paymentProcessing,
    netProfit,
    netMargin: profitMargin,
  };

  if (netProfit < config.minProfitAbsolute) {
    return {
      passed: false,
      profit: netProfit,
      profitMargin,
      reason: `Net profit $${netProfit.toFixed(2)} below minimum $${config.minProfitAbsolute.toFixed(2)}`,
      details,
    };
  }

  if (profitMargin < config.minProfitMarginPercent) {
    return {
      passed: false,
      profit: netProfit,
      profitMargin,
      reason: `Profit margin ${profitMargin.toFixed(1)}% below minimum ${config.minProfitMarginPercent}%`,
      details,
    };
  }

  const costMultiplier = input.revenue > 0 ? input.revenue / totalCost : Infinity;
  if (costMultiplier > config.maxCostMultiplier) {
    return {
      passed: false,
      profit: netProfit,
      profitMargin,
      reason: `Cost multiplier ${costMultiplier.toFixed(1)}x exceeds maximum ${config.maxCostMultiplier}x (suspicious pricing)`,
      details,
    };
  }

  return {
    passed: true,
    profit: netProfit,
    profitMargin,
    reason: "Profit check passed",
    details,
  };
}

export function calculateOptimalPrice(
  unitCost: number,
  shippingCost: number,
  quantity: number,
  targetMarginPercent: number,
  platformFeePercent: number = 15,
  paymentProcessingPercent: number = 2.9
): number {
  const totalUnitCost = unitCost + shippingCost;
  const fixedCostRatio = (platformFeePercent + paymentProcessingPercent) / 100;
  const optimalPrice = (totalUnitCost * quantity) / (1 - fixedCostRatio - targetMarginPercent / 100);
  return Math.ceil(optimalPrice * 100) / 100;
}

export function getProfitGuardSummary(
  inputs: ProfitCheckInput[],
  config: ProfitGuardConfig = DEFAULT_PROFIT_GUARD_CONFIG
): {
  totalOrders: number;
  passedOrders: number;
  failedOrders: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  avgMargin: number;
} {
  let totalRevenue = 0;
  let totalCost = 0;
  let totalProfit = 0;
  let passedOrders = 0;

  for (const input of inputs) {
    const result = checkProfitMargin(input, config);
    totalRevenue += input.revenue;
    totalCost += result.details.totalCost + result.details.platformFee + result.details.paymentProcessing;
    totalProfit += result.profit;
    if (result.passed) passedOrders++;
  }

  return {
    totalOrders: inputs.length,
    passedOrders,
    failedOrders: inputs.length - passedOrders,
    totalRevenue,
    totalCost,
    totalProfit,
    avgMargin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
  };
}
