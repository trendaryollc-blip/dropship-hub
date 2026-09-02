"use client";

import { TrendingUp, TrendingDown, Minus, Zap, AlertTriangle } from "lucide-react";
import type { TrendVelocityResult } from "@/types/product-validation";

const phaseConfig = {
  emerging: { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", label: "Emerging" },
  growth: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", label: "Growth" },
  mature: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", label: "Mature" },
  declining: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", label: "Declining" },
};

export default function TrendVelocityCard({ data }: { data: TrendVelocityResult }) {
  const phase = phaseConfig[data.phase];
  const TrendIcon = data.velocity > 0 ? TrendingUp : data.velocity < 0 ? TrendingDown : Minus;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-emerald-400/10 flex items-center justify-center">
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Trend Velocity</h3>
            <p className="text-[10px] text-muted-foreground">How fast is it growing</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${phase.color} ${phase.bg} ${phase.border}`}>
          {phase.label}
        </span>
      </div>

      <div className="flex items-end gap-3 mb-4">
        <div className="flex items-center gap-1.5">
          <TrendIcon className={`h-5 w-5 ${data.velocity > 0 ? "text-emerald-400" : data.velocity < 0 ? "text-red-400" : "text-muted-foreground"}`} />
          <span className="text-3xl font-display font-bold text-foreground">{data.velocity > 0 ? "+" : ""}{data.velocity}%</span>
        </div>
        <span className="text-xs text-muted-foreground mb-1">weekly velocity</span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-surface/50 p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Acceleration</p>
          <p className={`text-sm font-semibold ${data.acceleration > 0 ? "text-emerald-400" : data.acceleration < 0 ? "text-red-400" : "text-muted-foreground"}`}>
            {data.acceleration > 0 ? "+" : ""}{data.acceleration}%
          </p>
        </div>
        <div className="rounded-xl bg-surface/50 p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Score</p>
          <p className="text-sm font-semibold text-foreground">{data.score}/100</p>
        </div>
      </div>

      {data.weeklyGrowthRates.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-muted-foreground mb-2">Weekly Growth Trend</p>
          <div className="flex items-end gap-1 h-12">
            {data.weeklyGrowthRates.slice(-8).map((rate, i) => {
              const maxRate = Math.max(...data.weeklyGrowthRates.map(Math.abs), 1);
              const height = Math.abs(rate) / maxRate * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                  <div
                    className={`w-full rounded-sm min-h-[2px] ${rate >= 0 ? "bg-emerald-400" : "bg-red-400"}`}
                    style={{ height: `${Math.max(height, 5)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {data.acceleration < -5 && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-400/5 border border-amber-400/10">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-amber-400/80 leading-relaxed">Growth is decelerating. Monitor closely before investing heavily.</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed mt-3">{data.insight}</p>
    </div>
  );
}
