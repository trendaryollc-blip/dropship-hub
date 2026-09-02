"use client";

import { Users, AlertTriangle, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import type { SaturationResult } from "@/types/product-validation";

const levelConfig = {
  unsaturated: { color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Unsaturated", desc: "Wide open market" },
  low: { color: "text-blue-400", bg: "bg-blue-400/10", label: "Low", desc: "Room to grow" },
  moderate: { color: "text-amber-400", bg: "bg-amber-400/10", label: "Moderate", desc: "Competitive space" },
  saturated: { color: "text-orange-400", bg: "bg-orange-400/10", label: "Saturated", desc: "Crowded market" },
  "hyper-saturated": { color: "text-red-400", bg: "bg-red-400/10", label: "Hyper-Saturated", desc: "Extremely crowded" },
};

const riskIcons = { low: ShieldCheck, medium: ShieldAlert, high: ShieldX };
const riskColors = { low: "text-emerald-400", medium: "text-amber-400", high: "text-red-400" };

export default function SaturationGauge({ data }: { data: SaturationResult }) {
  const level = levelConfig[data.level];
  const circumference = 2 * Math.PI * 45;
  const dashoffset = circumference - (data.index / 100) * circumference;

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-purple-400/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Saturation Index</h3>
            <p className="text-[10px] text-muted-foreground">Market competition level</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${level.color} ${level.bg} border-current/20`}>
          {level.label}
        </span>
      </div>

      <div className="flex items-center gap-6 mb-4">
        <div className="relative w-28 h-28 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeWidth="6" className="text-surface" />
            <circle
              cx="50" cy="50" r="45" fill="none"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashoffset}
              className={`${data.index < 25 ? "text-emerald-400" : data.index < 50 ? "text-blue-400" : data.index < 75 ? "text-amber-400" : "text-red-400"}`}
              style={{ stroke: "currentColor", transition: "stroke-dashoffset 0.8s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-display font-bold text-foreground">{data.index}</span>
            <span className="text-[9px] text-muted-foreground">/ 100</span>
          </div>
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <p className="text-[10px] text-muted-foreground">Active Sellers</p>
            <p className="text-sm font-semibold text-foreground">{data.sellerCount.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground">Market Concentration</p>
            <p className="text-sm font-semibold text-foreground">{data.marketConcentration}%</p>
          </div>
          <p className="text-[10px] text-muted-foreground italic">{level.desc}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-surface/50 p-3">
          <p className="text-[10px] text-muted-foreground mb-1.5">Price War Risk</p>
          <div className="flex items-center gap-1.5">
            {(() => {
              const RiskIcon = riskIcons[data.priceWarRisk];
              return <RiskIcon className={`h-3.5 w-3.5 ${riskColors[data.priceWarRisk]}`} />;
            })()}
            <span className={`text-xs font-medium capitalize ${riskColors[data.priceWarRisk]}`}>{data.priceWarRisk}</span>
          </div>
        </div>
        <div className="rounded-xl bg-surface/50 p-3">
          <p className="text-[10px] text-muted-foreground mb-1.5">Barrier to Entry</p>
          <div className="flex items-center gap-1.5">
            {(() => {
              const RiskIcon = riskIcons[data.barrierToEntry];
              return <RiskIcon className={`h-3.5 w-3.5 ${riskColors[data.barrierToEntry]}`} />;
            })()}
            <span className={`text-xs font-medium capitalize ${riskColors[data.barrierToEntry]}`}>{data.barrierToEntry}</span>
          </div>
        </div>
      </div>

      {(data.priceWarRisk === "high" || data.barrierToEntry === "high") && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-400/5 border border-red-400/10 mb-3">
          <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-red-400/80 leading-relaxed">
            {data.priceWarRisk === "high" && "High price war risk — margins will be compressed. "}
            {data.barrierToEntry === "high" && "High barrier to entry — established sellers dominate."}
          </p>
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">{data.insight}</p>
    </div>
  );
}
