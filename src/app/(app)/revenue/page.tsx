"use client";

import { useState, useRef, useMemo } from "react";
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
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { KPICardSkeleton, ChartSkeleton } from "@/components/ui/Skeleton";
import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";

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

// ─── Sub-components ──────────────────────────────────────────────────────────

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length === 0) return <div className="w-20 h-7 shrink-0" />;
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
      className={`glass rounded-xl p-3 sm:p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        <div className={`flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg ${color}/10 group-hover:scale-110 transition-transform`}>
          <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${color}`} />
        </div>
        <span className={`flex items-center gap-0.5 text-[10px] sm:text-[11px] font-semibold ${up ? "text-emerald-400" : "text-red-400"}`}>
          {up ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3" />}
          {change}
        </span>
      </div>
      <p className="font-display text-lg sm:text-2xl font-bold text-foreground">
        {prefix || ""}{count.toLocaleString()}{suffix || ""}
      </p>
      <div className="flex items-center justify-between mt-1.5 sm:mt-2">
        <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate pr-2">{label}</p>
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
  if (allPoints.length === 0) return null;
  const maxVal = Math.max(...allPoints.map((p) => p.value));
  const minVal = Math.min(...allPoints.map((p) => p.value));
  const range = maxVal - minVal || 1;

  const padding = { top: 20, right: 15, bottom: 30, left: 40 };
  const w = 800;
  const h = 260;
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
    <div ref={ref} className={`glass rounded-2xl p-3 sm:p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
        <div>
          <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Revenue Trend</h3>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground">Last 30 days actual + 14-day projection</p>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-[11px]">
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
              <text x={padding.left - 6} y={getY(tick) + 3} textAnchor="end" className="fill-muted-foreground text-[8px] sm:text-[9px]">
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
            <text key={i} x={getX(allPoints.indexOf(p), allPoints.length)} y={h - 8} textAnchor="middle" className="fill-muted-foreground text-[7px] sm:text-[8px]">
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
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
          <span className="text-xs sm:text-sm font-medium text-foreground truncate">{category.name}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <span className="text-xs sm:text-sm font-bold text-foreground">${category.revenue.toLocaleString()}</span>
          <span className={`text-[10px] sm:text-[11px] font-semibold ${category.trend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {category.trend >= 0 ? "+" : ""}{category.trend}%
          </span>
        </div>
      </div>
      <div className="h-1.5 sm:h-2 rounded-full bg-surface overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: isInView ? `${width}%` : "0%",
            backgroundColor: category.color,
            transitionDelay: `${delay + 200}ms`,
          }}
        />
      </div>
      <div className="flex items-center gap-2 sm:gap-3 mt-1">
        <span className="text-[9px] sm:text-[10px] text-muted-foreground">{category.orders} orders</span>
        <span className="text-[9px] sm:text-[10px] text-muted-foreground">{category.margin}% margin</span>
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
      <div className="w-full flex items-end justify-center gap-1 sm:gap-1.5 h-24 sm:h-32 mb-1.5 sm:mb-2">
        <div
          className="w-4 sm:w-5 rounded-t-md bg-accent/60 transition-all duration-700"
          style={{ height: isInView ? `${revenueH}%` : "0%", transitionDelay: `${delay + 200}ms` }}
        />
        <div
          className="w-4 sm:w-5 rounded-t-md bg-emerald-400/60 transition-all duration-700"
          style={{ height: isInView ? `${profitH}%` : "0%", transitionDelay: `${delay + 400}ms` }}
        />
      </div>
      <span className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">{data.month}</span>
      <span className="text-[9px] sm:text-[10px] text-foreground font-bold">${(data.revenue / 1000).toFixed(1)}K</span>
    </div>
  );
}

