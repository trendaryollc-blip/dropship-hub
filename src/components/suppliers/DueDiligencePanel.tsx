"use client";

import { useState } from "react";
import {
  ShieldAlert, ShieldCheck, ShieldX, AlertTriangle, CheckCircle2,
  TrendingUp, TrendingDown, Minus, Loader2, RefreshCw, ChevronDown,
  ChevronUp, Package, Sparkles, X,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { SupplierDueDiligence, RedFlag } from "@/types/supplier";
import { useAPI } from "@/hooks/useAPI";

const riskColors = {
  low: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", ring: "#10b981" },
  medium: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", ring: "#f59e0b" },
  high: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", ring: "#f97316" },
  critical: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", ring: "#ef4444" },
};

const verdictConfig = {
  recommended: { icon: ShieldCheck, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20", label: "Recommended" },
  caution: { icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/20", label: "Use Caution" },
  avoid: { icon: ShieldX, color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", label: "Avoid" },
};

const redFlagLabels: Record<RedFlag["type"], string> = {
  review_manipulation: "Review Manipulation",
  price_gouging: "Price Gouging",
  stock_unreliable: "Unreliable Stock",
  slow_shipping: "Slow Shipping",
  high_refunds: "High Refund Rate",
  new_supplier: "New Supplier",
  fake_orders: "Fake Orders",
};

function RiskGauge({ score, size = 80 }: { score: number; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const color = score <= 30 ? "#10b981" : score <= 55 ? "#f59e0b" : score <= 75 ? "#f97316" : "#ef4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="4" className="text-white/5" />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={circumference - progress}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-bold text-foreground">{score}</span>
        <span className="text-[8px] text-muted-foreground">Risk</span>
      </div>
    </div>
  );
}

function RedFlagCard({ flag }: { flag: RedFlag }) {
  const isCritical = flag.severity === "critical";
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border ${isCritical ? "bg-red-500/5 border-red-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
      <div className={`shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${isCritical ? "bg-red-500/15" : "bg-amber-500/15"}`}>
        <AlertTriangle className={`h-3.5 w-3.5 ${isCritical ? "text-red-400" : "text-amber-400"}`} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-semibold text-foreground">{redFlagLabels[flag.type]}</span>
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase ${isCritical ? "bg-red-500/15 text-red-400" : "bg-amber-500/15 text-amber-400"}`}>
            {flag.severity}
          </span>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">{flag.evidence}</p>
      </div>
    </div>
  );
}

function TrendIndicator({ trend }: { trend: "improving" | "stable" | "declining" }) {
  if (trend === "improving") return <span className="flex items-center gap-1 text-[10px] text-emerald-400"><TrendingUp className="h-3 w-3" /> Improving</span>;
  if (trend === "declining") return <span className="flex items-center gap-1 text-[10px] text-red-400"><TrendingDown className="h-3 w-3" /> Declining</span>;
  return <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Minus className="h-3 w-3" /> Stable</span>;
}

export default function DueDiligencePanel({ supplierId, supplierName }: { supplierId: string; supplierName: string }) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const { data, isLoading, mutate } = useAPI<{ report?: SupplierDueDiligence; cached?: boolean; fresh?: boolean; error?: string }>(
    `/api/suppliers/due-diligence?supplierId=${encodeURIComponent(supplierId)}`
  );

  const report = data?.report;

  const handleGenerate = async (forceRefresh = false) => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/suppliers/due-diligence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplierId, forceRefresh }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to generate");
      await mutate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  };

  // Collapsed state - show summary
  if (!expanded && report) {
  const _risk = riskColors[report.riskLevel];
    return (
      <div ref={ref} className={`glass rounded-2xl border border-border p-4 transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
        <button onClick={() => setExpanded(true)} className="w-full flex items-center gap-4 text-left">
          <RiskGauge score={report.overallRiskScore} size={52} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-foreground">Due Diligence</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${_risk.bg} ${_risk.border} ${_risk.text}`}>
                {report.riskLevel}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground line-clamp-1">{report.recommendation.summary}</p>
            {report.redFlags.length > 0 && (
              <span className="text-[10px] text-amber-400 mt-1 inline-flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> {report.redFlags.length} red flag{report.redFlags.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </div>
    );
  }

  // Loading state
  if (isLoading && !report) {
    return (
      <div className="glass rounded-2xl border border-border p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="h-5 w-5 text-accent" />
          <span className="text-sm font-semibold text-foreground">Due Diligence</span>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Empty state - no report yet
  if (!report && !generating) {
    return (
      <div ref={ref} className={`glass rounded-2xl border border-border p-6 transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="h-5 w-5 text-accent" />
          <span className="text-sm font-semibold text-foreground">Due Diligence Report</span>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Generate an AI-powered trust report for {supplierName} with red flag detection, risk assessment, and recommendations.
        </p>
        <button
          onClick={() => handleGenerate()}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-accent to-accent-hover text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
        >
          <Sparkles className="h-4 w-4" />
          Generate Report
        </button>
      </div>
    );
  }

  // Generating state
  if (generating) {
    return (
      <div className="glass rounded-2xl border border-accent/20 bg-accent/5 p-6">
        <div className="flex items-center gap-3 mb-4">
          <ShieldAlert className="h-5 w-5 text-accent" />
          <span className="text-sm font-semibold text-foreground">Generating Due Diligence Report</span>
        </div>
        <div className="flex flex-col items-center justify-center py-8 gap-3">
          <Loader2 className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground">AI is analyzing {supplierName}...</p>
          <p className="text-[10px] text-muted-foreground/60">Checking ratings, policies, shipping data, and more</p>
        </div>
      </div>
    );
  }

  if (!report) return null;

  const _risk = riskColors[report.riskLevel];
  const verdict = verdictConfig[report.recommendation.verdict];
  const VerdictIcon = verdict.icon;

  return (
    <div ref={ref} className={`glass rounded-2xl border border-border overflow-hidden transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-accent" />
          <div>
            <span className="text-sm font-semibold text-foreground">Due Diligence Report</span>
            <p className="text-[10px] text-muted-foreground">Generated {new Date(report.generatedAt).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGenerate(true)}
            disabled={generating}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
            title="Refresh report"
          >
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setExpanded(false)} className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
            <ChevronUp className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-5 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
          <X className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}

      <div className="p-5 space-y-5">
        {/* Risk Score + Verdict Row */}
        <div className="flex items-center gap-5">
          <RiskGauge score={report.overallRiskScore} size={80} />
          <div className="flex-1 space-y-3">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border ${verdict.bg} ${verdict.border}`}>
              <VerdictIcon className={`h-4 w-4 ${verdict.color}`} />
              <span className={`text-xs font-bold ${verdict.color}`}>{verdict.label}</span>
              <span className="text-[10px] text-muted-foreground ml-1">{report.recommendation.confidence}% confidence</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{report.recommendation.summary}</p>
          </div>
        </div>

        {/* Red Flags */}
        {report.redFlags.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
              Red Flags ({report.redFlags.length})
            </h4>
            <div className="space-y-2">
              {report.redFlags.map((flag, i) => (
                <RedFlagCard key={i} flag={flag} />
              ))}
            </div>
          </div>
        )}

        {/* Strengths */}
        {report.strengths.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              Strengths
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {report.strengths.map((s, i) => (
                <span key={i} className="text-[10px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* History Analysis */}
        <div className="glass rounded-xl p-4 space-y-3">
          <h4 className="text-xs font-semibold text-foreground flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-blue-400" />
            History Analysis
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Review Pattern</span>
              <span className={`text-xs font-medium capitalize ${
                report.historyAnalysis.reviewPattern === "organic" ? "text-emerald-400" :
                report.historyAnalysis.reviewPattern === "suspicious" ? "text-red-400" : "text-amber-400"
              }`}>{report.historyAnalysis.reviewPattern}</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Avg Review Age</span>
              <span className="text-xs font-medium text-foreground">{report.historyAnalysis.averageReviewAge} days</span>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Refund Trend</span>
              <TrendIndicator trend={report.historyAnalysis.refundTrend} />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground">Price Stability</span>
              <TrendIndicator trend={report.historyAnalysis.priceStability === "stable" ? "stable" : report.historyAnalysis.priceStability === "declining" ? "declining" : "improving"} />
            </div>
            <div className="col-span-2 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Stock Consistency</span>
                <span className="text-[10px] font-medium text-foreground">{report.historyAnalysis.stockConsistency}%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    report.historyAnalysis.stockConsistency >= 80 ? "bg-emerald-500" :
                    report.historyAnalysis.stockConsistency >= 60 ? "bg-blue-500" : "bg-amber-500"
                  }`}
                  style={{ width: `${report.historyAnalysis.stockConsistency}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Best For / Avoid For */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="glass rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-3.5 w-3.5" /> Best For
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {report.recommendation.bestFor.map((item, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {item}
                </span>
              ))}
            </div>
          </div>
          <div className="glass rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5" /> Avoid For
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {report.recommendation.avoidFor.map((item, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
