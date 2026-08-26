import type { SupplierPerformance, SupplierAlert, SupplierMetricSnapshot } from "@/types/supplier";

function rand(min: number, max: number) {
  return +(min + Math.random() * (max - min)).toFixed(1);
}

function generateSnapshots(days: number, baseReliability: number, baseRefund: number, baseShipping: number, baseComplaint: number, baseStock: number): SupplierMetricSnapshot[] {
  const snapshots: SupplierMetricSnapshot[] = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const drift = (d / days) * 2;
    snapshots.push({
      date: date.toISOString().split("T")[0],
      reliabilityScore: +(baseReliability - drift + rand(-2, 2)).toFixed(1),
      refundRate: +(baseRefund + drift * 0.3 + rand(-0.5, 0.5)).toFixed(1),
      shippingDays: +(baseShipping + drift * 0.2 + rand(-1, 1)).toFixed(0) as unknown as number,
      complaintRate: +(baseComplaint + drift * 0.1 + rand(-0.2, 0.2)).toFixed(1),
      stockReliability: +(baseStock - drift * 0.5 + rand(-2, 2)).toFixed(1),
      orders: Math.floor(20 + Math.random() * 30),
    });
  }
  return snapshots.reverse();
}

const supplierData: SupplierPerformance[] = [
  {
    supplierId: "cj-dropshipping",
    supplierName: "CJ Dropshipping",
    reliabilityScore: 94.2,
    reliabilityTrend: 1.5,
    refundRate: 2.1,
    refundRateTrend: -0.3,
    avgShippingDays: 8,
    shippingTrend: -0.5,
    complaintRate: 1.8,
    complaintTrend: -0.2,
    stockReliability: 96.5,
    stockTrend: 0.8,
    communicationScore: 92,
    qualityScore: 90,
    totalOrders: 847,
    responseTimeHours: 2.1,
    dailySnapshots: generateSnapshots(30, 94, 2.1, 8, 1.8, 96.5),
    status: "excellent",
  },
  {
    supplierId: "aliexpress",
    supplierName: "AliExpress",
    reliabilityScore: 81.5,
    reliabilityTrend: -2.3,
    refundRate: 5.8,
    refundRateTrend: 1.2,
    avgShippingDays: 16,
    shippingTrend: 2.1,
    complaintRate: 4.2,
    complaintTrend: 0.8,
    stockReliability: 78.3,
    stockTrend: -3.1,
    communicationScore: 75,
    qualityScore: 78,
    totalOrders: 423,
    responseTimeHours: 8.5,
    dailySnapshots: generateSnapshots(30, 84, 4.5, 14, 3.4, 82),
    status: "warning",
  },
  {
    supplierId: "alibaba",
    supplierName: "Alibaba",
    reliabilityScore: 88.7,
    reliabilityTrend: 0.5,
    refundRate: 3.2,
    refundRateTrend: 0.1,
    avgShippingDays: 12,
    shippingTrend: 0.3,
    complaintRate: 2.5,
    complaintTrend: 0.0,
    stockReliability: 91.2,
    stockTrend: 0.2,
    communicationScore: 85,
    qualityScore: 87,
    totalOrders: 312,
    responseTimeHours: 4.2,
    dailySnapshots: generateSnapshots(30, 88, 3.2, 12, 2.5, 91),
    status: "good",
  },
  {
    supplierId: "amazon-liquidation",
    supplierName: "Amazon Liquidation",
    reliabilityScore: 76.3,
    reliabilityTrend: -4.1,
    refundRate: 8.4,
    refundRateTrend: 2.8,
    avgShippingDays: 6,
    shippingTrend: 0.5,
    complaintRate: 5.7,
    complaintTrend: 1.9,
    stockReliability: 65.8,
    stockTrend: -5.2,
    communicationScore: 68,
    qualityScore: 72,
    totalOrders: 189,
    responseTimeHours: 12.3,
    dailySnapshots: generateSnapshots(30, 82, 5.5, 5, 3.8, 72),
    status: "critical",
  },
  {
    supplierId: "temu-direct",
    supplierName: "Temu Direct",
    reliabilityScore: 85.1,
    reliabilityTrend: 3.2,
    refundRate: 4.1,
    refundRateTrend: -1.5,
    avgShippingDays: 10,
    shippingTrend: -1.8,
    complaintRate: 3.1,
    complaintTrend: -0.9,
    stockReliability: 88.4,
    stockTrend: 2.5,
    communicationScore: 80,
    qualityScore: 82,
    totalOrders: 256,
    responseTimeHours: 5.8,
    dailySnapshots: generateSnapshots(30, 82, 5.5, 12, 4.0, 85),
    status: "good",
  },
];

