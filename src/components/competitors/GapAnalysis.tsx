"use client";

import { useState } from "react";
import { Layers, Search, FileText, Key, DollarSign, ArrowRight, TrendingUp } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { GapItem } from "@/types/competitors";

const gapIcons: Record<string, typeof Layers> = {
  product: Layers,
  feature: Search,
  content: FileText,
  keyword: Key,
  price: DollarSign,
};

const gapColors: Record<string, { border: string; bg: string; icon: string; badge: string }> = {
  product: { border: "border-blue-400/30", bg: "bg-blue-400/5", icon: "text-blue-400", badge: "bg-blue-400/10 text-blue-400 border-blue-400/20" },
  feature: { border: "border-purple-400/30", bg: "bg-purple-400/5", icon: "text-purple-400", badge: "bg-purple-400/10 text-purple-400 border-purple-400/20" },
  content: { border: "border-amber-400/30", bg: "bg-amber-400/5", icon: "text-amber-400", badge: "bg-amber-400/10 text-amber-400 border-amber-400/20" },
  keyword: { border: "border-cyan-400/30", bg: "bg-cyan-400/5", icon: "text-cyan-400", badge: "bg-cyan-400/10 text-cyan-400 border-cyan-400/20" },
  price: { border: "border-emerald-400/30", bg: "bg-emerald-400/5", icon: "text-emerald-400", badge: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" },
};

const competitionColors = {
  low: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  high: "text-red-400 bg-red-400/10 border-red-400/20",
};

function DetailModal({ gap, onClose }: { gap: GapItem; onClose: () => void }) {
  const c = gapColors[gap.type];
  const Icon = gapIcons[gap.type] || Layers;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative glass rounded-2xl border border-border w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className={`p-5 border-b border-border ${c.bg}`}>
          <div className="flex items-center justify-between">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${c.badge}`}>
              <Icon className="h-3.5 w-3.5" />
              {gap.type.toUpperCase()} GAP
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${competitionColors[gap.competitionLevel]}`}>
              {gap.competitionLevel} competition
            </span>
          </div>
          <h3 className="font-display text-lg font-bold text-foreground mt-3">{gap.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{gap.description}</p>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-surface/50 rounded-xl p-3 border border-border/50 text-center">
              <p className="font-display text-lg font-bold text-foreground">{gap.demandScore}%</p>
              <p className="text-[10px] text-muted-foreground">Demand Score</p>
            </div>
            <div className="bg-surface/50 rounded-xl p-3 border border-border/50 text-center">
              <p className="font-display text-lg font-bold text-accent">{gap.estimatedValue}</p>
              <p className="text-[10px] text-muted-foreground">Est. Value</p>
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recommended Actions</h4>
            <div className="flex items-start gap-2 text-sm text-muted-foreground p-3 bg-surface/30 rounded-xl border border-border/30">
              <ArrowRight className="h-4 w-4 text-accent shrink-0 mt-0.5" />
              <span>{gap.description}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors">
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GapAnalysis({ gaps }: { gaps: GapItem[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [selectedGap, setSelectedGap] = useState<GapItem | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const types = ["all", ...Array.from(new Set(gaps.map((g) => g.type)))];
  const filtered = filter === "all" ? gaps : gaps.filter((g) => g.type === filter);

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
          <span className="text-lg">🔍</span> Gap Analysis
          <span className="text-xs font-normal text-muted-foreground ml-1">({gaps.length} gaps found)</span>
        </h3>
        <div className="flex gap-1">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-all capitalize ${
                filter === t
                  ? "bg-accent/10 text-accent border-accent/20"
                  : "text-muted-foreground border-border hover:border-accent/20"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filtered.map((gap, i) => {
          const c = gapColors[gap.type];
          const Icon = gapIcons[gap.type] || Layers;
          return (
            <div
              key={`${gap.type}-${gap.title}`}
              onClick={() => setSelectedGap(gap)}
              className={`glass rounded-xl p-4 border ${c.border} ${c.bg} cursor-pointer hover:scale-[1.01] active:scale-[0.99] transition-all duration-500 group ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold border ${c.badge}`}>
                  <Icon className="h-3 w-3" />
                  {gap.type.toUpperCase()}
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${competitionColors[gap.competitionLevel]}`}>
                  {gap.competitionLevel}
                </span>
              </div>
              <h4 className="font-display text-sm font-semibold text-foreground mb-1.5">{gap.title}</h4>
              <p className="text-xs text-muted-foreground leading-relaxed mb-3">{gap.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-3 w-3 text-accent" />
                    <span className="text-[10px] font-medium text-foreground">{gap.demandScore}% demand</span>
                  </div>
                  <span className="text-[10px] font-medium text-accent">{gap.estimatedValue}</span>
                </div>
                <span className="flex items-center gap-1 text-[10px] font-medium text-foreground group-hover:gap-2 transition-all">
                  {gap.actionLabel} <ArrowRight className="h-3 w-3" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {selectedGap && (
        <DetailModal gap={selectedGap} onClose={() => setSelectedGap(null)} />
      )}
    </div>
  );
}
