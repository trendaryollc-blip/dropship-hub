"use client";

import { Globe, TrendingUp, BarChart3, Zap } from "lucide-react";
import type { MarketIntelligenceResult } from "@/types/product-validation";

export default function MarketIntelligenceCard({ data }: { data: MarketIntelligenceResult }) {
  const circumference = 2 * Math.PI * 35;
  const dashoffset = circumference - (data.score / 100) * circumference;
  const scoreColor = data.score >= 70 ? "text-emerald-400" : data.score >= 40 ? "text-amber-400" : "text-red-400";
  const scoreGradient = data.score >= 70 ? "from-emerald-400 to-emerald-500" : data.score >= 40 ? "from-amber-400 to-amber-500" : "from-red-400 to-red-500";

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${scoreGradient} opacity-[0.03] pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-400/10 flex items-center justify-center border border-blue-400/20">
            <Globe className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Market Intelligence</h3>
            <p className="text-[11px] text-muted-foreground">Est. TAM / SAM / SOM (category benchmarks)</p>
          </div>
        </div>
        <div className="relative w-14 h-14 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="5" className="text-surface" />
            <circle cx="40" cy="40" r="35" fill="none" strokeWidth="5" strokeLinecap="round"
              strokeDasharray={circumference} strokeDashoffset={dashoffset}
              className={scoreColor} style={{ stroke: "currentColor", transition: "stroke-dashoffset 1s ease" }} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-display font-black ${scoreColor}`}>{data.score}</span>
          </div>
        </div>
      </div>

      {/* Market Size */}
      <div className="grid grid-cols-3 gap-3 mb-5 relative">
        <div className="rounded-xl bg-surface/40 p-4 text-center border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Est. TAM</p>
          <p className="text-lg font-display font-bold text-blue-400">${data.marketSize.tam.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground mt-1">Category benchmark</p>
        </div>
        <div className="rounded-xl bg-surface/40 p-4 text-center border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Est. SAM</p>
          <p className="text-lg font-display font-bold text-emerald-400">${data.marketSize.sam.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground mt-1">Serviceable</p>
        </div>
        <div className="rounded-xl bg-surface/40 p-4 text-center border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Est. SOM</p>
          <p className="text-lg font-display font-bold text-amber-400">${data.marketSize.som.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground mt-1">Obtainable</p>
        </div>
      </div>

      {/* Growth Rate */}
      <div className="grid grid-cols-2 gap-3 mb-5 relative">
        <div className="rounded-xl bg-surface/40 p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <p className="text-[10px] text-muted-foreground font-medium">Est. Growth Rate</p>
          </div>
          <p className="text-lg font-display font-bold text-emerald-400">{data.growthRate.current}%</p>
          <p className="text-[9px] text-muted-foreground mt-1">Projected: {data.growthRate.projected}% (benchmark)</p>
          <p className={`text-[10px] font-medium mt-1 capitalize ${data.growthRate.trend === "accelerating" ? "text-emerald-400" : data.growthRate.trend === "stable" ? "text-blue-400" : "text-amber-400"}`}>
            {data.growthRate.trend}
          </p>
        </div>
        <div className="rounded-xl bg-surface/40 p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="h-4 w-4 text-blue-400" />
            <p className="text-[10px] text-muted-foreground font-medium">Sales Demand Proxy</p>
          </div>
          <p className={`text-lg font-display font-bold capitalize ${data.demandIndicators.socialBuzz === "high" ? "text-emerald-400" : data.demandIndicators.socialBuzz === "medium" ? "text-amber-400" : "text-red-400"}`}>
            {data.demandIndicators.socialBuzz}
          </p>
          <p className="text-[9px] text-muted-foreground mt-1">From sales estimate — not social listening</p>
          <p className="text-[9px] text-muted-foreground mt-1">Elasticity: {data.priceElasticity}</p>
        </div>
      </div>

      {/* Audience Demographics */}
      <div className="mb-5 relative">
        <div className="p-4 rounded-xl bg-surface/20 border border-border/30">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Audience</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground mb-1 font-medium">Primary Age</p>
              <p className="text-sm font-bold text-foreground">{data.audienceDemographics.primaryAge}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground mb-1 font-medium">Gender Split</p>
              <p className="text-sm font-bold text-foreground">{data.audienceDemographics.genderSplit}</p>
              <p className="text-[9px] text-muted-foreground">No audience source connected</p>
            </div>
            <div className="col-span-2">
              <p className="text-[10px] text-muted-foreground mb-1 font-medium">Buying Behavior</p>
              <p className="text-[11px] text-foreground/80">{data.audienceDemographics.buyingBehavior}</p>
            </div>
          </div>
        </div>
      </div>

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
