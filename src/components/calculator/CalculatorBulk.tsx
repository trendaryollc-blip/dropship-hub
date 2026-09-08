"use client";

import { useState } from "react";
import { Package, Plus, X, Download, Sparkles, Loader2, ArrowRight } from "lucide-react";

interface BulkProduct {
  id: string;
  name: string;
  cost: number;
  price: number;
  shipping: number;
  fee: number;
  units: number;
}

interface CalculatorBulkProps {
  defaultFee: number;
  onAskAI?: (prompt: string) => void;
}

export default function CalculatorBulk({ defaultFee, onAskAI }: CalculatorBulkProps) {
  const [products, setProducts] = useState<BulkProduct[]>([
    { id: "1", name: "Product 1", cost: 8, price: 35, shipping: 5, fee: defaultFee, units: 100 },
  ]);
  const [aiLoading, setAiLoading] = useState(false);

  const addProduct = () => {
    setProducts([...products, {
      id: Date.now().toString(),
      name: `Product ${products.length + 1}`,
      cost: 8,
      price: 35,
      shipping: 5,
      fee: defaultFee,
      units: 100,
    }]);
  };

  const removeProduct = (id: string) => {
    if (products.length <= 1) return;
    setProducts(products.filter((p) => p.id !== id));
  };

  const updateProduct = (id: string, field: keyof BulkProduct, value: string | number) => {
    setProducts(products.map((p) => p.id === id ? { ...p, [field]: value } : p));
  };

  const calculateProduct = (p: BulkProduct) => {
    const revenue = p.price * p.units;
    const totalCost = (p.cost * p.units) + (p.shipping * p.units) + (revenue * p.fee / 100);
    const netProfit = revenue - totalCost;
    const margin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
    return { revenue, totalCost, netProfit, margin, perUnitProfit: netProfit / p.units };
  };

  const totals = products.reduce((acc, p) => {
    const calc = calculateProduct(p);
    return {
      revenue: acc.revenue + calc.revenue,
      totalCost: acc.totalCost + calc.totalCost,
      netProfit: acc.netProfit + calc.netProfit,
      totalUnits: acc.totalUnits + p.units,
    };
  }, { revenue: 0, totalCost: 0, netProfit: 0, totalUnits: 0 });

  const totalMargin = totals.revenue > 0 ? (totals.netProfit / totals.revenue) * 100 : 0;

  const handleExport = () => {
    const csv = [
      "Product,Cost,Price,Shipping,Fee%,Units,Revenue,Total Cost,Net Profit,Margin%",
      ...products.map((p) => {
        const calc = calculateProduct(p);
        return `${p.name},${p.cost},${p.price},${p.shipping},${p.fee},${p.units},${calc.revenue.toFixed(2)},${calc.totalCost.toFixed(2)},${calc.netProfit.toFixed(2)},${calc.margin.toFixed(1)}`;
      }),
      `TOTAL,,,,,${totals.totalUnits},${totals.revenue.toFixed(2)},${totals.totalCost.toFixed(2)},${totals.netProfit.toFixed(2)},${totalMargin.toFixed(1)}`,
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-calculation-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAIAnalysis = async () => {
    if (!onAskAI) return;
    setAiLoading(true);
    const prompt = `Analyze my bulk product portfolio:\n${products.map((p) => {
      const calc = calculateProduct(p);
      return `- ${p.name}: Cost $${p.cost}, Price $${p.price}, ${p.units} units, Profit $${calc.netProfit.toFixed(2)}, Margin ${calc.margin.toFixed(1)}%`;
    }).join("\n")}\n\nTotal: $${totals.netProfit.toFixed(2)} profit across ${totals.totalUnits} units (${totalMargin.toFixed(1)}% margin). Which products should I scale? Which should I drop? What can I optimize?`;
    onAskAI(prompt);
    setAiLoading(false);
  };

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Bulk Calculator</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </button>
          <button
            onClick={addProduct}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 text-accent text-[11px] font-medium hover:bg-accent/20 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="overflow-x-auto mb-4">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2 text-muted-foreground font-medium">Product</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Cost</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Price</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Ship</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Units</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Profit</th>
              <th className="text-right py-2 px-2 text-muted-foreground font-medium">Margin</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => {
              const calc = calculateProduct(p);
              return (
                <tr key={p.id} className="border-b border-border/50">
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={p.name}
                      onChange={(e) => updateProduct(p.id, "name", e.target.value)}
                      className="w-full px-2 py-1 rounded bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-accent/50"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      step="0.01"
                      value={p.cost}
                      onChange={(e) => updateProduct(p.id, "cost", +e.target.value)}
                      className="w-16 px-2 py-1 rounded bg-surface border border-border text-xs font-mono text-foreground text-right focus:outline-none focus:border-accent/50"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      step="0.01"
                      value={p.price}
                      onChange={(e) => updateProduct(p.id, "price", +e.target.value)}
                      className="w-16 px-2 py-1 rounded bg-surface border border-border text-xs font-mono text-foreground text-right focus:outline-none focus:border-accent/50"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      step="0.01"
                      value={p.shipping}
                      onChange={(e) => updateProduct(p.id, "shipping", +e.target.value)}
                      className="w-14 px-2 py-1 rounded bg-surface border border-border text-xs font-mono text-foreground text-right focus:outline-none focus:border-accent/50"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="number"
                      min="1"
                      value={p.units}
                      onChange={(e) => updateProduct(p.id, "units", +e.target.value)}
                      className="w-14 px-2 py-1 rounded bg-surface border border-border text-xs font-mono text-foreground text-right focus:outline-none focus:border-accent/50"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className={`font-mono font-medium ${calc.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      ${calc.netProfit.toFixed(2)}
                    </span>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="font-mono text-muted-foreground">{calc.margin.toFixed(1)}%</span>
                  </td>
                  <td className="py-2 px-2">
                    <button
                      onClick={() => removeProduct(p.id)}
                      disabled={products.length <= 1}
                      className="p-1 rounded hover:bg-surface text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-accent/30 font-medium">
              <td className="py-2 px-2 text-foreground">TOTAL</td>
              <td colSpan={3}></td>
              <td className="py-2 px-2 text-right font-mono text-foreground">{totals.totalUnits.toLocaleString()}</td>
              <td className="py-2 px-2 text-right">
                <span className={`font-mono font-bold ${totals.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  ${totals.netProfit.toFixed(2)}
                </span>
              </td>
              <td className="py-2 px-2 text-right font-mono text-foreground">{totalMargin.toFixed(1)}%</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-surface/50 border border-border text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Revenue</p>
          <p className="text-sm font-bold text-foreground">${totals.revenue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-3 rounded-xl bg-surface/50 border border-border text-center">
          <p className="text-[10px] text-muted-foreground uppercase">Total Cost</p>
          <p className="text-sm font-bold text-foreground">${totals.totalCost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-400/5 border border-emerald-400/20 text-center">
          <p className="text-[10px] text-emerald-400 uppercase">Net Profit</p>
          <p className={`text-sm font-bold ${totals.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${totals.netProfit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-center">
          <p className="text-[10px] text-accent uppercase">Avg Margin</p>
          <p className="text-sm font-bold text-accent">{totalMargin.toFixed(1)}%</p>
        </div>
      </div>

      {onAskAI && (
        <button
          onClick={handleAIAnalysis}
          disabled={aiLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50"
        >
          {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {aiLoading ? "AI analyzing..." : "AI Analyze Portfolio"}
        </button>
      )}
    </div>
  );
}
