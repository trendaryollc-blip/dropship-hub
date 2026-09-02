"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Package, DollarSign, ShoppingCart, BarChart3, ArrowUpRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import type { RevenueStat } from "@/types/dashboard";

const iconMap: Record<string, typeof DollarSign> = {
  dollar: DollarSign,
  package: Package,
  cart: ShoppingCart,
  trending: TrendingUp,
  bar: BarChart3,
};

function MiniSparkline({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 64;
  const h = 24;

  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / range) * h;
      return `${i === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  const areaPath = `${path} L ${w} ${h} L 0 ${h} Z`;

  const colorMap: Record<string, string> = {
    "text-emerald-400": "#22c55e",
    "text-blue-400": "#3b82f6",
    "text-amber-400": "#f59e0b",
    "text-purple-400": "#a855f7",
  };
  const stroke = colorMap[color] || "#3b82f6";

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id={`spark-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const statLinks: Record<string, string> = {
  "Revenue This Month": "/revenue",
  "Products Analyzed": "/revenue",
  "Active Orders": "/revenue",
  "Est. Profit": "/revenue",
};

function AnimatedStatCard({ stat, delay }: { stat: RevenueStat; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const count = useAnimatedCounter(stat.value, 1500, isInView);
  const Icon = iconMap[stat.icon] || DollarSign;
  const href = statLinks[stat.label] || "/products";

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <Link
        href={href}
        className={`block glass rounded-xl p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover group`}
      >
      <div className="flex items-center justify-between mb-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.color}/10 group-hover:scale-110 transition-transform`}>
          <Icon className={`h-4 w-4 ${stat.color}`} />
        </div>
        <span className={`flex items-center gap-0.5 text-[11px] font-semibold ${stat.up ? "text-emerald-400" : "text-red-400"}`}>
          {stat.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {stat.change}
        </span>
      </div>
      <p className="font-display text-xl font-bold text-foreground">
        {stat.prefix || ""}{count.toLocaleString()}
      </p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-[11px] text-muted-foreground">{stat.label}</p>
        <MiniSparkline points={stat.sparkline} color={stat.color} />
      </div>
      </Link>
    </div>
  );
}

function RevenueChart({ actual, predicted }: { actual: { date: string; value: number }[]; predicted: { date: string; value: number }[] }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; value: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const allPoints = [...actual, ...predicted];

  if (allPoints.length === 0) {
    return (
      <div ref={ref} className="glass rounded-2xl p-5 transition-all duration-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Revenue Forecast</h3>
            <p className="text-[11px] text-muted-foreground">Last 30 days + 14-day projection</p>
          </div>
        </div>
        <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
          No revenue data yet. Connect your store to see your forecast.
        </div>
      </div>
    );
  }
  const maxVal = Math.max(...allPoints.map((p) => p.value));
  const minVal = Math.min(...allPoints.map((p) => p.value));
  const range = maxVal - minVal || 1;

  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const w = 600;
  const h = 200;
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
          <h3 className="font-display text-sm font-semibold text-foreground">Revenue Forecast</h3>
          <p className="text-[11px] text-muted-foreground">Last 30 days + 14-day projection</p>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-accent" />
            <span className="text-muted-foreground">Actual</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded bg-purple-400 border-dashed" style={{ borderTop: "2px dashed #a855f7", height: 0 }} />
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
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
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

          {isInView && <path d={actualArea} fill="url(#chartGradient)" className="animate-fade-in" />}
          {isInView && <path d={actualPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" className="animate-chart-draw" />}
          {isInView && <path d={predictedPath} fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeDasharray="6 4" className="animate-chart-draw" style={{ animationDelay: "1s" }} />}

          {actual.filter((_, i) => i % 5 === 0 || i === actual.length - 1).map((p, i) => (
            <circle key={i} cx={getX(actual.indexOf(p), allPoints.length)} cy={getY(p.value)} r="3" fill="#3b82f6" stroke="#0f0f17" strokeWidth="2" />
          ))}

          {tooltip && (
            <g>
              <line x1={tooltip.x} y1={padding.top} x2={tooltip.x} y2={padding.top + chartH} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <circle cx={tooltip.x} cy={tooltip.y} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
              <rect x={tooltip.x - 45} y={tooltip.y - 32} width="90" height="22" rx="6" fill="#16161f" stroke="rgba(255,255,255,0.1)" />
              <text x={tooltip.x} y={tooltip.y - 17} textAnchor="middle" className="fill-foreground text-[9px] font-bold">
                ${tooltip.value} - ${tooltip.date}
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

export default function RevenueForecast({ actual, predicted, stats }: {
  actual: { date: string; value: number }[];
  predicted: { date: string; value: number }[];
  stats: RevenueStat[];
}) {
  const [timeframe, setTimeframe] = useState<"7d" | "30d" | "90d">("30d");

  return (
    <div className="space-y-6">
      {/* Actions Row */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <Link href="/revenue" className="group">
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1 group-hover:text-accent transition-colors">
            Revenue Forecast
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl group-hover:text-foreground/70 transition-colors">
            Your dropshipping command center. Track revenue, analyze trends, and forecast growth.
          </p>
        </Link>
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
          <Link
            href="/revenue"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover transition-all hover:shadow-[0_0_20px_rgba(var(--glow-color),0.3)] active:scale-[0.97]"
          >
            View Full Report
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Chart + Stats Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Link href="/revenue" className="block group">
            <div className="transition-all group-hover:opacity-90">
              <RevenueChart actual={actual} predicted={predicted} />
            </div>
          </Link>
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {stats.map((stat, i) => (
            <AnimatedStatCard key={stat.label} stat={stat} delay={i * 100} />
          ))}
        </div>
      </div>
    </div>
  );
}
