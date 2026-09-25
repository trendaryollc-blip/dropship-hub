"use client";

import Image from "next/image";
import { TrendingUp, TrendingDown, Minus, Flame, ArrowRight, Target, Clock, BookmarkPlus, Sparkles, GitCompare } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { NicheData } from "@/types/niches";

function MiniSparkline({ points, color = "#3b82f6" }: { points: number[]; color?: string }) {
  if (!points || points.length < 2) return null;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 60, h = 20;
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (points.length - 1)) * w} ${h - ((p - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path d={`${pathD} L ${w} ${h} L 0 ${h} Z`} fill={color} fillOpacity="0.1" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

const gradeColors: Record<string, string> = {
  "A+": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "A": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "B+": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "B": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "C+": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "C": "text-red-400 bg-red-400/10 border-red-400/20",
};

const riskColors: Record<string, string> = {
  low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  high: "text-red-400 bg-red-400/10 border-red-400/20",
};

interface NicheHeatmapCardProps {
  niche: NicheData;
  index: number;
  onSelect: (id: string) => void;
  onCompare?: (id: string) => void;
  onMission?: (id: string) => void;
  onWatchlist?: (id: string) => void;
  onListing?: (id: string) => void;
  compareIds?: string[];
}

export default function NicheHeatmapCard({ niche, index, onSelect, onCompare, onMission, onWatchlist, onListing, compareIds = [] }: NicheHeatmapCardProps) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const trendIcon = niche.trend === "up" ? TrendingUp : niche.trend === "down" ? TrendingDown : Minus;
  const trendColor = niche.trend === "up" ? "text-emerald-400" : niche.trend === "down" ? "text-red-400" : "text-muted-foreground";
  const TrendIcon = trendIcon;
  const heatColor = niche.heat >= 80 ? "#ef4444" : niche.heat >= 60 ? "#f59e0b" : niche.heat >= 40 ? "#3b82f6" : "#6b7280";
  const isComparing = compareIds.includes(niche.id);

  return (
    <div
      ref={ref}
      onClick={() => onSelect(niche.id)}
      className={`glass rounded-2xl border p-3 sm:p-5 cursor-pointer transition-all duration-500 group ${isComparing ? "border-accent/40 shadow-[0_0_20px_rgba(var(--glow-color),0.15)]" : "border-border hover:border-accent/20"} ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="relative h-20 sm:h-24 overflow-hidden rounded-xl mb-3">
        <Image
          src={niche.image || "/placeholder.png"}
          alt={niche.name}
          width={400}
          height={200}
          unoptimized
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${gradeColors[niche.grade]}`}>{niche.grade}</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${riskColors[niche.riskLevel]}`}>{niche.riskLevel}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate">{niche.name}</h3>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1">
          <Flame className="h-3.5 w-3.5" style={{ color: heatColor }} />
          <span className="font-display text-base sm:text-lg font-bold" style={{ color: heatColor }}>{niche.heat}</span>
          <span className="text-[9px] text-muted-foreground">heat (est.)</span>
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${niche.heat}%`, backgroundColor: heatColor }} />
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon className={`h-3 w-3 ${trendColor}`} />
          <span className={`text-[10px] font-medium ${trendColor}`}>{niche.growth != null ? `${niche.growth > 0 ? "+" : ""}${niche.growth}%` : "growth n/a"}</span>
        </div>
      </div>

      <div className="mb-3">
        <MiniSparkline points={niche.weeklyData || []} color={heatColor} />
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3">
        {[
          { label: "Products", value: niche.productCount },
          { label: "Avg Margin", value: niche.avgMargin != null ? `${niche.avgMargin}%` : "n/a" },
          { label: "Saturation", value: `${niche.saturation}% est.` },
        ].map((stat) => (
          <div key={stat.label} className="text-center p-1 sm:p-1.5 rounded-lg bg-surface/50">
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            <p className="text-xs font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-3">
        {[
          { label: "Revenue/mo", value: niche.estimatedMonthlyRevenue != null ? `$${niche.estimatedMonthlyRevenue.toLocaleString()}` : "n/a", icon: Target },
          { label: "Profit/unit", value: niche.profitPerUnit != null ? `$${niche.profitPerUnit.toFixed(2)}` : "n/a", icon: TrendingUp },
          { label: "Shipping", value: niche.avgShippingDays != null ? `${niche.avgShippingDays}d` : "n/a", icon: Clock },
        ].map((stat) => (
          <div key={stat.label} className="text-center p-1 sm:p-1.5 rounded-lg bg-surface/50">
            <div className="flex items-center justify-center gap-0.5 mb-0.5">
              <stat.icon className="h-2.5 w-2.5 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
            <p className="text-[10px] font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] text-muted-foreground truncate">Top: {niche.topProduct}</span>
        <span className="text-[10px] text-muted-foreground">Return: {niche.avgReturnRate != null ? `${niche.avgReturnRate}%` : "n/a"}</span>
      </div>

      <div className="flex items-center gap-1 pt-2 border-t border-border/50">
        <button
          onClick={(e) => { e.stopPropagation(); onMission?.(niche.id); }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-accent hover:bg-accent/5 transition-all"
          title="Start Mission"
        >
          <Target className="h-3 w-3" /> Mission
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onWatchlist?.(niche.id); }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-emerald-400 hover:bg-emerald-400/5 transition-all"
          title="Add to Watchlist"
        >
          <BookmarkPlus className="h-3 w-3" /> Watch
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onListing?.(niche.id); }}
          className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-purple-400 hover:bg-purple-400/5 transition-all"
          title="Generate Listing"
        >
          <Sparkles className="h-3 w-3" /> List
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onCompare?.(niche.id); }}
          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${isComparing ? "text-accent bg-accent/10" : "text-muted-foreground hover:text-amber-400 hover:bg-amber-400/5"}`}
          title="Compare"
        >
          <GitCompare className="h-3 w-3" /> Compare
        </button>
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-muted-foreground">
          {niche.competition?.storeCount != null ? `${niche.competition.storeCount} stores selling this` : "Store count not available"}
        </span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
      </div>
    </div>
  );
}
