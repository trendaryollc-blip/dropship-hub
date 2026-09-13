"use client";

import { useState } from "react";
import { calculateAmazonFBA } from "@/lib/calculations";
import type { AmazonFBACalcResult } from "@/types/calculator";
import CalculatorLayout from "@/components/calculator/CalculatorLayout";

const CATEGORIES = ["Electronics", "Clothing", "Home & Garden", "Beauty", "Toys", "Jewelry", "Shoes", "Default"];

export default function AmazonFBACalculatorPage() {
  const [productCategory, setProductCategory] = useState("Electronics");
  const [productWeight, setProductWeight] = useState(1.5);
  const [length, setLength] = useState(12);
  const [width, setWidth] = useState(8);
  const [height, setHeight] = useState(4);
  const [sellingPrice, setSellingPrice] = useState(34.99);
  const [productCost, setProductCost] = useState(8);
  const [shippingToWarehouse, setShippingToWarehouse] = useState(2);
  const [monthlyStorageMonths, setMonthlyStorageMonths] = useState(1);

  const result: AmazonFBACalcResult = calculateAmazonFBA({
    productCategory,
    productWeight,
    productDimensions: { length, width, height },
    sellingPrice,
    productCost,
    shippingToWarehouse,
    monthlyStorageMonths,
  });

  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm font-mono";
  const labelClass = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2";
  const cardClass = "glass rounded-2xl p-6";

  return (
    <CalculatorLayout
      title="Amazon FBA Calculator"
      description="FBA fulfillment fees, storage, referral fees, and FBA vs FBM comparison"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
        <div className="lg:col-span-1 space-y-4">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-6">Product Details</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Product Category</label>
                <select value={productCategory} onChange={(e) => setProductCategory(e.target.value)} className={inputClass}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
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
              <div className="h-px bg-border" />
              <div>
                <label className={labelClass}>Weight (lbs)</label>
                <input type="number" step="0.1" value={productWeight} onChange={(e) => setProductWeight(+e.target.value)} className={inputClass} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Length (in)</label>
                  <input type="number" value={length} onChange={(e) => setLength(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Width (in)</label>
                  <input type="number" value={width} onChange={(e) => setWidth(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Height (in)</label>
                  <input type="number" value={height} onChange={(e) => setHeight(+e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Ship to WH ($)</label>
                  <input type="number" step="0.01" value={shippingToWarehouse} onChange={(e) => setShippingToWarehouse(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Storage (months)</label>
                  <input type="number" min="1" max="12" value={monthlyStorageMonths} onChange={(e) => setMonthlyStorageMonths(+e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Amazon Fee Breakdown</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-surface border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">FBA Fee</p>
                <p className="font-display text-2xl font-bold text-foreground">${result.fbaFee}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Referral Fee</p>
                <p className="font-display text-2xl font-bold text-foreground">${result.referralFee}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Storage</p>
                <p className="font-display text-2xl font-bold text-foreground">${result.storageFee}</p>
              </div>
              <div className="p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20 text-center">
                <p className="text-[10px] text-emerald-400 uppercase tracking-wider mb-1">Profit/Unit</p>
                <p className={`font-display text-2xl font-bold ${result.profitPerUnit >= 0 ? "text-emerald-400" : "text-red-400"}`}>${result.profitPerUnit}</p>
              </div>
            </div>

            <div className="space-y-2 mb-6">
              {result.breakdown.map((item: { name: string; value: number; pct: number; color: string }) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground flex-1">{item.name}</span>
                  <span className="text-sm font-mono text-foreground">${item.value.toFixed(2)}</span>
                  <span className="text-xs text-muted-foreground w-12 text-right">{item.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
            <div className="h-3 rounded-full overflow-hidden flex bg-surface">
              {result.breakdown.map((item: { name: string; value: number; pct: number; color: string }) => (
                <div key={item.name} style={{ width: `${item.pct}%`, backgroundColor: item.color }} className="h-full transition-all duration-500" />
              ))}
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">FBA vs FBM Comparison</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-surface/50 border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total FBA Cost</p>
                <p className="font-display text-xl font-bold text-accent">${result.fbaVsFbm.fba}</p>
              </div>
              <div className="p-4 rounded-xl bg-surface/50 border border-border text-center">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Total FBM Cost</p>
                <p className="font-display text-xl font-bold text-foreground">${result.fbaVsFbm.fbm}</p>
              </div>
              <div className={`p-4 rounded-xl border text-center ${result.fbaVsFbm.savings > 0 ? "bg-emerald-400/5 border-emerald-400/20" : "bg-red-400/5 border-red-400/20"}`}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">FBA Savings</p>
                <p className={`font-display text-xl font-bold ${result.fbaVsFbm.savings > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {result.fbaVsFbm.savings > 0 ? `$${result.fbaVsFbm.savings}` : `-$${Math.abs(result.fbaVsFbm.savings)}`}
                </p>
              </div>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-surface/30 border border-border/50">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Margin:</span> {result.margin}% &nbsp;|&nbsp;
                <span className="font-semibold text-foreground">ROI:</span> {result.roi}% &nbsp;|&nbsp;
                <span className="font-semibold text-foreground">Total Amazon Fees:</span> ${result.totalAmazonFees}
              </p>
            </div>
          </div>
        </div>
      </div>
    </CalculatorLayout>
  );
}
