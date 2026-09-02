"use client";

import { useState } from "react";
import { Zap, AlertTriangle, ShieldAlert, ArrowRight, X } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { Opportunity } from "@/types/competitors";

const config = {
  opportunity: { icon: Zap, color: "emerald", border: "border-emerald-400/30", bg: "bg-emerald-400/5", glow: "shadow-emerald-400/10", badge: "bg-emerald-400/15 text-emerald-400 border-emerald-400/20", ring: "from-emerald-400 to-emerald-600" },
  gap: { icon: AlertTriangle, color: "amber", border: "border-amber-400/30", bg: "bg-amber-400/5", glow: "shadow-amber-400/10", badge: "bg-amber-400/15 text-amber-400 border-amber-400/20", ring: "from-amber-400 to-amber-600" },
  avoid: { icon: ShieldAlert, color: "red", border: "border-red-400/30", bg: "bg-red-400/5", glow: "shadow-red-400/10", badge: "bg-red-400/15 text-red-400 border-red-400/20", ring: "from-red-400 to-red-600" },
};

function DetailModal({ opp, onClose }: { opp: Opportunity; onClose: () => void }) {
  const c = config[opp.type];
  const Icon = c.icon;
  const tips = {
    opportunity: [
      "These products are priced significantly below market average",
      "Quick flip potential - buy low, sell at market price",
      "Check seller ratings before purchasing",
      "Verify product condition and authenticity",
      "Calculate total cost including shipping and fees",
    ],
    gap: [
      "There's a pricing gap between cheap and expensive competitors",
      "You can position your price in this sweet spot",
      "Focus on better product descriptions and photos",
      "Offer bundle deals to justify higher prices",
      "Consider adding value-added services (fast shipping, warranty)",
    ],
    avoid: [
      "These products have thin margins due to aggressive pricing",
      "Price wars erode profitability quickly",
      "Consider differentiating with bundles or unique listings",
      "Target a different audience or niche variant",
      "Focus on products with less price competition",
    ],
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass rounded-2xl border border-border w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className={`p-5 border-b border-border ${c.bg}`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${c.badge}`}>
              <Icon className="h-3.5 w-3.5" />
              {opp.type === "opportunity" ? "OPPORTUNITY" : opp.type === "gap" ? "PRICING GAP" : "AVOID"}
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-hover transition-colors"><X className="h-4 w-4" /></button>
          </div>
          <h3 className="font-display text-lg font-bold text-foreground mt-3">{opp.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{opp.description}</p>
        </div>
        <div className="p-5">
          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Action Items</h4>
          <div className="space-y-2">
            {tips[opp.type].map((tip, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-surface flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-accent">{i + 1}</span>
                </span>
                {tip}
              </div>
            ))}
          </div>
          <button onClick={onClose} className="w-full mt-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OpportunityFinder({ opportunities }: { opportunities: Opportunity[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="text-lg">🎯</span> AI Opportunity Finder
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {opportunities.map((opp, i) => {
          const c = config[opp.type];
          const Icon = c.icon;
          return (
            <div
              key={opp.type}
              onClick={() => setSelectedOpp(opp)}
              className={`relative glass rounded-2xl p-4 sm:p-6 border ${c.border} ${c.bg} overflow-hidden transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 120}ms` }}
            >
              <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${c.ring} opacity-5 rounded-bl-full`} />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${c.badge}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {opp.type === "opportunity" ? "OPPORTUNITY" : opp.type === "gap" ? "PRICING GAP" : "AVOID"}
                  </div>
                  {opp.potentialMargin && (
                    <span className="text-xl sm:text-2xl font-bold text-foreground">{opp.potentialMargin}%</span>
                  )}
                </div>
                <h4 className="font-display text-lg font-bold text-foreground mb-2">{opp.title}</h4>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{opp.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{opp.count} items</span>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-foreground group-hover:gap-2.5 transition-all duration-300">
                    {opp.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedOpp && (
        <DetailModal opp={selectedOpp} onClose={() => setSelectedOpp(null)} />
      )}
    </div>
  );
}