export function getSupplierPerformances(): SupplierPerformance[] {
  return supplierData;
}

export function getSupplierAlerts(): SupplierAlert[] {
  return [
    {
      id: "alert-1",
      supplierId: "amazon-liquidation",
      supplierName: "Amazon Liquidation",
      type: "quality_degradation",
      severity: "high",
      title: "Quality Score Dropping",
      description: "Amazon Liquidation's reliability score dropped from 82 to 76.3 over the past 30 days (-4.1%). Refund rate increased to 8.4%.",
      metric: "Reliability Score",
      previousValue: 82,
      currentValue: 76.3,
      changePercent: -7,
      recommendation: "Consider reducing order volume and evaluating alternative suppliers. Check CJ Dropshipping for similar products.",
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "alert-2",
      supplierId: "amazon-liquidation",
      supplierName: "Amazon Liquidation",
      type: "refund_spike",
      severity: "high",
      title: "Refund Rate Spike",
      description: "Refund rate increased from 5.5% to 8.4% this month (+52.7%). This significantly impacts profit margins.",
      metric: "Refund Rate",
      previousValue: 5.5,
      currentValue: 8.4,
      changePercent: 52.7,
      recommendation: "Investigate root cause - likely quality or description accuracy issues. Pause new orders until resolved.",
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "alert-3",
      supplierId: "aliexpress",
      supplierName: "AliExpress",
      type: "shipping_delay",
      severity: "medium",
      title: "Shipping Times Increasing",
      description: "Average shipping time increased from 14 to 16 days (+14.3%). Multiple suppliers reporting delays.",
      metric: "Avg Shipping Days",
      previousValue: 14,
      currentValue: 16,
      changePercent: 14.3,
      recommendation: "Update customer-facing shipping estimates. Consider CJ US warehouse for time-sensitive orders.",
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "alert-4",
      supplierId: "aliexpress",
      supplierName: "AliExpress",
      type: "stock_low",
      severity: "medium",
      title: "Stock Reliability Declining",
      description: "Stock reliability dropped from 82% to 78.3%. More out-of-stock incidents than usual.",
      metric: "Stock Reliability",
      previousValue: 82,
      currentValue: 78.3,
      changePercent: -4.5,
      recommendation: "Monitor top-selling products closely. Set up automatic reorder alerts.",
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "alert-5",
      supplierId: "temu-direct",
      supplierName: "Temu Direct",
      type: "quality_degradation",
      severity: "low",
      title: "Performance Improving",
      description: "Temu Direct reliability score improved from 82 to 85.1 (+3.2%). Refund rate decreasing.",
      metric: "Reliability Score",
      previousValue: 82,
      currentValue: 85.1,
      changePercent: 3.9,
      recommendation: "Good trend! Consider increasing order volume for cost savings.",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
  ];
}

export function getSupplierComparison() {
  return supplierData.map((s) => ({
    name: s.supplierName,
    reliabilityScore: s.reliabilityScore,
    refundRate: s.refundRate,
    avgShippingDays: s.avgShippingDays,
    complaintRate: s.complaintRate,
    stockReliability: s.stockReliability,
    priceCompetitiveness: s.totalOrders > 500 ? 90 : s.totalOrders > 200 ? 75 : 60,
    totalOrders: s.totalOrders,
  }));
}
