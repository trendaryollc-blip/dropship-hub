"use client";

import { useState } from "react";
import { calculateReturns } from "@/lib/calculations";
import type { ReturnsCalcResult } from "@/types/calculator";
import CalculatorLayout from "@/components/calculator/CalculatorLayout";

export default function ReturnsCalculatorPage() {
  const [sellingPrice, setSellingPrice] = useState(34.99);
  const [productCost, setProductCost] = useState(8);
  const [shippingCost, setShippingCost] = useState(5);
  const [returnRate, setReturnRate] = useState(5);
  const [returnShippingCost, setReturnShippingCost] = useState(4);
  const [refundProcessingFee, setRefundProcessingFee] = useState(2);
  const [monthlyOrders, setMonthlyOrders] = useState(200);

  const result: ReturnsCalcResult = calculateReturns({
    sellingPrice, productCost, shippingCost, returnRate,
    returnShippingCost, refundProcessingFee, monthlyOrders,
  });

  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm font-mono";
  const labelClass = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2";
  const cardClass = "glass rounded-2xl p-6";

  const monthlyRevenue = monthlyOrders * sellingPrice;
  const netMarginAfterReturns = monthlyRevenue > 0
    ? ((monthlyRevenue - result.totalMonthlyReturnCost) / monthlyRevenue) * 100
    : 0;

  return (
    <CalculatorLayout
      title="Return & Refund Cost Calculator"
      description="Calculate the true cost of product returns on your margins"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
        <div className="lg:col-span-1 space-y-4">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-6">Return Settings</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Selling Price ($)</label>
                  <input type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Product Cost ($)</label>
                  <input type="number" step="0.01" value={productCost} onChange={(e) => setProductCost(+e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Shipping Cost ($)</label>
                  <input type="number" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Return Rate (%)</label>
                  <input type="number" step="0.5" min="0" max="100" value={returnRate} onChange={(e) => setReturnRate(+e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Return Shipping ($)</label>
                  <input type="number" step="0.01" value={returnShippingCost} onChange={(e) => setReturnShippingCost(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Refund Fee ($)</label>
                  <input type="number" step="0.01" value={refundProcessingFee} onChange={(e) => setRefundProcessingFee(+e.target.value)} className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Monthly Orders</label>
                <input type="number" min="1" value={monthlyOrders} onChange={(e) => setMonthlyOrders(+e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Impact Analysis</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-red-400/5 border border-red-400/20 text-center">
                <p className="text-[10px] text-red-400 uppercase tracking-wider mb-1">Cost Per Return</p>
                <p className="font-display text-2xl font-bold text-red-400">${result.returnCostPerUnit}</p>
              </div>
              <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/20 text-center">
                <p className="text-[10px] text-amber-400 uppercase tracking-wider mb-1">Monthly Return Cost</p>
                <p className="font-display text-2xl font-bold text-amber-400">${result.totalMonthlyReturnCost.toLocaleString()}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Margin Impact</p>
                <p className="font-display text-2xl font-bold text-foreground">-{result.returnImpactOnMargin}%</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Annual Return Cost</p>
                <p className="font-display text-2xl font-bold text-foreground">${result.annualReturnCost.toLocaleString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-surface/50 border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Net Loss Per Return</p>
                <p className="font-display text-xl font-bold text-red-400">${result.netLossPerReturn}</p>
                <p className="text-[10px] text-muted-foreground mt-1">Revenue lost + cost incurred</p>
              </div>
              <div className="p-4 rounded-xl bg-surface/50 border border-border">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Net Margin After Returns</p>
                <p className={`font-display text-xl font-bold ${netMarginAfterReturns >= 20 ? "text-emerald-400" : netMarginAfterReturns >= 10 ? "text-amber-400" : "text-red-400"}`}>
                  {netMarginAfterReturns.toFixed(1)}%
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">Effective margin accounting for returns</p>
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Cost Breakdown Per Return</h3>
            <div className="space-y-2 mb-4">
              {result.breakdown.map((item: { name: string; value: number; color: string }) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground flex-1">{item.name}</span>
                  <span className="text-sm font-mono text-foreground">${item.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="h-3 rounded-full overflow-hidden flex bg-surface">
              {result.breakdown.map((item: { name: string; value: number; color: string }) => {
                const total = result.breakdown.reduce((s: number, b: { value: number }) => s + b.value, 0);
                return (
                  <div key={item.name} style={{ width: `${total > 0 ? (item.value / total) * 100 : 0}%`, backgroundColor: item.color }} className="h-full transition-all duration-500" />
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </CalculatorLayout>
  );
}
