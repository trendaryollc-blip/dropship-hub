"use client";

import { DollarSign, AlertCircle } from "lucide-react";
import type { ProfitPotentialResult } from "@/types/product-validation";

export default function ProfitPotentialPanel({ data }: { data: ProfitPotentialResult }) {
  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-amber-400/10 flex items-center justify-center">
            <DollarSign className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Profit Potential</h3>
            <p className="text-[10px] text-muted-foreground">Revenue after all costs</p>
          </div>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
          data.score >= 70 ? "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" :
          data.score >= 40 ? "text-amber-400 bg-amber-400/10 border-amber-400/20" :
          "text-red-400 bg-red-400/10 border-red-400/20"
        }`}>
          Score: {data.score}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl bg-surface/50 p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Per Unit Profit</p>
          <p className={`text-lg font-display font-bold ${data.netProfitPerUnit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${Math.abs(data.netProfitPerUnit).toFixed(2)}
          </p>
          {data.netProfitPerUnit < 0 && <p className="text-[9px] text-red-400">loss</p>}
        </div>
        <div className="rounded-xl bg-surface/50 p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">Margin</p>
          <p className={`text-lg font-display font-bold ${data.profitMargin >= 25 ? "text-emerald-400" : data.profitMargin >= 10 ? "text-amber-400" : "text-red-400"}`}>
            {data.profitMargin}%
          </p>
        </div>
        <div className="rounded-xl bg-surface/50 p-3 text-center">
          <p className="text-[10px] text-muted-foreground mb-1">ROI</p>
          <p className={`text-lg font-display font-bold ${data.roi >= 50 ? "text-emerald-400" : data.roi >= 20 ? "text-amber-400" : "text-red-400"}`}>
            {data.roi}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-xl bg-surface/50 p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Monthly Net Profit</p>
          <p className={`text-sm font-semibold ${data.monthlyNetProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${Math.abs(data.monthlyNetProfit).toFixed(2)}
            {data.monthlyNetProfit < 0 && <span className="text-[9px] text-red-400 ml-1">loss</span>}
          </p>
        </div>
        <div className="rounded-xl bg-surface/50 p-3">
          <p className="text-[10px] text-muted-foreground mb-1">Break-Even ROAS</p>
          <p className="text-sm font-semibold text-foreground">{data.breakEvenROAS}x</p>
        </div>
      </div>

      {data.costBreakdown.length > 0 && (
        <div className="mb-4">
          <p className="text-[10px] text-muted-foreground mb-2">Cost Breakdown</p>
          <div className="flex h-3 rounded-full overflow-hidden bg-surface">
            {data.costBreakdown.map((item) => (
              <div
                key={item.name}
                className="h-full transition-all duration-500"
                style={{ width: `${item.pct}%`, backgroundColor: item.color }}
                title={`${item.name}: $${item.value.toFixed(2)} (${item.pct}%)`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
            {data.costBreakdown.map((item) => (
              <div key={item.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-[9px] text-muted-foreground">{item.name} (${item.value.toFixed(2)})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {data.netProfitPerUnit <= 0 && (
        <div className="flex items-start gap-2 p-2.5 rounded-xl bg-red-400/5 border border-red-400/10 mb-3">
          <AlertCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
          <p className="text-[10px] text-red-400/80 leading-relaxed">This product is not profitable at current pricing. Adjust costs or increase price.</p>
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed">{data.insight}</p>
    </div>
  );
}
