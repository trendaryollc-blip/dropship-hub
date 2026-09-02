"use client";

import { useState } from "react";
import Link from "next/link";
import { Flame, TrendingUp, TrendingDown, Minus, ArrowUpRight, ShoppingCart, ChevronDown, ChevronUp, Activity } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { HeatmapCategory } from "@/types/dashboard";

function HeatRing({ heat, size = 56 }: { heat: number; size?: number }) {
  const safeHeat = heat || 0;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (safeHeat / 100) * circ;
  const getColor = (v: number) => v >= 80 ? "#ef4444" : v >= 65 ? "#f97316" : v >= 50 ? "#f59e0b" : v >= 35 ? "#3b82f6" : "#64748b";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={getColor(safeHeat)} strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-sm font-bold text-foreground">{safeHeat}</span>
      </div>
    </div>
  );
}

function BarChart({ data, color }: { data: number[] | null; color: string }) {
  if (!data?.length) return null;
  const max = Math.max(...data);
  const colorMap: Record<string, string> = { red: "#ef4444", orange: "#f97316", amber: "#f59e0b", blue: "#3b82f6", slate: "#64748b" };
  const fill = colorMap[color] || "#3b82f6";
  return (
    <div className="flex items-end gap-1 h-10">
      {data.map((val, i) => {
        const h = max > 0 ? (val / max) * 100 : 0;
        return (
          <div key={i} className="flex-1 rounded-t-sm transition-all duration-500" style={{ height: `${h}%`, backgroundColor: fill, opacity: 0.3 + (h / 100) * 0.7 }} />
        );
      })}
    </div>
  );
}

