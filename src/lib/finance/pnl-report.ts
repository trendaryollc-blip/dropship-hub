export interface PnLReport {
  id: string;
  period: {
    startDate: string;
    endDate: string;
    label: string;
  };
  revenue: {
    totalSales: number;
    refunds: number;
    netRevenue: number;
  };
  costs: {
    cogs: number;
    shipping: number;
    platformFees: number;
    paymentProcessing: number;
    adSpend: number;
    otherCosts: number;
    totalCosts: number;
  };
  profit: {
    grossProfit: number;
    operatingExpenses: number;
    operatingProfit: number;
    netProfit: number;
    profitMargin: number;
  };
  metrics: {
    totalOrders: number;
    avgOrderValue: number;
    avgOrderProfit: number;
    refundRate: number;
    customerAcquisitionCost: number;
    returnOnAdSpend: number;
  };
  breakdown: {
    byProduct: ProductBreakdown[];
    byPlatform: PlatformBreakdown[];
    bySupplier: SupplierBreakdown[];
  };
  generatedAt: string;
  format: "pdf" | "csv" | "json";
}

export interface ProductBreakdown {
  productId: string;
  productTitle: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  orders: number;
}

export interface PlatformBreakdown {
  platform: string;
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  orders: number;
}

export interface SupplierBreakdown {
  supplierId: string;
  supplierName: string;
  costs: number;
  orders: number;
  avgCostPerOrder: number;
}

export interface PnLReportInput {
  startDate: string;
  endDate: string;
  includeBreakdown?: boolean;
  format?: "pdf" | "csv" | "json";
}

const reports: Map<string, PnLReport> = new Map();

