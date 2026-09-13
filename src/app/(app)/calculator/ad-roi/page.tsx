"use client";

import { useState, useMemo } from "react";
import { calculateAdROI, type AdROICalc } from "@/lib/calculations";
import CalculatorLayout from "@/components/calculator/CalculatorLayout";

export default function AdROICalculatorPage() {
  const [productCost, setProductCost] = useState(8);
  const [sellingPrice, setSellingPrice] = useState(34.99);
  const [shippingCost, setShippingCost] = useState(5);
  const [platformFee, setPlatformFee] = useState(15);
  const [ctr, setCtr] = useState(2);
  const [cvr, setCvr] = useState(3);
  const [dailyBudget, setDailyBudget] = useState(50);

  const result: AdROICalc = calculateAdROI(productCost, sellingPrice, shippingCost, platformFee, ctr, cvr, dailyBudget);

  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm font-mono";
  const labelClass = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2";
  const cardClass = "glass rounded-2xl p-6";

  const profitPerUnit = useMemo(() => {
    const costPerUnit = productCost + shippingCost + (sellingPrice * platformFee / 100);
    return sellingPrice - costPerUnit;
  }, [productCost, sellingPrice, shippingCost, platformFee]);

  return (
    <CalculatorLayout
      title="Ad ROI / ROAS Calculator"
      description="Estimate CAC, break-even ROAS, and scaling scenarios"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
        <div className="lg:col-span-1 space-y-4">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-6">Product & Ad Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Product Cost ($)</label>
                  <input type="number" step="0.01" value={productCost} onChange={(e) => setProductCost(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Selling Price ($)</label>
                  <input type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(+e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Shipping ($)</label>
                  <input type="number" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Platform Fee (%)</label>
                  <input type="number" step="0.1" value={platformFee} onChange={(e) => setPlatformFee(+e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="h-px bg-border" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>CTR (%)</label>
                  <input type="number" step="0.1" value={ctr} onChange={(e) => setCtr(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Conversion Rate (%)</label>
                  <input type="number" step="0.1" value={cvr} onChange={(e) => setCvr(+e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Daily Ad Budget ($)</label>
                <input type="number" step="1" value={dailyBudget} onChange={(e) => setDailyBudget(+e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Key Metrics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20 text-center">
                <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Est. CAC</p>
                <p className="font-display text-2xl font-bold text-emerald-400">${result.estimatedCAC}</p>
              </div>
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 text-center">
                <p className="text-[10px] text-accent uppercase tracking-wider mb-1">Break-Even ROAS</p>
                <p className="font-display text-2xl font-bold text-accent">{result.breakEvenROAS}x</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Profit/Unit</p>
                <p className={`font-display text-2xl font-bold ${profitPerUnit >= 0 ? "text-foreground" : "text-red-400"}`}>${profitPerUnit.toFixed(2)}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Daily Profit</p>
                <p className={`font-display text-2xl font-bold ${result.projectedProfit >= 0 ? "text-foreground" : "text-red-400"}`}>${result.projectedProfit}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-surface/50 border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Monthly Revenue</p>
                <p className="font-display text-xl font-bold text-foreground">${result.monthlyRevenue.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface/50 border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Monthly Profit</p>
                <p className={`font-display text-xl font-bold ${result.monthlyProfit >= 0 ? "text-foreground" : "text-red-400"}`}>${result.monthlyProfit.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Scaling Scenarios</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scenario</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spend</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">ROAS</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {result.scenarios.map((s: { name: string; spend: number; revenue: number; profit: number; roas: number }) => (
                    <tr key={s.name} className="border-b border-border/50 hover:bg-surface/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">{s.name}</td>
                      <td className="py-3 px-4 text-right font-mono text-muted-foreground">${s.spend.toFixed(0)}</td>
                      <td className="py-3 px-4 text-right font-mono text-foreground">${s.revenue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono text-accent">{s.roas}x</td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${s.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        ${s.profit.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </CalculatorLayout>
  );
}
