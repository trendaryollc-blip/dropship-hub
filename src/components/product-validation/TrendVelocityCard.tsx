"use client";

import { TrendingUp, TrendingDown, Minus, Zap, AlertTriangle, Activity } from "lucide-react";
import type { TrendVelocityResult } from "@/types/product-validation";

const phaseConfig = {
  emerging: { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", label: "Emerging", gradient: "from-emerald-400 to-emerald-500" },
  growth: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", label: "Growth", gradient: "from-blue-400 to-blue-500" },
  mature: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", label: "Mature", gradient: "from-amber-400 to-amber-500" },
  declining: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", label: "Declining", gradient: "from-red-400 to-red-500" },
};

export default function TrendVelocityCard({ data }: { data: TrendVelocityResult }) {
  const phase = phaseConfig[data.phase];
  const TrendIcon = data.velocity > 0 ? TrendingUp : data.velocity < 0 ? TrendingDown : Minus;
  const circumference = 2 * Math.PI * 35;
  const dashoffset = circumference - (data.score / 100) * circumference;

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${phase.gradient} opacity-[0.03] pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${phase.bg} flex items-center justify-center border ${phase.border}`}>
            <Zap className={`h-5 w-5 ${phase.color}`} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Trend Velocity</h3>
            <p className="text-[11px] text-muted-foreground">How fast is it growing</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${phase.color} ${phase.bg} ${phase.border}`}>
          {phase.label}
        </span>
      </div>

      {/* Main Metric */}
      <div className="flex items-center gap-6 mb-5 relative">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <TrendIcon className={`h-8 w-8 ${data.velocity > 0 ? "text-emerald-400" : data.velocity < 0 ? "text-red-400" : "text-muted-foreground"}`} />
            <div>
              <span className="text-4xl font-display font-black text-foreground">
                {data.velocity > 0 ? "+" : ""}{data.velocity}%
              </span>
              <p className="text-[11px] text-muted-foreground mt-0.5">velocity (from your series)</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface/40 p-3 border border-border/30">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Acceleration</p>
              <p className={`text-base font-display font-bold ${data.acceleration > 0 ? "text-emerald-400" : data.acceleration < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                {data.acceleration > 0 ? "+" : ""}{data.acceleration}%
              </p>
            </div>
            <div className="rounded-xl bg-surface/40 p-3 border border-border/30">
              <p className="text-[10px] text-muted-foreground mb-1.5 font-medium">Score</p>
              <p className="text-base font-display font-bold text-foreground">{data.score}/100</p>
            </div>
          </div>
        </div>

        {/* Score Circle */}
        <div className="relative w-24 h-24 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="5" className="text-surface" />
            <circle
              cx="40" cy="40" r="35" fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              className={`${data.score >= 70 ? "text-emerald-400" : data.score >= 40 ? "text-amber-400" : "text-red-400"}`}
              style={{ stroke: "currentColor", transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-display font-black text-foreground">{data.score}</span>
            <span className="text-[8px] text-muted-foreground">/ 100</span>
          </div>
        </div>
      </div>

      {/* Weekly Growth Chart */}
      {data.weeklyGrowthRates.length > 0 && (
        <div className="mb-5 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Weekly Growth Trend</p>
          <div className="flex items-end gap-1.5 h-16 p-3 rounded-xl bg-surface/20 border border-border/30">
            {data.weeklyGrowthRates.slice(-8).map((rate, i) => {
              const maxRate = Math.max(...data.weeklyGrowthRates.map(Math.abs), 1);
              const height = Math.abs(rate) / maxRate * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group">
                  <div className="text-[8px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    {rate > 0 ? "+" : ""}{rate.toFixed(1)}%
                  </div>
                  <div
                    className={`w-full rounded-sm min-h-[3px] transition-all duration-300 ${rate >= 0 ? "bg-gradient-to-t from-emerald-400/50 to-emerald-400" : "bg-gradient-to-t from-red-400/50 to-red-400"}`}
                    style={{ height: `${Math.max(height, 8)}%` }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Warning */}
      {data.acceleration < -5 && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-400/5 border border-amber-400/15 mb-4">
          <div className="h-6 w-6 rounded-lg bg-amber-400/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
          </div>
          <p className="text-[11px] text-amber-400/80 leading-relaxed">Growth is decelerating. Monitor closely before investing heavily.</p>
        </div>
      )}

      {/* Insight */}
      <div className="p-3 rounded-xl bg-surface/20 border border-border/30">
        <div className="flex items-start gap-2">
          <Activity className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[12px] text-foreground/80 leading-relaxed">{data.insight}</p>
        </div>
      </div>
    </div>
  );
}
