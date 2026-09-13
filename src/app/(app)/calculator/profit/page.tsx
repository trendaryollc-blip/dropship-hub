"use client";

import { useState, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { saveCalcHistory, getCalcHistory, type CalcHistoryEntry } from "@/lib/data";
import {
  CheckCircle2, Save, Clock, AlertTriangle,
} from "lucide-react";
import { calculateProfit, type ProfitCalc } from "@/lib/calculations";
import CalculatorLayout from "@/components/calculator/CalculatorLayout";
import CalculatorPresets from "@/components/calculator/CalculatorPresets";
import CalculatorAIAnalysis from "@/components/calculator/CalculatorAIAnalysis";
import CalculatorComparison from "@/components/calculator/CalculatorComparison";
import CalculatorBulk from "@/components/calculator/CalculatorBulk";
import CalculatorTemplates from "@/components/calculator/CalculatorTemplates";

function ProfitGauge({ margin }: { margin: number }) {
  const normalizedMargin = Math.min(100, Math.max(-50, margin));
  const rotation = ((normalizedMargin + 50) / 150) * 180 - 90;
  const color = margin >= 40 ? "#10b981" : margin >= 20 ? "#f59e0b" : margin >= 0 ? "#f97316" : "#ef4444";

  return (
    <div className="relative w-32 h-16 mx-auto mb-3 overflow-hidden">
      <svg viewBox="0 0 100 50" className="w-full h-full">
        <defs>
          <linearGradient id="profitGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="33%" stopColor="#f97316" />
            <stop offset="66%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
        <path d="M 10 45 A 40 40 0 0 1 90 45" fill="none" stroke="url(#profitGaugeGrad)" strokeWidth="6" strokeLinecap="round" opacity={0.3} />
        <line
          x1="50" y1="45"
          x2={50 + 30 * Math.cos((rotation * Math.PI) / 180)}
          y2={45 - 30 * Math.sin((rotation * Math.PI) / 180)}
          stroke={color} strokeWidth="2.5" strokeLinecap="round"
        />
        <circle cx="50" cy="45" r="3" fill={color} />
      </svg>
    </div>
  );
}

function RevenueProjection({ profitPerUnit }: { profitPerUnit: number }) {
  const quantities = [10, 50, 100, 500, 1000];
  const maxProfit = Math.max(...quantities.map((q) => q * profitPerUnit), 1);

  return (
    <div className="mt-4">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-2">Revenue Projection</p>
      <div className="space-y-1.5">
        {quantities.map((qty) => {
          const profit = qty * profitPerUnit;
          const width = maxProfit > 0 ? Math.max(5, (Math.abs(profit) / maxProfit) * 100) : 5;
          return (
            <div key={qty} className="flex items-center gap-2">
              <span className="text-[9px] text-muted-foreground w-12 text-right">{qty} units</span>
              <div className="flex-1 h-2.5 rounded-full bg-surface/50 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${profit >= 0 ? "bg-emerald-400" : "bg-red-400"}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className={`text-[9px] font-mono w-16 ${profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                ${profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ProfitCalculatorPage() {
  const searchParams = useSearchParams();
  const initialCost = parseFloat(searchParams.get("cost") || "8");
  const initialPrice = parseFloat(searchParams.get("price") || "34.99");
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);
  const [history, setHistory] = useState<CalcHistoryEntry[]>([]);

  const [productCost, setProductCost] = useState(initialCost);
  const [sellingPrice, setSellingPrice] = useState(initialPrice);
  const [shippingCost, setShippingCost] = useState(parseFloat(searchParams.get("ship") || "5"));
  const [platformFee, setPlatformFee] = useState(parseFloat(searchParams.get("fee") || "15"));
  const [adSpend, setAdSpend] = useState(parseFloat(searchParams.get("ads") || "3"));
  const [units, setUnits] = useState(1);

  const profitResult: ProfitCalc = calculateProfit(productCost, sellingPrice, shippingCost, platformFee, adSpend, units);

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const entries = await getCalcHistory(user.uid, "profit");
      setHistory(entries.slice(0, 5));
    } catch (e) { console.warn("[ProfitCalc] Error:", e instanceof Error ? e.message : e); }
  };

  const handleSave = async () => {
    if (!user) return;
    await saveCalcHistory(user.uid, {
      type: "profit",
      inputs: { productCost, sellingPrice, shippingCost, platformFee, adSpend, units },
      result: { netProfit: profitResult.netProfit, profitMargin: profitResult.profitMargin, roi: profitResult.roi },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    fetchHistory();
  };

  const handleAskAI = useCallback((prompt: string) => {
    window.open(`/ai?q=${encodeURIComponent(prompt)}`, "_blank");
  }, []);

  const handleApplyPlatformFee = useCallback((fee: number) => setPlatformFee(fee), []);
  const handleApplyCategory = useCallback((cost: number, price: number, ship: number) => {
    setProductCost(cost);
    setSellingPrice(price);
    setShippingCost(ship);
  }, []);
  const handleApplyShipping = useCallback((ship: number) => setShippingCost(ship), []);

  const handleApplyTemplate = useCallback((templateId: string) => {
    switch (templateId) {
      case "new-product": setProductCost(8); setSellingPrice(34.99); setShippingCost(5); setPlatformFee(15); setAdSpend(3); break;
      case "bulk-order": setUnits(500); setProductCost(5); setSellingPrice(29.99); break;
      case "subscription": setProductCost(6); setSellingPrice(29.99); setShippingCost(4); setAdSpend(0); break;
    }
  }, []);

  const profitInputs = useMemo(() => ({ productCost, sellingPrice, shippingCost, platformFee, adSpend, units }), [productCost, sellingPrice, shippingCost, platformFee, adSpend, units]);
  const profitResults = useMemo(() => ({ netProfit: profitResult.netProfit, profitMargin: profitResult.profitMargin, roi: profitResult.roi }), [profitResult]);
  const currentScenario = useMemo(() => ({
    cost: productCost, price: sellingPrice, shipping: shippingCost, fee: platformFee, adSpend,
    netProfit: profitResult.netProfit, margin: profitResult.profitMargin, roi: profitResult.roi,
  }), [productCost, sellingPrice, shippingCost, platformFee, adSpend, profitResult]);

  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm font-mono";
  const labelClass = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2";
  const cardClass = "glass rounded-2xl p-6";

  return (
    <CalculatorLayout
      title="Profit Calculator"
      description="Quick profit calculation with cost breakdown and revenue projections"
      actions={
        user ? (
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all"
          >
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
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all cursor-pointer"
                onClick={() => {
                  if (entry.inputs.productCost != null) {
                    setProductCost(entry.inputs.productCost);
                    setSellingPrice(entry.inputs.sellingPrice);
                    setShippingCost(entry.inputs.shippingCost);
                    setPlatformFee(entry.inputs.platformFee);
                    setAdSpend(entry.inputs.adSpend);
                    setUnits(entry.inputs.units);
                  }
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {Object.entries(entry.inputs).slice(0, 3).map(([key, val]) => (
                      <span key={key} className="text-[10px] px-2 py-0.5 rounded-full bg-surface border border-border text-muted-foreground font-mono">
                        {key}: ${typeof val === "number" ? val.toFixed(2) : val}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {entry.savedAt?.toDate ? new Date(entry.savedAt.toDate()).toLocaleString() : "Just now"}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  {entry.result.netProfit != null && (
                    <p className={`text-xs font-bold ${entry.result.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      ${entry.result.netProfit.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6 animate-slide-up">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <div className={cardClass}>
              <h3 className="font-display text-lg font-semibold text-foreground mb-6">Input Values</h3>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Product Cost ($)</label>
                  <input type="number" step="0.01" value={productCost} onChange={(e) => setProductCost(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Selling Price ($)</label>
                  <input type="number" step="0.01" value={sellingPrice} onChange={(e) => setSellingPrice(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Shipping Cost ($)</label>
                  <input type="number" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(+e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Platform Fee (%)</label>
                    <input type="number" step="0.1" value={platformFee} onChange={(e) => setPlatformFee(+e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Ad Spend/Unit ($)</label>
                    <input type="number" step="0.01" value={adSpend} onChange={(e) => setAdSpend(+e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Units Sold</label>
                  <input type="number" min="1" value={units} onChange={(e) => setUnits(+e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
            <CalculatorPresets activeTab="profit" onApplyPlatformFee={handleApplyPlatformFee} onApplyCategory={handleApplyCategory} onApplyShipping={handleApplyShipping} />
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className={cardClass}>
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">Results</h3>
              <ProfitGauge margin={profitResult.profitMargin} />
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20 text-center">
                  <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Net Profit</p>
                  <p className={`font-display text-3xl font-bold ${profitResult.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${profitResult.netProfit.toFixed(2)}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 text-center">
                  <p className="text-xs text-accent uppercase tracking-wider mb-1">Profit Margin</p>
                  <p className="font-display text-3xl font-bold text-accent">{profitResult.profitMargin.toFixed(1)}%</p>
                </div>
                <div className="p-4 rounded-xl bg-surface border border-border text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">ROI</p>
                  <p className="font-display text-2xl font-bold text-foreground">{profitResult.roi.toFixed(1)}%</p>
                </div>
                <div className="p-4 rounded-xl bg-surface border border-border text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Break-Even</p>
                  <p className="font-display text-2xl font-bold text-foreground">{profitResult.breakEvenUnits} units</p>
                </div>
              </div>
              <RevenueProjection profitPerUnit={profitResult.netProfit} />
            </div>
            {profitResult.netProfit < 0 && (
              <div className="p-4 rounded-xl bg-red-400/5 border border-red-400/20 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-400">Negative margin detected</p>
                  <p className="text-xs text-muted-foreground mt-1">You&apos;re losing ${Math.abs(profitResult.netProfit).toFixed(2)} per unit. Increase your price or reduce costs.</p>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-1 space-y-4">
            <div className={cardClass}>
              <h4 className="text-sm font-semibold text-foreground mb-3">Cost Breakdown</h4>
              <div className="space-y-2">
                {profitResult.costBreakdown.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground flex-1">{item.name}</span>
                    <span className="text-sm font-mono text-foreground">${item.value.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground w-12 text-right">{item.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 h-3 rounded-full overflow-hidden flex bg-surface">
                {profitResult.costBreakdown.map((item) => (
                  <div key={item.name} style={{ width: `${item.pct}%`, backgroundColor: item.color }} className="h-full transition-all duration-500" />
                ))}
              </div>
            </div>
            <CalculatorAIAnalysis activeTab="profit" inputs={profitInputs} results={profitResults} onAskAI={handleAskAI} />
          </div>
        </div>

        <CalculatorComparison currentScenario={currentScenario} onAskAI={handleAskAI} />
        <CalculatorTemplates onApplyTemplate={handleApplyTemplate} />
        <CalculatorBulk defaultFee={platformFee} onAskAI={handleAskAI} />
      </div>
    </CalculatorLayout>
  );
}
