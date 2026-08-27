"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, BarChart3 } from "lucide-react";

interface ForecastPoint {
  date: string;
  actual: number | null;
  predicted: number;
  lowerBound: number;
  upperBound: number;
}

interface RevenueForecast {
  forecast: ForecastPoint[];
  summary: {
    currentTrend: "growing" | "declining" | "stable";
    projectedWeeklyRevenue: number;
    projectedMonthlyRevenue: number;
    confidenceLevel: "high" | "medium" | "low";
    avgDailyRevenue: number;
    bestDay: string;
    worstDay: string;
    growthRate: number;
  };
  insights: string[];
}

interface ForecastChartProps {
  forecast: RevenueForecast | null;
  onGenerate: () => void;
  loading?: boolean;
}

function MiniChart({ points }: { points: ForecastPoint[] }) {
  if (points.length === 0) return null;

  const allValues = points.flatMap((p) => [p.actual || 0, p.predicted, p.lowerBound, p.upperBound]);
  const max = Math.max(...allValues);
  const min = Math.min(...allValues.filter((v) => v > 0));
  const range = max - min || 1;
  const width = 280;
  const height = 60;

  const toX = (i: number) => (i / (points.length - 1)) * width;
  const toY = (v: number) => height - ((v - min) / range) * (height - 10) - 5;

  const actualPath = points
    .filter((p) => p.actual !== null)
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(points.indexOf(p))} ${toY(p.actual!)}`)
    .join(" ");

  const predictedPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.predicted)}`)
    .join(" ");

  const confidencePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i)} ${toY(p.upperBound)}`)
    .join(" ") +
    " " +
    [...points].reverse()
      .map((p, i) => `L ${toX(points.length - 1 - i)} ${toY(points[points.length - 1 - i].lowerBound)}`)
      .join(" ") +
    " Z";

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-16">
      {/* Confidence band */}
      <path d={confidencePath} fill="rgba(99,102,241,0.1)" stroke="none" />
      {/* Predicted line */}
      <path d={predictedPath} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="4,2" />
      {/* Actual line */}
      {actualPath && <path d={actualPath} fill="none" stroke="#22c55e" strokeWidth="2" />}
    </svg>
  );
}

export default function ForecastChart({ forecast, onGenerate, loading = false }: ForecastChartProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
            <BarChart3 className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Revenue Forecast</p>
            <p className="text-[10px] text-muted-foreground">
              {forecast ? `${forecast.summary.confidenceLevel} confidence prediction` : "AI-powered prediction"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {forecast && (
            <div className="text-right mr-2">
              <p className="text-sm font-bold text-foreground">${forecast.summary.projectedWeeklyRevenue.toFixed(0)}</p>
              <p className="text-[9px] text-muted-foreground">projected/week</p>
            </div>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.06] pt-3">
          {forecast ? (
            <>
              {/* Mini chart */}
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                <MiniChart points={forecast.forecast} />
                <div className="flex items-center justify-center gap-4 mt-2">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-emerald-400 rounded" />
                    <span className="text-[9px] text-muted-foreground">Actual</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-0.5 bg-indigo-400 rounded border-dashed" style={{ borderTop: "1px dashed #6366f1" }} />
                    <span className="text-[9px] text-muted-foreground">Predicted</span>
                  </div>
                </div>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-[9px] text-muted-foreground">Avg Daily</p>
                  <p className="text-sm font-bold text-foreground">${forecast.summary.avgDailyRevenue.toFixed(0)}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-[9px] text-muted-foreground">Growth Rate</p>
                  <div className="flex items-center gap-1">
                    {forecast.summary.growthRate > 0 ? (
                      <TrendingUp className="h-3 w-3 text-emerald-400" />
                    ) : forecast.summary.growthRate < 0 ? (
                      <TrendingDown className="h-3 w-3 text-red-400" />
                    ) : (
                      <Minus className="h-3 w-3 text-muted-foreground" />
                    )}
                    <p className={`text-sm font-bold ${forecast.summary.growthRate > 0 ? "text-emerald-400" : forecast.summary.growthRate < 0 ? "text-red-400" : "text-foreground"}`}>
                      {forecast.summary.growthRate > 0 ? "+" : ""}{forecast.summary.growthRate}%
                    </p>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-[9px] text-muted-foreground">Best Day</p>
                  <p className="text-xs font-medium text-emerald-400">{forecast.summary.bestDay}</p>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03]">
                  <p className="text-[9px] text-muted-foreground">Worst Day</p>
                  <p className="text-xs font-medium text-amber-400">{forecast.summary.worstDay}</p>
                </div>
              </div>

              {/* Insights */}
              <div className="space-y-1.5">
                {forecast.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-muted-foreground">
                    <span className="text-accent mt-0.5">•</span>
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <button
                onClick={onGenerate}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
              >
                {loading ? "Generating forecast..." : "Generate Revenue Forecast"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
