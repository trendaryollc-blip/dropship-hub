"use client";

import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, Users, Swords, Shield, AlertTriangle, Clock } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { MarketIntel } from "@/lib/mock-enrichment";

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score <= 30 ? "#22c55e" : score <= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
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
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="w-[80px] h-[24px] shrink-0" />;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const w = 80, h = 24;
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${(i / (points.length - 1)) * w} ${h - ((p - min) / range) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <defs><linearGradient id="miGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.2" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${pathD} L ${w} ${h} L 0 ${h} Z`} fill="url(#miGrad)" />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function MarketIntelligence({ data }: { data: MarketIntel }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const trendIcon = data.trendDirection === "rising" ? TrendingUp : data.trendDirection === "declining" ? TrendingDown : Minus;
  const trendColor = data.trendDirection === "rising" ? "text-emerald-400" : data.trendDirection === "declining" ? "text-red-400" : "text-muted-foreground";
  const TrendIcon = trendIcon;
  const volPct = data.searchVolume === "high" ? 90 : data.searchVolume === "medium" ? 55 : 25;

  return (
    <div ref={ref} className={`glass rounded-2xl border border-border overflow-hidden transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-400/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Market Intelligence</h3>
            <p className="text-[10px] text-muted-foreground">Demand, competition & risk analysis</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Trend + Volume row */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
              <span className="text-[10px] text-muted-foreground">Trend</span>
            </div>
            <p className={`text-sm font-bold capitalize ${trendColor}`}>{data.trendDirection}</p>
            <div className="mt-2"><MiniSparkline points={data.trendSparkline} /></div>
          </div>
          <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
            <div className="flex items-center gap-1.5 mb-2">
              <Users className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[10px] text-muted-foreground">Search Volume</span>
            </div>
            <p className="text-sm font-bold text-foreground capitalize">{data.searchVolume}</p>
            <div className="mt-2 h-1.5 rounded-full bg-surface overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-500 transition-all duration-700" style={{ width: `${volPct}%` }} />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">{data.searchVolumeNumber.toLocaleString()}/mo</p>
          </div>
        </div>

        {/* Seasonality */}
        <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[10px] text-muted-foreground">Seasonality</span>
          </div>
          <p className="text-xs text-foreground">{data.seasonality}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{data.bestTimeToSell}</p>
        </div>

        {/* Competition */}
        <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Swords className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] text-muted-foreground">Competition</span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
              data.competitionLevel === "low" ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" :
              data.competitionLevel === "medium" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" :
              "text-red-400 bg-red-400/10 border-red-400/20"
            }`}>{data.competitionLevel}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div><span className="text-muted-foreground">Sellers: </span><span className="text-foreground font-medium">{data.estimatedSellers.toLocaleString()}</span></div>
            <div><span className="text-muted-foreground">Avg Rating: </span><span className="text-foreground font-medium">{data.avgSellerRating}</span></div>
          </div>
          <div className="mt-2 flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">Price war risk: </span>
            <span className={`text-[10px] font-medium ${data.priceWarRisk === "low" ? "text-emerald-400" : data.priceWarRisk === "medium" ? "text-amber-400" : "text-red-400"}`}>{data.priceWarRisk}</span>
          </div>
        </div>

        {/* Can you compete? */}
        <div className="p-3 rounded-xl bg-accent/5 border border-accent/10">
          <div className="flex items-center gap-1.5 mb-1">
            <Shield className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] font-semibold text-accent">Can You Compete?</span>
          </div>
          <p className="text-xs text-foreground">{data.canCompete}</p>
        </div>

        {/* Risk Assessment */}
        <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] text-muted-foreground">Risk Assessment</span>
            </div>
            <ScoreRing score={data.riskScore} size={36} />
          </div>
          <div className="space-y-1.5">
            {data.riskFactors.map((f) => (
              <div key={f.label} className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{f.label}</span>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${f.level === "safe" ? "bg-emerald-400" : f.level === "caution" ? "bg-amber-400" : "bg-red-400"}`} />
                  <span className={`text-[10px] font-medium ${f.level === "safe" ? "text-emerald-400" : f.level === "caution" ? "text-amber-400" : "text-red-400"}`}>{f.level}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
