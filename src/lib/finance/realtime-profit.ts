export interface OrderProfitData {
  orderId: string;
  orderDate: string;
  productTitle: string;
  productImage?: string;
  platform: string;
  supplier: string;
  revenue: number;
  quantity: number;
  cogs: number;
  shippingCost: number;
  platformFee: number;
  paymentProcessing: number;
  refunds: number;
  adSpend: number;
  otherCosts: number;
  taxAmount: number;
  netProfit: number;
  profitMargin: number;
  status: "completed" | "pending" | "refunded" | "disputed";
}

export interface RealTimeProfitSummary {
  totalRevenue: number;
  totalCosts: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
  avgOrderProfit: number;
  avgOrderValue: number;
  refundRate: number;
  todayRevenue: number;
  todayProfit: number;
  todayOrders: number;
  monthRevenue: number;
  monthProfit: number;
  monthOrders: number;
  trend: "up" | "down" | "stable";
  trendPercentage: number;
}

export interface ProfitAlert {
  id: string;
  type: "low_margin" | "high_refund" | "loss_warning" | "milestone_reached";
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  orderId?: string;
  value: number;
  threshold: number;
  createdAt: string;
}

export interface ProfitTrend {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
  margin: number;
}

export function calculateRealTimeProfit(order: {
  revenue: number;
  quantity: number;
  cogs: number;
  shippingCost: number;
  platformFeePercent: number;
  paymentProcessingPercent: number;
  refunds?: number;
  adSpend?: number;
  otherCosts?: number;
  taxRate?: number;
}): OrderProfitData["netProfit"] {
  const { revenue, quantity, cogs, shippingCost, platformFeePercent, paymentProcessingPercent, refunds = 0, adSpend = 0, otherCosts = 0, taxRate = 0 } = order;

  if (!revenue || revenue <= 0) {
    return 0;
  }

  const platformFee = revenue * (platformFeePercent / 100);
  const paymentProcessing = revenue * (paymentProcessingPercent / 100);
  const taxAmount = revenue * (taxRate / 100);
  const totalCosts = cogs + shippingCost + platformFee + paymentProcessing + refunds + adSpend + otherCosts + taxAmount;
  const netProfit = revenue - totalCosts;

  return +netProfit.toFixed(2);
}

export function calculateProfitMargin(revenue: number, netProfit: number): number {
  if (revenue <= 0) return 0;
  return +((netProfit / revenue) * 100).toFixed(1);
}

