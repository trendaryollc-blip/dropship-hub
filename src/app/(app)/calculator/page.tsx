"use client";

import { useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { saveCalcHistory } from "@/lib/data";
import { CheckCircle2, Save } from "lucide-react";
import {
  DollarSign, Truck, Globe, Percent, TrendingUp,
  Calculator, ArrowRight, Info, BarChart3, AlertTriangle,
  Zap, Target, ChevronDown,
} from "lucide-react";
import {
  calculateProfit, calculateShipping, calculateLandedCost,
  calculateMargin, calculateAdROI,
  ProfitCalc, ShippingCalc, LandedCostCalc, MarginCalc, AdROICalc,
} from "@/lib/calculations";

type Tab = "profit" | "shipping" | "landed" | "margin" | "adroi";

const tabs: { id: Tab; label: string; icon: typeof DollarSign; unique?: boolean }[] = [
  { id: "profit", label: "Profit", icon: DollarSign },
  { id: "shipping", label: "Shipping", icon: Truck },
  { id: "landed", label: "Landed Cost", icon: Globe, unique: true },
  { id: "margin", label: "Margin", icon: Percent },
  { id: "adroi", label: "Ad ROI", icon: TrendingUp, unique: true },
];

function CalculatorContent() {
  const searchParams = useSearchParams();
  const initialCost = parseFloat(searchParams.get("cost") || "8");
  const initialPrice = parseFloat(searchParams.get("price") || "34.99");
  const { user } = useAuth();
  const [saved, setSaved] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>("profit");

  // Profit state
  const [productCost, setProductCost] = useState(initialCost);
  const [sellingPrice, setSellingPrice] = useState(initialPrice);
  const [shippingCost, setShippingCost] = useState(5);
  const [platformFee, setPlatformFee] = useState(15);
  const [adSpend, setAdSpend] = useState(3);
  const [units, setUnits] = useState(1);

  // Shipping state
  const [weight, setWeight] = useState(0.5);
  const [length, setLength] = useState(20);
  const [width, setWidth] = useState(15);
  const [height, setHeight] = useState(10);
  const [originCountry, setOriginCountry] = useState("China");
  const [destCountry, setDestCountry] = useState("US");

  // Landed cost state
  const [lcCost, setLcCost] = useState(initialCost);
  const [lcShipping, setLcShipping] = useState(5);
  const [tariff, setTariff] = useState(25);
  const [customsDuty, setCustomsDuty] = useState(0);
  const [insurance, setInsurance] = useState(0.5);
  const [lcPlatformFee, setLcPlatformFee] = useState(15);
  const [otherFees, setOtherFees] = useState(0);
  const [lcQty, setLcQty] = useState(1);

  // Margin state
  const [marginCost, setMarginCost] = useState(initialCost);
  const [desiredMargin, setDesiredMargin] = useState(40);

  // Ad ROI state
  const [roiCost, setRoiCost] = useState(initialCost);
  const [roiPrice, setRoiPrice] = useState(initialPrice);
  const [roiShipping, setRoiShipping] = useState(5);
  const [roiFee, setRoiFee] = useState(15);
  const [ctr, setCtr] = useState(2);
  const [cvr, setCvr] = useState(2.5);
  const [dailyBudget, setDailyBudget] = useState(50);

  const profitResult: ProfitCalc = calculateProfit(productCost, sellingPrice, shippingCost, platformFee, adSpend, units);
  const shippingResult: ShippingCalc = calculateShipping(weight, length, width, height, originCountry, destCountry);
  const landedResult: LandedCostCalc = calculateLandedCost(lcCost, lcShipping, tariff, customsDuty, insurance, lcPlatformFee, otherFees, lcQty);
  const marginResult: MarginCalc = calculateMargin(marginCost, desiredMargin, [sellingPrice]);
  const adROIResult: AdROICalc = calculateAdROI(roiCost, roiPrice, roiShipping, roiFee, ctr, cvr, dailyBudget);

  const handleSave = async () => {
    if (!user) return;
    const entries: Record<string, { inputs: Record<string, number>; result: Record<string, number> }> = {
      profit: { inputs: { productCost, sellingPrice, shippingCost, platformFee, adSpend, units }, result: { netProfit: profitResult.netProfit, profitMargin: profitResult.profitMargin, roi: profitResult.roi } },
      shipping: { inputs: { weight, length, width, height }, result: { estimatedCost: shippingResult.estimatedCost, costPerUnit: shippingResult.costPerUnit } },
      landed: { inputs: { lcCost, lcShipping, tariff, customsDuty, insurance }, result: { landedCost: landedResult.landedCost, totalDuties: landedResult.totalDuties, suggestedRetail: landedResult.suggestedRetail } },
      margin: { inputs: { marginCost, desiredMargin }, result: { recommendedPrice: marginResult.recommendedPrice, marginAtPrice: marginResult.marginAtPrice } },
      adroi: { inputs: { roiCost, roiPrice, dailyBudget, ctr, cvr }, result: { monthlyProfit: adROIResult.monthlyProfit, monthlyRevenue: adROIResult.monthlyRevenue, estimatedCAC: adROIResult.estimatedCAC } },
    };
    const entry = entries[activeTab];
    if (entry) {
      await saveCalcHistory(user.uid, { type: activeTab, inputs: entry.inputs, result: entry.result });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm font-mono";
  const labelClass = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2";
  const cardClass = "glass rounded-2xl p-6";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Calculator className="h-7 w-7 text-accent" /> Calculator Suite
        </h1>
        <p className="text-muted-foreground">Real-time calculations for profit, shipping, landed costs, margins, and ad ROI.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 items-center">
        <div className="flex gap-2 flex-1 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-accent text-white shadow-[0_0_15px_rgba(var(--glow-color),0.3)]"
                  : "bg-surface border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
              {tab.unique && (
                <span className="px-1.5 py-0.5 rounded-md bg-accent-warm/20 text-accent-warm text-[9px] font-bold uppercase">
                  Unique
                </span>
              )}
            </button>
          ))}
        </div>
        {user && (
          <button
            onClick={handleSave}
            disabled={saved}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all shrink-0"
          >
            {saved ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Save</>}
          </button>
        )}
      </div>

      {/* PROFIT CALCULATOR */}
      {activeTab === "profit" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
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

          <div className="space-y-6">
            <div className={cardClass}>
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">Results</h3>
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

              {/* Cost breakdown */}
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

              {/* Visual bar */}
              <div className="mt-4 h-3 rounded-full overflow-hidden flex bg-surface">
                {profitResult.costBreakdown.map((item) => (
                  <div key={item.name} style={{ width: `${item.pct}%`, backgroundColor: item.color }} className="h-full transition-all duration-500" />
                ))}
              </div>
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
        </div>
      )}

      {/* SHIPPING CALCULATOR */}
      {activeTab === "shipping" && (
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
              {shippingResult.carriers.map((c) => (
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
      )}

      {/* LANDED COST CALCULATOR */}
      {activeTab === "landed" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-6">
              <h3 className="font-display text-lg font-semibold text-foreground">True Cost Input</h3>
              <span className="px-2 py-0.5 rounded-md bg-accent-warm/20 text-accent-warm text-[10px] font-bold uppercase">Unique</span>
            </div>
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
                <p className="font-display text-4xl font-bold text-accent">${landedResult.landedCost}</p>
                <p className="text-xs text-muted-foreground mt-1">${(landedResult.landedCost / lcQty).toFixed(2)} per unit</p>
              </div>

              <div className="space-y-2 mb-4">
                {landedResult.breakdown.map((item) => (
                  <div key={item.name} className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-sm text-muted-foreground flex-1">{item.name}</span>
                    <span className="text-sm font-mono text-foreground">${item.value.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="h-3 rounded-full overflow-hidden flex bg-surface">
                {landedResult.breakdown.map((item) => (
                  <div key={item.name} style={{ width: `${(item.value / landedResult.landedCost) * 100}%`, backgroundColor: item.color }} className="h-full" />
                ))}
              </div>

              <div className="mt-6 p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20">
                <p className="text-sm font-medium text-emerald-400 mb-1">Suggested Retail: ${landedResult.suggestedRetail}</p>
                <p className="text-xs text-muted-foreground">Profit at suggested price: ${landedResult.profitAtSuggested} per unit</p>
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
      )}

      {/* MARGIN CALCULATOR */}
      {activeTab === "margin" && (
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
              <p className="font-display text-4xl font-bold text-accent">${marginResult.recommendedPrice}</p>
              <p className="text-xs text-muted-foreground mt-1">{desiredMargin}% margin</p>
            </div>

            <div className="space-y-2">
              {marginResult.priceBreakpoints.map((bp) => (
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
      )}

      {/* AD ROI CALCULATOR */}
      {activeTab === "adroi" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
          <div className={cardClass}>
            <div className="flex items-center gap-2 mb-6">
              <h3 className="font-display text-lg font-semibold text-foreground">Ad Spend Input</h3>
              <span className="px-2 py-0.5 rounded-md bg-accent-warm/20 text-accent-warm text-[10px] font-bold uppercase">Unique</span>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Product Cost ($)</label>
                  <input type="number" step="0.01" value={roiCost} onChange={(e) => setRoiCost(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Selling Price ($)</label>
                  <input type="number" step="0.01" value={roiPrice} onChange={(e) => setRoiPrice(+e.target.value)} className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Shipping ($)</label>
                  <input type="number" step="0.01" value={roiShipping} onChange={(e) => setRoiShipping(+e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Platform Fee (%)</label>
                  <input type="number" step="0.1" value={roiFee} onChange={(e) => setRoiFee(+e.target.value)} className={inputClass} />
                </div>
              </div>
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

          <div className="space-y-6">
            <div className={cardClass}>
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">ROI Projection</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20 text-center">
                  <p className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Break-Even ROAS</p>
                  <p className="font-display text-3xl font-bold text-emerald-400">{adROIResult.breakEvenROAS}x</p>
                </div>
                <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 text-center">
                  <p className="text-xs text-accent uppercase tracking-wider mb-1">Est. CAC</p>
                  <p className="font-display text-3xl font-bold text-accent">${adROIResult.estimatedCAC}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 rounded-xl bg-surface border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Monthly Revenue</p>
                  <p className="font-display text-xl font-bold text-foreground">${adROIResult.monthlyRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border text-center">
                  <p className="text-xs text-muted-foreground mb-1">Monthly Profit</p>
                  <p className={`font-display text-xl font-bold ${adROIResult.monthlyProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${adROIResult.monthlyProfit.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className={cardClass}>
              <h3 className="font-display text-sm font-semibold text-foreground mb-3">Budget Scenarios</h3>
              <div className="space-y-2">
                {adROIResult.scenarios.map((s) => (
                  <div key={s.name} className="flex items-center gap-4 p-3 rounded-xl bg-surface/50 border border-border">
                    <div className="w-20">
                      <p className="text-xs font-medium text-foreground">{s.name}</p>
                      <p className="text-[10px] text-muted-foreground">${s.spend}/day</p>
                    </div>
                    <div className="flex-1 text-right">
                      <p className="text-sm font-medium text-foreground">${s.revenue}/day rev</p>
                    </div>
                    <div className="w-20 text-right">
                      <p className={`text-sm font-bold ${s.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        ${s.profit.toFixed(0)}/day
                      </p>
                    </div>
                    <div className="w-14 text-right">
                      <p className="text-sm font-medium text-foreground">{s.roas}x</p>
                      <p className="text-[10px] text-muted-foreground">ROAS</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CalculatorPage() {
  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading calculator...</p>
        </div>
      </div>
    }>
      <CalculatorContent />
    </Suspense>
  );
}
