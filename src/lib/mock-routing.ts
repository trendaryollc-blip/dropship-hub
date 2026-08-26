import type { RoutingDecision, SupplierOption, RoutingPreferences, RoutingAnalytics, RoutingHistory } from "@/types/order";

function rand(min: number, max: number) {
  return +(min + Math.random() * (max - min)).toFixed(2);
}

const suppliers: SupplierOption[] = [
  { supplierId: "cj-us", supplierName: "CJ US Warehouse", inStock: true, stockLevel: 150, shippingDays: 2, shippingCost: 3.99, unitCost: 8.50, totalCost: 12.49, qualityScore: 92, location: "US", reliabilityScore: 94, totalScore: 0, selected: false },
  { supplierId: "cj-china", supplierName: "CJ China", inStock: true, stockLevel: 500, shippingDays: 12, shippingCost: 1.99, unitCost: 5.20, totalCost: 7.19, qualityScore: 88, location: "China", reliabilityScore: 90, totalScore: 0, selected: false },
  { supplierId: "aliexpress", supplierName: "AliExpress", inStock: true, stockLevel: 300, shippingDays: 15, shippingCost: 1.50, unitCost: 4.80, totalCost: 6.30, qualityScore: 80, location: "China", reliabilityScore: 82, totalScore: 0, selected: false },
  { supplierId: "alibaba", supplierName: "Alibaba", inStock: true, stockLevel: 1000, shippingDays: 18, shippingCost: 1.20, unitCost: 3.90, totalCost: 5.10, qualityScore: 78, location: "China", reliabilityScore: 85, totalScore: 0, selected: false },
  { supplierId: "amazon-liquidation", supplierName: "Amazon Liquidation", inStock: false, stockLevel: 0, shippingDays: 3, shippingCost: 5.99, unitCost: 6.50, totalCost: 12.49, qualityScore: 70, location: "US", reliabilityScore: 72, totalScore: 0, selected: false },
];

const products = [
  { title: "Smart LED Strip Lights", image: "\u{1f4a1}" },
  { title: "Posture Corrector Belt", image: "\u{1f9d8}" },
  { title: "Portable Mini Projector", image: "\u{1f4f1}" },
  { title: "Wireless Earbuds Pro", image: "\u{1f3a7}" },
  { title: "Car Phone Mount", image: "\u{1f697}" },
];

const locations = ["US-CA", "US-TX", "US-NY", "US-FL", "UK", "CA", "AU", "DE"];

function calculateScore(s: SupplierOption, preference: string): number {
  let score = 0;
  const speedScore = Math.max(0, 100 - s.shippingDays * 5);
  const costScore = Math.max(0, 100 - s.shippingCost * 10);
  const qualityScore = s.qualityScore;
  const stockScore = s.inStock ? Math.min(100, s.stockLevel / 5) : 0;

  if (preference === "speed") score = speedScore * 0.4 + qualityScore * 0.3 + stockScore * 0.2 + costScore * 0.1;
  else if (preference === "cost") score = costScore * 0.4 + stockScore * 0.3 + qualityScore * 0.2 + speedScore * 0.1;
  else score = speedScore * 0.25 + costScore * 0.25 + qualityScore * 0.25 + stockScore * 0.25;

  return +score.toFixed(1);
}

function generateDecisions(count: number): RoutingDecision[] {
  const decisions: RoutingDecision[] = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const product = products[Math.floor(Math.random() * products.length)];
    const location = locations[Math.floor(Math.random() * locations.length)];
    const preferences: ("speed" | "cost" | "balanced")[] = ["speed", "cost", "balanced"];
    const pref = preferences[Math.floor(Math.random() * preferences.length)];

    const options = suppliers.map((s) => ({
      ...s,
      totalScore: calculateScore(s, pref),
      selected: false,
      rejectionReason: s.inStock ? undefined : "Out of stock",
    }));

    const sorted = [...options].sort((a, b) => b.totalScore - a.totalScore);
    const selected = sorted[0];
    selected.selected = true;
    const alternatives = sorted.slice(1, 4);

    const date = new Date(now);
    date.setDate(date.getDate() - Math.floor(Math.random() * 7));
    const routedAt = new Date(date.getTime() + Math.random() * 86400000);

    decisions.push({
      id: `route-${i}`,
      orderId: `#${10000 + i}`,
      orderDate: date.toISOString().split("T")[0],
      customerName: ["Sarah M.", "James W.", "Emily C.", "Michael B.", "Lisa A.", "David L.", "Rachel G.", "Tom H."][Math.floor(Math.random() * 8)],
      customerLocation: location,
      productTitle: product.title,
      productImage: product.image,
      quantity: Math.floor(1 + Math.random() * 3),
      totalPrice: rand(24.99, 69.99),
      selectedSupplier: selected,
      alternativeSuppliers: alternatives,
      reasoning: generateReasoning(selected, location, pref),
      status: Math.random() > 0.1 ? "routed" : Math.random() > 0.5 ? "fallback" : "pending",
      routedAt: routedAt.toISOString(),
      estimatedDelivery: new Date(routedAt.getTime() + selected.shippingDays * 86400000).toISOString().split("T")[0],
      shippingCost: selected.shippingCost,
      totalCost: selected.unitCost + selected.shippingCost,
    });
  }
  return decisions.sort((a, b) => new Date(b.routedAt).getTime() - new Date(a.routedAt).getTime());
}

