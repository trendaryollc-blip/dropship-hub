"use client";

import { Target, BarChart3, ArrowUpRight, AlertTriangle } from "lucide-react";
import type { CompetitionAnalysisResult } from "@/types/product-validation";

const positionConfig = {
  dominant: { color: "text-emerald-400", bg: "bg-emerald-400/10", gradient: "from-emerald-400 to-emerald-500" },
  strong: { color: "text-blue-400", bg: "bg-blue-400/10", gradient: "from-blue-400 to-blue-500" },
  competitive: { color: "text-amber-400", bg: "bg-amber-400/10", gradient: "from-amber-400 to-amber-500" },
  weak: { color: "text-orange-400", bg: "bg-orange-400/10", gradient: "from-orange-400 to-orange-500" },
  struggling: { color: "text-red-400", bg: "bg-red-400/10", gradient: "from-red-400 to-red-500" },
  unknown: { color: "text-muted-foreground", bg: "bg-muted", gradient: "from-muted-foreground to-muted-foreground" },
};

export default function CompetitionAnalysisCard({ data }: { data: CompetitionAnalysisResult }) {
  const position = positionConfig[data.competitivePosition];
  const circumference = 2 * Math.PI * 35;
  const dashoffset = circumference - (data.score / 100) * circumference;

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${position.gradient} opacity-[0.03] pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${position.bg} flex items-center justify-center border border-current/20`}>
            <Target className={`h-5 w-5 ${position.color}`} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Competition Analysis</h3>
            <p className="text-[11px] text-muted-foreground">Market position & landscape</p>
          </div>
        </div>
        <div className="relative w-14 h-14 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="5" className="text-surface" />
            <circle cx="40" cy="40" r="35" fill="none" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashoffset}
              className={position.color} style={{ stroke: "currentColor", transition: "stroke-dashoffset 1s ease" }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-display font-black ${position.color}`}>{data.score}</span>
          </div>
        </div>
      </div>

      {/* Competitive Position */}
      <div className="mb-5 relative">
        <div className={`p-4 rounded-xl ${position.bg} border border-current/15`}>
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Competitive Position</p>
          <p className={`text-2xl font-display font-black capitalize ${position.color}`}>{data.competitivePosition}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{data.marketPositioning}</p>
        </div>
      </div>

      {/* Competitor Count & Top Competitor */}
      <div className="grid grid-cols-3 gap-3 mb-5 relative">
        <div className="rounded-xl bg-surface/40 p-4 text-center border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Competitors</p>
          <p className="text-xl font-display font-bold text-foreground">{data.competitorCount}</p>
        </div>
        <div className="rounded-xl bg-surface/40 p-4 text-center border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Top Price</p>
          <p className="text-xl font-display font-bold text-foreground">${data.topCompetitor.price.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-surface/40 p-4 text-center border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Top Rating</p>
          <p className="text-xl font-display font-bold text-amber-400">{data.topCompetitor.rating}★</p>
        </div>
      </div>

      {/* Price Gaps */}
      <div className="grid grid-cols-3 gap-3 mb-5 relative">
        <div className="rounded-xl bg-surface/40 p-3 border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium">vs Lowest</p>
          <p className={`text-sm font-bold ${data.priceGap.vsLowest > 0 ? "text-red-400" : "text-emerald-400"}`}>
            {data.priceGap.vsLowest > 0 ? "+" : ""}{data.priceGap.vsLowest}%
          </p>
        </div>
        <div className="rounded-xl bg-surface/40 p-3 border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium">vs Average</p>
          <p className={`text-sm font-bold ${data.priceGap.vsAverage > 0 ? "text-amber-400" : "text-emerald-400"}`}>
            {data.priceGap.vsAverage > 0 ? "+" : ""}{data.priceGap.vsAverage}%
          </p>
        </div>
        <div className="rounded-xl bg-surface/40 p-3 border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-1 font-medium">vs Highest</p>
          <p className={`text-sm font-bold ${data.priceGap.vsHighest > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {data.priceGap.vsHighest > 0 ? "+" : ""}{data.priceGap.vsHighest}%
          </p>
        </div>
      </div>

      {/* Differentiation Opportunities */}
      {data.differentiationOpportunities.length > 0 && (
        <div className="mb-5 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Differentiation Opportunities</p>
          <div className="space-y-2">
            {data.differentiationOpportunities.map((opp, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-400/5 border border-emerald-400/15">
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-emerald-400/80 leading-relaxed">{opp}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Threats */}
      {data.threats.length > 0 && (
        <div className="mb-5 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Threats</p>
          <div className="space-y-2">
            {data.threats.map((threat, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-red-400/5 border border-red-400/15">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-red-400/80 leading-relaxed">{threat}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight */}
      <div className="p-3 rounded-xl bg-surface/20 border border-border/30">
        <div className="flex items-start gap-2">
          <BarChart3 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[12px] text-foreground/80 leading-relaxed">{data.insight}</p>
        </div>
      </div>
    </div>
  );
}
