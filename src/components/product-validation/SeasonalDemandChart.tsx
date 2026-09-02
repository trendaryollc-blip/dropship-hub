"use client";

import { Calendar } from "lucide-react";
import type { SeasonalDemandResult } from "@/types/product-validation";

const phaseConfig = {
  peak: { color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Peak Season" },
  "off-peak": { color: "text-red-400", bg: "bg-red-400/10", label: "Off-Peak" },
  building: { color: "text-blue-400", bg: "bg-blue-400/10", label: "Building" },
  declining: { color: "text-amber-400", bg: "bg-amber-400/10", label: "Declining" },
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function SeasonalDemandChart({ data }: { data: SeasonalDemandResult }) {
  const phase = phaseConfig[data.currentPhase];
  const maxForecast = Math.max(...data.forecast.map((f) => f.predicted), 1);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-cyan-400/10 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Seasonal Demand</h3>
            <p className="text-[10px] text-muted-foreground">Monthly demand patterns</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${phase.color} ${phase.bg} border-current/20`}>
          {phase.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl bg-surface/50 p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Peak Month</p>
          <p className="text-sm font-semibold text-emerald-400">{MONTHS[data.peakMonth - 1]}</p>
        </div>
        <div className="rounded-xl bg-surface/50 p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Low Month</p>
          <p className="text-sm font-semibold text-red-400">{MONTHS[data.lowMonth - 1]}</p>
        </div>
        <div className="rounded-xl bg-surface/50 p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Seasonality</p>
          <p className={`text-sm font-semibold ${data.seasonalityIndex < 0.3 ? "text-emerald-400" : data.seasonalityIndex < 0.5 ? "text-amber-400" : "text-red-400"}`}>
            {(data.seasonalityIndex * 100).toFixed(0)}%
          </p>
        </div>
      </div>

      {data.forecast.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-muted-foreground mb-2">6-Month Forecast</p>
          <div className="flex items-end gap-2 h-24">
            {data.forecast.map((f, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative" style={{ height: `${(f.predicted / maxForecast) * 80}px` }}>
                  <div className="absolute inset-0 rounded-t bg-gradient-to-t from-cyan-400/30 to-cyan-400/10 border border-cyan-400/20" />
                </div>
                <span className="text-[9px] text-muted-foreground">{f.month}</span>
                <span className="text-[8px] text-cyan-400 font-medium">{f.predicted.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl bg-surface/50 p-3 mb-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Score</span>
          <span className={`text-sm font-semibold ${data.score >= 70 ? "text-emerald-400" : data.score >= 40 ? "text-amber-400" : "text-red-400"}`}>
            {data.score}/100
          </span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-surface overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${data.score >= 70 ? "bg-emerald-400" : data.score >= 40 ? "bg-amber-400" : "bg-red-400"}`}
            style={{ width: `${data.score}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">{data.insight}</p>
    </div>
  );
}
