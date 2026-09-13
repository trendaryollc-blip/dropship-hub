"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { saveCalcHistory, getCalcHistory, type CalcHistoryEntry } from "@/lib/data";
import { CheckCircle2, Save, Clock } from "lucide-react";
import { calculateShipping, type ShippingCalc } from "@/lib/calculations";
import CalculatorLayout from "@/components/calculator/CalculatorLayout";

export default function ShippingCalculatorPage() {
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<CalcHistoryEntry[]>([]);

  const [weight, setWeight] = useState(0.5);
  const [length, setLength] = useState(20);
  const [width, setWidth] = useState(15);
  const [height, setHeight] = useState(10);
  const [originCountry, setOriginCountry] = useState("China");
  const [destCountry, setDestCountry] = useState("US");

  const result: ShippingCalc = calculateShipping(weight, length, width, height, originCountry, destCountry);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const entries = await getCalcHistory(user.uid, "shipping");
      setHistory(entries.slice(0, 5));
    } catch (e) { console.warn("[ShippingCalc] Error:", e instanceof Error ? e.message : e); }
  };

  const handleSave = async () => {
    if (!user) return;
    await saveCalcHistory(user.uid, {
      type: "shipping",
      inputs: { weight, length, width, height },
      result: { estimatedCost: result.estimatedCost, costPerUnit: result.costPerUnit },
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
      title="Shipping Calculator"
      description="Compare carrier costs by package size, weight, and destination"
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
                  if (entry.inputs.weight != null) {
                    setWeight(entry.inputs.weight);
                    setLength(entry.inputs.length);
                    setWidth(entry.inputs.width);
                    setHeight(entry.inputs.height);
                  }
                }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(entry.inputs).slice(0, 3).map(([key, val]) => (
                      <span key={key} className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-muted-foreground font-mono">
                        {key}: {typeof val === "number" ? val.toFixed(2) : val}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  {entry.result.estimatedCost != null && (
                    <p className="text-xs font-bold text-accent">${entry.result.estimatedCost.toFixed(2)}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
        <div className={cardClass}>
          <h3 className="font-display text-lg font-semibold text-foreground mb-6">Package Details</h3>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Weight (kg)</label>
              <input type="number" step="0.1" value={weight} onChange={(e) => setWeight(+e.target.value)} className={inputClass} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Length (cm)</label>
                <input type="number" value={length} onChange={(e) => setLength(+e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Width (cm)</label>
                <input type="number" value={width} onChange={(e) => setWidth(+e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Height (cm)</label>
                <input type="number" value={height} onChange={(e) => setHeight(+e.target.value)} className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Origin</label>
                <select value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} className={inputClass}>
                  <option>China</option><option>US</option><option>Germany</option><option>India</option><option>Vietnam</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Destination</label>
                <select value={destCountry} onChange={(e) => setDestCountry(e.target.value)} className={inputClass}>
                  <option>US</option><option>UK</option><option>Germany</option><option>Australia</option><option>Canada</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className={cardClass}>
          <h3 className="font-display text-lg font-semibold text-foreground mb-4">Shipping Options</h3>
          <div className="space-y-3">
            {result.carriers.map((c) => (
              <div key={c.name} className="p-4 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-semibold text-foreground">{c.name}</h4>
                  <p className="font-display text-lg font-bold text-foreground">${c.cost.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{c.days} days</span>
                  <span>{c.reliability}% reliability</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-surface overflow-hidden">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${c.reliability}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CalculatorLayout>
  );
}
