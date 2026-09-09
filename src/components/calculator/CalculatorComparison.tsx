"use client";

import { useState } from "react";
import { GitCompare, Plus, X, Sparkles, Loader2 } from "lucide-react";

interface Scenario {
  id: string;
  name: string;
  cost: number;
  price: number;
  shipping: number;
  fee: number;
  adSpend: number;
  netProfit: number;
  margin: number;
  roi: number;
}

interface CalculatorComparisonProps {
  currentScenario: {
    cost: number;
    price: number;
    shipping: number;
    fee: number;
    adSpend: number;
    netProfit: number;
    margin: number;
    roi: number;
  };
  onAskAI?: (prompt: string) => void;
}

export default function CalculatorComparison({
  currentScenario,
  onAskAI,
}: CalculatorComparisonProps) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCost, setNewCost] = useState(currentScenario.cost);
  const [newPrice, setNewPrice] = useState(currentScenario.price);
  const [aiLoading, setAiLoading] = useState(false);

  const addScenario = () => {
    if (!newName.trim()) return;
    const netProfit = newPrice - newCost - currentScenario.shipping - (newPrice * currentScenario.fee / 100) - currentScenario.adSpend;
    const margin = newPrice > 0 ? (netProfit / newPrice) * 100 : 0;
    const totalCost = newCost + currentScenario.shipping + (newPrice * currentScenario.fee / 100) + currentScenario.adSpend;
    const roi = totalCost > 0 ? (netProfit / totalCost) * 100 : 0;

    setScenarios([...scenarios, {
      id: Date.now().toString(),
      name: newName,
      cost: newCost,
      price: newPrice,
      shipping: currentScenario.shipping,
      fee: currentScenario.fee,
      adSpend: currentScenario.adSpend,
      netProfit,
      margin,
      roi,
    }]);
    setNewName("");
    setShowAdd(false);
  };

  const removeScenario = (id: string) => {
    setScenarios(scenarios.filter((s) => s.id !== id));
  };

  const handleAICompare = async () => {
    if (!onAskAI) return;
    setAiLoading(true);
    const allScenarios = [
      { name: "Current", ...currentScenario },
      ...scenarios,
    ];
    const prompt = `Compare these pricing scenarios for my product:\n${allScenarios.map((s) => `- ${s.name}: Cost $${s.cost}, Price $${s.price}, Profit $${s.netProfit.toFixed(2)}, Margin ${s.margin.toFixed(1)}%`).join("\n")}\nWhich scenario is best and why? What should I optimize?`;
    onAskAI(prompt);
    setAiLoading(false);
  };

  const allScenarios = [
    { id: "current", name: "Current", ...currentScenario },
    ...scenarios,
  ];

  const bestProfit = Math.max(...allScenarios.map((s) => s.netProfit));
  const _bestMargin = Math.max(...allScenarios.map((s) => s.margin));

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Scenario Comparison</span>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Scenario
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 p-3 rounded-xl bg-surface/50 border border-border space-y-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Scenario name (e.g., Lower Price)"
            className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Cost ($)</label>
              <input
                type="number"
                step="0.01"
                value={newCost}
                onChange={(e) => setNewCost(+e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs font-mono text-foreground focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted-foreground mb-1">Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(+e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs font-mono text-foreground focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>
          <button
            onClick={addScenario}
            disabled={!newName.trim()}
            className="w-full py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            Add Scenario
          </button>
        </div>
      )}

      <div className="space-y-2">
        {allScenarios.map((scenario) => (
          <div
            key={scenario.id}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              scenario.id === "current"
                ? "bg-accent/5 border-accent/20"
                : "bg-surface/50 border-border hover:border-accent/10"
            }`}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-foreground">{scenario.name}</span>
                {scenario.id === "current" && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent/10 text-accent font-medium">Current</span>
                )}
                {scenario.netProfit === bestProfit && allScenarios.length > 1 && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 font-medium">Best Profit</span>
                )}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>Cost: ${scenario.cost.toFixed(2)}</span>
                <span>Price: ${scenario.price.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className={`text-sm font-bold ${scenario.netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                ${scenario.netProfit.toFixed(2)}
              </p>
              <p className="text-[10px] text-muted-foreground">{scenario.margin.toFixed(1)}% margin</p>
            </div>
            {scenario.id !== "current" && (
              <button
                onClick={() => removeScenario(scenario.id)}
                className="p-1 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>

      {allScenarios.length >= 2 && onAskAI && (
        <button
          onClick={handleAICompare}
          disabled={aiLoading}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50"
        >
          {aiLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {aiLoading ? "AI comparing..." : "AI Compare Scenarios"}
        </button>
      )}
    </div>
  );
}
