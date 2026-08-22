"use client";

import { Zap, AlertTriangle, ShieldAlert, ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { Opportunity } from "@/lib/mock-competitors";

const config = {
  opportunity: { icon: Zap, color: "emerald", border: "border-emerald-400/30", bg: "bg-emerald-400/5", glow: "shadow-emerald-400/10", badge: "bg-emerald-400/15 text-emerald-400 border-emerald-400/20", ring: "from-emerald-400 to-emerald-600" },
  gap: { icon: AlertTriangle, color: "amber", border: "border-amber-400/30", bg: "bg-amber-400/5", glow: "shadow-amber-400/10", badge: "bg-amber-400/15 text-amber-400 border-amber-400/20", ring: "from-amber-400 to-amber-600" },
  avoid: { icon: ShieldAlert, color: "red", border: "border-red-400/30", bg: "bg-red-400/5", glow: "shadow-red-400/10", badge: "bg-red-400/15 text-red-400 border-red-400/20", ring: "from-red-400 to-red-600" },
};

export default function OpportunityFinder({ opportunities }: { opportunities: Opportunity[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

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
              className={`relative glass rounded-2xl p-6 border ${c.border} ${c.bg} overflow-hidden transition-all duration-500 hover:scale-[1.02] cursor-pointer group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
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
                    <span className="text-2xl font-bold text-foreground">{opp.potentialMargin}%</span>
                  )}
                </div>
                <h4 className="font-display text-lg font-bold text-foreground mb-2">{opp.title}</h4>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{opp.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{opp.count} items</span>
                  <button className="flex items-center gap-1.5 text-xs font-medium text-foreground hover:text-foreground/80 group-hover:gap-2.5 transition-all duration-300">
                    {opp.actionLabel} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
