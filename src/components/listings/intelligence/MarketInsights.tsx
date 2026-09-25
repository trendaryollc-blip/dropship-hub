"use client";

import { BarChart3, DollarSign, Star, Users } from "lucide-react";
import type { MarketInsights } from "@/types/listing-intelligence";

interface MarketInsightsProps {
  insights: MarketInsights;
}

function InsightBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px]">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-medium">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-surface overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function MarketInsightsPanel({ insights }: MarketInsightsProps) {
  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
          <BarChart3 className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Market Insights</p>
          <p className="text-[10px] text-muted-foreground">Computed from listings in this set</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="glass rounded-xl p-2.5 text-center">
          <DollarSign className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">${insights.avgPrice.toFixed(0)}</p>
          <p className="text-[9px] text-muted-foreground">Avg Price</p>
        </div>
        <div className="glass rounded-xl p-2.5 text-center">
          <Star className="h-4 w-4 text-amber-400 mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{insights.avgRating.toFixed(1)}</p>
          <p className="text-[9px] text-muted-foreground">Avg Rating</p>
        </div>
        <div className="glass rounded-xl p-2.5 text-center">
          <Users className="h-4 w-4 text-purple-400 mx-auto mb-1" />
          <p className="text-sm font-bold text-foreground">{(insights.avgReviewCount / 1000).toFixed(1)}k</p>
          <p className="text-[9px] text-muted-foreground">Avg Reviews</p>
        </div>
      </div>

      <div className="space-y-2.5">
        <p className="text-[10px] text-muted-foreground font-medium">Price Distribution</p>
        {insights.priceDistribution.map((d, i) => (
          <InsightBar key={i} label={d.range} value={d.count} max={Math.max(...insights.priceDistribution.map((x) => x.count), 1)} color={d.percentage > 30 ? "bg-accent" : "bg-muted-foreground/30"} />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="glass rounded-xl p-2.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Median Price</p>
          <p className="text-xs font-bold text-foreground">${insights.medianPrice.toFixed(2)}</p>
        </div>
        <div className="glass rounded-xl p-2.5">
          <p className="text-[10px] text-muted-foreground mb-0.5">Saturation</p>
          <p className="text-xs font-bold text-foreground">{insights.saturationScore}%</p>
        </div>
      </div>

      {insights.topKeywords.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground mb-1.5">Top Keywords in Market</p>
          <div className="space-y-1">
            {insights.topKeywords.slice(0, 5).map((kw, i) => (
              <div key={i} className="flex items-center justify-between text-[10px]">
                <span className="text-foreground">{kw.keyword}</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-1 rounded-full bg-surface overflow-hidden">
                    <div className="h-full rounded-full bg-accent/60" style={{ width: `${Math.min(100, kw.frequency * 10)}%` }} />
                  </div>
                  <span className="text-muted-foreground w-4 text-right">{kw.frequency}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {insights.insights.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground font-medium">Insights (heuristic)</p>
          {insights.insights.map((insight, i) => (
            <div key={i} className="text-[10px] text-muted-foreground bg-surface rounded-lg px-2.5 py-2">
              {insight}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
