"use client";

import { CheckCircle, XCircle, ArrowUp, ArrowDown, Pause, RotateCcw, FlaskConical } from "lucide-react";
import { useMutation, revalidate } from "@/hooks/useAPI";

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

const typeConfig: Record<string, { icon: typeof ArrowUp; color: string; bg: string; label: string }> = {
  scale_up: { icon: ArrowUp, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Scale Up" },
  scale_down: { icon: ArrowDown, color: "text-amber-400", bg: "bg-amber-400/10", label: "Scale Down" },
  pause: { icon: Pause, color: "text-red-400", bg: "bg-red-400/10", label: "Pause" },
  reallocate: { icon: RotateCcw, color: "text-blue-400", bg: "bg-blue-400/10", label: "Reallocate" },
  new_test: { icon: FlaskConical, color: "text-purple-400", bg: "bg-purple-400/10", label: "New Test" },
};

export default function BudgetRecommendation({ rec }: { rec: Recommendation }) {
  const { trigger: updateRec, isMutating } = useMutation(`/api/budget-optimizer/${rec.id}`);
  const tc = typeConfig[rec.type] || typeConfig.scale_up;
  const Icon = tc.icon;

  const handleAccept = async () => {
    await updateRec({ body: { status: "accepted" }, method: "PATCH" });
    revalidate("/api/budget-optimizer");
  };

  const handleReject = async () => {
    await updateRec({ body: { status: "rejected" }, method: "PATCH" });
    revalidate("/api/budget-optimizer");
  };

  const budgetDelta = rec.recommendedBudget - rec.currentBudget;
  const budgetPct = rec.currentBudget > 0 ? ((budgetDelta / rec.currentBudget) * 100).toFixed(0) : "0";

  return (
    <div className="glass rounded-2xl p-5 hover:border-accent/10 transition-all">
      <div className="flex items-start gap-3 mb-3">
        <div className={`p-2 rounded-xl ${tc.bg} shrink-0`}>
          <Icon className={`h-4 w-4 ${tc.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-medium ${tc.color}`}>{tc.label}</span>
            <span className="text-[10px] text-muted-foreground">&middot;</span>
            <span className="text-xs font-semibold text-foreground truncate">{rec.campaignName}</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">{rec.reason}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center p-2 rounded-lg bg-surface/50">
          <p className="text-[9px] text-muted-foreground mb-0.5">Budget Change</p>
          <p className={`text-xs font-bold ${budgetDelta > 0 ? "text-emerald-400" : budgetDelta < 0 ? "text-red-400" : "text-foreground"}`}>
            {budgetDelta > 0 ? "+" : ""}{budgetPct}%
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-surface/50">
          <p className="text-[9px] text-muted-foreground mb-0.5">ROAS Impact</p>
          <p className={`text-xs font-bold ${rec.expectedImpact.roasChange > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {rec.expectedImpact.roasChange > 0 ? "+" : ""}{rec.expectedImpact.roasChange.toFixed(1)}x
          </p>
        </div>
        <div className="text-center p-2 rounded-lg bg-surface/50">
          <p className="text-[9px] text-muted-foreground mb-0.5">Confidence</p>
          <p className="text-xs font-bold text-accent">{(rec.expectedImpact.confidence * 100).toFixed(0)}%</p>
        </div>
      </div>

      {rec.status === "pending" && (
        <div className="flex gap-2">
          <button
            onClick={handleReject}
            disabled={isMutating}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-medium text-red-400 hover:bg-red-500/20 transition-all"
          >
            <XCircle className="h-3 w-3" /> Reject
          </button>
          <button
            onClick={handleAccept}
            disabled={isMutating}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all"
          >
            <CheckCircle className="h-3 w-3" /> Accept
          </button>
        </div>
      )}

      {rec.status === "accepted" && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <CheckCircle className="h-3 w-3 text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-medium">Accepted</span>
        </div>
      )}

      {rec.status === "rejected" && (
        <div className="flex items-center gap-1.5 p-2 rounded-lg bg-red-500/5 border border-red-500/20">
          <XCircle className="h-3 w-3 text-red-400" />
          <span className="text-[10px] text-red-400 font-medium">Rejected</span>
        </div>
      )}
    </div>
  );
}
