"use client";

import { useState } from "react";
import { calculateCustoms, lookupHSCode } from "@/lib/shipping/customs-calculator";
import CalculatorLayout from "@/components/calculator/CalculatorLayout";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";

const COUNTRIES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France",
  CA: "Canada", AU: "Australia", JP: "Japan", BR: "Brazil",
  IN: "India", AE: "UAE", SG: "Singapore", KR: "South Korea",
  SA: "Saudi Arabia", MX: "Mexico",
};

interface CustomsItemInput {
  name: string;
  hsCode: string;
  quantity: number;
  unitValue: number;
  weightKg: number;
}

export default function CustomsCalculatorPage() {
  const [originCountry, setOriginCountry] = useState("CN");
  const [destCountry, setDestCountry] = useState("US");
  const [shippingCost, setShippingCost] = useState(15);
  const [items, setItems] = useState<CustomsItemInput[]>([
    { name: "Wireless Earbuds", hsCode: "8518", quantity: 50, unitValue: 8, weightKg: 0.1 },
  ]);

  const [itemName, setItemName] = useState("");
  const [hsLookupResult, setHsLookupResult] = useState<{ hsCode: string; description: string; confidence: number } | null>(null);

  const customsResult = calculateCustoms(originCountry, destCountry, items.map((item) => ({ ...item, originCountry, description: "" })), "USD", shippingCost);

  const addItem = () => {
    if (!itemName) return;
    const lookup = lookupHSCode(itemName);
    setHsLookupResult(lookup);
    setItems([...items, {
      name: itemName,
      hsCode: lookup?.hsCode || "9999",
      quantity: 10,
      unitValue: 10,
      weightKg: 0.5,
    }]);
    setItemName("");
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof CustomsItemInput, value: string | number) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm font-mono";
  const labelClass = "block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2";
  const cardClass = "glass rounded-2xl p-6";

  return (
    <CalculatorLayout
      title="Customs & Import Duty Calculator"
      description="HS code lookup, duty rates, VAT, and de minimis thresholds by country"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
        <div className="lg:col-span-1 space-y-4">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-6">Shipment Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Origin Country</label>
                  <select value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} className={inputClass}>
                    <option value="CN">China</option><option value="IN">India</option><option value="VN">Vietnam</option>
                    <option value="DE">Germany</option><option value="US">US</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Destination</label>
                  <select value={destCountry} onChange={(e) => setDestCountry(e.target.value)} className={inputClass}>
                    {Object.entries(COUNTRIES).map(([code, name]) => (
                      <option key={code} value={code}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Shipping Cost ($)</label>
                <input type="number" step="0.01" value={shippingCost} onChange={(e) => setShippingCost(+e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Add Item</h3>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>Product Name</label>
                <div className="flex gap-2">
                  <input type="text" value={itemName} onChange={(e) => setItemName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addItem()}
                    placeholder="e.g. Wireless Earbuds" className={inputClass} />
                  <button onClick={addItem} className="px-4 py-2 rounded-xl bg-accent text-white text-sm font-medium shrink-0 hover:bg-accent/90 transition-colors">
                    Add
                  </button>
                </div>
                {hsLookupResult && (
                  <p className="text-[10px] text-emerald-400 mt-1">
                    HS Code found: {hsLookupResult.hsCode} ({hsLookupResult.description}) — {Math.round(hsLookupResult.confidence * 100)}% confidence
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Items ({items.length})</h3>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {items.map((item, i) => (
                <div key={i} className="p-3 rounded-xl bg-surface/50 border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground truncate">{item.name}</span>
                    <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-300 text-xs">Remove</button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] text-muted-foreground">HS Code</label>
                      <input type="text" value={item.hsCode} onChange={(e) => updateItem(i, "hsCode", e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-xs font-mono text-foreground" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">Qty</label>
                      <input type="number" value={item.quantity} onChange={(e) => updateItem(i, "quantity", +e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-xs font-mono text-foreground" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">Unit Value ($)</label>
                      <input type="number" step="0.01" value={item.unitValue} onChange={(e) => updateItem(i, "unitValue", +e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-xs font-mono text-foreground" />
                    </div>
                    <div>
                      <label className="text-[9px] text-muted-foreground">Weight (kg)</label>
                      <input type="number" step="0.01" value={item.weightKg} onChange={(e) => updateItem(i, "weightKg", +e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-surface border border-border text-xs font-mono text-foreground" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Customs Summary</h3>
            <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 text-center mb-6">
              <p className="text-xs text-accent uppercase tracking-wider mb-1">Total Landed Cost</p>
              <p className="font-display text-4xl font-bold text-accent">${customsResult.summary.totalLandedCost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground mt-1">Effective tax rate: {customsResult.summary.effectiveTaxRate.toFixed(1)}%</p>
            </div>

            <div className="space-y-2 mb-4">
              {customsResult.summary.breakdown.map((item) => (
                <div key={item.name} className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-muted-foreground flex-1">{item.name}</span>
                  <span className="text-sm font-mono text-foreground">${item.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="h-3 rounded-full overflow-hidden flex bg-surface">
              {customsResult.summary.breakdown.map((item) => {
                const total = customsResult.summary.totalLandedCost;
                return (
                  <div key={item.name} style={{ width: `${total > 0 ? (item.amount / total) * 100 : 0}%`, backgroundColor: item.color }} className="h-full" />
                );
              })}
            </div>
          </div>

          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">De Minimis Status</h3>
            <div className={`p-4 rounded-xl border flex items-start gap-3 ${
              customsResult.summary.subtotal <= customsResult.deMinimis.threshold
                ? "bg-emerald-400/5 border-emerald-400/20"
                : "bg-amber-400/5 border-amber-400/20"
            }`}>
              {customsResult.summary.subtotal <= customsResult.deMinimis.threshold
                ? <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                : <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              }
              <div>
                <p className={`text-sm font-medium ${customsResult.summary.subtotal <= customsResult.deMinimis.threshold ? "text-emerald-400" : "text-amber-400"}`}>
                  {customsResult.deMinimis.explanation}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Order value: ${customsResult.summary.subtotal.toFixed(2)} | Threshold: {customsResult.deMinimis.currency} {customsResult.deMinimis.threshold}
                </p>
              </div>
            </div>
          </div>

          {customsResult.warnings.length > 0 && (
            <div className={cardClass}>
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">Warnings</h3>
              <div className="space-y-2">
                {customsResult.warnings.map((w, i) => (
                  <div key={i} className={`p-3 rounded-xl border flex items-start gap-3 ${
                    w.severity === "critical" ? "bg-red-400/5 border-red-400/20" :
                    w.severity === "warning" ? "bg-amber-400/5 border-amber-400/20" :
                    "bg-blue-400/5 border-blue-400/20"
                  }`}>
                    {w.severity === "critical" ? <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" /> :
                     w.severity === "warning" ? <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" /> :
                     <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />}
                    <p className="text-xs text-muted-foreground">{w.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {customsResult.tips.length > 0 && (
            <div className={cardClass}>
              <h3 className="font-display text-lg font-semibold text-foreground mb-4">Tips</h3>
              <div className="space-y-2">
                {customsResult.tips.map((tip, i) => (
                  <div key={i} className="p-3 rounded-xl bg-surface/50 border border-border">
                    <p className="text-xs text-muted-foreground">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className={cardClass}>
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Item Details</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">Item</th>
                    <th className="text-left py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">HS</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">Value</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">Duty</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">VAT</th>
                    <th className="text-right py-2 px-3 text-[10px] font-semibold text-muted-foreground uppercase">Landed</th>
                  </tr>
                </thead>
                <tbody>
                  {customsResult.items.map((item, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-2 px-3 text-foreground">{item.name}</td>
                      <td className="py-2 px-3 text-muted-foreground font-mono text-xs">{item.hsCode}</td>
                      <td className="py-2 px-3 text-right font-mono">${item.totalValue.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono text-red-400">${item.dutyAmount.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono text-amber-400">${item.vatAmount.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-accent">${item.landedCost.toFixed(2)}</td>
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
