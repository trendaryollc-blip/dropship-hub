"use client";

import { Zap, Loader2, TrendingUp, DollarSign, Target } from "lucide-react";
import { useAPI, useMutation, revalidate } from "@/hooks/useAPI";
import BudgetRecommendation from "./BudgetRecommendation";

interface Recommendation {
  id: string;
  type: string;
  campaignId: string;
  campaignName: string;
  currentBudget: number;
  recommendedBudget: number;
  reason: string;
  expectedImpact: {
    roasChange: number;
    revenueChange: number;
    confidence: number;
  };
  status: string;
  expiresAt: string;
  createdAt: string;
}

export default function BudgetDashboard() {
  const { data, isLoading } = useAPI<{ recommendations: Recommendation[] }>("/api/budget-optimizer");
  const { trigger: runOptimizer, isMutating } = useMutation("/api/budget-optimizer");

  const recommendations = data?.recommendations || [];
  const pending = recommendations.filter((r) => r.status === "pending");
  const accepted = recommendations.filter((r) => r.status === "accepted");
  const _rejected = recommendations.filter((r) => r.status === "rejected");

  const totalRevenueImpact = accepted.reduce((sum, r) => sum + r.expectedImpact.revenueChange, 0);
  const avgConfidence = accepted.length > 0
    ? accepted.reduce((sum, r) => sum + r.expectedImpact.confidence, 0) / accepted.length
    : 0;

  const handleRunOptimizer = async () => {
    await runOptimizer({});
    revalidate("/api/budget-optimizer");
  };

  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-surface rounded w-1/3" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-surface rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400" /> Budget Optimizer
          </h3>
          <button
            onClick={handleRunOptimizer}
            disabled={isMutating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-xs font-medium text-accent hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            {isMutating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            Run Optimizer
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="p-3 rounded-xl bg-surface/50 text-center">
            <Target className="h-4 w-4 text-accent mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">{pending.length}</p>
            <p className="text-[9px] text-muted-foreground">Pending</p>
          </div>
          <div className="p-3 rounded-xl bg-surface/50 text-center">
            <TrendingUp className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-emerald-400">{accepted.length}</p>
            <p className="text-[9px] text-muted-foreground">Accepted</p>
          </div>
          <div className="p-3 rounded-xl bg-surface/50 text-center">
            <DollarSign className="h-4 w-4 text-amber-400 mx-auto mb-1" />
            <p className="text-lg font-bold text-foreground">${totalRevenueImpact.toFixed(0)}</p>
            <p className="text-[9px] text-muted-foreground">Revenue Impact</p>
          </div>
        </div>

        {accepted.length > 0 && (
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 mb-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-emerald-400">Avg Confidence: {(avgConfidence * 100).toFixed(0)}%</span>
              <span className="text-xs text-emerald-400">Est. Revenue: +${totalRevenueImpact.toFixed(0)}</span>
            </div>
          </div>
        )}
      </div>

      {pending.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-3">Pending Recommendations ({pending.length})</h4>
          <div className="space-y-3">
            {pending.map((rec) => (
              <BudgetRecommendation key={rec.id} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-3">Accepted ({accepted.length})</h4>
          <div className="space-y-3">
            {accepted.map((rec) => (
              <BudgetRecommendation key={rec.id} rec={rec} />
            ))}
          </div>
        </div>
      )}

      {recommendations.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-2">No recommendations yet</p>
          <p className="text-xs text-muted-foreground">Create some campaigns and run the optimizer to get started.</p>
        </div>
      )}
    </div>
  );
}
