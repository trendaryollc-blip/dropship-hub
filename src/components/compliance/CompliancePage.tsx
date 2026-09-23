"use client";

import { useState, useCallback } from "react";
import {
  ShieldCheck,
  Loader2,
  Clock,
  Zap,
  Download,
  FileText,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import { authJson, getAuthHeaders } from "@/lib/auth-headers";
import type {
  ComplianceCheckInput,
  ComplianceReport,
  ComplianceDoc,
  ComplianceStats,
} from "@/types/compliance";
import ComplianceCheckForm from "./ComplianceCheckForm";
import ComplianceResult from "./ComplianceResult";
import ComplianceStatsCards from "./ComplianceStatsCards";
import ComplianceHistory from "./ComplianceHistory";

function DataState({
  isLoading,
  error,
  label,
  onRetry,
}: {
  isLoading: boolean;
  error: unknown;
  label: string;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto" />
        <p className="text-sm text-muted-foreground mt-2">Loading {label}…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="glass rounded-2xl p-6 text-center border border-red-500/20">
        <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-foreground">Couldn&apos;t load {label}.</p>
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-1.5"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }
  return null;
}

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<"check" | "history">("check");
  const [result, setResult] = useState<ComplianceReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<{
    reports: ComplianceReport[];
    summary: {
      total: number;
      passed: number;
      warnings: number;
      violations: number;
      blocked: number;
    };
  } | null>(null);
  const { success, error: showError } = useToast();

  const {
    data: statsData,
    mutate: mutateStats,
    isLoading: statsLoading,
    error: statsError,
  } = useAPI<{
    stats: ComplianceStats;
  }>("/api/compliance?type=stats");
  const {
    data: historyData,
    mutate: mutateHistory,
    isLoading: historyLoading,
    error: historyError,
  } = useAPI<{
    checks: ComplianceDoc[];
  }>("/api/compliance?type=list");

  const handleCheck = useCallback(
    async (input: ComplianceCheckInput) => {
      setLoading(true);
      setResult(null);
      setBatchResults(null);
      try {
        const data = await authJson<{ report: ComplianceReport }>("/api/compliance", input);
        setResult(data.report);
        success("Compliance check complete");
        mutateStats();
        mutateHistory();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Check failed");
      } finally {
        setLoading(false);
      }
    },
    [success, showError, mutateStats, mutateHistory]
  );

  const handleBatchSubmit = useCallback(
    async (products: ComplianceCheckInput[]) => {
      setLoading(true);
      setBatchResults(null);
      try {
        const data = await authJson<{
          reports: { report: ComplianceReport }[];
          summary: {
            total: number;
            passed: number;
            warnings: number;
            violations: number;
            blocked: number;
          };
        }>("/api/compliance", { type: "batch", products });
        // The API wraps each report as { success, report } — unwrap for the UI.
        setBatchResults({ reports: data.reports.map((r) => r.report), summary: data.summary });
        success(
          `Batch check complete: ${data.summary.passed} passed, ${data.summary.warnings} warnings, ${data.summary.violations} violations`
        );
        mutateStats();
        mutateHistory();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Batch check failed");
      } finally {
        setLoading(false);
      }
    },
    [success, showError, mutateStats, mutateHistory]
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await authJson(`/api/compliance?id=${encodeURIComponent(id)}`, undefined, "DELETE");
        success("Check deleted");
        mutateHistory();
        mutateStats();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Delete failed");
      }
    },
    [success, showError, mutateHistory, mutateStats]
  );

  const downloadExport = useCallback(
    async (format: "csv" | "json") => {
      const headers = await getAuthHeaders();
      const res = await fetch(`/api/compliance?type=export&format=${format}`, { headers });
      if (!res.ok) {
        let message = "Export failed";
        try {
          const body = await res.json();
          if (body?.error) message = String(body.error);
        } catch {
          // not JSON — keep generic message
        }
        throw new Error(message);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compliance-export-${new Date().toISOString().split("T")[0]}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    },
    []
  );

  const handleExportCSV = async () => {
    try {
      await downloadExport("csv");
      success("CSV exported");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleExportJSON = async () => {
    try {
      await downloadExport("json");
      success("JSON exported");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Export failed");
    }
  };

  const stats = statsData?.stats;
  const history = historyData?.checks || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-accent" />
            Compliance Checker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Check products for trademark, DMCA, patent, export control,
            restricted items, and ad policy violations before listing.
          </p>
        </div>
      </div>

      {/* Stats */}
      <DataState isLoading={statsLoading} error={statsError} label="compliance stats" onRetry={() => mutateStats()} />
      {!statsLoading && !statsError && stats && <ComplianceStatsCards stats={stats} />}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("check")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "check"
              ? "bg-accent/10 text-accent border border-accent/20"
              : "bg-surface border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-4 w-4 inline mr-1.5" />
          New Check
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
            activeTab === "history"
              ? "bg-accent/10 text-accent border border-accent/20"
              : "bg-surface border border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Clock className="h-4 w-4 inline mr-1.5" />
          History ({history.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === "check" ? (
        <div className="space-y-6">
          <ComplianceCheckForm
            onSubmit={handleCheck}
            onBatchSubmit={handleBatchSubmit}
            loading={loading}
          />
          {loading && (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-accent mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Running compliance checks...
              </p>
            </div>
          )}
          {result && <ComplianceResult report={result} />}
          {batchResults && (
            <div className="space-y-4">
              <div className="glass rounded-2xl p-6">
                <h3 className="font-display text-lg font-bold text-foreground mb-4">
                  Batch Results
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-foreground">
                      {batchResults.summary.total}
                    </p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-green-500">
                      {batchResults.summary.passed}
                    </p>
                    <p className="text-xs text-muted-foreground">Passed</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-yellow-500">
                      {batchResults.summary.warnings}
                    </p>
                    <p className="text-xs text-muted-foreground">Warnings</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-red-500">
                      {batchResults.summary.violations}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Violations
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-bold text-red-700">
                      {batchResults.summary.blocked}
                    </p>
                    <p className="text-xs text-muted-foreground">Blocked</p>
                  </div>
                </div>
              </div>
              {batchResults.reports.map((report, idx) => (
                <ComplianceResult key={idx} report={report} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={handleExportCSV}
              disabled={historyLoading || !!historyError || history.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-border text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
            >
              <FileText className="h-3.5 w-3.5" />
              Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              disabled={historyLoading || !!historyError || history.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-surface border border-border text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              Export JSON
            </button>
          </div>
          <DataState
            isLoading={historyLoading}
            error={historyError}
            label="your compliance history"
            onRetry={() => mutateHistory()}
          />
          {!historyLoading && !historyError && history.length === 0 && (
            <div className="glass rounded-2xl p-10 text-center">
              <Clock className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No compliance checks yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Run your first check from the &quot;New Check&quot; tab.</p>
            </div>
          )}
          {!historyLoading && !historyError && history.length > 0 && (
            <ComplianceHistory checks={history} onDelete={handleDelete} />
          )}
        </div>
      )}
    </div>
  );
}
