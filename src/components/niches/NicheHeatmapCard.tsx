"use client";

import { TrendingUp, TrendingDown, Minus, Flame, ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { NicheData } from "@/lib/mock-niches";

function MiniSparkline({ points, color = "#3b82f6" }: { points: number[]; color?: string }) {
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

export default function NicheHeatmapCard({ niche, index, onSelect }: { niche: NicheData; index: number; onSelect: (id: string) => void }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const trendIcon = niche.trend === "up" ? TrendingUp : niche.trend === "down" ? TrendingDown : Minus;
  const trendColor = niche.trend === "up" ? "text-emerald-400" : niche.trend === "down" ? "text-red-400" : "text-muted-foreground";
  const TrendIcon = trendIcon;
  const heatColor = niche.heat >= 80 ? "#ef4444" : niche.heat >= 60 ? "#f59e0b" : niche.heat >= 40 ? "#3b82f6" : "#6b7280";

  return (
    <div
      ref={ref}
      onClick={() => onSelect(niche.id)}
      className={`glass rounded-2xl border border-border p-5 cursor-pointer hover:border-accent/20 transition-all duration-500 group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className="relative h-24 overflow-hidden rounded-xl mb-3">
        <img
          src={niche.image}
          alt={niche.name}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-surface/80 to-transparent" />
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${gradeColors[niche.grade]}`}>{niche.grade}</span>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-2">
        <h3 className="font-display text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{niche.name}</h3>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <div className="flex items-center gap-1">
          <Flame className="h-3.5 w-3.5" style={{ color: heatColor }} />
          <span className="font-display text-lg font-bold" style={{ color: heatColor }}>{niche.heat}</span>
        </div>
        <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${niche.heat}%`, backgroundColor: heatColor }} />
        </div>
        <div className="flex items-center gap-1">
          <TrendIcon className={`h-3 w-3 ${trendColor}`} />
          <span className={`text-[10px] font-medium ${trendColor}`}>+{niche.growth}%</span>
        </div>
      </div>

      <div className="mb-3">
        <MiniSparkline points={niche.weeklyData} color={heatColor} />
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {[
          { label: "Products", value: niche.productCount },
          { label: "Avg Margin", value: `${niche.avgMargin}%` },
          { label: "Saturation", value: `${niche.saturation}%` },
        ].map((stat) => (
          <div key={stat.label} className="text-center p-1.5 rounded-lg bg-surface/50">
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            <p className="text-xs font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground truncate">Top: {niche.topProduct}</span>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
      </div>
    </div>
  );
}