function MarketOverview({ categories }: { categories: HeatmapCategory[] }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const avgHeat = categories.length > 0 ? Math.round(categories.reduce((s, c) => s + (c.heat || 0), 0) / categories.length) : 0;
  const overheating = categories.filter((c) => c.heat >= 80).length;
  const trendingUp = categories.filter((c) => c.trend === "up").length;
  const cooling = categories.filter((c) => c.trend === "down").length;
  const totalProducts = categories.reduce((s, c) => s + c.productCount, 0);

  const getLabel = (v: number) => v >= 75 ? "Overheated" : v >= 55 ? "Hot" : v >= 40 ? "Warm" : "Cool";
  const getColor = (v: number) => v >= 75 ? "#ef4444" : v >= 55 ? "#f97316" : v >= 40 ? "#f59e0b" : "#3b82f6";
  const r = 42, circ = Math.PI * r, offset = circ - ((avgHeat || 0) / 100) * circ;
  const safeAvg = avgHeat || 0;

  return (
    <div ref={ref} className={`glass rounded-2xl p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex flex-col md:flex-row md:items-center gap-5">
        {/* Gauge */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="relative w-[100px] h-[55px] overflow-hidden">
            <svg viewBox="0 0 100 55" className="w-full h-full">
              <defs>
                <linearGradient id="heatGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#ef4444" />
                </linearGradient>
              </defs>
              <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="7" strokeLinecap="round" />
              <path d="M 5 50 A 45 45 0 0 1 95 50" fill="none" stroke="url(#heatGaugeGrad)" strokeWidth="7" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000" />
              <circle cx={5 + (safeAvg / 100) * 90} cy={50 - Math.sin((safeAvg / 100) * Math.PI) * 45} r="5" fill={getColor(safeAvg)} stroke="#0f0f17" strokeWidth="2" />
            </svg>
          </div>
          <div>
            <p className="font-display text-2xl font-bold text-foreground">{avgHeat}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: getColor(avgHeat) }}>{getLabel(avgHeat)}</p>
          </div>
        </div>

        <div className="hidden md:block w-px h-14 bg-border shrink-0" />

        {/* Title + Typing insight */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Flame className="h-4 w-4 text-orange-400" />
            <h3 className="font-display text-sm font-semibold text-foreground">Market Pulse</h3>
            <span className="flex items-center gap-1 text-[10px] text-emerald-400">
              <Activity className="h-2.5 w-2.5" /> Live
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            AI scanned <span className="font-semibold text-foreground">{totalProducts.toLocaleString()}</span> products across <span className="font-semibold text-foreground">{categories.length}</span> categories
          </p>
        </div>

        <div className="hidden md:block w-px h-14 bg-border shrink-0" />

        {/* Stat pills */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-400/10 border border-red-400/20">
            <Flame className="h-3 w-3 text-red-400" />
            <span className="text-[11px] font-semibold text-red-400">{overheating}</span>
            <span className="text-[10px] text-red-400/70 hidden sm:inline">overheating</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <span className="text-[11px] font-semibold text-emerald-400">{trendingUp}</span>
            <span className="text-[10px] text-emerald-400/70 hidden sm:inline">trending up</span>
          </div>
          {cooling > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-400/10 border border-blue-400/20">
              <TrendingDown className="h-3 w-3 text-blue-400" />
              <span className="text-[11px] font-semibold text-blue-400">{cooling}</span>
              <span className="text-[10px] text-blue-400/70 hidden sm:inline">cooling</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeatTile({ cat, index }: { cat: HeatmapCategory; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { ref, isInView } = useInView({ threshold: 0.2 });

  const getTileColors = (heat: number) => {
    if (heat >= 80) return { bg: "from-red-500/15 to-red-500/5", border: "border-red-500/20", text: "text-red-400", bar: "red" as const };
    if (heat >= 65) return { bg: "from-orange-500/15 to-orange-500/5", border: "border-orange-500/20", text: "text-orange-400", bar: "orange" as const };
    if (heat >= 50) return { bg: "from-amber-500/10 to-amber-500/5", border: "border-amber-500/15", text: "text-amber-400", bar: "amber" as const };
    if (heat >= 35) return { bg: "from-blue-500/10 to-blue-500/5", border: "border-blue-500/15", text: "text-blue-400", bar: "blue" as const };
    return { bg: "from-slate-500/10 to-slate-500/5", border: "border-slate-500/10", text: "text-slate-400", bar: "slate" as const };
  };

  const c = getTileColors(cat.heat);
  const TrendIcon = cat.trend === "up" ? TrendingUp : cat.trend === "down" ? TrendingDown : Minus;
  const trendColor = cat.trend === "up" ? "text-emerald-400" : cat.trend === "down" ? "text-red-400" : "text-muted-foreground";

  return (
    <div
      ref={ref}
      className={`rounded-2xl bg-gradient-to-br ${c.bg} border ${c.border} transition-all duration-500 hover:scale-[1.02] hover:shadow-lg overflow-hidden group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      {cat.heat >= 75 && <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent animate-pulse pointer-events-none" />}

      <div className="relative z-10 p-4">
        {/* Header */}
        <Link href="/products" className="flex items-center justify-between mb-3">
          <h4 className="font-display text-xs font-semibold text-foreground truncate">{cat.category}</h4>
          <HeatRing heat={cat.heat} size={40} />
        </Link>

        {/* Top Product */}
        <Link href="/products" className="flex items-center gap-1.5 mb-2 hover:opacity-80 transition-opacity">
          <ShoppingCart className="h-3 w-3 text-accent shrink-0" />
          <span className="text-[10px] font-medium text-foreground truncate">{cat.topProduct}</span>
          <span className="text-[9px] text-emerald-400 shrink-0">{cat.topProductMargin}%</span>
        </Link>

        {/* AI Insight */}
        <p className="text-[10px] text-muted-foreground leading-relaxed mb-3 line-clamp-2">{cat.aiInsight}</p>

        {/* Metrics */}
        <div className="flex items-center gap-3 mb-2 text-[10px]">
          <span className="text-muted-foreground">{cat.productCount} products</span>
          <span className="text-emerald-400 font-medium">{cat.avgMargin}% avg</span>
        </div>

        {/* Bar Chart */}
        <BarChart data={cat.weeklyData} color={c.bar} />

        {/* Bottom row */}
        <div className="flex items-center justify-between mt-2">
          <span className="text-[9px] text-muted-foreground/60">7-day trend</span>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-0.5 text-[10px] font-medium ${trendColor}`}>
              <TrendIcon className="h-2.5 w-2.5" /> {cat.trend}
            </span>
            {cat.velocity !== 0 && (
              <span className={`text-[9px] font-semibold ${cat.velocity > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {cat.velocity > 0 ? "+" : ""}{cat.velocity}%/wk
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Expand */}
      <button onClick={() => setExpanded(!expanded)} className="w-full flex items-center justify-center gap-1 py-2 border-t border-white/5 text-[9px] font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.02] transition-colors">
        {expanded ? "Less" : "Details"}
        {expanded ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-white/5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Demand score</span>
              <span className="font-semibold text-foreground">{cat.heat}/100</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Avg margin</span>
              <span className="font-semibold text-emerald-400">{cat.avgMargin}%</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Products</span>
              <span className="font-semibold text-foreground">{cat.productCount}</span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">Velocity</span>
              <span className={`font-semibold ${cat.velocity > 0 ? "text-emerald-400" : cat.velocity < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                {cat.velocity > 0 ? "+" : ""}{cat.velocity}% per week
              </span>
            </div>
          </div>
          <Link href="/products/niches" className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-[10px] font-semibold hover:bg-accent/20 transition-all">
            Explore {cat.category} <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function MarketplaceHeatmap({ categories }: { categories: HeatmapCategory[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`space-y-6 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <MarketOverview categories={categories} />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {categories.map((cat, i) => (
          <HeatTile key={cat.category} cat={cat} index={i} />
        ))}
      </div>
    </div>
  );
}
