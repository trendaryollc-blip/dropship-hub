"use client";

import { useState, useMemo } from "react";
import { calculatePlatformFees } from "@/lib/calculations";
import type { PlatformComparisonResult } from "@/types/calculator";
import CalculatorLayout from "@/components/calculator/CalculatorLayout";
import { CheckCircle } from "lucide-react";

export default function PlatformComparisonPage() {
  const [sellingPrice, setSellingPrice] = useState(34.99);
  const [productCost, setProductCost] = useState(8);

  const result: PlatformComparisonResult = calculatePlatformFees(sellingPrice, productCost);

  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm font-mono";
  const labelClass = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2";
  const cardClass = "glass rounded-2xl p-6";

  const maxFee = Math.max(...result.platforms.map((p) => p.totalFeeAtPrice), 1);

  return (
    <CalculatorLayout
      title="Platform Fee Comparison"
      description="Compare Shopify, Amazon, eBay, Etsy, Walmart, and WooCommerce fees"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
        <div className="lg:col-span-1 space-y-4">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-6">Product Price</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Selling Price ($)</label>
                <input type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(+e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Product Cost ($)</label>
                <input type="number" step="0.01" value={productCost} onChange={(e) => setProductCost(+e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">Fee Breakdown</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p><span className="font-semibold text-foreground">Referral Fee:</span> Category-based % of sale price</p>
              <p><span className="font-semibold text-foreground">Payment Processing:</span> Per-transaction % charged by gateway</p>
              <p><span className="font-semibold text-foreground">Per-Order Fee:</span> Fixed fee per transaction</p>
              <p><span className="font-semibold text-foreground">Monthly Fee:</span> Platform subscription (prorated per order)</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Platform Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-3 text-[10px] font-semibold text-muted-foreground uppercase">Platform</th>
                    <th className="text-right py-3 px-3 text-[10px] font-semibold text-muted-foreground uppercase">Total Fee</th>
                    <th className="text-right py-3 px-3 text-[10px] font-semibold text-muted-foreground uppercase">Eff. Rate</th>
                    <th className="text-right py-3 px-3 text-[10px] font-semibold text-muted-foreground uppercase">Net Profit</th>
                    <th className="text-center py-3 px-3 text-[10px] font-semibold text-muted-foreground uppercase"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.platforms.map((p: PlatformComparisonResult["platforms"][0]) => (
                    <tr key={p.platform} className={`border-b border-border/50 transition-colors ${
                      p.platform === result.bestPlatform ? "bg-emerald-400/5" : "hover:bg-surface/30"
                    }`}>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                          <span className="font-medium text-foreground">{p.platform}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-foreground">${p.totalFeeAtPrice.toFixed(2)}</td>
                      <td className="py-3 px-3 text-right font-mono text-muted-foreground">{p.effectiveFeeRate}%</td>
                      <td className={`py-3 px-3 text-right font-mono font-bold ${p.netProfitAtPrice >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        ${p.netProfitAtPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {p.platform === result.bestPlatform && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                            <CheckCircle className="h-3 w-3" /> Best
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Fee Comparison</h3>
            <div className="space-y-3">
              {result.platforms.map((p) => (
                <div key={p.platform} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-24 shrink-0">{p.platform}</span>
                  <div className="flex-1 h-4 rounded-full bg-surface/50 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${maxFee > 0 ? (p.totalFeeAtPrice / maxFee) * 100 : 0}%`,
                        backgroundColor: p.color,
                      }}
                    />
                  </div>
                  <span className="text-xs font-mono text-foreground w-16 text-right">${p.totalFeeAtPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Detailed Fee Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-2 text-muted-foreground uppercase">Platform</th>
                    <th className="text-right py-2 px-2 text-muted-foreground uppercase">Monthly</th>
                    <th className="text-right py-2 px-2 text-muted-foreground uppercase">Referral</th>
                    <th className="text-right py-2 px-2 text-muted-foreground uppercase">Processing</th>
                    <th className="text-right py-2 px-2 text-muted-foreground uppercase">Per-Order</th>
                  </tr>
                </thead>
                <tbody>
                  {result.platforms.map((p: PlatformComparisonResult["platforms"][0]) => (
                    <tr key={p.platform} className="border-b border-border/50">
                      <td className="py-2 px-2 font-medium text-foreground">{p.platform}</td>
                      <td className="py-2 px-2 text-right font-mono text-muted-foreground">${p.monthlyFee}/mo</td>
                      <td className="py-2 px-2 text-right font-mono text-muted-foreground">{p.referralFee}%</td>
                      <td className="py-2 px-2 text-right font-mono text-muted-foreground">{p.paymentProcessing}%</td>
                      <td className="py-2 px-2 text-right font-mono text-muted-foreground">${p.perOrderFee}</td>
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
