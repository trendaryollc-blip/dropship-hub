import type {
  ProfitEntry,
  ProductProfitability,
  DailyProfit,
  CostBreakdownItem,
  CampaignProfit,
} from "@/types/profit";

const products = [
  { title: "Smart LED Strip Lights", image: "\u{1f4a1}", category: "Electronics" },
  { title: "Posture Corrector Belt", image: "\u{1f9d8}", category: "Health" },
  { title: "Portable Mini Projector", image: "\u{1f4f1}", category: "Electronics" },
  { title: "Wireless Earbuds Pro", image: "\u{1f3a7}", category: "Electronics" },
  { title: "Car Phone Mount", image: "\u{1f697}", category: "Auto" },
  { title: "Silicone Makeup Sponge", image: "\u2728", category: "Beauty" },
  { title: "Resistance Bands Set", image: "\u{1f3cb}", category: "Fitness" },
  { title: "Aromatherapy Diffuser", image: "\u{1f4a8}", category: "Home" },
];

const platforms = ["Amazon", "Shopify", "eBay", "Etsy"];
const suppliers = ["CJ Dropshipping", "AliExpress", "Alibaba"];
const campaigns = ["Facebook - Retargeting", "Google - Shopping", "TikTok - Spark Ads", "Instagram - Reels"];

function rand(min: number, max: number) {
  return +(min + Math.random() * (max - min)).toFixed(2);
}

function generateOrders(days: number): ProfitEntry[] {
  const orders: ProfitEntry[] = [];
  const now = new Date();

  for (let d = 0; d < days; d++) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const dateStr = date.toISOString().split("T")[0];
    const ordersPerDay = Math.floor(3 + Math.random() * 5);

    for (let o = 0; o < ordersPerDay; o++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const platform = platforms[Math.floor(Math.random() * platforms.length)];
      const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
      const campaign = campaigns[Math.floor(Math.random() * campaigns.length)];
      const revenue = rand(24.99, 69.99);
      const cogs = +(revenue * rand(0.2, 0.4)).toFixed(2);
      const shippingCost = rand(2.5, 6.99);
      const platformFee = +(revenue * 0.15).toFixed(2);
      const paymentProcessing = +(revenue * 0.029 + 0.3).toFixed(2);
      const refunds = Math.random() > 0.92 ? revenue : 0;
      const adSpend = rand(1.5, 5);
      const otherCosts = rand(0.2, 0.8);
      const totalCosts = cogs + shippingCost + platformFee + paymentProcessing + refunds + adSpend + otherCosts;
      const netProfit = +(revenue - totalCosts).toFixed(2);
      const profitMargin = revenue > 0 ? +((netProfit / revenue) * 100).toFixed(1) : 0;

      orders.push({
        id: `ord-${d}-${o}`,
        orderId: `#${10000 + d * 100 + o}`,
        date: dateStr,
        productTitle: product.title,
        productImage: product.image,
        platform,
        supplier,
        revenue,
        cogs,
        shippingCost,
        platformFee,
        paymentProcessing,
        refunds,
        adSpend,
        otherCosts,
        netProfit,
        profitMargin,
        campaignName: campaign,
        customerLocation: ["US", "UK", "CA", "AU", "DE"][Math.floor(Math.random() * 5)],
        status: refunds > 0 ? "refunded" : Math.random() > 0.1 ? "completed" : "pending",
      });
    }
  }
  return orders;
}

export const mockOrders: ProfitEntry[] = generateOrders(30);

export function getDailyProfits(orders: ProfitEntry[]): DailyProfit[] {
  const map = new Map<string, DailyProfit>();
  for (const o of orders) {
    const existing = map.get(o.date) || { date: o.date, revenue: 0, profit: 0, orders: 0, costs: 0 };
    existing.revenue += o.revenue;
    existing.profit += o.netProfit;
    existing.orders += 1;
    existing.costs += o.cogs + o.shippingCost + o.platformFee + o.paymentProcessing + o.adSpend + o.otherCosts;
    map.set(o.date, existing);
  }
  return Array.from(map.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      ...d,
      revenue: +d.revenue.toFixed(2),
      profit: +d.profit.toFixed(2),
      costs: +d.costs.toFixed(2),
    }));
}

