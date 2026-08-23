"use client";

import { useState } from "react";
import Link from "next/link";
import { Target, ArrowUpRight, TrendingUp, TrendingDown, Package, DollarSign, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { NicheCard as NicheCardType } from "@/lib/mock-dashboard";

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const getColor = (v: number) => v >= 80 ? "#22c55e" : v >= 70 ? "#3b82f6" : v >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="4" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={getColor(score)} strokeWidth="4" strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-sm font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}

function MiniSparkline({ points }: { points: number[] }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 80, h = 24;
  const pathD = points.map((p, i) => {
    const x = (i / (points.length - 1)) * w;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  const areaPath = `${pathD} L ${w} ${h} L 0 ${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs>
        <linearGradient id="nicheSpark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#nicheSpark)" />
      <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function MiniRadar({ scores }: { scores: NicheCardType["scores"] }) {
  const labels = ["Demand", "Profit", "Competition", "Trend", "Season"];
  const values = [scores.demand, scores.profit, scores.competition, scores.trend, scores.seasonality];
  const cx = 75, cy = 75, r = 55;
  const n = labels.length;
  const getPoint = (i: number, val: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (val / 100) * r;
    return { x: cx + dist * Math.cos(angle), y: cy + dist * Math.sin(angle) };
  };
  const polygonPoints = values.map((v, i) => `${getPoint(i, v).x},${getPoint(i, v).y}`).join(" ");
  return (
    <svg viewBox="0 0 150 150" className="w-full h-full">
      <defs>
        <linearGradient id="radarFillNiche" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.08" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((level) => (
        <polygon key={level} points={Array.from({ length: n }, (_, i) => `${getPoint(i, 100 * level).x},${getPoint(i, 100 * level).y}`).join(" ")} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
      ))}
      {labels.map((_, i) => { const p = getPoint(i, 100); return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />; })}
      <polygon points={polygonPoints} fill="url(#radarFillNiche)" stroke="#3b82f6" strokeWidth="1.5" />
      {values.map((v, i) => { const p = getPoint(i, v); return <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="#3b82f6" stroke="#0f0f17" strokeWidth="1" />; })}
      {labels.map((label, i) => { const p = getPoint(i, 120); return <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle" className="fill-muted-foreground text-[7px] font-medium">{label}</text>; })}
    </svg>
  );
}

const gradeColors: Record<string, string> = {
  "A+": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "A": "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  "B+": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "B": "text-blue-400 bg-blue-400/10 border-blue-400/20",
  "C+": "text-amber-400 bg-amber-400/10 border-amber-400/20",
  "C": "text-amber-400 bg-amber-400/10 border-amber-400/20",
};

function NicheCard({ card, index }: { card: NicheCardType; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { ref, isInView } = useInView({ threshold: 0.2 });

  return (
    <div
      ref={ref}
      className={`shrink-0 w-[300px] glass rounded-2xl transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${index * 80}ms` }}
    >
      {/* Top section */}
      <Link href="/products/niches" className="block p-5 pb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-accent">{card.category}</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${gradeColors[card.grade]}`}>{card.grade}</span>
          </div>
          <div className="flex items-center gap-1">
            {card.growth >= 0 ? (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400">
                <TrendingUp className="h-2.5 w-2.5" />+{card.growth}%
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-[10px] font-semibold text-red-400">
                <TrendingDown className="h-2.5 w-2.5" />{card.growth}%
              </span>
            )}
          </div>
        </div>

        <h4 className="font-display text-sm font-semibold text-foreground mb-1 group-hover:text-accent transition-colors">{card.name}</h4>
        <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{card.aiInsight}</p>

        {/* Metrics row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="p-2 rounded-lg bg-surface/50 border border-border text-center">
            <Package className="h-3 w-3 text-blue-400 mx-auto mb-0.5" />
            <p className="font-display text-xs font-bold text-foreground">{card.productCount}</p>
            <p className="text-[8px] text-muted-foreground uppercase">Products</p>
          </div>
          <div className="p-2 rounded-lg bg-surface/50 border border-border text-center">
            <DollarSign className="h-3 w-3 text-emerald-400 mx-auto mb-0.5" />
            <p className="font-display text-xs font-bold text-foreground">{card.avgMargin}%</p>
            <p className="text-[8px] text-muted-foreground uppercase">Avg Margin</p>
          </div>
          <div className="flex items-center justify-center">
            <ScoreRing score={card.overallScore} size={48} />
          </div>
        </div>

        {/* Sparkline */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">7-day demand trend</span>
          <MiniSparkline points={card.demandSparkline} />
        </div>
      </Link>

      {/* Expand toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-center gap-1.5 py-2 border-t border-border text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors"
      >
        {expanded ? "Less details" : "More details"}
        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {/* Expanded section */}
      {expanded && (
        <div className="p-5 pt-3 border-t border-border">
          <div className="grid grid-cols-2 gap-4">
            {/* Radar Chart */}
            <div>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Score Breakdown</p>
              <div className="w-full aspect-square max-w-[130px] mx-auto">
                <MiniRadar scores={card.scores} />
              </div>
            </div>
            {/* Details */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Key Metrics</p>
              {Object.entries(card.scores).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground capitalize">{key === "seasonality" ? "Season" : key}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 rounded-full bg-surface overflow-hidden">
                      <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: `${val}%` }} />
                    </div>
                    <span className="text-[10px] font-semibold text-foreground w-6 text-right">{val}</span>
                  </div>
                </div>
              ))}
              <div className="pt-2 mt-2 border-t border-border">
                <p className="text-[10px] text-muted-foreground mb-0.5">Top product</p>
                <Link href="/products" className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors">
                  {card.topProduct}
                </Link>
              </div>
            </div>
          </div>
          <Link href="/products/niches" className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all">
            Explore Niche <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function NicheRadarCards({ niches }: { niches: NicheCardType[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Niche Opportunities</h3>
            <p className="text-[10px] text-muted-foreground">AI ranked by demand, margin, competition & trend data</p>
          </div>
        </div>
        <Link href="/products/niches" className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
          View all <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
        {niches.map((niche, i) => (
          <NicheCard key={niche.name} card={niche} index={i} />
        ))}
      </div>
    </div>
  );
}
