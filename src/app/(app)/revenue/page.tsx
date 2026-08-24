"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Package,
  BarChart3,
  Target,
  Download,
  ChevronRight,
  Truck,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { revenueData } from "@/lib/mock-dashboard";

// ─── Types ───────────────────────────────────────────────────────────────────

type Timeframe = "7d" | "30d" | "90d";

interface CategoryBreakdown {
  name: string;
  revenue: number;
  orders: number;
  margin: number;
  trend: number;
  color: string;
}

interface TopProduct {
  name: string;
  image: string;
  revenue: number;
  orders: number;
  margin: number;
  platform: string;
}

interface MonthlyComparison {
  month: string;
  revenue: number;
  profit: number;
  orders: number;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const categoryData: CategoryBreakdown[] = [
  { name: "Electronics", revenue: 1650, orders: 8, margin: 72, trend: 24, color: "#3b82f6" },
  { name: "Fashion", revenue: 980, orders: 5, margin: 68, trend: 18, color: "#a855f7" },
  { name: "Home & Garden", revenue: 720, orders: 4, margin: 65, trend: -5, color: "#22c55e" },
  { name: "Beauty", revenue: 540, orders: 3, margin: 78, trend: 32, color: "#f59e0b" },
  { name: "Toys & Games", revenue: 360, orders: 3, margin: 61, trend: 8, color: "#ef4444" },
];

const topProducts: TopProduct[] = [
  { name: "Smart LED Strip Lights", image: "💡", revenue: 580, orders: 3, margin: 74, platform: "Amazon" },
  { name: "Posture Corrector Belt", image: "🧘", revenue: 420, orders: 2, margin: 82, platform: "Shopify" },
  { name: "Portable Mini Projector", image: "📽️", revenue: 390, orders: 2, margin: 65, platform: "Amazon" },
  { name: "Wireless Earbuds Pro", image: "🎧", revenue: 340, orders: 2, margin: 71, platform: "eBay" },
  { name: "Car Phone Mount", image: "🚗", revenue: 280, orders: 2, margin: 78, platform: "Amazon" },
];

const monthlyComparison: MonthlyComparison[] = [
  { month: "May", revenue: 2800, profit: 1820, orders: 15 },
  { month: "Jun", revenue: 3200, profit: 2080, orders: 18 },
  { month: "Jul", revenue: 3600, profit: 2340, orders: 20 },
  { month: "Aug", revenue: 4250, profit: 2847, orders: 23 },
];

const platformRevenue = [
  { name: "Amazon", revenue: 2100, share: 49, color: "#f59e0b" },
  { name: "Shopify", revenue: 1250, share: 29, color: "#22c55e" },
  { name: "eBay", revenue: 550, share: 13, color: "#3b82f6" },
  { name: "Etsy", revenue: 350, share: 9, color: "#a855f7" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`rev-spark-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#rev-spark-${color})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function KPICard({
  label,
  value,
  prefix,
  suffix,
  change,
  up,
  icon: Icon,
  color,
  sparkline,
  delay,
}: {
  label: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change: string;
  up: boolean;
  icon: typeof DollarSign;
  color: string;
  sparkline: number[];
  delay: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const count = useAnimatedCounter(value, 1500, isInView);

  return (
    <div
      ref={ref}
      className={`glass rounded-xl p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}/10 group-hover:scale-110 transition-transform`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
          {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {change}
        </span>
      </div>
      <p className="font-display text-2xl font-bold text-foreground">
        {prefix || ""}{count.toLocaleString()}{suffix || ""}
      </p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <MiniSparkline points={sparkline} color={color === "text-emerald-400" ? "#22c55e" : color === "text-blue-400" ? "#3b82f6" : color === "text-amber-400" ? "#f59e0b" : "#a855f7"} />
      </div>
    </div>
  );
}

function RevenueChart({ actual, predicted }: { actual: { date: string; value: number }[]; predicted: { date: string; value: number }[] }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; value: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const allPoints = [...actual, ...predicted];
  const maxVal = Math.max(...allPoints.map((p) => p.value));
  const minVal = Math.min(...allPoints.map((p) => p.value));
  const range = maxVal - minVal || 1;

  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const w = 800;
  const h = 280;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const getX = (i: number, total: number) => padding.left + (i / (total - 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - ((val - minVal) / range) * chartH;

  const actualPath = actual.map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i, allPoints.length)} ${getY(p.value)}`).join(" ");
  const predictedPath = [actual[actual.length - 1], ...predicted]
    .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(actual.length - 1 + i, allPoints.length)} ${getY(p.value)}`)
    .join(" ");
  const actualArea = `${actualPath} L ${getX(actual.length - 1, allPoints.length)} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => Math.round(minVal + range * p));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const idx = Math.round(((x - padding.left) / chartW) * (allPoints.length - 1));
    if (idx >= 0 && idx < allPoints.length) {
      const point = allPoints[idx];
      setTooltip({
        x: getX(idx, allPoints.length),
        y: getY(point.value),
        date: point.date,
        value: point.value,
      });
    }
  };

  return (
    <div ref={ref} className={`glass rounded-2xl p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-display text-base font-semibold text-foreground">Revenue Trend</h3>
          <p className="text-[11px] text-muted-foreground">Last 30 days actual + 14-day projection</p>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-accent" />
            <span className="text-muted-foreground">Actual</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded border-dashed" style={{ borderTop: "2px dashed #a855f7", height: 0 }} />
            <span className="text-muted-foreground">Predicted</span>
          </span>
        </div>
      </div>

      <div className="relative">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${w} ${h}`}
          className="w-full h-auto"
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
        >
          <defs>
            <linearGradient id="revChartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={padding.left} y1={getY(tick)} x2={w - padding.right} y2={getY(tick)} stroke="rgba(255,255,255,0.04)" />
              <text x={padding.left - 8} y={getY(tick) + 3} textAnchor="end" className="fill-muted-foreground text-[9px]">
                ${tick}
              </text>
            </g>
          ))}

          {isInView && <path d={actualArea} fill="url(#revChartGradient)" className="animate-fade-in" />}
          {isInView && <path d={actualPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" className="animate-chart-draw" />}
          {isInView && <path d={predictedPath} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" className="animate-chart-draw" style={{ animationDelay: "1s" }} />}

          {actual.filter((_, i) => i % 5 === 0 || i === actual.length - 1).map((p, i) => (
            <circle key={i} cx={getX(actual.indexOf(p), allPoints.length)} cy={getY(p.value)} r="3" fill="#3b82f6" stroke="#0f0f17" strokeWidth="2" />
          ))}

          {tooltip && (
            <g>
              <line x1={tooltip.x} y1={padding.top} x2={tooltip.x} y2={padding.top + chartH} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <circle cx={tooltip.x} cy={tooltip.y} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
              <rect x={tooltip.x - 50} y={tooltip.y - 34} width="100" height="24" rx="6" fill="#16161f" stroke="rgba(255,255,255,0.1)" />
              <text x={tooltip.x} y={tooltip.y - 18} textAnchor="middle" className="fill-foreground text-[9px] font-bold">
                ${tooltip.value} — {tooltip.date}
              </text>
            </g>
          )}

          {allPoints.filter((_, i) => i % 7 === 0 || i === allPoints.length - 1).map((p, i) => (
            <text key={i} x={getX(allPoints.indexOf(p), allPoints.length)} y={h - 8} textAnchor="middle" className="fill-muted-foreground text-[8px]">
              {p.date}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}

function CategoryBar({ category, maxRevenue, delay }: { category: CategoryBreakdown; maxRevenue: number; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const width = (category.revenue / maxRevenue) * 100;

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: category.color }} />
          <span className="text-sm font-medium text-foreground">{category.name}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-foreground">${category.revenue.toLocaleString()}</span>
          <span className={`text-[11px] font-semibold ${category.trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {category.trend >= 0 ? "+" : ""}{category.trend}%
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: isInView ? `${width}%` : "0%",
            backgroundColor: category.color,
            transitionDelay: `${delay + 200}ms`,
          }}
        />
      </div>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-[10px] text-muted-foreground">{category.orders} orders</span>
        <span className="text-[10px] text-muted-foreground">{category.margin}% margin</span>
      </div>
    </div>
  );
}

function MonthlyBar({ data, maxRevenue, delay }: { data: MonthlyComparison; maxRevenue: number; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const revenueH = (data.revenue / maxRevenue) * 100;
  const profitH = (data.profit / maxRevenue) * 100;

  return (
    <div
      ref={ref}
      className={`flex flex-col items-center transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="w-full flex items-end justify-center gap-1.5 h-32 mb-2">
        <div
          className="w-5 rounded-t-md bg-accent/60 transition-all duration-700"
          style={{ height: isInView ? `${revenueH}%` : "0%", transitionDelay: `${delay + 200}ms` }}
        />
        <div
          className="w-5 rounded-t-md bg-emerald-400/60 transition-all duration-700"
          style={{ height: isInView ? `${profitH}%` : "0%", transitionDelay: `${delay + 400}ms` }}
        />
      </div>
      <span className="text-[11px] font-medium text-muted-foreground">{data.month}</span>
      <span className="text-[10px] text-foreground font-bold">${(data.revenue / 1000).toFixed(1)}K</span>
    </div>
  );
}

function PlatformDonut() {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const size = 140;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const segments = platformRevenue.map((p, i) => {
    const offset = platformRevenue.slice(0, i).reduce((sum, prev) => sum + prev.share, 0);
    return { ...p, offset, dash: (p.share / 100) * circumference };
  });

  return (
    <div ref={ref} className={`flex flex-col items-center transition-all duration-700 ${isInView ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={strokeWidth} />
          {segments.map((seg, i) => (
            <circle
              key={seg.name}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
              strokeDashoffset={-seg.offset * (circumference / 100)}
              className="transition-all duration-1000"
              style={{ transitionDelay: `${i * 150}ms` }}
            />
          ))}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-lg font-bold text-foreground">$4.2K</span>
          <span className="text-[9px] text-muted-foreground">Total</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4">
        {platformRevenue.map((p) => (
          <div key={p.name} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-[11px] text-muted-foreground">{p.name}</span>
            <span className="text-[11px] font-semibold text-foreground">{p.share}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function InsightCard({ icon: Icon, title, description, type, delay }: { icon: typeof TrendingUp; title: string; description: string; type: "success" | "warning" | "info"; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const colors = {
    success: { bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: "text-emerald-400" },
    warning: { bg: "bg-amber-400/10", border: "border-amber-400/20", icon: "text-amber-400" },
    info: { bg: "bg-blue-400/10", border: "border-blue-400/20", icon: "text-blue-400" },
  };
  const c = colors[type];

  return (
    <div
      ref={ref}
      className={`p-4 rounded-xl ${c.bg} border ${c.border} transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${c.bg} shrink-0`}>
          <Icon className={`h-4 w-4 ${c.icon}`} />
        </div>
        <div>
          <h4 className="text-sm font-semibold text-foreground mb-0.5">{title}</h4>
          <p className="text-[12px] text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const { actual, predicted } = revenueData;
  const maxCategoryRevenue = Math.max(...categoryData.map((c) => c.revenue));
  const maxMonthlyRevenue = Math.max(...monthlyComparison.map((m) => m.revenue));

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-24">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1">
            Revenue Forecast
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Track your revenue, analyze trends, and forecast growth across all platforms.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
            {(["7d", "30d", "90d"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${timeframe === tf ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all">
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard label="Revenue This Month" value={4250} prefix="$" change="+18%" up icon={DollarSign} color="text-emerald-400" sparkline={[3200, 3400, 3600, 3800, 3900, 4100, 4250]} delay={0} />
        <KPICard label="Est. Profit" value={2847} prefix="$" change="+8%" up icon={TrendingUp} color="text-purple-400" sparkline={[2400, 2500, 2550, 2600, 2700, 2780, 2847]} delay={100} />
        <KPICard label="Active Orders" value={23} change="+24%" up icon={ShoppingCart} color="text-amber-400" sparkline={[12, 14, 16, 18, 19, 21, 23]} delay={200} />
        <KPICard label="Avg. Margin" value={71} suffix="%" change="+3.2%" up icon={Target} color="text-blue-400" sparkline={[65, 66, 68, 69, 70, 70, 71]} delay={300} />
      </div>

      {/* Main Revenue Chart */}
      <RevenueChart actual={actual} predicted={predicted} />

      {/* Category Breakdown + Platform Split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-3 glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">Revenue by Category</h3>
              <p className="text-[11px] text-muted-foreground">Performance breakdown across product categories</p>
            </div>
            <Link href="/products" className="text-[11px] text-accent hover:underline flex items-center gap-1">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-4">
            {categoryData.map((cat, i) => (
              <CategoryBar key={cat.name} category={cat} maxRevenue={maxCategoryRevenue} delay={i * 100} />
            ))}
          </div>
        </div>

        {/* Platform Revenue Split */}
        <div className="lg:col-span-2 glass rounded-2xl p-5">
          <div className="mb-5">
            <h3 className="font-display text-base font-semibold text-foreground">Revenue by Platform</h3>
            <p className="text-[11px] text-muted-foreground">Where your sales are coming from</p>
          </div>
          <PlatformDonut />
        </div>
      </div>

      {/* Monthly Comparison + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Comparison */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">Monthly Comparison</h3>
              <p className="text-[11px] text-muted-foreground">Revenue vs Profit over time</p>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent/60" />
                <span className="text-muted-foreground">Revenue</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
                <span className="text-muted-foreground">Profit</span>
              </span>
            </div>
          </div>
          <div className="flex items-end justify-around h-40">
            {monthlyComparison.map((m, i) => (
              <MonthlyBar key={m.month} data={m} maxRevenue={maxMonthlyRevenue} delay={i * 100} />
            ))}
          </div>
        </div>

        {/* Top Performing Products */}
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-display text-base font-semibold text-foreground">Top Products</h3>
              <p className="text-[11px] text-muted-foreground">Best performing products this month</p>
            </div>
            <Link href="/products" className="text-[11px] text-accent hover:underline flex items-center gap-1">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {topProducts.map((product, i) => (
              <div key={product.name} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface-hover transition-colors group">
                <span className="text-[11px] font-bold text-muted-foreground w-4">{i + 1}</span>
                <span className="text-xl">{product.image}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">{product.name}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">{product.platform}</span>
                    <span className="text-[10px] text-emerald-400 font-semibold">{product.margin}% margin</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-foreground">${product.revenue}</p>
                  <p className="text-[10px] text-muted-foreground">{product.orders} orders</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Growth Insights */}
      <div>
        <div className="mb-4">
          <h3 className="font-display text-base font-semibold text-foreground">Growth Insights</h3>
          <p className="text-[11px] text-muted-foreground">AI-powered recommendations to boost your revenue</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <InsightCard
            icon={TrendingUp}
            title="Scale Beauty Products"
            description="Beauty category grew 32% this month with 78% avg margin. Consider expanding your catalog here."
            type="success"
            delay={0}
          />
          <InsightCard
            icon={AlertTriangle}
            title="Home & Garden Slowing"
            description="Revenue dipped 5% this week. Check competitor pricing and consider refreshing product listings."
            type="warning"
            delay={100}
          />
          <InsightCard
            icon={Zap}
            title="Amazon Dominance"
            description="49% of revenue comes from Amazon. Diversifying to Shopify could reduce platform dependency risk."
            type="info"
            delay={200}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass rounded-2xl p-5">
        <h3 className="font-display text-base font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/products" className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 group-hover:scale-110 transition-transform">
              <Package className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Find Products</p>
              <p className="text-[10px] text-muted-foreground">Discover new items</p>
            </div>
          </Link>
          <Link href="/calculator" className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10 group-hover:scale-110 transition-transform">
              <DollarSign className="h-4 w-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Calculator</p>
              <p className="text-[10px] text-muted-foreground">Estimate profit</p>
            </div>
          </Link>
          <Link href="/competitors" className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10 group-hover:scale-110 transition-transform">
              <BarChart3 className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Competitors</p>
              <p className="text-[10px] text-muted-foreground">Analyze market</p>
            </div>
          </Link>
          <Link href="/suppliers" className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-400/10 group-hover:scale-110 transition-transform">
              <Truck className="h-4 w-4 text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Suppliers</p>
              <p className="text-[10px] text-muted-foreground">Manage sources</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
