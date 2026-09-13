"use client";

import { useState } from "react";
import { Shield, TrendingUp, Zap, AlertTriangle, ChevronDown, Target, Activity, Flame, Snowflake } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { ExecutiveSummary } from "@/types/competitors";

const threatConfig = {
  low: { label: "Low Threat", color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icon: Shield },
  medium: { label: "Medium Threat", color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", icon: AlertTriangle },
  high: { label: "High Threat", color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20", icon: AlertTriangle },
  critical: { label: "Critical Threat", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", icon: AlertTriangle },
};

const momentumConfig = {
  heating: { label: "Heating Up", color: "text-red-400", bg: "bg-red-400/10", icon: Flame, desc: "Market is getting competitive fast" },
  stable: { label: "Stable", color: "text-blue-400", bg: "bg-blue-400/10", icon: Activity, desc: "Competition level is steady" },
  cooling: { label: "Cooling Down", color: "text-cyan-400", bg: "bg-cyan-400/10", icon: Snowflake, desc: "Less competition entering the market" },
};

function IntensityBar({ score }: { score: number }) {
  const getColor = (s: number) => {
    if (s <= 30) return "from-emerald-400 to-emerald-500";
    if (s <= 60) return "from-amber-400 to-amber-500";
    if (s <= 80) return "from-orange-400 to-orange-500";
    return "from-red-400 to-red-500";
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Competition Intensity</span>
        <span className="text-sm font-display font-bold text-foreground">{score}/100</span>
      </div>
      <div className="h-2.5 rounded-full bg-surface overflow-hidden border border-border/50">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${getColor(score)} transition-all duration-1000 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-emerald-400">Low</span>
        <span className="text-[9px] text-amber-400">Medium</span>
        <span className="text-[9px] text-red-400">High</span>
      </div>
    </div>
  );
}

export default function ExecutiveSummaryBar({ summary }: { summary: ExecutiveSummary }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [expanded, setExpanded] = useState(false);
  const tc = threatConfig[summary.threatLevel];
  const mc = momentumConfig[summary.marketMomentum];
  const ThreatIcon = tc.icon;
  const MomentumIcon = mc.icon;

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <Target className="h-4 w-4 text-accent" />
            </div>
            <h3 className="font-display text-base font-semibold text-foreground">Executive Summary</h3>
            <span className="text-[10px] text-accent bg-accent/10 px-2 py-0.5 rounded-full font-medium border border-accent/20">AI</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className={`rounded-xl p-3 border ${tc.bg} ${tc.border}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <ThreatIcon className={`h-3.5 w-3.5 ${tc.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Threat</span>
              </div>
              <p className={`font-display text-sm font-bold ${tc.color}`}>{tc.label}</p>
            </div>

            <div className={`rounded-xl p-3 border ${mc.bg} border-border/50`}>
              <div className="flex items-center gap-1.5 mb-1">
                <MomentumIcon className={`h-3.5 w-3.5 ${mc.color}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Momentum</span>
              </div>
              <p className={`font-display text-sm font-bold ${mc.color}`}>{mc.label}</p>
            </div>

            <div className="rounded-xl p-3 border border-border/50 bg-surface/50">
              <div className="flex items-center gap-1.5 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-purple-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Sellers</span>
              </div>
              <p className="font-display text-sm font-bold text-foreground">{summary.totalSellers.toLocaleString()}</p>
            </div>

            <div className="rounded-xl p-3 border border-border/50 bg-surface/50">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Volatility</span>
              </div>
              <p className="font-display text-sm font-bold text-foreground">{summary.priceVolatility}%</p>
            </div>
          </div>

          <IntensityBar score={summary.competitionIntensity} />

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-400/5 border border-emerald-400/15 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider">Key Opportunity</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{summary.keyOpportunity}</p>
            </div>
            <div className="rounded-xl bg-red-400/5 border border-red-400/15 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <span className="text-[10px] font-semibold text-red-400 uppercase tracking-wider">Top Threat</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{summary.topThreat}</p>
            </div>
          </div>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 border-t border-border/50 text-xs text-muted-foreground hover:text-foreground hover:bg-surface/50 transition-all"
        >
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Less details" : "More details"}
        </button>

        {expanded && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-border/50">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
              <div className="text-center p-3 bg-surface/30 rounded-xl">
                <p className="font-display text-xl font-bold text-foreground">{summary.avgRating.toFixed(1)}</p>
                <p className="text-[10px] text-muted-foreground">Avg Rating</p>
              </div>
              <div className="text-center p-3 bg-surface/30 rounded-xl">
                <p className="font-display text-xl font-bold text-foreground">{summary.competitionIntensity}%</p>
                <p className="text-[10px] text-muted-foreground">Intensity Score</p>
              </div>
              <div className="text-center p-3 bg-surface/30 rounded-xl">
                <p className="font-display text-xl font-bold text-foreground">{mc.desc}</p>
                <p className="text-[10px] text-muted-foreground">Market Status</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
