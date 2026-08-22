"use client";

import { BarChart3, Sparkles } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { PriceTier } from "@/lib/mock-competitors";

export default function PriceDistribution({ tiers, avgPrice }: { tiers: PriceTier[]; avgPrice: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const maxCount = Math.max(...tiers.map((t) => t.count), 1);

  return (
    <div ref={ref} className={`glass rounded-2xl p-6 border border-border transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-accent" />
          <h3 className="font-display text-base font-semibold text-foreground">Price Distribution</h3>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full">
          <Sparkles className="h-3 w-3" />
          <span>AI Analyzed</span>
        </div>
      </div>

      <div className="space-y-3">
        {tiers.map((tier, i) => (
          <div key={tier.range} className={`group transition-all duration-500 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${i * 100}ms` }}>
            <div className="flex items-center gap-3">
              <span className={`text-[10px] sm:text-xs font-mono w-16 sm:w-28 text-right shrink-0 ${tier.isSweetSpot ? "text-emerald-400 font-bold" : "text-muted-foreground"}`}>{tier.range}</span>
              <div className="flex-1 relative">
                <div className="h-8 rounded-lg bg-surface/50 border border-border/50 overflow-hidden">
                  <div
                    className={`h-full rounded-lg transition-all duration-1000 ease-out ${tier.isSweetSpot ? "bg-gradient-to-r from-emerald-500/80 to-emerald-400/60 border border-emerald-400/30" : "bg-gradient-to-r from-accent/40 to-accent/25"}`}
                    style={{ width: isInView ? `${(tier.count / maxCount) * 100}%` : "0%", transitionDelay: `${200 + i * 120}ms` }}
                  />
                </div>
                <div className="absolute inset-0 flex items-center justify-between px-3 overflow-hidden">
                  <span className="text-xs font-medium text-foreground/90 truncate">{tier.count} sellers</span>
                  {tier.isSweetSpot && (
                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-400/15 px-2 py-0.5 rounded-full border border-emerald-400/20">
                      <Sparkles className="h-2.5 w-2.5" />
                      SWEET SPOT
                    </span>
                  )}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground w-8 text-right">{tier.percent}%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-5 p-3 rounded-xl bg-accent/5 border border-accent/10">
        <p className="text-xs text-muted-foreground">
          <span className="text-accent font-medium">Market Insight:</span> Most competitors price between{" "}
          <span className="text-foreground font-medium">${(avgPrice * 0.8).toFixed(2)} - ${(avgPrice * 1.1).toFixed(2)}</span>.
          Price here to stay competitive, or go below to capture volume.
        </p>
      </div>
    </div>
  );
}
