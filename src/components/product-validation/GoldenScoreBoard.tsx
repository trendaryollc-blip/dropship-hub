"use client";

import { Trophy, Star, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import type { GoldenProductResult } from "@/types/product-validation";

const rankConfig = {
  S: { color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30", glow: "shadow-yellow-400/20", label: "S-Tier" },
  A: { color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30", glow: "shadow-emerald-400/20", label: "A-Tier" },
  B: { color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30", glow: "shadow-blue-400/20", label: "B-Tier" },
  C: { color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30", glow: "shadow-amber-400/20", label: "C-Tier" },
  D: { color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30", glow: "shadow-red-400/20", label: "D-Tier" },
};

const statusConfig = {
  excellent: { icon: CheckCircle2, color: "text-emerald-400" },
  good: { icon: Star, color: "text-blue-400" },
  average: { icon: AlertCircle, color: "text-amber-400" },
  poor: { icon: XCircle, color: "text-red-400" },
};

export default function GoldenScoreBoard({ data }: { data: GoldenProductResult }) {
  const rank = rankConfig[data.rank];

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-yellow-400/10 flex items-center justify-center">
            <Trophy className="h-4 w-4 text-yellow-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Golden Product Score</h3>
            <p className="text-[10px] text-muted-foreground">10-criteria weighted analysis</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 mb-5">
        <div className={`relative w-32 h-32 shrink-0 rounded-2xl ${rank.bg} border ${rank.border} flex flex-col items-center justify-center shadow-lg ${rank.glow}`}>
          <span className={`text-5xl font-display font-black ${rank.color}`}>{data.rank}</span>
          <span className={`text-xs font-medium ${rank.color} mt-1`}>{rank.label}</span>
        </div>
        <div className="flex-1">
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-muted-foreground">Overall Score</span>
              <span className="text-sm font-bold text-foreground">{data.score}/100</span>
            </div>
            <div className="h-2.5 rounded-full bg-surface overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${
                  data.score >= 90 ? "bg-gradient-to-r from-yellow-400 to-amber-500" :
                  data.score >= 75 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                  data.score >= 60 ? "bg-gradient-to-r from-blue-400 to-blue-500" :
                  data.score >= 40 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                  "bg-gradient-to-r from-red-400 to-red-500"
                }`}
                style={{ width: `${data.score}%` }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed italic">{data.verdict}</p>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Criteria Breakdown</p>
        <div className="space-y-1.5">
          {data.criteria.map((c) => {
            const status = statusConfig[c.status];
            const StatusIcon = status.icon;
            return (
              <div key={c.name} className="flex items-center gap-2 py-1.5 px-2.5 rounded-lg bg-surface/30 hover:bg-surface/50 transition-colors">
                <StatusIcon className={`h-3.5 w-3.5 shrink-0 ${status.color}`} />
                <span className="text-[11px] text-foreground flex-1 min-w-0 truncate">{c.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-16 h-1.5 rounded-full bg-surface overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        c.score >= 80 ? "bg-emerald-400" : c.score >= 60 ? "bg-blue-400" : c.score >= 40 ? "bg-amber-400" : "bg-red-400"
                      }`}
                      style={{ width: `${c.score}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground w-6 text-right">{c.score}</span>
                  <span className="text-[9px] text-muted-foreground/50 w-8 text-right">({(c.weight * 100).toFixed(0)}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {data.actionItems.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Action Items</p>
          <div className="space-y-1.5">
            {data.actionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-accent/5 border border-accent/10">
                <span className="text-[10px] font-bold text-accent mt-0.5">{i + 1}.</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground leading-relaxed mt-3">{data.overallInsight}</p>
    </div>
  );
}
