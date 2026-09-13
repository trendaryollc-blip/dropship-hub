"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { saveCalcHistory, getCalcHistory, type CalcHistoryEntry } from "@/lib/data";
import { CheckCircle2, Save, Clock, Info } from "lucide-react";
import { calculateLandedCost, type LandedCostCalc } from "@/lib/calculations";
import CalculatorLayout from "@/components/calculator/CalculatorLayout";

export default function LandedCostCalculatorPage() {
  const searchParams = useSearchParams();
  const initialCost = parseFloat(searchParams.get("cost") || "8");
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<CalcHistoryEntry[]>([]);

  const [lcCost, setLcCost] = useState(initialCost);
  const [lcShipping, setLcShipping] = useState(5);
  const [tariff, setTariff] = useState(25);
  const [customsDuty, setCustomsDuty] = useState(0);
  const [insurance, setInsurance] = useState(0.5);
  const [lcPlatformFee, setLcPlatformFee] = useState(15);
  const [otherFees, setOtherFees] = useState(0);
  const [lcQty, setLcQty] = useState(1);

  const result: LandedCostCalc = calculateLandedCost(lcCost, lcShipping, tariff, customsDuty, insurance, lcPlatformFee, otherFees, lcQty);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const entries = await getCalcHistory(user.uid, "landed");
      setHistory(entries.slice(0, 5));
    } catch (e) { console.warn("[LandedCalc] Error:", e instanceof Error ? e.message : e); }
  };

  const handleSave = async () => {
    if (!user) return;
    await saveCalcHistory(user.uid, {
      type: "landed",
      inputs: { lcCost, lcShipping, tariff, customsDuty, insurance },
      result: { landedCost: result.landedCost, totalDuties: result.totalDuties, suggestedRetail: result.suggestedRetail },
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
      title="Landed Cost Calculator"
      description="Full import cost including tariffs, customs, and insurance"
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
                  if (entry.inputs.lcCost != null) {
                    setLcCost(entry.inputs.lcCost);
                    setLcShipping(entry.inputs.lcShipping);
                    setTariff(entry.inputs.tariff);
                    setCustomsDuty(entry.inputs.customsDuty);
                    setInsurance(entry.inputs.insurance);
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
                  {entry.result.landedCost != null && (
                    <p className="text-xs font-bold text-accent">${entry.result.landedCost}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
        <div className={cardClass}>
          <h3 className="font-display text-lg font-semibold text-foreground mb-6">True Cost Input</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Product Cost ($)</label>
                <input type="number" step="0.01" value={lcCost} onChange={(e) => setLcCost(+e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Shipping ($)</label>
                <input type="number" step="0.01" value={lcShipping} onChange={(e) => setLcShipping(+e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Tariff (%)</label>
                <input type="number" step="0.1" value={tariff} onChange={(e) => setTariff(+e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Customs Duty ($)</label>
                <input type="number" step="0.01" value={customsDuty} onChange={(e) => setCustomsDuty(+e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Insurance ($)</label>
                <input type="number" step="0.01" value={insurance} onChange={(e) => setInsurance(+e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Platform Fee (%)</label>
                <input type="number" step="0.1" value={lcPlatformFee} onChange={(e) => setLcPlatformFee(+e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Other Fees ($)</label>
                <input type="number" step="0.01" value={otherFees} onChange={(e) => setOtherFees(+e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Quantity</label>
                <input type="number" min="1" value={lcQty} onChange={(e) => setLcQty(+e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Landed Cost Breakdown</h3>
            <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 text-center mb-6">
              <p className="text-xs text-accent uppercase tracking-wider mb-1">Total Landed Cost</p>
              <p className="font-display text-4xl font-bold text-accent">${result.landedCost}</p>
              <p className="text-xs text-muted-foreground mt-1">${(result.landedCost / lcQty).toFixed(2)} per unit</p>
            </div>

            <div className="space-y-2 mb-4">
              {result.breakdown.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground flex-1">{item.name}</span>
                  <span className="text-sm font-mono text-foreground">${item.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="h-3 rounded-full overflow-hidden flex bg-surface">
              {result.breakdown.map((item) => (
                <div key={item.name} style={{ width: `${(item.value / result.landedCost) * 100}%`, backgroundColor: item.color }} className="h-full" />
              ))}
            </div>
            <div className="mt-6 p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20">
              <p className="text-sm font-medium text-emerald-400 mb-1">Suggested Retail: ${result.suggestedRetail}</p>
              <p className="text-xs text-muted-foreground">Profit at suggested price: ${result.profitAtSuggested} per unit</p>
            </div>
          </div>

          {tariff > 0 && (
            <div className="p-4 rounded-xl bg-amber-400/5 border border-amber-400/20 flex items-start gap-3">
              <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-400">Tariff Alert</p>
                <p className="text-xs text-muted-foreground mt-1">Section 301 tariffs on Chinese goods are currently 25%. Factor this into your pricing strategy.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </CalculatorLayout>
  );
}
