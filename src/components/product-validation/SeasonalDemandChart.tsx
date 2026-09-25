"use client";

import { Calendar, BarChart3 } from "lucide-react";
import type { SeasonalDemandResult } from "@/types/product-validation";

const phaseConfig = {
  peak: { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", label: "Peak Season", gradient: "from-emerald-400 to-emerald-500" },
  "off-peak": { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/20", label: "Off-Peak", gradient: "from-red-400 to-red-500" },
  building: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", label: "Building", gradient: "from-blue-400 to-blue-500" },
  declining: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", label: "Declining", gradient: "from-amber-400 to-amber-500" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function SeasonalDemandChart({ data }: { data: SeasonalDemandResult }) {
  const phase = phaseConfig[data.currentPhase];
  const maxForecast = Math.max(...data.forecast.map((f) => f.predicted), 1);
  const scoreColor = data.score >= 70 ? "text-emerald-400" : data.score >= 40 ? "text-amber-400" : "text-red-400";
  const scoreGradient = data.score >= 70 ? "from-emerald-400 to-emerald-500" : data.score >= 40 ? "from-amber-400 to-amber-500" : "from-red-400 to-red-500";

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${phase.gradient} opacity-[0.03] pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${phase.bg} flex items-center justify-center border ${phase.border}`}>
            <Calendar className={`h-5 w-5 ${phase.color}`} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Seasonal Demand</h3>
            <p className="text-[11px] text-muted-foreground">Monthly demand patterns</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${phase.color} ${phase.bg} ${phase.border}`}>
          {phase.label}
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-5 relative">
        <div className="rounded-xl bg-surface/40 p-4 text-center border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Peak Month</p>
          <p className="text-xl font-display font-bold text-emerald-400">{MONTHS[data.peakMonth - 1]}</p>
        </div>
        <div className="rounded-xl bg-surface/40 p-4 text-center border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Low Month</p>
          <p className="text-xl font-display font-bold text-red-400">{MONTHS[data.lowMonth - 1]}</p>
        </div>
        <div className="rounded-xl bg-surface/40 p-4 text-center border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Seasonality</p>
          <p className={`text-xl font-display font-bold ${data.seasonalityIndex < 0.3 ? "text-emerald-400" : data.seasonalityIndex < 0.5 ? "text-amber-400" : "text-red-400"}`}>
            {(data.seasonalityIndex * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {/* Forecast Chart */}
      {data.forecast.length > 0 && (
        <div className="mb-5 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">6-Month Projection (heuristic)</p>
          <div className="p-4 rounded-xl bg-surface/20 border border-border/30">
            <div className="flex items-end gap-2 h-28">
              {data.forecast.map((f, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="text-[8px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity font-medium">
                    {f.predicted.toLocaleString()}
                  </div>
                  <div className="w-full relative" style={{ height: `${(f.predicted / maxForecast) * 90}px` }}>
                    <div className="absolute inset-0 rounded-t bg-gradient-to-t from-cyan-400/40 to-cyan-400/15 border border-cyan-400/25 transition-all duration-300 group-hover:from-cyan-400/60 group-hover:to-cyan-400/25" />
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium">{f.month}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Score */}
      <div className="mb-5 relative">
        <div className="p-4 rounded-xl bg-surface/20 border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-muted-foreground font-medium">Seasonal Score</span>
            <span className={`text-base font-display font-bold ${scoreColor}`}>
              {data.score}/100
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-surface overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${scoreGradient} transition-all duration-700`}
              style={{ width: `${data.score}%` }}
            />
          </div>
        </div>
      </div>

      {/* Insight */}
      <div className="p-3 rounded-xl bg-surface/20 border border-border/30">
        <div className="flex items-start gap-2">
          <BarChart3 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[12px] text-foreground/80 leading-relaxed">{data.insight}</p>
        </div>
      </div>
    </div>
  );
}
