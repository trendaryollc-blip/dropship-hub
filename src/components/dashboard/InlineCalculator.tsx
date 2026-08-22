"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Calculator, ArrowUpRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { calculateProfit } from "@/lib/calculations";

function MiniDonut({ profit, cost }: { profit: number; cost: number }) {
  const total = profit + cost;
  const profitPct = total > 0 ? (profit / total) * 100 : 0;
  const r = 28;
  const circumference = 2 * Math.PI * r;
  const profitOffset = circumference - (profitPct / 100) * circumference;

  return (
    <svg viewBox="0 0 80 80" className="w-full h-full">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
      <circle
        cx="40" cy="40" r={r} fill="none"
        stroke="url(#calcGradient)"
        strokeWidth="8"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={profitOffset}
        className="transition-all duration-700 -rotate-90"
      />
      <defs>
        <linearGradient id="calcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function InlineCalculator() {
  const [cost, setCost] = useState(10);
  const [sellPrice, setSellPrice] = useState(30);
  const { ref, isInView } = useInView({ threshold: 0.2 });

  const result = useMemo(() => {
    return calculateProfit(cost, sellPrice, 3, 15, 2, 1);
  }, [cost, sellPrice]);

  const marginColor = result.profitMargin > 50 ? "text-emerald-400" : result.profitMargin > 30 ? "text-amber-400" : "text-red-400";

  return (
    <div ref={ref} className={`glass rounded-2xl p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10">
          <Calculator className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <h3 className="font-display text-sm font-semibold text-foreground">Quick Calc</h3>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Cost ($)</label>
          <input
            type="number"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all"
          />
        </div>
        <div>
          <label className="text-[10px] text-muted-foreground mb-1 block">Sell Price ($)</label>
          <input
            type="number"
            value={sellPrice}
            onChange={(e) => setSellPrice(Number(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <div className="w-16 h-16 shrink-0">
          <MiniDonut profit={result.netProfit} cost={result.totalCost} />
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Profit</span>
            <span className="font-display text-sm font-bold text-emerald-400">${result.netProfit.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">Margin</span>
            <span className={`font-display text-sm font-bold ${marginColor}`}>{result.profitMargin.toFixed(1)}%</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">ROI</span>
            <span className="font-display text-sm font-bold text-accent">{result.roi.toFixed(1)}%</span>
          </div>
        </div>
      </div>

      <Link
        href="/calculator"
        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
      >
        Open Full Calculator
        <ArrowUpRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
