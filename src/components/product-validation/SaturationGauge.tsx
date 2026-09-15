"use client";

import { Users, AlertTriangle, ShieldCheck, ShieldAlert, ShieldX, BarChart3 } from "lucide-react";
import type { SaturationResult } from "@/types/product-validation";

const levelConfig = {
  unsaturated: { color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Unsaturated", desc: "Wide open market", gradient: "from-emerald-400 to-emerald-500" },
  low: { color: "text-blue-400", bg: "bg-blue-400/10", label: "Low", desc: "Room to grow", gradient: "from-blue-400 to-blue-500" },
  moderate: { color: "text-amber-400", bg: "bg-amber-400/10", label: "Moderate", desc: "Competitive space", gradient: "from-amber-400 to-amber-500" },
  saturated: { color: "text-orange-400", bg: "bg-orange-400/10", label: "Saturated", desc: "Crowded market", gradient: "from-orange-400 to-orange-500" },
  "hyper-saturated": { color: "text-red-400", bg: "bg-red-400/10", label: "Hyper-Saturated", desc: "Extremely crowded", gradient: "from-red-400 to-red-500" },
};

const riskIcons = { low: ShieldCheck, medium: ShieldAlert, high: ShieldX };
const riskColors = { low: "text-emerald-400", medium: "text-amber-400", high: "text-red-400" };
const riskBg = { low: "bg-emerald-400/10", medium: "bg-amber-400/10", high: "bg-red-400/10" };

export default function SaturationGauge({ data }: { data: SaturationResult }) {
  const level = levelConfig[data.level];
  const circumference = 2 * Math.PI * 45;
  const dashoffset = circumference - (data.index / 100) * circumference;

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${level.gradient} opacity-[0.03] pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${level.bg} flex items-center justify-center border border-current/20`}>
            <Users className={`h-5 w-5 ${level.color}`} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Saturation Index</h3>
            <p className="text-[11px] text-muted-foreground">Market competition level</p>
          </div>
        </div>
        <span className={`text-xs px-3 py-1.5 rounded-full font-semibold border ${level.color} ${level.bg} border-current/20`}>
          {level.label}
        </span>
      </div>

      {/* Gauge Display */}
      <div className="flex items-center gap-6 mb-5 relative">
        <div className="relative w-32 h-32 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-surface" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              className={`${data.index < 25 ? "text-emerald-400" : data.index < 50 ? "text-blue-400" : data.index < 75 ? "text-amber-400" : "text-red-400"}`}
              style={{ stroke: "currentColor", transition: "stroke-dashoffset 1s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-display font-black text-foreground">{data.index}</span>
            <span className="text-[9px] text-muted-foreground font-medium">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <div className="p-3 rounded-xl bg-surface/40 border border-border/30">
            <p className="text-[10px] text-muted-foreground mb-1 font-medium">Active Sellers</p>
            <p className="text-xl font-display font-bold text-foreground">{data.sellerCount.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-xl bg-surface/40 border border-border/30">
            <p className="text-[10px] text-muted-foreground mb-1 font-medium">Market Concentration</p>
            <p className="text-xl font-display font-bold text-foreground">{data.marketConcentration}%</p>
          </div>
          <p className="text-[11px] text-muted-foreground italic px-1">{level.desc}</p>
        </div>
      </div>

      {/* Risk Indicators */}
      <div className="grid grid-cols-2 gap-3 mb-5 relative">
        <div className={`rounded-xl ${riskBg[data.priceWarRisk]} p-4 border border-border/30`}>
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Price War Risk</p>
          <div className="flex items-center gap-2">
            {(() => {
              const RiskIcon = riskIcons[data.priceWarRisk];
              return <RiskIcon className={`h-5 w-5 ${riskColors[data.priceWarRisk]}`} />;
            })()}
            <span className={`text-sm font-bold capitalize ${riskColors[data.priceWarRisk]}`}>{data.priceWarRisk}</span>
          </div>
        </div>
        <div className={`rounded-xl ${riskBg[data.barrierToEntry]} p-4 border border-border/30`}>
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Barrier to Entry</p>
          <div className="flex items-center gap-2">
            {(() => {
              const RiskIcon = riskIcons[data.barrierToEntry];
              return <RiskIcon className={`h-5 w-5 ${riskColors[data.barrierToEntry]}`} />;
            })()}
            <span className={`text-sm font-bold capitalize ${riskColors[data.barrierToEntry]}`}>{data.barrierToEntry}</span>
          </div>
        </div>
      </div>

      {/* Warning */}
      {(data.priceWarRisk === "high" || data.barrierToEntry === "high") && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-400/5 border border-red-400/15 mb-4">
          <div className="h-6 w-6 rounded-lg bg-red-400/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
          </div>
          <p className="text-[11px] text-red-400/80 leading-relaxed">
            {data.priceWarRisk === "high" && "High price war risk — margins will be compressed. "}
            {data.barrierToEntry === "high" && "High barrier to entry — established sellers dominate."}
          </p>
        </div>
      )}

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