export function getProductProfitabilities(orders: ProfitEntry[]): ProductProfitability[] {
  const map = new Map<string, ProductProfitability>();
  for (const o of orders) {
    const existing = map.get(o.productTitle) || {
      productTitle: o.productTitle,
      productImage: o.productImage,
      totalRevenue: 0,
      totalProfit: 0,
      totalOrders: 0,
      profitMargin: 0,
      trend: 0,
      status: "profitable" as const,
    };
    existing.totalRevenue += o.revenue;
    existing.totalProfit += o.netProfit;
    existing.totalOrders += 1;
    map.set(o.productTitle, existing);
  }
  return Array.from(map.values())
    .map((p) => ({
      ...p,
      totalRevenue: +p.totalRevenue.toFixed(2),
      totalProfit: +p.totalProfit.toFixed(2),
      profitMargin: p.totalRevenue > 0 ? +((p.totalProfit / p.totalRevenue) * 100).toFixed(1) : 0,
      trend: +rand(-15, 25),
      status: (p.totalProfit > 0 ? "profitable" : p.totalProfit > -10 ? "breakeven" : "losing") as "profitable" | "breakeven" | "losing",
    }))
    .sort((a, b) => b.totalProfit - a.totalProfit);
}

export function getCostBreakdown(orders: ProfitEntry[]): CostBreakdownItem[] {
  let cogs = 0, shipping = 0, platformFees = 0, payment = 0, refunds = 0, ads = 0, other = 0;
  for (const o of orders) {
    cogs += o.cogs;
    shipping += o.shippingCost;
    platformFees += o.platformFee;
    payment += o.paymentProcessing;
    refunds += o.refunds;
    ads += o.adSpend;
    other += o.otherCosts;
  }
  const total = cogs + shipping + platformFees + payment + refunds + ads + other || 1;
  return [
    { name: "COGS", value: +cogs.toFixed(2), pct: +((cogs / total) * 100).toFixed(1), color: "#3b82f6" },
    { name: "Shipping", value: +shipping.toFixed(2), pct: +((shipping / total) * 100).toFixed(1), color: "#f97316" },
    { name: "Platform Fees", value: +platformFees.toFixed(2), pct: +((platformFees / total) * 100).toFixed(1), color: "#a855f7" },
    { name: "Payment Processing", value: +payment.toFixed(2), pct: +((payment / total) * 100).toFixed(1), color: "#eab308" },
    { name: "Refunds", value: +refunds.toFixed(2), pct: +((refunds / total) * 100).toFixed(1), color: "#ef4444" },
    { name: "Ad Spend", value: +ads.toFixed(2), pct: +((ads / total) * 100).toFixed(1), color: "#ec4899" },
    { name: "Other", value: +other.toFixed(2), pct: +((other / total) * 100).toFixed(1), color: "#6b7280" },
  ];
}

export function getCampaignProfits(orders: ProfitEntry[]): CampaignProfit[] {
  const map = new Map<string, CampaignProfit>();
  for (const o of orders) {
    const name = o.campaignName || "Organic";
    const existing = map.get(name) || { campaignName: name, adSpend: 0, revenue: 0, profit: 0, roas: 0, orders: 0 };
    existing.adSpend += o.adSpend;
    existing.revenue += o.revenue;
    existing.profit += o.netProfit;
    existing.orders += 1;
    map.set(name, existing);
  }
  return Array.from(map.values())
    .map((c) => ({
      ...c,
      adSpend: +c.adSpend.toFixed(2),
      revenue: +c.revenue.toFixed(2),
      profit: +c.profit.toFixed(2),
      roas: c.adSpend > 0 ? +(c.revenue / c.adSpend).toFixed(2) : 0,
    }))
    .sort((a, b) => b.profit - a.profit);
}
