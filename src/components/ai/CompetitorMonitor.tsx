"use client";

import { useState } from "react";
import { Eye, AlertTriangle, TrendingUp, TrendingDown, ChevronDown, ChevronUp } from "lucide-react";

interface CompetitorChange {
  id: string;
  competitorName: string;
  changeType: string;
  severity: string;
  product: string;
  oldValue: string;
  newValue: string;
  impact: string;
  recommendation: string;
  detectedAt: string;
}

interface CompetitorMonitorProps {
  changes: CompetitorChange[];
  summary: { totalChanges: number; critical: number; warnings: number; opportunities: number };
  onAskAI: (prompt: string) => void;
}

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${styles[severity] || styles.info}`}>
      {severity}
    </span>
  );
}

function ChangeIcon({ type }: { type: string }) {
  if (type === "price-drop" || type === "out-of-stock") return <TrendingDown className="h-3.5 w-3.5 text-emerald-400" />;
  if (type === "price-increase" || type === "review-surge") return <TrendingUp className="h-3.5 w-3.5 text-blue-400" />;
  return <Eye className="h-3.5 w-3.5 text-muted-foreground" />;
}

export default function CompetitorMonitor({ changes, summary, onAskAI }: CompetitorMonitorProps) {
  const [expanded, setExpanded] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? changes : changes.slice(0, 4);

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10">
            <Eye className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Competitor Monitor</p>
            <p className="text-[10px] text-muted-foreground">
              {summary.totalChanges} changes detected • {summary.opportunities} opportunities
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {summary.critical > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="h-2.5 w-2.5 text-red-400" />
              <span className="text-[9px] font-medium text-red-400">{summary.critical}</span>
            </span>
          )}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2 border-t border-white/[0.06] pt-3">
          {displayed.map((change) => (
            <div key={change.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04] space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ChangeIcon type={change.changeType} />
                  <span className="text-xs font-medium text-foreground">{change.competitorName}</span>
                </div>
                <SeverityBadge severity={change.severity} />
              </div>
              <p className="text-[11px] text-foreground">{change.product}</p>
              <div className="flex items-center gap-2 text-[10px]">
                <span className="text-muted-foreground">{change.oldValue}</span>
                <span className="text-accent">→</span>
                <span className="text-foreground font-medium">{change.newValue}</span>
              </div>
              <p className="text-[10px] text-muted-foreground/80">{change.recommendation}</p>
            </div>
          ))}
          {changes.length > 4 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="w-full text-center text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              {showAll ? "Show less" : `Show ${changes.length - 4} more`}
            </button>
          )}
          {summary.opportunities > 0 && (
            <button
              onClick={() => onAskAI(`Based on ${summary.opportunities} competitor opportunities I have, what actions should I take right now?`)}
              className="w-full text-center text-[10px] text-accent hover:text-accent/80 transition-colors py-2 rounded-lg bg-accent/5 border border-accent/10"
            >
              Ask AI: How to capitalize on competitor changes
            </button>
          )}
        </div>
      )}
    </div>
  );
}
