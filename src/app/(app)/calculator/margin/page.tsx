"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { saveCalcHistory, getCalcHistory, type CalcHistoryEntry } from "@/lib/data";
import { CheckCircle2, Save, Clock } from "lucide-react";
import { calculateMargin, type MarginCalc } from "@/lib/calculations";
import CalculatorLayout from "@/components/calculator/CalculatorLayout";

export default function MarginCalculatorPage() {
  const searchParams = useSearchParams();
  const initialCost = parseFloat(searchParams.get("cost") || "8");
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<CalcHistoryEntry[]>([]);

  const [marginCost, setMarginCost] = useState(initialCost);
  const [desiredMargin, setDesiredMargin] = useState(40);

  const result: MarginCalc = calculateMargin(marginCost, desiredMargin);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const entries = await getCalcHistory(user.uid, "margin");
      setHistory(entries.slice(0, 5));
    } catch (e) { console.warn("[MarginCalc] Error:", e instanceof Error ? e.message : e); }
  };

  const handleSave = async () => {
    if (!user) return;
    await saveCalcHistory(user.uid, {
      type: "margin",
      inputs: { marginCost, desiredMargin },
      result: { recommendedPrice: result.recommendedPrice, marginAtPrice: result.marginAtPrice },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    fetchHistory();
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm font-mono";
  const labelClass = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2";
  const cardClass = "glass rounded-2xl p-6";

  return (
    <CalculatorLayout
      title="Margin Calculator"
      description="Find the right selling price for your desired profit margin"
      actions={
        user ? (
          <button onClick={handleSave} disabled={saved}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all">
            {saved ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Save</>}
          </button>
        ) : undefined
      }
    >
      {user && history.length > 0 && (
        <div className="mb-6 glass rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Recent Saves</h3>
          </div>
          <div className="space-y-2">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all cursor-pointer"
                onClick={() => {
                  if (entry.inputs.marginCost != null) {
                    setMarginCost(entry.inputs.marginCost);
                    setDesiredMargin(entry.inputs.desiredMargin);
                  }
                }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(entry.inputs).slice(0, 3).map(([key, val]) => (
                      <span key={key} className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-muted-foreground font-mono">
                        {key}: ${typeof val === "number" ? val.toFixed(2) : val}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  {entry.result.recommendedPrice != null && (
                    <p className="text-xs font-bold text-accent">${entry.result.recommendedPrice}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
        <div className={cardClass}>
          <h3 className="font-display text-lg font-semibold text-foreground mb-6">Margin Input</h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Cost Price ($)</label>
              <input type="number" step="0.01" value={marginCost} onChange={(e) => setMarginCost(+e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Desired Margin (%)</label>
              <input type="number" step="1" min="0" max="95" value={desiredMargin} onChange={(e) => setDesiredMargin(+e.target.value)} className={inputClass} />
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Price Breakpoints</h3>
          <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 text-center mb-6">
            <p className="text-xs text-accent uppercase tracking-wider mb-1">Recommended Price</p>
            <p className="font-display text-4xl font-bold text-accent">${result.recommendedPrice}</p>
            <p className="text-xs text-muted-foreground mt-1">{desiredMargin}% margin</p>
          </div>
          <div className="space-y-2">
            {result.priceBreakpoints.map((bp) => (
              <div key={bp.margin} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${bp.margin === desiredMargin ? "bg-accent/10 border border-accent/20" : "bg-surface/50 border border-border"}`}>
                <div className="w-16 text-center">
                  <p className="text-sm font-bold text-foreground">${bp.price}</p>
                </div>
                <div className="flex-1">
                  <div className="h-2 rounded-full bg-surface overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${bp.margin}%` }} />
                  </div>
                </div>
                <div className="text-right w-20">
                  <p className="text-sm font-medium text-foreground">{bp.margin}%</p>
                  <p className="text-[10px] text-muted-foreground">ROI: {bp.roi}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CalculatorLayout>
  );
}
