"use client";

import { Trophy, Star, AlertCircle, CheckCircle2, XCircle, Target } from "lucide-react";
import type { GoldenProductResult } from "@/types/product-validation";

const rankConfig = {
  S: {
    color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/30",
    glow: "shadow-yellow-400/20", label: "S-Tier", sublabel: "Elite Product",
    gradient: "from-yellow-400 to-amber-500",
  },
  A: {
    color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/30",
    glow: "shadow-emerald-400/20", label: "A-Tier", sublabel: "High Quality",
    gradient: "from-emerald-400 to-emerald-500",
  },
  B: {
    color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/30",
    glow: "shadow-blue-400/20", label: "B-Tier", sublabel: "Good Potential",
    gradient: "from-blue-400 to-blue-500",
  },
  C: {
    color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/30",
    glow: "shadow-amber-400/20", label: "C-Tier", sublabel: "Average",
    gradient: "from-amber-400 to-amber-500",
  },
  D: {
    color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30",
    glow: "shadow-red-400/20", label: "D-Tier", sublabel: "Below Average",
    gradient: "from-red-400 to-red-500",
  },
};

const statusConfig = {
  excellent: { icon: CheckCircle2, color: "text-emerald-400", label: "Excellent" },
  good: { icon: Star, color: "text-blue-400", label: "Good" },
  average: { icon: AlertCircle, color: "text-amber-400", label: "Average" },
  poor: { icon: XCircle, color: "text-red-400", label: "Poor" },
};

export default function GoldenScoreBoard({ data }: { data: GoldenProductResult }) {
  const rank = rankConfig[data.rank];

  return (
    <div className="glass rounded-2xl p-6 relative overflow-hidden">
      {/* Decorative gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br ${rank.gradient} opacity-[0.03] pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 relative">
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-xl ${rank.bg} flex items-center justify-center border ${rank.border}`}>
            <Trophy className={`h-5 w-5 ${rank.color}`} />
          </div>
          <div>
            <h3 className="font-display text-base font-bold text-foreground">Golden Product Score</h3>
            <p className="text-[11px] text-muted-foreground">10-criteria weighted analysis</p>
          </div>
        </div>
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${rank.bg} border ${rank.border}`}>
          <Target className={`h-3.5 w-3.5 ${rank.color}`} />
          <span className={`text-xs font-bold ${rank.color}`}>{rank.label}</span>
        </div>
      </div>

      {/* Main Score Display */}
      <div className="flex items-center gap-6 mb-6 relative">
        {/* Rank Badge with Glow */}
        <div className={`relative w-36 h-36 shrink-0 rounded-2xl ${rank.bg} border ${rank.border} flex flex-col items-center justify-center shadow-lg ${rank.glow}`}>
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent" />
          <span className={`text-6xl font-display font-black ${rank.color} relative z-10`}>{data.rank}</span>
          <span className={`text-[11px] font-semibold ${rank.color} mt-1 relative z-10`}>{rank.sublabel}</span>
        </div>

        {/* Score Details */}
        <div className="flex-1 relative">
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground font-medium">Overall Score</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-display font-black text-foreground">{data.score}</span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="h-3 rounded-full bg-surface overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r ${rank.gradient}`}
                style={{ width: `${data.score}%` }}
              />
            </div>
          </div>

          {/* Verdict */}
          <div className="p-3 rounded-xl bg-surface/30 border border-border/50">
            <div className="flex items-start gap-2">
              <div className={`h-5 w-5 rounded-full ${rank.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                <span className={`text-[10px] font-bold ${rank.color}`}>{data.rank}</span>
              </div>
              <p className="text-[12px] text-foreground/80 leading-relaxed italic">{data.verdict}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Criteria Breakdown */}
      <div className="mb-5 relative">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Criteria Breakdown</p>
          <span className="text-[10px] text-muted-foreground">{data.criteria.length} criteria</span>
        </div>
        <div className="space-y-2">
          {data.criteria.map((c, idx) => {
            const status = statusConfig[c.status];
            const StatusIcon = status.icon;
            return (
              <div
                key={c.name}
                className="flex items-center gap-3 py-2 px-3 rounded-xl bg-surface/20 hover:bg-surface/40 transition-all duration-200 group"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div className={`h-6 w-6 rounded-lg ${c.status === "excellent" ? "bg-emerald-400/10" : c.status === "good" ? "bg-blue-400/10" : c.status === "average" ? "bg-amber-400/10" : "bg-red-400/10"} flex items-center justify-center shrink-0`}>
                  <StatusIcon className={`h-3.5 w-3.5 ${status.color}`} />
                </div>
                <span className="text-[12px] text-foreground flex-1 min-w-0 truncate font-medium">{c.name}</span>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="w-20 h-2 rounded-full bg-surface overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        c.score >= 80 ? "bg-gradient-to-r from-emerald-400 to-emerald-500" :
                        c.score >= 60 ? "bg-gradient-to-r from-blue-400 to-blue-500" :
                        c.score >= 40 ? "bg-gradient-to-r from-amber-400 to-amber-500" :
                        "bg-gradient-to-r from-red-400 to-red-500"
                      }`}
                      style={{ width: `${c.score}%`, transitionDelay: `${idx * 100}ms` }}
                    />
                  </div>
                  <span className={`text-[11px] font-bold w-7 text-right ${
                    c.score >= 80 ? "text-emerald-400" : c.score >= 60 ? "text-blue-400" : c.score >= 40 ? "text-amber-400" : "text-red-400"
                  }`}>{c.score}</span>
                  <span className="text-[9px] text-muted-foreground/60 w-8 text-right">{(c.weight * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Items */}
      {data.actionItems.length > 0 && (
        <div className="mb-4 relative">
          <p className="text-[11px] text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Action Items</p>
          <div className="space-y-2">
            {data.actionItems.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-accent/5 border border-accent/10 hover:bg-accent/10 transition-colors">
                <div className="h-6 w-6 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-accent">{i + 1}</span>
                </div>
                <p className="text-[12px] text-foreground/80 leading-relaxed">{item}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Overall Insight */}
      <div className="p-4 rounded-xl bg-surface/20 border border-border/30 relative">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
            <span className="text-lg">{data.rank === "S" ? "🏆" : data.rank === "A" ? "⭐" : data.rank === "B" ? "👍" : "📊"}</span>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider mb-1">Overall Insight</p>
            <p className="text-[12px] text-foreground/80 leading-relaxed">{data.overallInsight}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