export function generateProfitSummary(orders: OrderProfitData[]): RealTimeProfitSummary {
  if (orders.length === 0) {
    return {
      totalRevenue: 0,
      totalCosts: 0,
      totalProfit: 0,
      profitMargin: 0,
      totalOrders: 0,
      avgOrderProfit: 0,
      avgOrderValue: 0,
      refundRate: 0,
      todayRevenue: 0,
      todayProfit: 0,
      todayOrders: 0,
      monthRevenue: 0,
      monthProfit: 0,
      monthOrders: 0,
      trend: "stable",
      trendPercentage: 0,
    };
  }

  const now = new Date();
  const todayStr = now.toISOString().split("T")[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

  let totalRevenue = 0;
  let totalCosts = 0;
  let totalProfit = 0;
  let totalOrders = orders.length;
  let refundCount = 0;
  let todayRevenue = 0;
  let todayProfit = 0;
  let todayOrders = 0;
  let monthRevenue = 0;
  let monthProfit = 0;
  let monthOrders = 0;

  for (const order of orders) {
    totalRevenue += order.revenue;
    totalProfit += order.netProfit;
    totalCosts += order.cogs + order.shippingCost + order.platformFee + order.paymentProcessing + order.refunds + order.adSpend + order.otherCosts + order.taxAmount;

    if (order.status === "refunded") refundCount++;

    if (order.orderDate === todayStr) {
      todayRevenue += order.revenue;
      todayProfit += order.netProfit;
      todayOrders++;
    }

    if (order.orderDate >= monthStart) {
      monthRevenue += order.revenue;
      monthProfit += order.netProfit;
      monthOrders++;
    }
  }

  const profitMargin = totalRevenue > 0 ? +((totalProfit / totalRevenue) * 100).toFixed(1) : 0;
  const avgOrderProfit = totalOrders > 0 ? +(totalProfit / totalOrders).toFixed(2) : 0;
  const avgOrderValue = totalOrders > 0 ? +(totalRevenue / totalOrders).toFixed(2) : 0;
  const refundRate = totalOrders > 0 ? +((refundCount / totalOrders) * 100).toFixed(1) : 0;

  const trend = calculateProfitTrend(orders);

  return {
    totalRevenue: +totalRevenue.toFixed(2),
    totalCosts: +totalCosts.toFixed(2),
    totalProfit: +totalProfit.toFixed(2),
    profitMargin,
    totalOrders,
    avgOrderProfit,
    avgOrderValue,
    refundRate,
    todayRevenue: +todayRevenue.toFixed(2),
    todayProfit: +todayProfit.toFixed(2),
    todayOrders,
    monthRevenue: +monthRevenue.toFixed(2),
    monthProfit: +monthProfit.toFixed(2),
    monthOrders,
    trend: trend.direction,
    trendPercentage: trend.percentage,
  };
}

function calculateProfitTrend(orders: OrderProfitData[]): { direction: "up" | "down" | "stable"; percentage: number } {
  if (orders.length < 2) return { direction: "stable", percentage: 0 };

  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const prev7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  let recentProfit = 0;
  let recentCount = 0;
  let prevProfit = 0;
  let prevCount = 0;

  for (const order of orders) {
    const orderDate = new Date(order.orderDate);
    if (orderDate >= last7Days) {
      recentProfit += order.netProfit;
      recentCount++;
    } else if (orderDate >= prev7Days) {
      prevProfit += order.netProfit;
      prevCount++;
    }
  }

  if (recentCount === 0 || prevCount === 0) return { direction: "stable", percentage: 0 };

  const recentAvg = recentProfit / recentCount;
  const prevAvg = prevProfit / prevCount;

  if (prevAvg === 0) return { direction: recentAvg > 0 ? "up" : "stable", percentage: 0 };

  const change = ((recentAvg - prevAvg) / Math.abs(prevAvg)) * 100;
  const direction = change > 5 ? "up" : change < -5 ? "down" : "stable";

  return { direction, percentage: +Math.abs(change).toFixed(1) };
}

export function generateProfitAlerts(orders: OrderProfitData[], settings?: {
  lowMarginThreshold?: number;
  highRefundRateThreshold?: number;
  lossWarningEnabled?: boolean;
}): ProfitAlert[] {
  const alerts: ProfitAlert[] = [];
  const lowMarginThreshold = settings?.lowMarginThreshold ?? 10;
  const highRefundRateThreshold = settings?.highRefundRateThreshold ?? 5;

  const summary = generateProfitSummary(orders);

  if (summary.profitMargin < lowMarginThreshold && summary.totalOrders > 0) {
    alerts.push({
      id: `alert_${Date.now()}_low_margin`,
      type: "low_margin",
      title: "Low Profit Margin",
      message: `Current profit margin is ${summary.profitMargin}%, which is below the ${lowMarginThreshold}% threshold`,
      severity: summary.profitMargin < 0 ? "critical" : "warning",
      value: summary.profitMargin,
      threshold: lowMarginThreshold,
      createdAt: new Date().toISOString(),
    });
  }

  if (summary.refundRate > highRefundRateThreshold) {
    alerts.push({
      id: `alert_${Date.now()}_high_refund`,
      type: "high_refund",
      title: "High Refund Rate",
      message: `Refund rate is ${summary.refundRate}%, which is above the ${highRefundRateThreshold}% threshold`,
      severity: summary.refundRate > 10 ? "critical" : "warning",
      value: summary.refundRate,
      threshold: highRefundRateThreshold,
      createdAt: new Date().toISOString(),
    });
  }

  if (settings?.lossWarningEnabled !== false) {
    for (const order of orders) {
      if (order.netProfit < 0 && order.status !== "refunded") {
        alerts.push({
          id: `alert_${Date.now()}_loss_${order.orderId}`,
          type: "loss_warning",
          title: "Order Loss Detected",
          message: `Order ${order.orderId} has a loss of $${Math.abs(order.netProfit).toFixed(2)}`,
          severity: "warning",
          orderId: order.orderId,
          value: order.netProfit,
          threshold: 0,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return alerts;
}

export function calculateProfitByProduct(orders: OrderProfitData[]): Array<{
  productTitle: string;
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  profitMargin: number;
  avgProfitPerOrder: number;
}> {
  const productMap = new Map<string, {
    productTitle: string;
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
  }>();

  for (const order of orders) {
    const existing = productMap.get(order.productTitle) || {
      productTitle: order.productTitle,
      totalRevenue: 0,
      totalProfit: 0,
      totalOrders: 0,
    };

    existing.totalRevenue += order.revenue;
    existing.totalProfit += order.netProfit;
    existing.totalOrders++;

    productMap.set(order.productTitle, existing);
  }

  return Array.from(productMap.values())
    .map((p) => ({
      ...p,
      profitMargin: p.totalRevenue > 0 ? +((p.totalProfit / p.totalRevenue) * 100).toFixed(1) : 0,
      avgProfitPerOrder: p.totalOrders > 0 ? +(p.totalProfit / p.totalOrders).toFixed(2) : 0,
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit);
}

export function calculateProfitByPlatform(orders: OrderProfitData[]): Array<{
  platform: string;
  totalRevenue: number;
  totalProfit: number;
  totalOrders: number;
  profitMargin: number;
}> {
  const platformMap = new Map<string, {
    platform: string;
    totalRevenue: number;
    totalProfit: number;
    totalOrders: number;
  }>();

  for (const order of orders) {
    const existing = platformMap.get(order.platform) || {
      platform: order.platform,
      totalRevenue: 0,
      totalProfit: 0,
      totalOrders: 0,
    };

    existing.totalRevenue += order.revenue;
    existing.totalProfit += order.netProfit;
    existing.totalOrders++;

    platformMap.set(order.platform, existing);
  }

  return Array.from(platformMap.values())
    .map((p) => ({
      ...p,
      profitMargin: p.totalRevenue > 0 ? +((p.totalProfit / p.totalRevenue) * 100).toFixed(1) : 0,
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit);
}
