"use client";

import { useState } from "react";
import {
  CheckSquare, Square, Zap, ShoppingCart, Megaphone, Package, FileText,
  Clock, Target,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { ActionItem } from "@/types/competitors";

const priorityConfig = {
  critical: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", ring: "bg-red-400" },
  high: { color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20", ring: "bg-orange-400" },
  medium: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", ring: "bg-amber-400" },
  low: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", ring: "bg-blue-400" },
};

const categoryIcons: Record<string, typeof Zap> = {
  pricing: Target,
  product: Package,
  marketing: Megaphone,
  sourcing: ShoppingCart,
  listing: FileText,
};

const effortColors = {
  easy: "text-emerald-400 bg-emerald-400/10",
  medium: "text-amber-400 bg-amber-400/10",
  hard: "text-red-400 bg-red-400/10",
};

export default function ActionItems({ items }: { items: ActionItem[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>("all");

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const priorities = ["all", "critical", "high", "medium", "low"];
  const filtered = filter === "all" ? items : items.filter((it) => it.priority === filter);
  const sorted = [...filtered].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  const completedCount = checked.size;
  const total = items.length;

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-base font-semibold text-foreground flex items-center gap-2">
          <span className="text-lg">⚡</span> Action Items
          <span className="text-xs font-normal text-muted-foreground ml-1">
            {completedCount}/{total} done
          </span>
        </h3>
        <div className="flex gap-1">
          {priorities.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`text-[10px] px-2.5 py-1 rounded-full border transition-all capitalize ${
                filter === p
                  ? "bg-accent/10 text-accent border-accent/20"
                  : "text-muted-foreground border-border hover:border-accent/20"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {total > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Progress</span>
            <span className="text-[10px] text-accent font-medium">{Math.round((completedCount / total) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden border border-border/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60 transition-all duration-500"
              style={{ width: `${(completedCount / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        {sorted.map((item, i) => {
          const pc = priorityConfig[item.priority];
          const Icon = categoryIcons[item.category] || Zap;
          const isDone = checked.has(item.id);
          return (
            <div
              key={item.id}
              className={`glass rounded-xl border transition-all duration-500 ${
                isDone ? "opacity-60 border-border/50" : "border-border hover:border-accent/15"
              } ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <div className="p-3 sm:p-4 flex items-start gap-3">
                <button onClick={() => toggle(item.id)} className="shrink-0 mt-0.5">
                  {isDone ? (
                    <CheckSquare className="h-5 w-5 text-accent" />
                  ) : (
                    <Square className="h-5 w-5 text-muted-foreground/40 hover:text-accent transition-colors" />
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <div className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${pc.color} ${pc.bg} ${pc.border}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${pc.ring}`} />
                      {item.priority.toUpperCase()}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                      <Icon className="h-3 w-3" />
                      <span className="capitalize">{item.category}</span>
                    </div>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${effortColors[item.effort]}`}>
                      {item.effort}
                    </span>
                  </div>
                  <h4 className={`font-display text-sm font-semibold mb-1 ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.title}
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-2">{item.description}</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[10px] text-accent font-medium flex items-center gap-1">
                      <Zap className="h-3 w-3" /> {item.impact}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium">{item.estimatedGain}</span>
                    {item.relatedCompetitor && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" /> vs {item.relatedCompetitor}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-8 text-muted-foreground/50">
          <CheckSquare className="h-8 w-8 mx-auto mb-2" />
          <p className="text-xs">No items for this filter</p>
        </div>
      )}
    </div>
  );
}
