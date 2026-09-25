"use client";

import { Package, Sparkles, ShoppingCart, TrendingUp } from "lucide-react";
import type { BundleAnalysisResult } from "@/types/product-validation";

const typeConfig = {
  "cross-sell": { color: "text-blue-400", bg: "bg-blue-400/10" },
  upsell: { color: "text-emerald-400", bg: "bg-emerald-400/10" },
  bundle: { color: "text-purple-400", bg: "bg-purple-400/10" },
  accessory: { color: "text-amber-400", bg: "bg-amber-400/10" },
};

export default function BundleOpportunityCard({ data }: { data: BundleAnalysisResult }) {
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
          <div className="h-10 w-10 rounded-xl bg-purple-400/10 flex items-center justify-center border border-purple-400/20">
            <Package className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Bundle Opportunities</h3>
            <p className="text-[11px] text-muted-foreground">Cross-sell & upsell potential</p>
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

      {/* Bundle Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-5 relative">
        <div className="rounded-xl bg-surface/40 p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <p className="text-[10px] text-muted-foreground font-medium">Est. Revenue Lift</p>
          </div>
          <p className="text-lg font-display font-bold text-emerald-400">+{data.avgOrderValuePotential.lift}%</p>
          <p className="text-[9px] text-muted-foreground mt-1">Current: ${data.avgOrderValuePotential.current.toFixed(2)}</p>
          <p className="text-[9px] text-emerald-400 mt-0.5">Potential: ${data.avgOrderValuePotential.potential.toFixed(2)}</p>
          <p className="text-[9px] text-muted-foreground mt-0.5">Rule-based heuristic, not measured</p>
        </div>
        <div className="rounded-xl bg-surface/40 p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            <p className="text-[10px] text-muted-foreground font-medium">Lifetime Impact</p>
          </div>
          <p className="text-sm font-bold text-foreground">${data.customerLifetimeImpact.withBundles.toFixed(2)}</p>
          <p className="text-[9px] text-muted-foreground mt-1">vs ${data.customerLifetimeImpact.oneTime.toFixed(2)} one-time</p>
        </div>
      </div>

      {/* Bundle Opportunities */}
      {data.bundleOpportunities.length > 0 && (
        <div className="mb-5 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Opportunities</p>
          <div className="space-y-2">
            {data.bundleOpportunities.map((opp, i) => {
              const cfg = typeConfig[opp.type];
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface/20 border border-border/30 hover:bg-surface/40 transition-colors">
                  <div className={`h-8 w-8 rounded-lg ${cfg.bg} flex items-center justify-center shrink-0`}>
                    <ShoppingCart className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] text-foreground font-medium truncate">{opp.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.color} font-medium capitalize`}>{opp.type}</span>
                      <span className="text-[9px] text-emerald-400 font-medium">+{opp.expectedLift}% est. lift</span>
                      <span className="text-[9px] text-muted-foreground">{Math.round(opp.confidence * 100)}% heuristic</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="mb-5 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Recommendations</p>
          <div className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-purple-400/5 border border-purple-400/15">
                <span className="text-[11px] font-bold text-purple-400 mt-0.5 shrink-0">{i + 1}.</span>
                <p className="text-[11px] text-purple-400/80 leading-relaxed">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insight */}
      <div className="p-3 rounded-xl bg-surface/20 border border-border/30">
        <div className="flex items-start gap-2">
          <Package className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[12px] text-foreground/80 leading-relaxed">{data.insight}</p>
        </div>
      </div>
    </div>
  );
}
