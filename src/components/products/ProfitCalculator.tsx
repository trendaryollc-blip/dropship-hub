"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Calculator, Zap, ArrowRight, DollarSign, TrendingUp, Target } from "lucide-react";
import { useInView } from "@/hooks/useInView";

const presets = [
  { name: "Amazon FBA", platformFee: 15, shipping: 3.5, adSpend: 5 },
  { name: "Shopify Dropship", platformFee: 0, shipping: 5, adSpend: 8 },
  { name: "eBay Resell", platformFee: 13, shipping: 4, adSpend: 2 },
];

export default function ProfitCalculator({ sourcePrice, sellPrice }: { sourcePrice: number; sellPrice: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [cost, setCost] = useState(sourcePrice);
  const [selling, setSelling] = useState(sellPrice);
  const [platformFee, setPlatformFee] = useState(15);
  const [shipping, setShipping] = useState(5);
  const [adSpend, setAdSpend] = useState(5);

  const result = useMemo(() => {
    const fee = selling * (platformFee / 100);
    const totalCost = cost + shipping + adSpend + fee;
    const profit = selling - totalCost;
    const margin = selling > 0 ? (profit / selling) * 100 : 0;
    const roi = totalCost > 0 ? (profit / totalCost) * 100 : 0;
    const breakEven = profit > 0 ? Math.ceil((cost + shipping + adSpend) / (selling - fee - cost - shipping - adSpend + profit)) : 0;
    return { profit, margin, roi, breakEven: profit > 0 ? Math.ceil((cost + shipping + adSpend) / profit) : 0 };
  }, [cost, selling, platformFee, shipping, adSpend]);

  const applyPreset = (p: typeof presets[0]) => {
    setPlatformFee(p.platformFee);
    setShipping(p.shipping);
    setAdSpend(p.adSpend);
  };

  return (
    <div ref={ref} className={`glass rounded-2xl border border-border overflow-hidden transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center">
            <Calculator className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Profit Calculator</h3>
            <p className="text-[10px] text-muted-foreground">Calculate real margins with all costs</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex gap-2 mb-1">
          {presets.map((p) => (
            <button key={p.name} onClick={() => applyPreset(p)} className="text-[10px] px-2.5 py-1 rounded-lg bg-surface border border-border text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all">
              {p.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Source Price</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="number" value={cost} onChange={(e) => setCost(+e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/50" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Selling Price</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="number" value={selling} onChange={(e) => setSelling(+e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/50" />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Platform Fee (%)</label>
            <input type="number" value={platformFee} onChange={(e) => setPlatformFee(+e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/50" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Shipping Cost</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="number" value={shipping} onChange={(e) => setShipping(+e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/50" />
            </div>
          </div>
          <div className="col-span-2">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 block">Ad Spend per Sale</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input type="number" value={adSpend} onChange={(e) => setAdSpend(+e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/50" />
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="h-3 w-3 text-emerald-400" />
                <span className="text-[10px] text-muted-foreground">Net Profit</span>
              </div>
              <p className={`font-display text-lg font-bold ${result.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                ${result.profit.toFixed(2)}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] text-muted-foreground">ROI</span>
              </div>
              <p className={`font-display text-lg font-bold ${result.roi >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {result.roi.toFixed(0)}%
              </p>
            </div>
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Target className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] text-muted-foreground">Break Even</span>
              </div>
              <p className="font-display text-lg font-bold text-foreground">
                {result.breakEven > 0 ? result.breakEven : "-"}
              </p>
            </div>
          </div>
          <div className="mt-3 text-center">
            <span className="text-[10px] text-muted-foreground">Profit Margin: </span>
            <span className={`text-xs font-bold ${result.margin >= 30 ? "text-emerald-400" : result.margin >= 15 ? "text-amber-400" : "text-red-400"}`}>
              {result.margin.toFixed(1)}%
            </span>
            <span className="text-[10px] text-muted-foreground"> {result.margin >= 30 ? "(Excellent)" : result.margin >= 15 ? "(Good)" : "(Low)"}</span>
          </div>
        </div>

        <Link
          href={`/calculator?cost=${cost}&sell=${selling}&fee=${platformFee}&ship=${shipping}&ads=${adSpend}`}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all"
        >
          <Calculator className="h-3.5 w-3.5" /> Full Calculator <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
