"use client";

import { useState } from "react";
import { Loader2, BarChart3, ArrowRight } from "lucide-react";
import DashboardRadarChart from "@/components/ui/charts/DashboardRadarChart";
import type { TrendPrediction } from "@/types/trend-predictor";

interface KeywordComparisonProps {
  onAnalyze: (keywords: string[]) => Promise<TrendPrediction[]>;
  className?: string;
}

export default function KeywordComparison({ onAnalyze, className = "" }: KeywordComparisonProps) {
  const [keywords, setKeywords] = useState<string[]>(["", ""]);
  const [results, setResults] = useState<TrendPrediction[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  const addKeyword = () => {
    if (keywords.length < 5) setKeywords([...keywords, ""]);
  };

  const removeKeyword = (index: number) => {
    if (keywords.length > 2) {
      setKeywords(keywords.filter((_, i) => i !== index));
    }
  };

  const updateKeyword = (index: number, value: string) => {
    const updated = [...keywords];
    updated[index] = value;
    setKeywords(updated);
  };

  const handleCompare = async () => {
    const valid = keywords.filter((k) => k.trim());
    if (valid.length < 2) return;
    setAnalyzing(true);
    try {
      const preds = await onAnalyze(valid);
      setResults(preds);
    } finally {
      setAnalyzing(false);
    }
  };

  const radarData = results.map((r) => ({
    axis: r.productIdea.slice(0, 12),
    value: r.trendScore,
  }));

  const winner = results.length > 0
    ? results.reduce((best, r) => r.trendScore > best.trendScore ? r : best, results[0])
    : null;

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-accent" /> Compare Keywords
          </h3>
          {keywords.length < 5 && (
            <button onClick={addKeyword} className="text-[10px] text-accent hover:underline">
              + Add keyword
            </button>
          )}
        </div>

        <div className="space-y-2">
          {keywords.map((kw, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-6">#{i + 1}</span>
              <input
                value={kw}
                onChange={(e) => updateKeyword(i, e.target.value)}
                placeholder={`Keyword ${i + 1}`}
                className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40"
              />
              {keywords.length > 2 && (
                <button onClick={() => removeKeyword(i)} className="text-[10px] text-red-400 hover:underline">
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleCompare}
          disabled={analyzing || keywords.filter((k) => k.trim()).length < 2}
          className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
        >
          {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {analyzing ? "Comparing..." : "Compare Keywords"}
        </button>
      </div>

      {results.length > 0 && (
        <>
          {/* Radar Chart */}
          {radarData.length >= 3 && (
            <div className="glass rounded-2xl p-4">
              <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Score Comparison</h4>
              <DashboardRadarChart data={radarData} height={200} maxValue={100} />
            </div>
          )}

          {/* Comparison Table */}
          <div className="glass rounded-2xl p-4 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="text-left py-2 text-muted-foreground font-semibold">Keyword</th>
                  <th scope="col" className="text-right py-2 text-muted-foreground font-semibold">Score</th>
                  <th scope="col" className="text-right py-2 text-muted-foreground font-semibold">Direction</th>
                  <th scope="col" className="text-right py-2 text-muted-foreground font-semibold">Peak</th>
                  <th scope="col" className="text-right py-2 text-muted-foreground font-semibold">Margin</th>
                  <th scope="col" className="text-right py-2 text-muted-foreground font-semibold">Competition</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r) => (
                  <tr key={r.id} className={`border-b border-border/50 ${winner?.id === r.id ? "bg-accent/5" : ""}`}>
                    <td className="py-2 font-medium text-foreground">
                      {r.productIdea}
                      {winner?.id === r.id && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 text-[8px] font-bold">
                          BEST
                        </span>
                      )}
                    </td>
                    <td className="text-right py-2 font-bold text-foreground">{r.trendScore}%</td>
                    <td className={`text-right py-2 font-semibold capitalize ${
                      r.direction === "rising" ? "text-emerald-400" :
                      r.direction === "peaking" ? "text-amber-400" :
                      r.direction === "declining" ? "text-red-400" : "text-blue-400"
                    }`}>{r.direction}</td>
                    <td className="text-right py-2 text-foreground">{r.timeToPeak || "—"}</td>
                    <td className="text-right py-2 font-semibold text-emerald-400">Est. {r.estimatedMargin}%</td>
                    <td className={`text-right py-2 font-semibold ${
                      r.competitionLevel === "low" ? "text-emerald-400" :
                      r.competitionLevel === "medium" ? "text-amber-400" : "text-red-400"
                    }`}>{r.competitionLevel.replace("_", " ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Recommendation */}
          {winner && (
            <div className="glass rounded-2xl p-4 border-l-4 border-l-emerald-400">
              <p className="text-xs text-muted-foreground mb-1">Recommendation</p>
              <p className="text-sm text-foreground">
                <span className="font-bold">{winner.productIdea}</span> is the best keyword to target with a{" "}
                <span className="font-bold text-emerald-400">{winner.trendScore}%</span> trend score,{" "}
                <span className="font-bold text-emerald-400">{winner.estimatedMargin}%</span> estimated margin, and{" "}
                <span className={`font-bold ${winner.competitionLevel === "low" ? "text-emerald-400" : "text-amber-400"}`}>
                  {winner.competitionLevel}
                </span> competition.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
