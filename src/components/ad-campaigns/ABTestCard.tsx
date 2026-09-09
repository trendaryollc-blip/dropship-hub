"use client";

import { GitBranch, Trophy, Clock, BarChart3 } from "lucide-react";

interface ABTest {
  id: string;
  campaignId: string;
  name: string;
  status: string;
  creativeAId: string;
  creativeBId: string;
  splitPercent: number;
  winnerId?: string;
  winnerConfidence?: number;
  startDate: string;
  endDate?: string;
  results?: {
    aMetrics: { impressions: number; clicks: number; conversions: number; ctr: number; conversionRate: number };
    bMetrics: { impressions: number; clicks: number; conversions: number; ctr: number; conversionRate: number };
    statisticallySignificant: boolean;
    pValue?: number;
  };
}

const statusColors: Record<string, { bg: string; text: string }> = {
  running: { bg: "bg-emerald-500/10", text: "text-emerald-400" },
  completed: { bg: "bg-blue-500/10", text: "text-blue-400" },
  paused: { bg: "bg-amber-500/10", text: "text-amber-400" },
};

export default function ABTestCard({ test }: { test: ABTest }) {
  const sc = statusColors[test.status] || statusColors.paused;
  const r = test.results;

  return (
    <div className="glass rounded-2xl p-5 hover:border-accent/10 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <GitBranch className="h-3.5 w-3.5 text-accent" />
            <h4 className="font-display text-sm font-semibold text-foreground truncate">{test.name}</h4>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Split: {test.splitPercent}% / {100 - test.splitPercent}% &middot; Started {test.startDate}
          </p>
        </div>
        <span className={`px-2 py-1 rounded-lg text-[10px] font-medium ${sc.bg} ${sc.text}`}>
          {test.status}
        </span>
      </div>

      {r ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl border ${test.winnerId === test.creativeAId ? "border-emerald-400/30 bg-emerald-400/5" : "border-border bg-surface/30"}`}>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[9px] font-medium text-muted-foreground">Variant A</span>
                {test.winnerId === test.creativeAId && <Trophy className="h-3 w-3 text-emerald-400" />}
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CTR</span>
                  <span className="font-mono text-foreground">{r.aMetrics.ctr.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conv Rate</span>
                  <span className="font-mono text-foreground">{r.aMetrics.conversionRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clicks</span>
                  <span className="font-mono text-foreground">{r.aMetrics.clicks}</span>
                </div>
              </div>
            </div>
            <div className={`p-3 rounded-xl border ${test.winnerId === test.creativeBId ? "border-emerald-400/30 bg-emerald-400/5" : "border-border bg-surface/30"}`}>
              <div className="flex items-center gap-1 mb-2">
                <span className="text-[9px] font-medium text-muted-foreground">Variant B</span>
                {test.winnerId === test.creativeBId && <Trophy className="h-3 w-3 text-emerald-400" />}
              </div>
              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CTR</span>
                  <span className="font-mono text-foreground">{r.bMetrics.ctr.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conv Rate</span>
                  <span className="font-mono text-foreground">{r.bMetrics.conversionRate.toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Clicks</span>
                  <span className="font-mono text-foreground">{r.bMetrics.clicks}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
            <div className="flex items-center gap-1.5">
              <BarChart3 className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] text-muted-foreground">
                {r.statisticallySignificant ? "Statistically significant" : "Not yet significant"}
              </span>
            </div>
            {test.winnerConfidence && (
              <span className="text-[10px] font-mono text-accent">{(test.winnerConfidence * 100).toFixed(0)}% confidence</span>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-surface/30 border border-border">
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Collecting data...</span>
        </div>
      )}
    </div>
  );
}
