"use client";

import { Shield, TrendingUp, AlertTriangle, CheckCircle2, Minus } from "lucide-react";

interface RiskSummaryBarProps {
  authenticityScore?: number;
  supplierScore?: number;
  riskScore?: number;
  marketScore?: number;
}

export default function RiskSummaryBar({ authenticityScore, supplierScore, riskScore, marketScore }: RiskSummaryBarProps) {
  const all = [
    { label: "Authenticity", score: authenticityScore, icon: Shield },
    { label: "Supplier", score: supplierScore, icon: CheckCircle2 },
    { label: "Risk", score: riskScore, icon: AlertTriangle },
    { label: "Market", score: marketScore, icon: TrendingUp },
  ];
  const scores = all.filter((s) => typeof s.score === "number");
  const skipped = all.filter((s) => typeof s.score !== "number").map((s) => s.label);

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400";
    if (score >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return "bg-emerald-400/10";
    if (score >= 40) return "bg-amber-400/10";
    return "bg-red-400/10";
  };

  const getBarColor = (score: number) => {
    if (score >= 70) return "bg-gradient-to-r from-emerald-400 to-emerald-500";
    if (score >= 40) return "bg-gradient-to-r from-amber-400 to-amber-500";
    return "bg-gradient-to-r from-red-400 to-red-500";
  };

  return (
    <div className="glass rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent pointer-events-none" />

      <div className="flex items-center justify-between mb-4 relative">
        <h3 className="font-display text-sm font-bold text-foreground">Risk Summary</h3>
        <span className="text-[10px] text-muted-foreground font-medium">{scores.length} of 4 engines ran</span>
      </div>

      <div className="space-y-3 relative">
        {scores.map(({ label, score, icon: Icon }) => {
          const scoreNum = score as number;
          return (
          <div key={label} className="flex items-center gap-3 group">
            <div className={`h-8 w-8 rounded-lg ${getScoreBg(scoreNum)} flex items-center justify-center shrink-0`}>
              <Icon className={`h-4 w-4 ${getScoreColor(scoreNum)}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-foreground font-medium">{label}</span>
                <span className={`text-[11px] font-bold ${getScoreColor(scoreNum)}`}>{scoreNum}/100</span>
              </div>
              <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${getBarColor(scoreNum)}`}
                  style={{ width: `${scoreNum}%` }}
                />
              </div>
            </div>
          </div>
          );
        })}
        {skipped.map((label) => (
          <div key={label} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-surface flex items-center justify-center shrink-0">
              <Minus className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
                <span className="text-[11px] font-bold text-muted-foreground">Not run</span>
              </div>
              <p className="text-[9px] text-muted-foreground">Fill the related form tab to score this engine</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
