import type { ProductLifecycle, LifecycleSnapshot, LifecycleAlert, LifecycleStage } from "@/types/product";

function rand(min: number, max: number) {
  return +(min + Math.random() * (max - min)).toFixed(1);
}

function generateSnapshots(days: number, stage: LifecycleStage): LifecycleSnapshot[] {
  const snapshots: LifecycleSnapshot[] = [];
  const now = new Date();
  const stageMultipliers: Record<LifecycleStage, { orders: number; revenue: number; competition: number }> = {
    discovery: { orders: 2, revenue: 50, competition: 5 },
    testing: { orders: 8, revenue: 200, competition: 12 },
    winning: { orders: 25, revenue: 800, competition: 20 },
    scaling: { orders: 50, revenue: 1800, competition: 35 },
    saturation: { orders: 35, revenue: 1200, competition: 60 },
    sunset: { orders: 10, revenue: 300, competition: 45 },
  };
  const m = stageMultipliers[stage];

  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const growth = stage === "scaling" ? 1 + (days - d) * 0.02 : stage === "sunset" ? 0.5 + d * 0.01 : 1;
    snapshots.push({
      date: date.toISOString().split("T")[0],
      stage,
      orders: Math.floor(m.orders * growth * rand(0.8, 1.2)),
      revenue: +(m.revenue * growth * rand(0.8, 1.2)).toFixed(2),
      profit: +(m.revenue * growth * rand(0.3, 0.6)).toFixed(2),
      competitionCount: Math.floor(m.competition * rand(0.8, 1.3)),
      searchVolume: Math.floor(m.revenue * rand(10, 30)),
    });
  }
  return snapshots.reverse();
}