function generateReasoning(supplier: SupplierOption, location: string, pref: string): string {
  const isUS = location.startsWith("US");
  if (supplier.location === "US" && isUS) {
    return `Customer in ${supplier.location}. ${supplier.supplierName} has stock (${supplier.stockLevel} units) with ${supplier.shippingDays}-day delivery. Selected for fastest domestic shipping.`;
  }
  if (pref === "speed") {
    return `Speed optimization: ${supplier.supplierName} offers ${supplier.shippingDays}-day shipping at $${supplier.shippingCost}. Quality score: ${supplier.qualityScore}/100.`;
  }
  if (pref === "cost") {
    return `Cost optimization: ${supplier.supplierName} has lowest total cost ($${supplier.unitCost} + $${supplier.shippingCost} shipping). ${supplier.shippingDays}-day delivery.`;
  }
  return `Balanced selection: ${supplier.supplierName} scored ${supplier.totalScore}/100 across speed, cost, quality, and stock metrics.`;
}

const decisions = generateDecisions(20);

export function getRoutingDecisions(): RoutingDecision[] {
  return decisions;
}

export function getRoutingPreferences(): RoutingPreferences {
  return { optimization: "balanced", maxShippingDays: 14, minQualityScore: 75, preferLocalWarehouse: true, autoFallback: true, maxFallbackAttempts: 3 };
}

export function getRoutingAnalytics(): RoutingAnalytics {
  return {
    totalRouted: decisions.length,
    avgShippingDays: +(decisions.reduce((sum, d) => sum + d.selectedSupplier.shippingDays, 0) / decisions.length).toFixed(1),
    avgCost: +(decisions.reduce((sum, d) => sum + d.totalCost, 0) / decisions.length).toFixed(2),
    supplierDistribution: [
      { name: "CJ US Warehouse", count: decisions.filter((d) => d.selectedSupplier.supplierId === "cj-us").length, color: "#22c55e" },
      { name: "CJ China", count: decisions.filter((d) => d.selectedSupplier.supplierId === "cj-china").length, color: "#3b82f6" },
      { name: "AliExpress", count: decisions.filter((d) => d.selectedSupplier.supplierId === "aliexpress").length, color: "#a855f7" },
      { name: "Alibaba", count: decisions.filter((d) => d.selectedSupplier.supplierId === "alibaba").length, color: "#f59e0b" },
      { name: "Amazon Liquidation", count: decisions.filter((d) => d.selectedSupplier.supplierId === "amazon-liquidation").length, color: "#ef4444" },
    ].filter((s) => s.count > 0),
    optimizationBreakdown: [
      { type: "Speed", count: decisions.filter((_, i) => i % 3 === 0).length },
      { type: "Cost", count: decisions.filter((_, i) => i % 3 === 1).length },
      { type: "Balanced", count: decisions.filter((_, i) => i % 3 === 2).length },
    ],
    costSavings: +(decisions.reduce((sum, d) => {
      const worst = d.alternativeSuppliers[0];
      return sum + (worst ? worst.unitCost + worst.shippingCost - d.totalCost : 0);
    }, 0)).toFixed(2),
    timeSavings: +(decisions.reduce((sum, d) => {
      const worst = d.alternativeSuppliers[0];
      return sum + (worst ? worst.shippingDays - d.selectedSupplier.shippingDays : 0);
    }, 0) / decisions.length).toFixed(1),
  };
}

export function getRoutingHistory(): RoutingHistory[] {
  return decisions.slice(0, 15).map((d) => ({
    id: d.id,
    orderId: d.orderId,
    productTitle: d.productTitle,
    customerLocation: d.customerLocation,
    selectedSupplier: d.selectedSupplier.supplierName,
    shippingDays: d.selectedSupplier.shippingDays,
    shippingCost: d.selectedSupplier.shippingCost,
    reason: d.reasoning,
    routedAt: d.routedAt,
  }));
}
