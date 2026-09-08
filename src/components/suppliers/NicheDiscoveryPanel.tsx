"use client";

import { useState } from "react";
import { Target, TrendingUp, AlertCircle, ChevronRight, Filter } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI } from "@/hooks/useAPI";
import type { NicheSupplierScore } from "@/types/supplier";

function NicheScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20"
    : score >= 60 ? "text-blue-400 bg-blue-400/10 border-blue-400/20"
    : score >= 40 ? "text-amber-400 bg-amber-400/10 border-amber-400/20"
    : "text-red-400 bg-red-400/10 border-red-400/20";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${color}`}>
      {score}
    </span>
  );
}

function SaturationBadge({ level }: { level: string }) {
  const config = {
    low: { label: "Low Saturation", color: "text-emerald-400 bg-emerald-400/10" },
    medium: { label: "Medium", color: "text-blue-400 bg-blue-400/10" },
    high: { label: "High", color: "text-amber-400 bg-amber-400/10" },
    saturated: { label: "Saturated", color: "text-red-400 bg-red-400/10" },
  };
  const c = config[level as keyof typeof config] || config.medium;

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium ${c.color}`}>
      {c.label}
    </span>
  );
}

function OpportunityCard({ score }: { score: NicheSupplierScore & { id: string } }) {
  return (
    <div className="glass rounded-xl p-4 border border-border hover:border-accent/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-foreground truncate">{score.supplierName}</p>
          <div className="flex items-center gap-2 mt-1">
            <NicheScoreBadge score={score.nicheScore} />
            <SaturationBadge level={score.saturationLevel} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-muted-foreground">Opportunity</p>
          <p className="text-sm font-bold text-accent">{score.opportunityScore}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className="text-[9px] text-muted-foreground">Competitive Density</p>
          <p className="text-xs font-medium text-foreground">{score.competitiveDensity}%</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/5">
          <p className="text-[9px] text-muted-foreground">Unique Products</p>
          <p className="text-xs font-medium text-foreground">{score.uniqueProducts}</p>
        </div>
      </div>

      {score.categoryBreakdown.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] text-muted-foreground font-medium">Category Breakdown</p>
          {score.categoryBreakdown.slice(0, 3).map((cat) => (
            <div key={cat.category} className="flex items-center justify-between text-[10px]">
              <span className="text-foreground">{cat.category}</span>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{cat.avgMargin}% margin</span>
                <span className={cat.trendDirection === "rising" ? "text-emerald-400" : cat.trendDirection === "falling" ? "text-red-400" : "text-muted-foreground"}>
                  {cat.trendDirection === "rising" ? "↑" : cat.trendDirection === "falling" ? "↓" : "→"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NicheDiscoveryPanel() {
  const { ref, isInView } = useInView();
  const [filterCategory, setFilterCategory] = useState<string>("");

  const url = isInView
    ? `/api/suppliers/niche-discovery${filterCategory ? `?category=${filterCategory}` : ""}`
    : null;

  const { data, isLoading } = useAPI<{ scores: (NicheSupplierScore & { id: string })[] }>(url);

  const scores = data?.scores || [];

  return (
    <div ref={ref} className="space-y-4">
      <div className="glass rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <h3 className="text-sm font-semibold text-foreground">Niche Discovery</h3>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-[10px] bg-white/5 border border-border rounded-lg px-2 py-1 text-foreground"
            >
              <option value="">All Categories</option>
              <option value="fashion">Fashion</option>
              <option value="electronics">Electronics</option>
              <option value="home">Home & Garden</option>
              <option value="beauty">Beauty</option>
              <option value="fitness">Fitness</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : scores.length === 0 ? (
          <div className="text-center py-8">
            <Target className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No niche scores yet. Analyze suppliers to discover opportunities.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {scores.map((score) => (
              <OpportunityCard key={score.id} score={score} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
