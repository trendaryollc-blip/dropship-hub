"use client";

import { useState } from "react";
import { ShieldCheck, ShieldAlert, Lightbulb, AlertTriangle, ChevronDown, ChevronRight, Target } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { CompetitorSWOT } from "@/types/competitors";

const swotConfig = {
  strengths: { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-400/5", border: "border-emerald-400/20", badge: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20", label: "Strengths" },
  weaknesses: { icon: ShieldAlert, color: "text-red-400", bg: "bg-red-400/5", border: "border-red-400/20", badge: "bg-red-400/10 text-red-400 border-red-400/20", label: "Weaknesses" },
  opportunities: { icon: Lightbulb, color: "text-amber-400", bg: "bg-amber-400/5", border: "border-amber-400/20", badge: "bg-amber-400/10 text-amber-400 border-amber-400/20", label: "Opportunities" },
  threats: { icon: AlertTriangle, color: "text-purple-400", bg: "bg-purple-400/5", border: "border-purple-400/20", badge: "bg-purple-400/10 text-purple-400 border-purple-400/20", label: "Threats" },
};

function SWOTCard({ category, items }: { category: keyof typeof swotConfig; items: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const config = swotConfig[category];
  const Icon = config.icon;
  const visibleItems = expanded ? items : items.slice(0, 2);

  return (
    <div className={`rounded-xl p-3 border ${config.border} ${config.bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
        <span className="text-xs font-semibold text-foreground">{config.label}</span>
        <span className="text-[9px] text-muted-foreground">({items.length})</span>
      </div>
      <ul className="space-y-1.5">
        {visibleItems.map((item, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[11px] text-muted-foreground leading-relaxed">
            <span className={`w-1 h-1 rounded-full ${config.color.replace("text-", "bg-")} shrink-0 mt-1.5`} />
            {item}
          </li>
        ))}
      </ul>
      {items.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-2 text-[10px] text-accent hover:text-accent/80 transition-colors"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show less" : `Show ${items.length - 2} more`}
        </button>
      )}
    </div>
  );
}

export default function SWOTAnalysis({ competitors }: { competitors: CompetitorSWOT[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <h3 className="font-display text-base font-semibold text-foreground mb-4 flex items-center gap-2">
        <span className="text-lg">📋</span> SWOT Analysis
        <span className="text-xs font-normal text-muted-foreground ml-1">({competitors.length} competitors)</span>
      </h3>

      <div className="space-y-3">
        {competitors.map((comp, i) => {
          const isOpen = expanded === comp.sellerName;
          return (
            <div
              key={comp.sellerName}
              className={`glass rounded-xl border transition-all duration-500 ${isOpen ? "border-accent/30 shadow-lg shadow-accent/5" : "border-border hover:border-accent/15"} ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <button
                onClick={() => setExpanded(isOpen ? null : comp.sellerName)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-display text-sm font-semibold text-foreground truncate">{comp.sellerName}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{comp.exploitableVulnerability}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                    {comp.strengths.length} S
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-red-400/10 text-red-400 border border-red-400/20">
                    {comp.weaknesses.length} W
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 border border-amber-400/20">
                    {comp.opportunities.length} O
                  </span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-purple-400/10 text-purple-400 border border-purple-400/20">
                    {comp.threats.length} T
                  </span>
                </div>
                <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "rotate-90" : ""}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 border-t border-border/50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 mb-4">
                    <SWOTCard category="strengths" items={comp.strengths} />
                    <SWOTCard category="weaknesses" items={comp.weaknesses} />
                    <SWOTCard category="opportunities" items={comp.opportunities} />
                    <SWOTCard category="threats" items={comp.threats} />
                  </div>

                  <div className="rounded-xl bg-accent/5 border border-accent/15 p-3">
                    <div className="flex items-center gap-2 mb-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 text-accent" />
                      <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">Exploitable Vulnerability</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{comp.exploitableVulnerability}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