const lifecycleProducts: ProductLifecycle[] = [
  {
    id: "lc-1",
    productId: "p-1",
    productTitle: "Smart LED Strip Lights",
    productImage: "\u{1f4a1}",
    category: "Electronics",
    currentStage: "scaling",
    stageEnteredAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    daysInStage: 14,
    totalDaysTracked: 45,
    snapshots: generateSnapshots(45, "scaling"),
    metrics: { totalOrders: 342, totalRevenue: 12450, totalProfit: 6225, avgProfitMargin: 50, competitionCount: 38, searchVolume: 45000, trendDirection: "rising" },
    alerts: [
      { id: "la-1", type: "stage_transition", severity: "info", title: "Entered Scaling Phase", description: "Product moved from Winning to Scaling stage. Order velocity increased 120% over 2 weeks.", detectedAt: new Date(Date.now() - 14 * 86400000).toISOString() },
      { id: "la-2", type: "competition_spike", severity: "warning", title: "Competition Increasing", description: "38 competitors detected (up from 20 last month). Consider differentiating your listing.", detectedAt: new Date(Date.now() - 3 * 86400000).toISOString() },
    ],
    recommendations: ["Scale ad spend by 30% while margins hold", "Add product variations to capture more market", "Monitor competitor pricing weekly"],
  },
  {
    id: "lc-2",
    productId: "p-2",
    productTitle: "Posture Corrector Belt",
    productImage: "\u{1f9d8}",
    category: "Health",
    currentStage: "winning",
    stageEnteredAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    daysInStage: 21,
    totalDaysTracked: 60,
    snapshots: generateSnapshots(60, "winning"),
    metrics: { totalOrders: 189, totalRevenue: 7560, totalProfit: 4158, avgProfitMargin: 55, competitionCount: 18, searchVolume: 32000, trendDirection: "rising" },
    alerts: [
      { id: "la-3", type: "stage_transition", severity: "info", title: "Entered Winning Phase", description: "Consistent daily orders and positive ROI for 3+ weeks.", detectedAt: new Date(Date.now() - 21 * 86400000).toISOString() },
    ],
    recommendations: ["Start scaling ad budget gradually", "Test higher price points", "Build email list from buyers"],
  },
  {
    id: "lc-3",
    productId: "p-3",
    productTitle: "Portable Mini Projector",
    productImage: "\u{1f4f1}",
    category: "Electronics",
    currentStage: "saturation",
    stageEnteredAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    daysInStage: 10,
    totalDaysTracked: 90,
    snapshots: generateSnapshots(90, "saturation"),
    metrics: { totalOrders: 156, totalRevenue: 8580, totalProfit: 2574, avgProfitMargin: 30, competitionCount: 55, searchVolume: 28000, trendDirection: "declining" },
    alerts: [
      { id: "la-4", type: "competition_spike", severity: "critical", title: "Market Saturated", description: "Competition increased 40% this month. 55 active sellers. Profit margins declining.", detectedAt: new Date(Date.now() - 5 * 86400000).toISOString() },
      { id: "la-5", type: "profit_decline", severity: "warning", title: "Profit Margins Shrinking", description: "Avg margin dropped from 45% to 30% over 4 weeks due to price wars.", detectedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    ],
    recommendations: ["Consider sunsetting within 2-3 weeks", "Reduce ad spend to preserve remaining margin", "Find replacement product in similar category"],
  },
  {
    id: "lc-4",
    productId: "p-4",
    productTitle: "Wireless Earbuds Pro",
    productImage: "\u{1f3a7}",
    category: "Electronics",
    currentStage: "testing",
    stageEnteredAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    daysInStage: 7,
    totalDaysTracked: 14,
    snapshots: generateSnapshots(14, "testing"),
    metrics: { totalOrders: 28, totalRevenue: 980, totalProfit: 392, avgProfitMargin: 40, competitionCount: 15, searchVolume: 18000, trendDirection: "stable" },
    alerts: [
      { id: "la-6", type: "stage_transition", severity: "info", title: "Testing Phase Started", description: "Initial sales data coming in. Running test ads to validate demand.", detectedAt: new Date(Date.now() - 7 * 86400000).toISOString() },
    ],
    recommendations: ["Run A/B tests on ad creatives", "Test different price points ($29.99 vs $34.99)", "Collect first 20 reviews before scaling"],
  },
  {
    id: "lc-5",
    productId: "p-5",
    productTitle: "Car Phone Mount",
    productImage: "\u{1f697}",
    category: "Auto",
    currentStage: "sunset",
    stageEnteredAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    daysInStage: 20,
    totalDaysTracked: 120,
    snapshots: generateSnapshots(120, "sunset"),
    metrics: { totalOrders: 89, totalRevenue: 2670, totalProfit: 801, avgProfitMargin: 30, competitionCount: 42, searchVolume: 8000, trendDirection: "declining" },
    alerts: [
      { id: "la-7", type: "sunset_warning", severity: "critical", title: "Recommended: Sunset Product", description: "Declining orders, shrinking margins, high competition. Recommend phasing out.", detectedAt: new Date(Date.now() - 10 * 86400000).toISOString() },
    ],
    recommendations: ["Reduce inventory orders", "Run final clearance sale", "Replace with Magnetic Phone Mount (rising trend)"],
  },
  {
    id: "lc-6",
    productId: "p-6",
    productTitle: "Aromatherapy Diffuser",
    productImage: "\u{1f4a8}",
    category: "Home",
    currentStage: "discovery",
    stageEnteredAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    daysInStage: 5,
    totalDaysTracked: 5,
    snapshots: generateSnapshots(5, "discovery"),
    metrics: { totalOrders: 8, totalRevenue: 320, totalProfit: 128, avgProfitMargin: 40, competitionCount: 8, searchVolume: 12000, trendDirection: "rising" },
    alerts: [],
    recommendations: ["Gather initial sales data for 2 more weeks", "Research top competitors' listings", "Order sample for quality check"],
  },
];

export function getLifecycleProducts(): ProductLifecycle[] {
  return lifecycleProducts;
}

export function getLifecycleAlerts(): LifecycleAlert[] {
  const allAlerts = lifecycleProducts.flatMap((p) =>
    p.alerts.map((a) => ({ ...a, productTitle: p.productTitle, productImage: p.productImage }))
  );
  return allAlerts.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime());
}

export function getStageDistribution() {
  const stages = ["discovery", "testing", "winning", "scaling", "saturation", "sunset"] as LifecycleStage[];
  return stages.map((stage) => ({
    stage,
    count: lifecycleProducts.filter((p) => p.currentStage === stage).length,
    products: lifecycleProducts.filter((p) => p.currentStage === stage).map((p) => p.productTitle),
  }));
}
