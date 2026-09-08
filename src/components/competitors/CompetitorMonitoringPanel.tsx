"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Eye, TrendingDown, TrendingUp, AlertTriangle, Package,
  ChevronDown, Loader2, RefreshCw,
} from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";

interface CompetitorChange {
  id: string;
  competitorName: string;
  changeType: "price-drop" | "price-increase" | "new-listing" | "out-of-stock" | "rating-change" | "review-surge";
  severity: "info" | "warning" | "critical";
  product: string;
  oldValue: string;
  newValue: string;
  impact: string;
  recommendation: string;
  detectedAt: string;
}

interface MonitoringSummary {
  totalChanges: number;
  critical: number;
  warnings: number;
  opportunities: number;
}

const changeIcons: Record<string, typeof TrendingDown> = {
  "price-drop": TrendingDown,
  "price-increase": TrendingUp,
  "out-of-stock": AlertTriangle,
  "new-listing": Package,
  "rating-change": TrendingDown,
  "review-surge": TrendingUp,
};

const severityColors: Record<string, string> = {
  critical: "bg-red-400/10 text-red-400 border-red-400/20",
  warning: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  info: "bg-blue-400/10 text-blue-400 border-blue-400/20",
};

export default function CompetitorMonitoringPanel() {
  const { user } = useAuth();
  const [changes, setChanges] = useState<CompetitorChange[]>([]);
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user?.uid) { setLoading(false); return; }
    try {
      const data = await safeFetch<{ changes: CompetitorChange[]; summary: MonitoringSummary }>(
        "/api/ai/competitors",
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: user.uid }) }
      );
      setChanges(data.changes || []);
      setSummary(data.summary || { totalChanges: 0, critical: 0, warnings: 0, opportunities: 0 });
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Loader2 className="h-4 w-4 text-accent animate-spin" />
          <span className="text-xs text-muted-foreground">Loading competitor changes...</span>
        </div>
      </div>
    );
  }

  if (changes.length === 0) {
    return (
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="h-4 w-4 text-accent" />
          <h3 className="text-xs font-semibold text-foreground">Live Competitor Changes</h3>
        </div>
        <p className="text-xs text-muted-foreground/60">No competitor changes detected yet. Add competitors to your watchlist to start monitoring.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-accent" />
          <h3 className="text-xs font-semibold text-foreground">Live Competitor Changes</h3>
          {summary && summary.critical > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-400/10 text-red-400 font-medium">
              {summary.critical} critical
            </span>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {summary && (
        <p className="text-[10px] text-muted-foreground/60 mb-3">
          {summary.totalChanges} changes detected · {summary.warnings} warnings · {summary.opportunities} opportunities
        </p>
      )}

      <div className="space-y-2">
        {changes.slice(0, expanded ? changes.length : 4).map((change) => {
          const Icon = changeIcons[change.changeType] || TrendingDown;
          return (
            <div
              key={change.id}
              className={`rounded-xl border p-3 ${severityColors[change.severity]}`}
            >
              <div className="flex items-start gap-2.5">
                <Icon className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] font-semibold">{change.competitorName}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-white/5 capitalize">{change.changeType.replace("-", " ")}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground truncate">{change.product}</p>
                  <div className="flex items-center gap-1.5 mt-1 text-[10px]">
                    <span className="line-through opacity-50">{change.oldValue}</span>
                    <span>→</span>
                    <span className="font-medium">{change.newValue}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{change.recommendation}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {changes.length > 4 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 mt-3 text-[11px] text-accent hover:text-accent/80 transition-colors"
        >
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
          {expanded ? "Show less" : `Show ${changes.length - 4} more`}
        </button>
      )}
    </div>
  );
}
