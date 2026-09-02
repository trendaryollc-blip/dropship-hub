"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, Users, Swords, Shield, AlertTriangle, Clock } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { MarketIntel } from "@/types/enrichment";

function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score <= 30 ? "#22c55e" : score <= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="3" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}

function MiniSparkline({ points, color = "#3b82f6" }: { points: number[]; color?: string }) {
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard SSR mount guard
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="w-full h-[32px] shrink-0" />;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 120, h = 32;
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (points.length - 1)) * w} ${h - ((p - min) / range) * h}`).join(" ");
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0" preserveAspectRatio="none">
      <defs><linearGradient id="miGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${pathD} L ${w} ${h} L 0 ${h} Z`} fill="url(#miGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function MarketIntelligence({ data }: { data: MarketIntel | null }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  if (!data) {
    return (
      <div ref={ref} className={`intel-card transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="p-5 border-b border-border/50 flex items-center gap-3">
          <div className="icon-container-blue"><BarChart3 className="h-4 w-4 text-blue-400" /></div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Market Intelligence</h3>
            <p className="text-[10px] text-muted-foreground">Demand, competition & risk analysis</p>
          </div>
        </div>
        <div className="p-8 text-center">
          <BarChart3 className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Market intelligence unavailable</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Data could not be fetched for this product</p>
        </div>
      </div>
    );
  }
  const trendIcon = data.trendDirection === "rising" ? TrendingUp : data.trendDirection === "declining" ? TrendingDown : Minus;
  const trendColor = data.trendDirection === "rising" ? "text-emerald-400" : data.trendDirection === "declining" ? "text-red-400" : "text-muted-foreground";
  const TrendIcon = trendIcon;
  const volPct = data.searchVolume === "high" ? 90 : data.searchVolume === "medium" ? 55 : 25;

  const compPct = data.competitionLevel === "low" ? 20 : data.competitionLevel === "medium" ? 50 : data.competitionLevel === "high" ? 75 : 95;

  return (
    <div ref={ref} className={`intel-card transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Header */}
      <div className="p-5 border-b border-border/50 flex items-center gap-3">
        <div className="icon-container-blue">
          <BarChart3 className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Market Intelligence</h3>
          <p className="text-[10px] text-muted-foreground">Demand, competition & risk analysis</p>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Trend + Volume — side by side with distinct looks */}
        <div className="grid grid-cols-2 gap-3">
          {/* Trend tile — sparkline as background */}
          <div className="intel-tile overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 mb-2">
                <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
                <span className="text-[10px] text-muted-foreground font-medium">Trend</span>
              </div>
              <p className={`text-base font-bold capitalize ${trendColor} mb-3`}>{data.trendDirection}</p>
            </div>
            <div className="relative -mx-2 -mb-2 mt-1 opacity-60">
              <MiniSparkline points={data.trendSparkline} />
            </div>
          </div>

          {/* Volume tile — big bar */}
          <div className="intel-tile">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] text-muted-foreground font-medium">Search Volume</span>
            </div>
            <p className="text-base font-bold text-foreground capitalize mb-3">{data.searchVolume}</p>
            <div className="h-2 rounded-full bg-surface overflow-hidden mb-1.5">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-700" style={{ width: `${volPct}%` }} />
            </div>
            <p className="text-[9px] text-muted-foreground">{data.searchVolumeNumber.toLocaleString()} searches/mo</p>
          </div>
        </div>

        {/* Seasonality — full width with icon watermark */}
        <div className="intel-tile relative overflow-hidden">
          <div className="absolute top-1/2 -translate-y-1/2 right-3 opacity-[0.03]">
            <Clock className="h-20 w-20" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] text-muted-foreground font-medium">Seasonality</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{data.seasonality}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{data.bestTimeToSell}</p>
          </div>
        </div>

        {/* Competition — visual bar */}
        <div className="intel-tile">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <Swords className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] text-muted-foreground font-medium">Competition</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
              data.competitionLevel === "low" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" :
              data.competitionLevel === "medium" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" :
              "text-red-400 bg-red-400/10 border-red-400/20"
            }`}>{data.competitionLevel}</span>
          </div>
          <div className="competition-bar mb-3">
            <div className="competition-indicator" style={{ left: `calc(${compPct}% - 7px)` }} />
          </div>
          <div className="flex items-center justify-between">
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[10px]">
              <div><span className="text-muted-foreground">Sellers: </span><span className="text-foreground font-semibold">{data.estimatedSellers.toLocaleString()}</span></div>
              <div><span className="text-muted-foreground">Avg Rating: </span><span className="text-foreground font-semibold">{data.avgSellerRating}</span></div>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] text-muted-foreground">Price war: </span>
              <span className={`text-[10px] font-semibold ${data.priceWarRisk === "low" ? "text-emerald-400" : data.priceWarRisk === "medium" ? "text-amber-400" : "text-red-400"}`}>{data.priceWarRisk}</span>
            </div>
          </div>
        </div>

        {/* Can you compete? — prominent callout */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-accent/5 to-blue-500/5 border border-accent/10 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-accent/3 to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="icon-container-blue mt-0.5">
              <Shield className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-accent uppercase tracking-wider mb-0.5">Can You Compete?</p>
              <p className="text-sm text-foreground leading-relaxed">{data.canCompete}</p>
            </div>
          </div>
        </div>

        {/* Risk Assessment — prominent gauge + pills */}
        <div className="intel-tile">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] text-muted-foreground font-medium">Risk Assessment</span>
            </div>
            <ScoreRing score={data.riskScore} size={44} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.riskFactors.map((f) => (
              <span key={f.label} className={`risk-pill ${
                f.level === "safe" ? "text-emerald-400 bg-emerald-400/8 border-emerald-400/15" :
                f.level === "caution" ? "text-amber-400 bg-amber-400/8 border-amber-400/15" :
                "text-red-400 bg-red-400/8 border-red-400/15"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${f.level === "safe" ? "bg-emerald-400" : f.level === "caution" ? "bg-amber-400" : "bg-red-400"}`} />
                {f.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
