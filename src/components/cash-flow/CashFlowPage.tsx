"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DollarSign,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Wallet,
  Zap,
  Loader2,
  Trash2,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import DataSourceBadge from "@/components/ui/DataSourceBadge";
import { authJson } from "@/lib/auth-headers";
import type { CashFlowSnapshot, CashFlowForecast, CashFlowAlert, CashFlowEntry } from "@/types/cash-flow";

const CATEGORIES = [
  { id: "sales", label: "Sales", type: "inflow" },
  { id: "refunds", label: "Refunds", type: "outflow" },
  { id: "supplier_payment", label: "Supplier Payment", type: "outflow" },
  { id: "shipping", label: "Shipping", type: "outflow" },
  { id: "platform_fee", label: "Platform Fee", type: "outflow" },
  { id: "ads", label: "Ads", type: "outflow" },
  { id: "subscription", label: "Subscription", type: "outflow" },
  { id: "other", label: "Other", type: "outflow" },
];

const inputClass =
  "w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all";

const fmtUSD = (v: number): string =>
  `$${(Number.isFinite(v) ? v : 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

function DataState({ isLoading, error, label, onRetry }: { isLoading: boolean; error: unknown; label: string; onRetry: () => void }) {
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
        <AlertTriangle className="h-6 w-6 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-foreground">Couldn&apos;t load {label}.</p>
        <button onClick={onRetry} className="mt-3 px-4 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-1.5">
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }
  return null;
}

export default function CashFlowPage() {
  const [showAdd, setShowAdd] = useState(false);
  const [entryLoading, setEntryLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { success, error: showError } = useToast();

  const {
    data: snapshotData,
    isLoading: snapLoading,
    error: snapError,
    mutate: mutateSnapshot,
  } = useAPI<{ snapshot: CashFlowSnapshot }>("/api/cash-flow?type=snapshot");
  const {
    data: forecastData,
    isLoading: fcLoading,
    error: fcError,
    mutate: mutateForecast,
  } = useAPI<{ forecast: CashFlowForecast[] }>("/api/cash-flow?type=forecast");
  const { data: alertsData, isLoading: alertsLoading, error: alertsError, mutate: mutateAlerts } = useAPI<{ alerts: CashFlowAlert[] }>("/api/cash-flow?type=alerts");
  const {
    data: entriesData,
    isLoading: entriesLoading,
    error: entriesError,
    mutate: mutateEntries,
  } = useAPI<{ entries: CashFlowEntry[] }>("/api/cash-flow?type=entries");

  // Add-entry form
  const [category, setCategory] = useState("supplier_payment");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [expectedDate, setExpectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  // Starting balance form
  const [balanceInput, setBalanceInput] = useState("");
  const [balanceLoading, setBalanceLoading] = useState(false);

  const snapshot = snapshotData?.snapshot;
  const forecast = useMemo(() => forecastData?.forecast || [], [forecastData]);
  const alerts = alertsData?.alerts || [];
  const entries = entriesData?.entries || [];

  const refreshAll = useCallback(() => {
    mutateSnapshot();
    mutateForecast();
    mutateAlerts();
    mutateEntries();
  }, [mutateSnapshot, mutateForecast, mutateAlerts, mutateEntries]);

  const selectedCategory = CATEGORIES.find((c) => c.id === category);
  const entryType = selectedCategory?.type === "inflow" ? "inflow" : "outflow";

  const handleAddEntry = useCallback(async () => {
    const parsed = Number(amount);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      showError("Amount must be a positive number");
      return;
    }
    if (!expectedDate) {
      showError("Expected date is required");
      return;
    }
    setEntryLoading(true);
    try {
      const data = await authJson<{ success: boolean }>("/api/cash-flow", {
        action: "add_entry",
        type: entryType,
        category,
        amount: parsed,
        description,
        expectedDate,
      });
      if (!data.success) throw new Error("Failed to save entry");
      success("Entry added");
      setAmount("");
      setDescription("");
      setShowAdd(false);
      refreshAll();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to add entry");
    } finally {
      setEntryLoading(false);
    }
  }, [amount, expectedDate, description, category, entryType, success, showError, refreshAll]);

  const handleDeleteEntry = useCallback(
    async (id: string) => {
      setDeletingId(id);
      try {
        await authJson(`/api/cash-flow?id=${encodeURIComponent(id)}`, undefined, "DELETE");
        success("Entry deleted");
        refreshAll();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Delete failed");
      } finally {
        setDeletingId(null);
      }
    },
    [success, showError, refreshAll]
  );

  const handleMarkCompleted = useCallback(
    async (id: string) => {
      try {
        const data = await authJson<{ success: boolean }>("/api/cash-flow", {
          action: "update_entry_status",
          id,
          status: "completed",
          actualDate: new Date().toISOString().split("T")[0],
        });
        if (!data.success) throw new Error("Failed to update");
        success("Marked as completed");
        refreshAll();
      } catch (err) {
        showError(err instanceof Error ? err.message : "Failed to update");
      }
    },
    [success, showError, refreshAll]
  );

  const handleSetBalance = useCallback(async () => {
    const parsed = Number(balanceInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      showError("Balance must be a non-negative number");
      return;
    }
    setBalanceLoading(true);
    try {
      const data = await authJson<{ success: boolean }>("/api/cash-flow", {
        action: "set_balance",
        startingBalance: parsed,
      });
      if (!data.success) throw new Error("Failed to save balance");
      success("Starting balance updated");
      setBalanceInput("");
      refreshAll();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save balance");
    } finally {
      setBalanceLoading(false);
    }
  }, [balanceInput, success, showError, refreshAll]);

  const maxBalance = useMemo(() => {
    if (forecast.length === 0) return 1000;
    return Math.max(...forecast.map((f) => Math.abs(f.runningBalance)), snapshot?.currentBalance || 0, 1) * 1.2;
  }, [forecast, snapshot]);


  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-accent" />
            Cash Flow Timing
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track when money comes in vs. when it goes out. Avoid cash crunches.
          </p>
        </div>
        <button
          onClick={() => setShowAdd((v) => !v)}
          aria-pressed={showAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all"
        >
          <Plus className="h-4 w-4" />
          {showAdd ? "Close" : "Add Entry"}
        </button>
      </div>

      {/* Starting balance setter */}
      <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Wallet className="h-4 w-4 text-accent shrink-0" />
          <label htmlFor="cf-balance" className="text-sm text-foreground shrink-0">Starting balance</label>
          <input
            id="cf-balance"
            type="number"
            min={0}
            step="0.01"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
            placeholder={snapshot ? String(snapshot.currentBalance) : "0.00"}
            className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all"
          />
        </div>
        <button
          onClick={handleSetBalance}
          disabled={balanceLoading || balanceInput === ""}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-surface border border-border text-sm font-medium text-foreground hover:border-accent/30 transition-all disabled:opacity-50"
        >
          {balanceLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Save
        </button>
      </div>

      <DataState isLoading={snapLoading && fcLoading} error={snapError} label="your cash flow" onRetry={() => mutateSnapshot()} />

      {/* KPI Cards */}
      {snapshot && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Current Balance", value: fmtUSD(snapshot.currentBalance), icon: Wallet, color: "text-accent", sub: snapshot.runwayDays == null ? "N/A — no net outflow" : `${snapshot.runwayDays} days runway` },
            { label: "Pending Inflows (Estimated)", value: fmtUSD(snapshot.pendingInflows), icon: ArrowUpRight, color: "text-emerald-400", sub: "Expected from sales" },
            { label: "Pending Outflows (Estimated)", value: fmtUSD(snapshot.pendingOutflows), icon: ArrowDownRight, color: "text-red-400", sub: "Supplier + fees" },
            { label: "Burn Rate (Estimated)", value: `$${snapshot.burnRate.toFixed(0)}/day`, icon: Zap, color: snapshot.burnRate > 100 ? "text-amber-400" : "text-emerald-400", sub: "Daily net outflow" },
          ].map((kpi) => (
            <div key={kpi.label} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground uppercase">{kpi.label}</span>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div className="font-display text-xl font-bold text-foreground">{kpi.value}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Add Entry form */}
      {showAdd && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-sm font-semibold text-foreground">New Cash Flow Entry</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="cf-category" className="block text-xs font-medium text-muted-foreground mb-1.5">Category *</label>
              <select id="cf-category" value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                {CATEGORIES.map((c) => (
                  <option key={c.id} value={c.id}>{c.label} ({c.type})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cf-amount" className="block text-xs font-medium text-muted-foreground mb-1.5">Amount *</label>
              <input id="cf-amount" type="number" min={0.01} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00" className={inputClass} />
            </div>
            <div>
              <label htmlFor="cf-date" className="block text-xs font-medium text-muted-foreground mb-1.5">Expected Date *</label>
              <input id="cf-date" type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label htmlFor="cf-desc" className="block text-xs font-medium text-muted-foreground mb-1.5">Description</label>
              <input id="cf-desc" type="text" maxLength={200} value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder={entryType === "inflow" ? "e.g. Weekly payout" : "e.g. Supplier order #123"}
                className={inputClass} />
            </div>
          </div>
          <button onClick={handleAddEntry} disabled={entryLoading}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50">
            {entryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Add Entry
          </button>
        </div>
      )}

      {/* Cash Conversion Cycle */}
      {snapshot && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3 gap-2">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-semibold text-foreground">Cash Conversion Cycle</h3>
              <DataSourceBadge source="estimated" />
            </div>
            <span className="text-xs text-muted-foreground">Typical {snapshot.cashConversionCycle}-day benchmark (Estimated)</span>
          </div>
          <div className="grid grid-cols-1 sm:flex sm:items-center sm:gap-2 text-xs">
            <div className="flex-1 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="font-semibold text-emerald-400">You get paid</p>
              <p className="text-muted-foreground mt-0.5">Day 0</p>
            </div>
            <div className="hidden sm:flex text-muted-foreground items-center justify-center">→</div>
            <div className="flex-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="font-semibold text-amber-400">Pay supplier</p>
              <p className="text-muted-foreground mt-0.5">Day {Math.round(snapshot.cashConversionCycle * 0.3)} (typical, estimated)</p>
            </div>
            <div className="hidden sm:flex text-muted-foreground items-center justify-center">→</div>
            <div className="flex-1 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
              <p className="font-semibold text-blue-400">Customer receives</p>
              <p className="text-muted-foreground mt-0.5">Day {Math.round(snapshot.cashConversionCycle * 0.7)} (typical, estimated)</p>
            </div>
            <div className="hidden sm:flex text-muted-foreground items-center justify-center">→</div>
            <div className="flex-1 p-3 rounded-xl bg-accent/10 border border-accent/20 text-center">
              <p className="font-semibold text-accent">Platform payout</p>
              <p className="text-muted-foreground mt-0.5">Day {snapshot.cashConversionCycle} (benchmark)</p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      <DataState isLoading={alertsLoading} error={alertsError} label="cash flow alerts" onRetry={() => mutateAlerts()} />
      {!alertsLoading && !alertsError && alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
              alert.severity === "critical" ? "bg-red-500/5 border-red-500/20" :
              alert.severity === "warning" ? "bg-amber-500/5 border-amber-500/20" :
              "bg-blue-500/5 border-blue-500/20"
            }`}>
              <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                alert.severity === "critical" ? "text-red-400" :
                alert.severity === "warning" ? "text-amber-400" : "text-blue-400"
              }`} />
              <div>
                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Entries list */}
      <DataState isLoading={entriesLoading} error={entriesError} label="your entries" onRetry={() => mutateEntries()} />
      {!entriesLoading && !entriesError && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">Cash Flow Entries</h3>
          {entries.length === 0 ? (
            <div className="p-8 text-center">
              <Clock className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No entries yet — add your first inflow or outflow above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {entries.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface/50 border border-border/50 group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-lg shrink-0 ${entry.type === "inflow" ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
                      {entry.type === "inflow" ? <ArrowUpRight className="h-4 w-4 text-emerald-400" /> : <ArrowDownRight className="h-4 w-4 text-red-400" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORIES.find((c) => c.id === entry.category)?.label || entry.category} • {entry.expectedDate}
                        {entry.status !== "pending" ? ` • ${entry.status}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`font-display text-sm font-bold ${entry.type === "inflow" ? "text-emerald-400" : "text-red-400"}`}>
                      {entry.type === "inflow" ? "+" : "−"}{fmtUSD(entry.amount)}
                    </span>
                    <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      {entry.status !== "completed" && (
                        <button onClick={() => handleMarkCompleted(entry.id)} aria-label="Mark completed" title="Mark completed"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDeleteEntry(entry.id)} disabled={deletingId === entry.id}
                        aria-label="Delete entry" title="Delete entry"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50">
                        {deletingId === entry.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Forecast Chart (simplified bar chart) */}
      <DataState isLoading={fcLoading} error={fcError} label="your forecast" onRetry={() => mutateForecast()} />
      {forecast.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4">30-Day Cash Flow Forecast (Estimated)</h3>
          <div className="flex items-end gap-1 h-48">
            {forecast.slice(0, 30).map((day, i) => {
              const inflowHeight = maxBalance > 0 ? (day.inflows / maxBalance) * 100 : 0;
              const outflowHeight = maxBalance > 0 ? (day.outflows / maxBalance) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${day.date}: In $${day.inflows}, Out $${day.outflows}, Balance $${day.runningBalance.toFixed(0)}`}>
                  <div className="w-full flex flex-col items-center gap-0.5" style={{ height: "100%" }}>
                    <div className="flex-1" />
                    <div className="w-full bg-emerald-500/60 rounded-t" style={{ height: `${inflowHeight}%`, minHeight: day.inflows > 0 ? "2px" : "0" }} />
                    <div className="w-full bg-red-500/60 rounded-b" style={{ height: `${outflowHeight}%`, minHeight: day.outflows > 0 ? "2px" : "0" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>Today</span>
            <span>+15 days</span>
            <span>+30 days</span>
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/60" /> Inflows</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/60" /> Outflows</span>
          </div>
        </div>
      )}

      {/* Running Balance Line */}
      {forecast.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4">Running Balance Projection (Estimated)</h3>
          <div className="relative h-40">
            <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="none">
              {/* Zero line */}
              <line x1="0" y1="50" x2="300" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
              {/* Balance line */}
              <polyline
                fill="none"
                stroke="rgb(99, 102, 241)"
                strokeWidth="2"
                points={forecast.slice(0, 30).map((f, i) => {
                  const x = (i / 29) * 300;
                  const normalized = maxBalance > 0 ? 50 - (f.runningBalance / maxBalance) * 50 : 50;
                  return `${x},${Math.max(0, Math.min(100, normalized))}`;
                }).join(" ")}
              />
              {/* Fill under line */}
              <polygon
                fill="url(#gradient)"
                points={`0,50 ${forecast.slice(0, 30).map((f, i) => {
                  const x = (i / 29) * 300;
                  const normalized = maxBalance > 0 ? 50 - (f.runningBalance / maxBalance) * 50 : 50;
                  return `${x},${Math.max(0, Math.min(100, normalized))}`;
                }).join(" ")} 300,50`}
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>Today: {snapshot ? fmtUSD(snapshot.currentBalance) : "—"}</span>
            <span>Day 30: {forecast[29] ? fmtUSD(forecast[29].runningBalance) : "—"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
