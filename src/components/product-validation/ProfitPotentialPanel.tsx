"use client";

import { DollarSign, AlertCircle, TrendingUp, PieChart } from "lucide-react";
import type { ProfitPotentialResult } from "@/types/product-validation";

export default function ProfitPotentialPanel({ data }: { data: ProfitPotentialResult }) {
  const scoreColor = data.score >= 70 ? "text-emerald-400" : data.score >= 40 ? "text-amber-400" : "text-red-400";
  const scoreBg = data.score >= 70 ? "bg-emerald-400/10" : data.score >= 40 ? "bg-amber-400/10" : "bg-red-400/10";
  const scoreGradient = data.score >= 70 ? "from-emerald-400 to-emerald-500" : data.score >= 40 ? "from-amber-400 to-amber-500" : "from-red-400 to-red-500";
  const circumference = 2 * Math.PI * 35;
  const dashoffset = circumference - (data.score / 100) * circumference;

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${scoreGradient} opacity-[0.03] pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${scoreBg} flex items-center justify-center border border-current/20`}>
            <DollarSign className={`h-5 w-5 ${scoreColor}`} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Profit Potential</h3>
            <p className="text-[11px] text-muted-foreground">Revenue after all costs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative w-14 h-14 shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="35" fill="none" stroke="currentColor" strokeWidth="5" className="text-surface" />
              <circle
                cx="40" cy="40" r="35" fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashoffset}
                className={scoreColor}
                style={{ stroke: "currentColor", transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-sm font-display font-black ${scoreColor}`}>{data.score}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-3 gap-3 mb-5 relative">
        <div className="rounded-xl bg-surface/40 p-4 text-center border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Per Unit Profit</p>
          <p className={`text-2xl font-display font-black ${data.netProfitPerUnit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${Math.abs(data.netProfitPerUnit).toFixed(2)}
          </p>
          {data.netProfitPerUnit < 0 && <p className="text-[9px] text-red-400 font-medium">loss</p>}
        </div>
        <div className="rounded-xl bg-surface/40 p-4 text-center border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">Margin</p>
          <p className={`text-2xl font-display font-black ${data.profitMargin >= 25 ? "text-emerald-400" : data.profitMargin >= 10 ? "text-amber-400" : "text-red-400"}`}>
            {data.profitMargin}%
          </p>
        </div>
        <div className="rounded-xl bg-surface/40 p-4 text-center border border-border/30">
          <p className="text-[10px] text-muted-foreground mb-2 font-medium">ROI</p>
          <p className={`text-2xl font-display font-black ${data.roi >= 50 ? "text-emerald-400" : data.roi >= 20 ? "text-amber-400" : "text-red-400"}`}>
            {data.roi}%
          </p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-5 relative">
        <div className="rounded-xl bg-surface/40 p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-accent" />
            <p className="text-[10px] text-muted-foreground font-medium">Monthly Net Profit</p>
          </div>
          <p className={`text-lg font-display font-bold ${data.monthlyNetProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${Math.abs(data.monthlyNetProfit).toFixed(2)}
            {data.monthlyNetProfit < 0 && <span className="text-[10px] text-red-400 ml-1 font-medium">loss</span>}
          </p>
        </div>
        <div className="rounded-xl bg-surface/40 p-4 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <PieChart className="h-4 w-4 text-accent" />
            <p className="text-[10px] text-muted-foreground font-medium">Break-Even ROAS</p>
          </div>
          <p className="text-lg font-display font-bold text-foreground">{data.breakEvenROAS}x</p>
        </div>
      </div>

      {/* Cost Breakdown */}
      {data.costBreakdown.length > 0 && (
        <div className="mb-5 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Cost Breakdown</p>
          <div className="p-3 rounded-xl bg-surface/20 border border-border/30">
            <div className="flex h-4 rounded-full overflow-hidden bg-surface">
              {data.costBreakdown.map((item) => (
                <div
                  key={item.name}
                  className="h-full transition-all duration-500"
                  style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                  title={`${item.name}: $${item.value.toFixed(2)} (${item.pct}%)`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3">
              {data.costBreakdown.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-foreground/80 font-medium">{item.name}</span>
                  <span className="text-[10px] text-muted-foreground">${item.value.toFixed(2)}</span>
                  <span className="text-[9px] text-muted-foreground/60">({item.pct}%)</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Warning */}
      {data.netProfitPerUnit <= 0 && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-400/5 border border-red-400/15 mb-4">
          <div className="h-6 w-6 rounded-lg bg-red-400/10 flex items-center justify-center shrink-0">
            <AlertCircle className="h-3.5 w-3.5 text-red-400" />
          </div>
          <p className="text-[11px] text-red-400/80 leading-relaxed">This product is not profitable at current pricing. Adjust costs or increase price.</p>
        </div>
      )}

      {/* Insight */}
      <div className="p-3 rounded-xl bg-surface/20 border border-border/30">
        <div className="flex items-start gap-2">
          <DollarSign className="h-4 w-4 text-accent shrink-0 mt-0.5" />
          <p className="text-[12px] text-foreground/80 leading-relaxed">{data.insight}</p>
        </div>
      </div>
    </div>
  );
}
