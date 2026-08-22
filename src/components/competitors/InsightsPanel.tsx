"use client";

import { Lightbulb, ChevronRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";

export default function InsightsPanel({ insights }: { insights: string[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`glass rounded-2xl p-6 border border-border transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
          <Lightbulb className="h-4 w-4 text-amber-400" />
        </div>
        <h3 className="font-display text-base font-semibold text-foreground">Market Insights</h3>
        <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-medium border border-amber-400/20">AI Generated</span>
      </div>
      <div className="space-y-2.5">
        {insights.map((insight, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-xl bg-surface/30 border border-border/30 hover:border-accent/15 transition-all duration-500 group cursor-pointer ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className="w-6 h-6 rounded-md bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-[10px] font-bold text-accent">{i + 1}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed flex-1 group-hover:text-foreground/80 transition-colors">{insight}</p>
            <ChevronRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-accent/50 transition-all shrink-0 mt-1 group-hover:translate-x-0.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
