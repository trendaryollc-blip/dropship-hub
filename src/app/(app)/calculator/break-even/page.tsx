"use client";

import { useState } from "react";
import { calculateBreakEven } from "@/lib/calculations";
import type { BreakEvenCalcResult } from "@/types/calculator";
import CalculatorLayout from "@/components/calculator/CalculatorLayout";

export default function BreakEvenCalculatorPage() {
  const [fixedCosts, setFixedCosts] = useState(200);
  const [sellingPrice, setSellingPrice] = useState(34.99);
  const [variableCostPerUnit, setVariableCostPerUnit] = useState(16);
  const [monthlyAdBudget, setMonthlyAdBudget] = useState(300);

  const result: BreakEvenCalcResult = calculateBreakEven({
    fixedCosts, sellingPrice, variableCostPerUnit, monthlyAdBudget,
  });

  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm font-mono";
  const labelClass = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2";
  const cardClass = "glass rounded-2xl p-6";

  const maxProfit = Math.max(...result.monthlyProjection.map((m) => m.cumulativeProfit), 1);

  return (
    <CalculatorLayout
      title="Break-Even Calculator"
      description="Find out how many orders you need to cover fixed and variable costs"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
        <div className="lg:col-span-1 space-y-4">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-6">Cost Structure</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Fixed Monthly Costs ($)</label>
                <input type="number" step="1" value={fixedCosts} onChange={(e) => setFixedCosts(+e.target.value)} className={inputClass} />
                <p className="text-[10px] text-muted-foreground mt-1">Shopify plan, tools, subscriptions, etc.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Selling Price ($)</label>
                  <input type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Variable Cost/Unit ($)</label>
                  <input type="number" step="0.01" value={variableCostPerUnit} onChange={(e) => setVariableCostPerUnit(+e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Monthly Ad Budget ($)</label>
                <input type="number" step="1" value={monthlyAdBudget} onChange={(e) => setMonthlyAdBudget(+e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Break-Even Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 text-center">
                <p className="text-[10px] text-accent uppercase tracking-wider mb-1">Break-Even Units</p>
                <p className="font-display text-3xl font-bold text-accent">{result.breakEvenUnits}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Break-Even Revenue</p>
                <p className="font-display text-2xl font-bold text-foreground">${result.breakEvenRevenue.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Contribution Margin</p>
                <p className="font-display text-2xl font-bold text-foreground">${result.contributionMargin}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">CM %</p>
                <p className="font-display text-2xl font-bold text-foreground">{result.contributionMarginPct}%</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface/50 border border-border mb-6">
              <p className="text-xs text-muted-foreground">
                With a <span className="font-semibold text-foreground">${sellingPrice}</span> selling price and <span className="font-semibold text-foreground">${variableCostPerUnit}</span> variable cost per unit,
                you need <span className="font-semibold text-accent">{result.breakEvenUnits} orders</span> to cover your <span className="font-semibold text-foreground">${(fixedCosts + monthlyAdBudget).toLocaleString()}</span> in fixed monthly costs.
              </p>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">12-Month Profit Projection</h3>
            <div className="space-y-2">
              {result.monthlyProjection.map((m: { month: number; cumulativeProfit: number; orders: number }) => {
                const width = maxProfit > 0 ? Math.max(5, (Math.abs(m.cumulativeProfit) / maxProfit) * 100) : 5;
                return (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-16 text-right">Month {m.month}</span>
                    <div className="flex-1 h-3 rounded-full bg-surface/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${m.cumulativeProfit >= 0 ? "bg-emerald-400" : "bg-red-400"}`}
                        style={{ width: `${width}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono w-20 text-right ${m.cumulativeProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      ${m.cumulativeProfit.toLocaleString()}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 p-3 rounded-xl bg-surface/30 border border-border/50">
              <p className="text-[10px] text-muted-foreground">
                Projection based on {result.breakEvenUnits} orders/month at ${sellingPrice}/unit with ${variableCostPerUnit} variable cost.
              </p>
            </div>
          </div>
        </div>
      </div>
    </CalculatorLayout>
  );
}
