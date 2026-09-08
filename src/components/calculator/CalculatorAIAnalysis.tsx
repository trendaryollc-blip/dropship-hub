"use client";

import { useState } from "react";
import { Sparkles, ArrowRight, Loader2, TrendingUp, AlertTriangle, CheckCircle, Lightbulb } from "lucide-react";

interface AIInsight {
  type: "good" | "warning" | "tip" | "action";
  title: string;
  description: string;
}

interface CalculatorAIAnalysisProps {
  activeTab: string;
  inputs: Record<string, number>;
  results: Record<string, number>;
  onAskAI?: (prompt: string) => void;
}

function generateInsights(activeTab: string, inputs: Record<string, number>, results: Record<string, number>): AIInsight[] {
  const insights: AIInsight[] = [];

  if (activeTab === "profit") {
    const margin = results.profitMargin || 0;
    const roi = results.roi || 0;
    const netProfit = results.netProfit || 0;

    if (margin >= 40) {
      insights.push({ type: "good", title: "Excellent Margin", description: `${margin.toFixed(1)}% margin is above the 30% industry average. You're in a strong position.` });
    } else if (margin >= 20) {
      insights.push({ type: "warning", title: "Moderate Margin", description: `${margin.toFixed(1)}% margin is workable but consider optimizing costs or raising price.` });
    } else if (margin > 0) {
      insights.push({ type: "warning", title: "Low Margin Alert", description: `${margin.toFixed(1)}% margin leaves little room for refunds and unexpected costs.` });
    } else {
      insights.push({ type: "action", title: "Negative Margin!", description: "You're losing money per unit. Increase price or reduce costs immediately." });
    }

    if (roi < 50) {
      insights.push({ type: "tip", title: "Low ROI", description: `${roi.toFixed(1)}% ROI means slow capital recovery. Consider reducing ad spend or finding cheaper suppliers.` });
    }

    if ((inputs.adSpend || 0) > (inputs.sellingPrice || 0) * 0.3) {
      insights.push({ type: "warning", title: "High Ad Spend", description: "Ad spend is over 30% of selling price. This significantly impacts profitability." });
    }

    if (netProfit > 0) {
      insights.push({ type: "action", title: "Scale This Product", description: `At $${netProfit.toFixed(2)} profit/unit, selling 100 units/month = $${(netProfit * 100).toFixed(2)} monthly profit.` });
    }
  }

  if (activeTab === "shipping") {
    insights.push({ type: "tip", title: "Volume Discounts", description: "Shipping costs decrease significantly at higher volumes. Negotiate rates at 500+ units/month." });
    insights.push({ type: "action", title: "Compare Carriers", description: "Get quotes from 3+ carriers. Prices can vary 30-50% for the same route." });
  }

  if (activeTab === "landed") {
    const landed = results.landedCost || 0;
    const qty = inputs.lcQty || 1;
    const perUnit = landed / qty;

    if ((inputs.tariff || 0) > 15) {
      insights.push({ type: "warning", title: "High Tariff", description: "Tariffs over 15% significantly impact margins. Consider sourcing from tariff-free countries." });
    }

    insights.push({ type: "tip", title: "Optimize Quantity", description: "Buying in bulk (500+ units) can reduce per-unit landed cost by 15-25%." });
    insights.push({ type: "action", title: "Find Alternative Source", description: "Compare landed costs from China vs Vietnam vs India for the same product." });
  }

  if (activeTab === "margin") {
    const recommended = results.recommendedPrice || 0;

    insights.push({ type: "tip", title: "Psychological Pricing", description: `Consider pricing at $${(Math.floor(recommended) - 0.01).toFixed(2)} instead of $${recommended.toFixed(2)} for better conversion.` });
    insights.push({ type: "action", title: "A/B Test Pricing", description: "Test 2-3 price points over 2 weeks to find the optimal price for maximum revenue." });
  }

  return insights.slice(0, 4);
}

const iconMap = {
  good: CheckCircle,
  warning: AlertTriangle,
  tip: Lightbulb,
  action: TrendingUp,
};

const colorMap = {
  good: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  warning: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  tip: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  action: "text-violet-400 bg-violet-400/10 border-violet-400/20",
};

export default function CalculatorAIAnalysis({
  activeTab,
  inputs,
  results,
  onAskAI,
}: CalculatorAIAnalysisProps) {
  const [showAll, setShowAll] = useState(false);
  const insights = generateInsights(activeTab, inputs, results);
  const visibleInsights = showAll ? insights : insights.slice(0, 2);

  const handleAskAI = () => {
    if (!onAskAI) return;
    const tabLabels: Record<string, string> = {
      profit: "profit",
      shipping: "shipping cost",
      landed: "landed cost",
      margin: "pricing margin",
    };
    const prompt = `Analyze my ${tabLabels[activeTab]} calculation. Inputs: ${Object.entries(inputs).map(([k, v]) => `${k}=${v}`).join(", ")}. Results: ${Object.entries(results).map(([k, v]) => `${k}=${typeof v === "number" ? v.toFixed(2) : v}`).join(", ")}. Give me specific recommendations to improve profitability.`;
    onAskAI(prompt);
  };

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-foreground">AI Analysis</span>
        </div>
        {onAskAI && (
          <button
            onClick={handleAskAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500/15 to-purple-500/15 text-violet-400 border border-violet-500/20 text-[11px] font-medium hover:border-violet-500/40 transition-all"
          >
            <Sparkles className="h-3 w-3" />
            Ask AI
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visibleInsights.map((insight, i) => {
          const Icon = iconMap[insight.type];
          return (
            <div
              key={i}
              className={`flex items-start gap-2.5 p-3 rounded-xl border ${colorMap[insight.type]}`}
            >
              <Icon className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium">{insight.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{insight.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {insights.length > 2 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {showAll ? "Show less" : `Show ${insights.length - 2} more insights`}
        </button>
      )}

      {onAskAI && (
        <button
          onClick={handleAskAI}
          className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition-all"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Get Full AI Analysis
        </button>
      )}
    </div>
  );
}