export function generatePnLReport(input: PnLReportInput, data: {
  orders: Array<{
    orderId: string;
    orderDate: string;
    revenue: number;
    cogs: number;
    shippingCost: number;
    platformFee: number;
    paymentProcessing: number;
    refunds: number;
    adSpend: number;
    otherCosts: number;
    productTitle: string;
    productId: string;
    platform: string;
    supplierId: string;
    supplierName: string;
    status: string;
  }>;
}): PnLReport {
  const { startDate, endDate, includeBreakdown = true, format = "json" } = input;
  const { orders } = data;

  const filteredOrders = orders.filter(
    (o) => o.orderDate >= startDate && o.orderDate <= endDate && o.status !== "refunded"
  );

  const allOrdersInRange = orders.filter(
    (o) => o.orderDate >= startDate && o.orderDate <= endDate
  );

  const totalSales = filteredOrders.reduce((sum, o) => sum + o.revenue, 0);
  const refunds = allOrdersInRange.reduce((sum, o) => sum + o.refunds, 0);
  const netRevenue = totalSales - refunds;

  const cogs = filteredOrders.reduce((sum, o) => sum + o.cogs, 0);
  const shipping = filteredOrders.reduce((sum, o) => sum + o.shippingCost, 0);
  const platformFees = filteredOrders.reduce((sum, o) => sum + o.platformFee, 0);
  const paymentProcessing = filteredOrders.reduce((sum, o) => sum + o.paymentProcessing, 0);
  const adSpend = filteredOrders.reduce((sum, o) => sum + o.adSpend, 0);
  const otherCosts = filteredOrders.reduce((sum, o) => sum + o.otherCosts, 0);
  const totalCosts = cogs + shipping + platformFees + paymentProcessing + adSpend + otherCosts;

  const grossProfit = netRevenue - cogs - shipping;
  const operatingExpenses = platformFees + paymentProcessing + adSpend + otherCosts;
  const operatingProfit = grossProfit - operatingExpenses;
  const netProfit = operatingProfit;
  const profitMargin = netRevenue > 0 ? +((netProfit / netRevenue) * 100).toFixed(1) : 0;

  const totalOrders = filteredOrders.length;
  const avgOrderValue = totalOrders > 0 ? +(netRevenue / totalOrders).toFixed(2) : 0;
  const avgOrderProfit = totalOrders > 0 ? +(netProfit / totalOrders).toFixed(2) : 0;
  const refundRate = orders.length > 0 ? +((orders.filter((o) => o.status === "refunded").length / orders.length) * 100).toFixed(1) : 0;
  const customerAcquisitionCost = totalOrders > 0 ? +(adSpend / totalOrders).toFixed(2) : 0;
  const returnOnAdSpend = adSpend > 0 ? +(netRevenue / adSpend).toFixed(2) : 0;

  const report: PnLReport = {
    id: `pnl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    period: {
      startDate,
      endDate,
      label: formatDateRange(startDate, endDate),
    },
    revenue: {
      totalSales: +totalSales.toFixed(2),
      refunds: +refunds.toFixed(2),
      netRevenue: +netRevenue.toFixed(2),
    },
    costs: {
      cogs: +cogs.toFixed(2),
      shipping: +shipping.toFixed(2),
      platformFees: +platformFees.toFixed(2),
      paymentProcessing: +paymentProcessing.toFixed(2),
      adSpend: +adSpend.toFixed(2),
      otherCosts: +otherCosts.toFixed(2),
      totalCosts: +totalCosts.toFixed(2),
    },
    profit: {
      grossProfit: +grossProfit.toFixed(2),
      operatingExpenses: +operatingExpenses.toFixed(2),
      operatingProfit: +operatingProfit.toFixed(2),
      netProfit: +netProfit.toFixed(2),
      profitMargin,
    },
    metrics: {
      totalOrders,
      avgOrderValue,
      avgOrderProfit,
      refundRate,
      customerAcquisitionCost,
      returnOnAdSpend,
    },
    breakdown: includeBreakdown
      ? generateBreakdown(filteredOrders)
      : { byProduct: [], byPlatform: [], bySupplier: [] },
    generatedAt: new Date().toISOString(),
    format,
  };

  reports.set(report.id, report);
  return report;
}

function generateBreakdown(orders: Array<{
  orderId: string;
  orderDate: string;
  revenue: number;
  cogs: number;
  shippingCost: number;
  platformFee: number;
  paymentProcessing: number;
  refunds: number;
  adSpend: number;
  otherCosts: number;
  productTitle: string;
  productId: string;
  platform: string;
  supplierId: string;
  supplierName: string;
  status: string;
}>): PnLReport["breakdown"] {
  const productMap = new Map<string, ProductBreakdown>();
  const platformMap = new Map<string, PlatformBreakdown>();
  const supplierMap = new Map<string, SupplierBreakdown>();

  for (const order of orders) {
    const product = productMap.get(order.productId) || {
      productId: order.productId,
      productTitle: order.productTitle,
      revenue: 0,
      costs: 0,
      profit: 0,
      margin: 0,
      orders: 0,
    };
    product.revenue += order.revenue;
    product.costs += order.cogs + order.shippingCost;
    product.profit += order.revenue - order.cogs - order.shippingCost - order.platformFee - order.paymentProcessing - order.adSpend - order.otherCosts;
    product.orders++;
    product.margin = product.revenue > 0 ? +((product.profit / product.revenue) * 100).toFixed(1) : 0;
    productMap.set(order.productId, product);

    const platform = platformMap.get(order.platform) || {
      platform: order.platform,
      revenue: 0,
      costs: 0,
      profit: 0,
      margin: 0,
      orders: 0,
    };
    platform.revenue += order.revenue;
    platform.costs += order.cogs + order.shippingCost + order.platformFee + order.paymentProcessing + order.adSpend + order.otherCosts;
    platform.profit += order.revenue - platform.costs;
    platform.orders++;
    platform.margin = platform.revenue > 0 ? +((platform.profit / platform.revenue) * 100).toFixed(1) : 0;
    platformMap.set(order.platform, platform);

    const supplier = supplierMap.get(order.supplierId) || {
      supplierId: order.supplierId,
      supplierName: order.supplierName,
      costs: 0,
      orders: 0,
      avgCostPerOrder: 0,
    };
    supplier.costs += order.cogs + order.shippingCost;
    supplier.orders++;
    supplier.avgCostPerOrder = supplier.orders > 0 ? +(supplier.costs / supplier.orders).toFixed(2) : 0;
    supplierMap.set(order.supplierId, supplier);
  }

  return {
    byProduct: Array.from(productMap.values()).sort((a, b) => b.profit - a.profit),
    byPlatform: Array.from(platformMap.values()).sort((a, b) => b.profit - a.profit),
    bySupplier: Array.from(supplierMap.values()).sort((a, b) => a.avgCostPerOrder - b.avgCostPerOrder),
  };
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
  return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}`;
}

export function getReport(id: string): PnLReport | null {
  return reports.get(id) || null;
}

export function getAllReports(limit: number = 20): PnLReport[] {
  return Array.from(reports.values())
    .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
    .slice(0, limit);
}

export function deleteReport(id: string): boolean {
  return reports.delete(id);
}

export function exportReportToCSV(report: PnLReport): string {
  const lines: string[] = [];

  lines.push("P&L Report");
  lines.push(`Period,${report.period.label}`);
  lines.push(`Generated,${report.generatedAt}`);
  lines.push("");

  lines.push("Revenue");
  lines.push(`Total Sales,$${report.revenue.totalSales}`);
  lines.push(`Refunds,$${report.revenue.refunds}`);
  lines.push(`Net Revenue,$${report.revenue.netRevenue}`);
  lines.push("");

  lines.push("Costs");
  lines.push(`COGS,$${report.costs.cogs}`);
  lines.push(`Shipping,$${report.costs.shipping}`);
  lines.push(`Platform Fees,$${report.costs.platformFees}`);
  lines.push(`Payment Processing,$${report.costs.paymentProcessing}`);
  lines.push(`Ad Spend,$${report.costs.adSpend}`);
  lines.push(`Other Costs,$${report.costs.otherCosts}`);
  lines.push(`Total Costs,$${report.costs.totalCosts}`);
  lines.push("");

  lines.push("Profit");
  lines.push(`Gross Profit,$${report.profit.grossProfit}`);
  lines.push(`Operating Expenses,$${report.profit.operatingExpenses}`);
  lines.push(`Operating Profit,$${report.profit.operatingProfit}`);
  lines.push(`Net Profit,$${report.profit.netProfit}`);
  lines.push(`Profit Margin,${report.profit.profitMargin}%`);
  lines.push("");

  lines.push("Metrics");
  lines.push(`Total Orders,${report.metrics.totalOrders}`);
  lines.push(`Average Order Value,$${report.metrics.avgOrderValue}`);
  lines.push(`Average Order Profit,$${report.metrics.avgOrderProfit}`);
  lines.push(`Refund Rate,${report.metrics.refundRate}%`);
  lines.push(`Customer Acquisition Cost,$${report.metrics.customerAcquisitionCost}`);
  lines.push(`Return on Ad Spend,${report.metrics.returnOnAdSpend}x`);
  lines.push("");

  if (report.breakdown.byProduct.length > 0) {
    lines.push("Product Breakdown");
    lines.push("Product,Revenue,Costs,Profit,Margin,Orders");
    for (const p of report.breakdown.byProduct) {
      lines.push(`${p.productTitle},$${p.revenue},$${p.costs},$${p.profit},${p.margin}%,${p.orders}`);
    }
    lines.push("");
  }

  if (report.breakdown.byPlatform.length > 0) {
    lines.push("Platform Breakdown");
    lines.push("Platform,Revenue,Costs,Profit,Margin,Orders");
    for (const p of report.breakdown.byPlatform) {
      lines.push(`${p.platform},$${p.revenue},$${p.costs},$${p.profit},${p.margin}%,${p.orders}`);
    }
    lines.push("");
  }

  if (report.breakdown.bySupplier.length > 0) {
    lines.push("Supplier Breakdown");
    lines.push("Supplier,Costs,Orders,Avg Cost/Order");
    for (const s of report.breakdown.bySupplier) {
      lines.push(`${s.supplierName},$${s.costs},${s.orders},$${s.avgCostPerOrder}`);
    }
  }

  return lines.join("\n");
}

export function exportReportToPDFData(report: PnLReport): {
  title: string;
  subtitle: string;
  sections: Array<{
    title: string;
    data: Array<{ label: string; value: string | number }>;
  }>;
} {
  return {
    title: "Profit & Loss Report",
    subtitle: report.period.label,
    sections: [
      {
        title: "Revenue",
        data: [
          { label: "Total Sales", value: `$${report.revenue.totalSales.toLocaleString()}` },
          { label: "Refunds", value: `$${report.revenue.refunds.toLocaleString()}` },
          { label: "Net Revenue", value: `$${report.revenue.netRevenue.toLocaleString()}` },
        ],
      },
      {
        title: "Costs",
        data: [
          { label: "COGS", value: `$${report.costs.cogs.toLocaleString()}` },
          { label: "Shipping", value: `$${report.costs.shipping.toLocaleString()}` },
          { label: "Platform Fees", value: `$${report.costs.platformFees.toLocaleString()}` },
          { label: "Payment Processing", value: `$${report.costs.paymentProcessing.toLocaleString()}` },
          { label: "Ad Spend", value: `$${report.costs.adSpend.toLocaleString()}` },
          { label: "Other Costs", value: `$${report.costs.otherCosts.toLocaleString()}` },
          { label: "Total Costs", value: `$${report.costs.totalCosts.toLocaleString()}` },
        ],
      },
      {
        title: "Profit",
        data: [
          { label: "Gross Profit", value: `$${report.profit.grossProfit.toLocaleString()}` },
          { label: "Operating Expenses", value: `$${report.profit.operatingExpenses.toLocaleString()}` },
          { label: "Operating Profit", value: `$${report.profit.operatingProfit.toLocaleString()}` },
          { label: "Net Profit", value: `$${report.profit.netProfit.toLocaleString()}` },
          { label: "Profit Margin", value: `${report.profit.profitMargin}%` },
        ],
      },
      {
        title: "Key Metrics",
        data: [
          { label: "Total Orders", value: report.metrics.totalOrders },
          { label: "Average Order Value", value: `$${report.metrics.avgOrderValue.toLocaleString()}` },
          { label: "Average Order Profit", value: `$${report.metrics.avgOrderProfit.toLocaleString()}` },
          { label: "Refund Rate", value: `${report.metrics.refundRate}%` },
          { label: "Customer Acquisition Cost", value: `$${report.metrics.customerAcquisitionCost.toLocaleString()}` },
          { label: "Return on Ad Spend", value: `${report.metrics.returnOnAdSpend}x` },
        ],
      },
    ],
  };
}

export function validatePnLReportInput(input: PnLReportInput): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!input.startDate) {
    errors.push("Start date is required");
  }
  if (!input.endDate) {
    errors.push("End date is required");
  }
  if (input.startDate && input.endDate && new Date(input.startDate) > new Date(input.endDate)) {
    errors.push("Start date must be before end date");
  }
  if (input.format && !["pdf", "csv", "json"].includes(input.format)) {
    errors.push("Invalid format. Must be pdf, csv, or json");
  }

  return { valid: errors.length === 0, errors };
}