function PlatformDonut({ platformRevenue, totalRevenue }: { platformRevenue: { name: string; revenue: number; share: number; color: string }[]; totalRevenue: number }) {
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
          <span className="font-display text-lg font-bold text-foreground">${totalRevenue >= 1000 ? `${(totalRevenue / 1000).toFixed(1)}K` : totalRevenue.toLocaleString()}</span>
          <span className="text-[9px] text-muted-foreground">Total</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 sm:gap-x-6 gap-y-1 sm:gap-y-1.5 mt-3 sm:mt-4">
        {platformRevenue.map((p) => (
          <div key={p.name} className="flex items-center gap-1.5 sm:gap-2">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-[10px] sm:text-[11px] text-muted-foreground">{p.name}</span>
            <span className="text-[10px] sm:text-[11px] font-semibold text-foreground">{p.share}%</span>
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
      className={`p-3 sm:p-4 rounded-xl ${c.bg} border ${c.border} transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg ${c.bg} shrink-0`}>
          <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${c.icon}`} />
        </div>
        <div className="min-w-0">
          <h4 className="text-xs sm:text-sm font-semibold text-foreground mb-0.5">{title}</h4>
          <p className="text-[11px] sm:text-[12px] text-muted-foreground leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function RevenuePage() {
  const { user } = useAuth();
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");

  const uid = user?.uid || "";
  const profit7dUrl = uid ? `/api/profit?uid=${uid}&timeframe=7d` : null;
  const profit30dUrl = uid ? `/api/profit?uid=${uid}&timeframe=30d` : null;
  const profit90dUrl = uid ? `/api/profit?uid=${uid}&timeframe=90d` : null;

  type ProfitResponse = {
    summary?: { totalRevenue: number; totalProfit: number; totalOrders: number; avgMargin: number };
    dailyBreakdown?: Array<{ date: string; revenue: number; profit: number; orders: number }>;
    topProducts?: unknown[];
    campaignProfits?: unknown[];
  };

  const { data: data7d, isLoading: loading7d } = useAPI<ProfitResponse>(profit7dUrl);
  const { data: data30d, isLoading: loading30d } = useAPI<ProfitResponse>(profit30dUrl);
  const { data: data90d, isLoading: loading90d } = useAPI<ProfitResponse>(profit90dUrl);

  const loading = loading7d || loading30d || loading90d;

  const buildKpiForTimeframe = (data: ProfitResponse | undefined) => {
    if (!data?.summary) return { revenue: 0, profit: 0, orders: 0, margin: 0, revenueChange: "0%", profitChange: "0%", ordersChange: "0%", marginChange: "0%", revenueSparkline: [] as number[], profitSparkline: [] as number[], ordersSparkline: [] as number[], marginSparkline: [] as number[] };
    const summary = data.summary;
    const daily: Array<{ date: string; revenue: number; profit: number; orders: number }> = data.dailyBreakdown ?? [];
    return {
      revenue: Math.round(summary.totalRevenue),
      profit: Math.round(summary.totalProfit),
      orders: summary.totalOrders,
      margin: summary.avgMargin,
      revenueChange: "—",
      profitChange: "—",
      ordersChange: "—",
      marginChange: "—",
      revenueSparkline: daily.slice(-7).map((d: { revenue: number }) => d.revenue),
      profitSparkline: daily.slice(-7).map((d: { profit: number }) => d.profit),
      ordersSparkline: daily.slice(-7).map((d: { orders: number }) => d.orders),
      marginSparkline: daily.slice(-7).map((d: { revenue: number; profit: number }) => d.revenue > 0 ? +((d.profit / d.revenue) * 100).toFixed(1) : 0),
    };
  };

  const kpiData = useMemo<Record<Timeframe, ReturnType<typeof buildKpiForTimeframe>>>(() => ({
    "7d": buildKpiForTimeframe(data7d),
    "30d": buildKpiForTimeframe(data30d),
    "90d": buildKpiForTimeframe(data90d),
  }), [data7d, data30d, data90d]);

  const kpi = kpiData[timeframe];

  const revenueData = useMemo(() => {
    const primary = data30d;
    const result: { actual: { date: string; value: number }[]; predicted: { date: string; value: number }[] } = { actual: [], predicted: [] };
    if (primary?.dailyBreakdown?.length) {
      const daily = primary.dailyBreakdown as Array<{ date: string; revenue: number }>;
      result.actual = daily.map((d) => ({ date: d.date.slice(5), value: Math.round(d.revenue) }));
    }
    return result;
  }, [data30d]);

  const categoryData = useMemo<CategoryBreakdown[]>(() => [], []);

  const topProducts = useMemo<TopProduct[]>(() => {
    const primary = data30d;
    if (!primary?.topProducts?.length) return [];
    const apiTopProducts = primary.topProducts as Array<{ productTitle: string; productImage: string; totalRevenue: number; totalOrders: number; profitMargin: number; trend: number }>;
    return apiTopProducts.slice(0, 5).map((p) => ({
      name: p.productTitle,
      image: p.productImage || "📦",
      revenue: Math.round(p.totalRevenue),
      orders: p.totalOrders,
      margin: p.profitMargin,
      platform: "—",
    }));
  }, [data30d]);

  const platformRevenue = useMemo(() => {
    const primary = data30d;
    if (!primary?.campaignProfits?.length) return [];
    const campaigns = primary.campaignProfits as Array<{ campaignName: string; revenue: number }>;
    const totalRev = campaigns.reduce((s, c) => s + c.revenue, 0);
    const platformColors = ["#f59e0b", "#22c55e", "#3b82f6", "#a855f7", "#ef4444"];
    return campaigns.filter((c) => c.revenue > 0).map((c, i) => ({
      name: c.campaignName,
      revenue: Math.round(c.revenue),
      share: totalRev > 0 ? Math.round((c.revenue / totalRev) * 100) : 0,
      color: platformColors[i % platformColors.length],
    }));
  }, [data30d]);

  const monthlyComparison = useMemo<MonthlyComparison[]>(() => {
    const primary = data30d;
    const allDaily30 = primary?.dailyBreakdown as Array<{ date: string; revenue: number; profit: number; orders: number }> | undefined;
    if (!allDaily30?.length) return [];
    const monthMap = new Map<string, { month: string; revenue: number; profit: number; orders: number }>();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    for (const d of allDaily30) {
      const dt = new Date(d.date);
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      const label = monthNames[dt.getMonth()];
      const existing = monthMap.get(key) || { month: label, revenue: 0, profit: 0, orders: 0 };
      existing.revenue += d.revenue;
      existing.profit += d.profit;
      existing.orders += d.orders;
      monthMap.set(key, existing);
    }
    return Array.from(monthMap.values());
  }, [data30d]);

  const { actual, predicted } = revenueData;
  const maxCategoryRevenue = categoryData.length > 0 ? Math.max(...categoryData.map((c) => c.revenue)) : 0;
  const maxMonthlyRevenue = monthlyComparison.length > 0 ? Math.max(...monthlyComparison.map((m) => m.revenue)) : 0;
  const hasData = revenueData.actual.length > 0 || revenueData.predicted.length > 0;
  const hasAnyData = hasData || categoryData.length > 0 || topProducts.length > 0 || monthlyComparison.length > 0 || platformRevenue.length > 0 || kpi.revenue > 0;

  return (
    <PageErrorBoundary>
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              Revenue Forecast
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Revenue trends, forecasts, and growth analytics across all platforms. For per-order cost breakdown, see Profit Tracker.
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
            {(["7d", "30d", "90d"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold transition-all ${timeframe === tf ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}
              >
                {tf}
              </button>
            ))}
          </div>
          <button onClick={() => {
            if (!revenueData.actual.length) return;
            const csv = [["Date", "Revenue", "Profit", "Orders"]].concat(
              revenueData.actual.map((d) => [d.date, String(d.value), "", ""])
            ).map((r) => r.join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `revenue-${timeframe}.csv`;
            a.click();
            URL.revokeObjectURL(url);
          }} className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border border-border text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all">
            <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {!loading && !hasAnyData && (
        <div className="glass rounded-2xl p-8 sm:p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
              <DollarSign className="h-7 w-7 text-accent" />
            </div>
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No revenue data yet</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Connect your store and start selling to see your revenue analytics. Your data will appear here automatically once you have orders.
          </p>
        </div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[0, 1, 2, 3].map((i) => (
            <KPICardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <KPICard label="Revenue This Month" value={kpi.revenue} prefix="$" change={kpi.revenueChange} up icon={DollarSign} color="text-emerald-400" sparkline={kpi.revenueSparkline} delay={0} />
          <KPICard label="Est. Profit" value={kpi.profit} prefix="$" change={kpi.profitChange} up icon={TrendingUp} color="text-purple-400" sparkline={kpi.profitSparkline} delay={100} />
          <KPICard label="Active Orders" value={kpi.orders} change={kpi.ordersChange} up icon={ShoppingCart} color="text-amber-400" sparkline={kpi.ordersSparkline} delay={200} />
          <KPICard label="Avg. Margin" value={kpi.margin} suffix="%" change={kpi.marginChange} up icon={Target} color="text-blue-400" sparkline={kpi.marginSparkline} delay={300} />
        </div>
      )}

      {/* Main Revenue Chart */}
      {loading ? (
        <ChartSkeleton height={260} />
      ) : hasData ? (
        <RevenueChart actual={actual} predicted={predicted} />
      ) : (
        <div className="glass rounded-2xl p-6 sm:p-8 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Revenue trend will appear once you have sales data.</p>
        </div>
      )}

      {/* Category Breakdown + Platform Split */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-3 glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Revenue by Category</h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">Performance breakdown across product categories</p>
            </div>
            <Link href="/products" className="text-[10px] sm:text-[11px] text-accent hover:underline flex items-center gap-1">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {categoryData.length > 0 ? (
            <div className="space-y-3 sm:space-y-4">
              {categoryData.map((cat, i) => (
                <CategoryBar key={cat.name} category={cat} maxRevenue={maxCategoryRevenue} delay={i * 100} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No category data available yet.</p>
            </div>
          )}
        </div>

        {/* Platform Revenue Split */}
        <div className="lg:col-span-2 glass rounded-2xl p-4 sm:p-5">
          <div className="mb-4 sm:mb-5">
            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Revenue by Platform</h3>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">Where your sales are coming from</p>
          </div>
          {platformRevenue.length > 0 ? (
            <PlatformDonut platformRevenue={platformRevenue} totalRevenue={kpi.revenue} />
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No platform data available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Monthly Comparison + Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Monthly Comparison */}
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Monthly Comparison</h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">Revenue vs Profit over time</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-[11px]">
              <span className="flex items-center gap-1 sm:gap-1.5">
                <span className="w-2 h-2 rounded-full bg-accent/60" />
                <span className="text-muted-foreground">Revenue</span>
              </span>
              <span className="flex items-center gap-1 sm:gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400/60" />
                <span className="text-muted-foreground">Profit</span>
              </span>
            </div>
          </div>
          {monthlyComparison.length > 0 ? (
            <div className="flex items-end justify-around h-28 sm:h-40">
              {monthlyComparison.map((m, i) => (
                <MonthlyBar key={m.month} data={m} maxRevenue={maxMonthlyRevenue} delay={i * 100} />
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No monthly data available yet.</p>
            </div>
          )}
        </div>

        {/* Top Performing Products */}
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4 sm:mb-5">
            <div>
              <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Top Products</h3>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">Best performing products this month</p>
            </div>
            <Link href="/products" className="text-[10px] sm:text-[11px] text-accent hover:underline flex items-center gap-1">
              View All <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
          {topProducts.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {topProducts.map((product, i) => (
                <div key={product.name} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-2.5 rounded-xl hover:bg-surface-hover transition-colors group">
                  <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground w-3 sm:w-4">{i + 1}</span>
                  <span className="text-base sm:text-xl">{product.image}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate group-hover:text-accent transition-colors">{product.name}</p>
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <span className="text-[9px] sm:text-[10px] text-muted-foreground">{product.platform}</span>
                      <span className="text-[9px] sm:text-[10px] text-emerald-400 font-semibold">{product.margin}% margin</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-bold text-foreground">${product.revenue}</p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground">{product.orders} orders</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">No product data available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Growth Insights */}
      {kpi.revenue > 0 && (
        <div>
          <div className="mb-3 sm:mb-4">
            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Growth Insights</h3>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">AI-powered recommendations to boost your revenue</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 sm:gap-3">
            {kpi.margin >= 50 && (
              <InsightCard
                icon={TrendingUp}
                title="Strong Margins"
                description={`Your avg margin is ${kpi.margin}%. This is healthy — consider scaling your top performing products.`}
                type="success"
                delay={0}
              />
            )}
            {topProducts.length > 0 && (
              <InsightCard
                icon={Package}
                title="Top Product Focus"
                description={`"${topProducts[0].name}" generated $${topProducts[0].revenue.toLocaleString()} with ${topProducts[0].margin}% margin. Double down on winners.`}
                type="info"
                delay={100}
              />
            )}
            {platformRevenue.length > 1 && (
              <InsightCard
                icon={Zap}
                title="Platform Diversity"
                description={`Your revenue is spread across ${platformRevenue.length} channels. Diversification reduces dependency risk.`}
                type="success"
                delay={200}
              />
            )}
            {platformRevenue.length === 1 && (
              <InsightCard
                icon={AlertTriangle}
                title="Single Platform Risk"
                description={`All revenue from ${platformRevenue[0]?.name}. Consider diversifying to reduce platform dependency.`}
                type="warning"
                delay={200}
              />
            )}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="glass rounded-2xl p-4 sm:p-5">
        <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-3 sm:mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <Link href="/products" className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-surface border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-accent/10 group-hover:scale-110 transition-transform shrink-0">
              <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate">Find Products</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Discover new items</p>
            </div>
          </Link>
          <Link href="/calculator" className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-surface border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-400/10 group-hover:scale-110 transition-transform shrink-0">
              <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate">Calculator</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Estimate profit</p>
            </div>
          </Link>
          <Link href="/competitors" className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-surface border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-400/10 group-hover:scale-110 transition-transform shrink-0">
              <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-amber-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate">Competitors</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Analyze market</p>
            </div>
          </Link>
          <Link href="/suppliers" className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-xl bg-surface border border-border hover:border-accent/20 hover:bg-surface-hover transition-all group">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-purple-400/10 group-hover:scale-110 transition-transform shrink-0">
              <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-400" />
            </div>
            <div className="min-w-0">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate">Suppliers</p>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground">Manage sources</p>
            </div>
          </Link>
        </div>
      </div>
    </div>
    </PageErrorBoundary>
  );
}
