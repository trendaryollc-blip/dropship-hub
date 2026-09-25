"use client";

// Price War Bot — monitor competitor prices and auto-adjust while protecting margins.
// All price adjustments are server-side guarded (auth, rate limits, daily caps,
// margin floors in the price-war engine); the Execute confirm dialog below is a
// UX safeguard, not a substitute for those server controls.

import { useState, useMemo, useCallback } from "react";
import {
  DollarSign, Plus, Trash2, Play, Pause, Loader2, TrendingDown, TrendingUp,
  X, ChevronLeft, ChevronRight, Download, Settings,
  Bell, AlertTriangle, CheckCircle2, Info, Edit3, Save,
  ArrowUpDown, ArrowUp, ArrowDown, BarChart3, Sparkles,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { authJson } from "@/lib/auth-headers";
import { toDate, formatDate, formatDateTime } from "@/lib/dates";
import FilterBar from "@/components/ui/FilterBar";
import Tooltip from "@/components/ui/Tooltip";
import Tour, { useTour, type TourStep } from "@/components/ui/Tour";
import { KPICardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import type { PriceRule, PriceAdjustmentLog, PriceWarStats, PriceWarSettings, PriceAlert } from "@/types/price-war";

const STRATEGIES = [
  { id: "match_lowest", label: "Match Lowest", desc: "Match the lowest competitor price" },
  { id: "stay_below", label: "Stay Below", desc: "Stay X% below lowest competitor" },
  { id: "maintain_margin", label: "Maintain Margin", desc: "Keep minimum margin while competing" },
  { id: "undercut_percent", label: "Undercut %", desc: "Undercut by a fixed percentage" },
  { id: "fixed", label: "Fixed Price", desc: "Never auto-adjust" },
] as const;

const STRAT_COLORS: Record<string, string> = {
  match_lowest: "bg-blue-400/10 text-blue-400",
  stay_below: "bg-emerald-400/10 text-emerald-400",
  maintain_margin: "bg-purple-400/10 text-purple-400",
  undercut_percent: "bg-amber-400/10 text-amber-400",
  fixed: "bg-gray-400/10 text-gray-400",
};

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-400/10 text-emerald-400",
  paused: "bg-amber-400/10 text-amber-400",
  triggered: "bg-blue-400/10 text-blue-400",
  error: "bg-red-400/10 text-red-400",
};

const DEFAULT_SETTINGS: PriceWarSettings = {
  enabled: true,
  checkIntervalMinutes: 60,
  autoApply: true,
  maxDailyAdjustments: 50,
  notifyOnAdjustment: true,
  notifyOnFloorBreach: true,
};

const ALERT_SEVERITY_COLORS: Record<string, string> = {
  low: "bg-blue-400/10 text-blue-400",
  medium: "bg-amber-400/10 text-amber-400",
  high: "bg-red-400/10 text-red-400",
};

function formatAlertTime(value: PriceAlert["createdAt"]): string {
  return formatDateTime(value);
}

type SortField = "productTitle" | "myPrice" | "cost" | "margin" | "lastChecked" | "createdAt";
type SortDir = "asc" | "desc";

interface SortConfig {
  field: SortField;
  dir: SortDir;
}

interface Filters {
  search: string;
  status: string;
  strategy: string;
  platform: string;
}

const ITEMS_PER_PAGE = 10;

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="add-rule"]',
    title: "Create Your First Rule",
    content: "Start by adding a price rule. Tell us your product, cost, and which competitor URLs to monitor.",
    placement: "bottom",
  },
  {
    target: '[data-tour="execute-check"]',
    title: "Run a Price Check",
    content: "Click here to fetch real competitor prices and see what adjustments the bot recommends.",
    placement: "bottom",
  },
  {
    target: '[data-tour="dry-run"]',
    title: "Test Without Risk",
    content: "Use Dry Run to preview price changes without actually applying them. Great for first-timers.",
    placement: "bottom",
  },
  {
    target: '[data-tour="rules-table"]',
    title: "Your Price Rules",
    content: "All your monitoring rules appear here. Each row shows the product, strategy, margin, and status.",
    placement: "top",
  },
  {
    target: '[data-tour="rule-actions"]',
    title: "Rule Controls",
    content: "Edit any rule, pause/resume monitoring, or delete rules you no longer need.",
    placement: "top",
  },
  {
    target: '[data-tour="adjustments-log"]',
    title: "Adjustment History",
    content: "Every price change is logged here with before/after prices and the reason. Export to CSV anytime.",
    placement: "top",
  },
  {
    target: '[data-tour="settings"]',
    title: "Settings",
    content: "Configure auto-apply, check intervals, notifications, and daily limits.",
    placement: "bottom",
  },
];

export default function PriceWarPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const { error: toastError, success: toastSuccess } = useToast();
  const { isOpen: tourOpen, complete: completeTour, skip: skipTour, restart: restartTour } = useTour("price-war");

  const { data: rulesData, mutate: mutateRules, isLoading: rulesLoading, error: rulesError } = useAPI<{ rules?: PriceRule[] }>(uid ? "/api/ai/price-war" : null);
  const { data: statsData, isLoading: statsLoading } = useAPI<{ stats?: PriceWarStats }>(uid ? "/api/ai/price-war?type=stats" : null);
  const { data: logsData, mutate: mutateLogs } = useAPI<{ logs?: PriceAdjustmentLog[] }>(uid ? "/api/ai/price-war/history?limit=200" : null);
  const { data: settingsData, isLoading: settingsLoading, error: settingsError, mutate: mutateSettings } = useAPI<{ settings?: PriceWarSettings }>(uid ? "/api/ai/price-war/settings" : null);
  const { data: alertsData, isLoading: alertsLoading, error: alertsError, mutate: mutateAlerts } = useAPI<{ alerts?: PriceAlert[] }>(uid ? "/api/ai/price-war/alerts" : null);

  const rules = useMemo(() => rulesData?.rules || [], [rulesData]);
  const stats = useMemo(() => statsData?.stats || null, [statsData]);
  const logs = useMemo(() => logsData?.logs || [], [logsData]);
  const priceAlerts = useMemo(() => alertsData?.alerts || [], [alertsData]);

  const [showAdd, setShowAdd] = useState(false);
  const [editingRule, setEditingRule] = useState<PriceRule | null>(null);
  const [executing, setExecuting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; ids: string[] }>({ open: false, ids: [] });
  const [executeConfirm, setExecuteConfirm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAlerts, setShowAlerts] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState<PriceWarSettings | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [ruleSort, setRuleSort] = useState<SortConfig>({ field: "createdAt", dir: "desc" });
  const [ruleFilters, setRuleFilters] = useState<Filters>({ search: "", status: "", strategy: "", platform: "" });
  const [rulePage, setRulePage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [logFilter, setLogFilter] = useState({ ruleId: "", dateFrom: "", dateTo: "" });
  const [expandedStrategy, setExpandedStrategy] = useState<string | null>(null);

  const [form, setForm] = useState({
    productTitle: "", myPrice: "", cost: "", floorPrice: "", minMargin: "20",
    strategy: "match_lowest" as string, undercutPercent: "3", belowPercent: "5", targetMargin: "25",
    platforms: "amazon", competitorUrls: "", productImage: "", productUrl: "",
    maxIncrease: "", maxDecrease: "",
  });

  const getMargin = useCallback((price: number, cost: number) => price > 0 ? Math.round(((price - cost) / price) * 100) : 0, []);

  const settings = settingsDraft ?? settingsData?.settings ?? DEFAULT_SETTINGS;

  const updateSetting = <K extends keyof PriceWarSettings>(key: K, value: PriceWarSettings[K]) => {
    setSettingsDraft({ ...settings, [key]: value });
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await authJson("/api/ai/price-war/settings", settings, "PUT");
      setSettingsDraft(null);
      mutateSettings();
      toastSuccess("Settings saved");
    } catch (e) {
      console.error("[PriceWar] Failed to save settings:", e instanceof Error ? e.message : e);
      toastError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleMarkAlertsRead = async () => {
    try {
      await authJson("/api/ai/price-war/alerts", { markAll: true }, "PATCH");
      mutateAlerts();
      toastSuccess("Alerts marked as read");
    } catch (e) {
      console.error("[PriceWar] Failed to update alerts:", e instanceof Error ? e.message : e);
      toastError(e instanceof Error ? e.message : "Failed to update alerts");
    }
  };

  const getMarginStatus = useCallback((margin: number) => {
    if (margin < 5) return "critical";
    if (margin < 15) return "warning";
    if (margin < 40) return "healthy";
    return "excellent";
  }, []);

  const filteredRules = useMemo(() => {
    let result = [...rules];

    if (ruleFilters.search) {
      const q = ruleFilters.search.toLowerCase();
      result = result.filter((r) =>
        r.productTitle.toLowerCase().includes(q) ||
        r.platforms.some((p) => p.toLowerCase().includes(q)) ||
        r.competitorUrls.some((u) => u.toLowerCase().includes(q))
      );
    }
    if (ruleFilters.status) {
      result = result.filter((r) => r.status === ruleFilters.status);
    }
    if (ruleFilters.strategy) {
      result = result.filter((r) => r.strategy === ruleFilters.strategy);
    }
    if (ruleFilters.platform) {
      result = result.filter((r) => r.platforms.includes(ruleFilters.platform));
    }

    result.sort((a, b) => {
      const { field, dir } = ruleSort;
      const mult = dir === "asc" ? 1 : -1;
      switch (field) {
        case "productTitle": return mult * a.productTitle.localeCompare(b.productTitle);
        case "myPrice": return mult * (a.myPrice - b.myPrice);
        case "cost": return mult * (a.cost - b.cost);
        case "margin": return mult * (getMargin(a.myPrice, a.cost) - getMargin(b.myPrice, b.cost));
        case "lastChecked": return mult * ((a.lastChecked ? toDate(a.lastChecked)?.getTime() ?? 0 : 0) - (b.lastChecked ? toDate(b.lastChecked)?.getTime() ?? 0 : 0));
        case "createdAt": return mult * ((toDate(a.createdAt)?.getTime() ?? 0) - (toDate(b.createdAt)?.getTime() ?? 0));
        default: return 0;
      }
    });

    return result;
  }, [rules, ruleFilters, ruleSort, getMargin]);

  const ruleTotalPages = Math.max(1, Math.ceil(filteredRules.length / ITEMS_PER_PAGE));
  const paginatedRules = filteredRules.slice((rulePage - 1) * ITEMS_PER_PAGE, rulePage * ITEMS_PER_PAGE);

  const filteredLogs = useMemo(() => {
    let result = [...logs];
    if (logFilter.ruleId) {
      result = result.filter((l) => l.ruleId === logFilter.ruleId);
    }
    if (logFilter.dateFrom) {
      const from = new Date(logFilter.dateFrom).getTime();
      result = result.filter((l) => (toDate(l.createdAt)?.getTime() ?? 0) >= from);
    }
    if (logFilter.dateTo) {
      const to = new Date(logFilter.dateTo).getTime() + 86400000;
      result = result.filter((l) => (toDate(l.createdAt)?.getTime() ?? 0) <= to);
    }
    return result;
  }, [logs, logFilter]);

  const logTotalPages = Math.max(1, Math.ceil(filteredLogs.length / ITEMS_PER_PAGE));
  const paginatedLogs = filteredLogs.slice((logPage - 1) * ITEMS_PER_PAGE, logPage * ITEMS_PER_PAGE);

  const allPlatforms = useMemo(() => {
    const set = new Set<string>();
    rules.forEach((r) => r.platforms.forEach((p) => set.add(p)));
    return Array.from(set);
  }, [rules]);

  const toggleSort = (field: SortField) => {
    setRuleSort((prev) => ({
      field,
      dir: prev.field === field && prev.dir === "asc" ? "desc" : "asc",
    }));
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (ruleSort.field !== field) return <ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />;
    return ruleSort.dir === "asc"
      ? <ArrowUp className="h-3 w-3 text-accent" />
      : <ArrowDown className="h-3 w-3 text-accent" />;
  };

  const buildRulePayload = () => {
    const urls = form.competitorUrls.split("\n").map((s) => s.trim()).filter(Boolean);
    const validUrls = urls.filter((u) => { try { new URL(u); return true; } catch { return false; } });
    // Reject raw URLs that fail URL parsing instead of silently discarding them
    // — a rule with zero usable competitor URLs would otherwise monitor nothing (add)
    // or wipe its competitor list (edit).
    if (urls.length > 0 && validUrls.length === 0) {
      toastError("No valid competitor URLs — enter at least one full URL starting with http(s)://");
      return null;
    }
    return {
      productTitle: form.productTitle.trim(),
      myPrice: parseFloat(form.myPrice) || 0,
      cost: parseFloat(form.cost) || 0,
      floorPrice: parseFloat(form.floorPrice) || 0,
      minMargin: parseFloat(form.minMargin) || 0,
      strategy: form.strategy,
      strategyConfig: {
        undercutPercent: parseFloat(form.undercutPercent) || undefined,
        belowPercent: parseFloat(form.belowPercent) || undefined,
        targetMargin: parseFloat(form.targetMargin) || undefined,
        maxIncrease: form.maxIncrease ? parseFloat(form.maxIncrease) : undefined,
        maxDecrease: form.maxDecrease ? parseFloat(form.maxDecrease) : undefined,
      },
      platforms: form.platforms.split(",").map((s) => s.trim()).filter(Boolean),
      competitorUrls: validUrls,
      productImage: form.productImage || undefined,
      productUrl: form.productUrl || undefined,
    };
  };

  const handleAdd = async () => {
    const payload = buildRulePayload();
    if (!payload) return;
    // POST requires ≥1 competitor URL; surface a clear error instead of the
    // schema's 400 so the user knows what to fix.
    if (payload.competitorUrls.length === 0) {
      toastError("Add at least one competitor URL to monitor");
      return;
    }
    try {
      await authJson("/api/ai/price-war", payload);
      mutateRules();
      setShowAdd(false);
      resetForm();
      toastSuccess("Price rule created");
    } catch (e) { console.error("[PriceWar] Failed to add price rule:", e instanceof Error ? e.message : e); toastError(e instanceof Error ? e.message : "Failed to add price rule"); }
  };

  const handleEdit = async () => {
    if (!editingRule) return;
    const payload = buildRulePayload();
    if (!payload) return;
    try {
      await authJson("/api/ai/price-war", { ruleId: editingRule.id, ...payload }, "PUT");
      mutateRules();
      setEditingRule(null);
      resetForm();
      toastSuccess("Price rule updated");
    } catch (e) { console.error("[PriceWar] Failed to update rule:", e instanceof Error ? e.message : e); toastError(e instanceof Error ? e.message : "Failed to update rule"); }
  };

  const resetForm = () => {
    setForm({
      productTitle: "", myPrice: "", cost: "", floorPrice: "", minMargin: "20",
      strategy: "match_lowest", undercutPercent: "3", belowPercent: "5", targetMargin: "25",
      platforms: "amazon", competitorUrls: "", productImage: "", productUrl: "",
      maxIncrease: "", maxDecrease: "",
    });
  };

  const openEditForm = (rule: PriceRule) => {
    setForm({
      productTitle: rule.productTitle,
      myPrice: String(rule.myPrice),
      cost: String(rule.cost),
      floorPrice: String(rule.floorPrice),
      minMargin: String(rule.minMargin),
      strategy: rule.strategy,
      undercutPercent: String(rule.strategyConfig.undercutPercent || 3),
      belowPercent: String(rule.strategyConfig.belowPercent || 5),
      targetMargin: String(rule.strategyConfig.targetMargin || 25),
      platforms: rule.platforms.join(", "),
      competitorUrls: rule.competitorUrls.join("\n"),
      productImage: rule.productImage || "",
      productUrl: rule.productUrl || "",
      maxIncrease: String(rule.strategyConfig.maxIncrease || ""),
      maxDecrease: String(rule.strategyConfig.maxDecrease || ""),
    });
    setEditingRule(rule);
    setShowAdd(false);
  };

  const handleExecute = async (mode: "dry" | "apply" = "apply") => {
    if (mode === "apply") {
      setExecuteConfirm(true);
      return;
    }
    await runExecute(mode);
  };

  const runExecute = async (mode: "dry" | "apply") => {
    setExecuteConfirm(false);
    setExecuting(true);
    try {
      const res = await authJson("/api/ai/price-war/execute", mode === "dry" ? { dryRun: true } : { apply: true }) as { dryRun?: boolean } | null | undefined;
      mutateRules();
      mutateLogs();
      const wasDryRun = typeof res?.dryRun === "boolean" ? res.dryRun : mode === "dry";
      toastSuccess(wasDryRun ? "Dry run completed — no prices changed" : "Price check executed and adjustments applied");
    } catch (e) { console.error("[PriceWar] Failed to run price check:", e instanceof Error ? e.message : e); toastError(e instanceof Error ? e.message : "Failed to run price check"); }
    finally { setExecuting(false); }
  };

  const handleToggle = async (rule: PriceRule) => {
    const newStatus = rule.status === "active" ? "paused" : "active";
    try {
      await authJson("/api/ai/price-war", { ruleId: rule.id, status: newStatus }, "PUT");
      mutateRules();
      toastSuccess(`Rule ${newStatus === "active" ? "resumed" : "paused"}`);
    } catch (e) { console.error("[PriceWar] Failed to update rule status:", e instanceof Error ? e.message : e); toastError(e instanceof Error ? e.message : "Failed to update rule status"); }
  };

  const handleDelete = async (id: string) => {
    setConfirmDelete({ open: true, ids: [id] });
  };

  const confirmDeleteAction = async () => {
    const { ids } = confirmDelete;
    setConfirmDelete({ open: false, ids: [] });

    if (ids.length === 1) {
      try {
        await authJson(`/api/ai/price-war?id=${encodeURIComponent(ids[0])}`, undefined, "DELETE");
        mutateRules();
        setSelectedIds((prev) => { const next = new Set(prev); next.delete(ids[0]); return next; });
        toastSuccess("Rule deleted");
      } catch (e) { console.error("[PriceWar] Failed to delete rule:", e instanceof Error ? e.message : e); toastError(e instanceof Error ? e.message : "Failed to delete rule"); }
    } else {
      try {
        await authJson("/api/ai/price-war", { ruleIds: ids, action: "delete" }, "PATCH");
        mutateRules();
        setSelectedIds(new Set());
        toastSuccess(`${ids.length} rules deleted`);
      } catch (e) { console.error("[PriceWar] Failed to delete rules:", e instanceof Error ? e.message : e); toastError(e instanceof Error ? e.message : "Failed to delete rules"); }
    }
  };

  const handleBulkAction = async (action: "pause" | "resume" | "delete") => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (action === "delete") {
      setConfirmDelete({ open: true, ids });
      return;
    }
    try {
      await authJson("/api/ai/price-war", { ruleIds: ids, action }, "PATCH");
      mutateRules();
      setSelectedIds(new Set());
      toastSuccess(`${ids.length} rules ${action === "pause" ? "paused" : "resumed"}`);
    } catch (e) { console.error("[PriceWar] Failed to bulk update rules:", e instanceof Error ? e.message : e); toastError(e instanceof Error ? e.message : `Failed to ${action} rules`); }
  };

  const toggleSelectRule = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedRules.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRules.map((r) => r.id)));
    }
  };

  const exportCsv = () => {
    const headers = ["Product", "Previous Price", "New Price", "Change", "Reason", "Date"];
    const rows = filteredLogs.map((log) => [
      log.productTitle,
      log.previousPrice.toFixed(2),
      log.newPrice.toFixed(2),
      (log.newPrice - log.previousPrice).toFixed(2),
      log.reason,
      formatDate(log.createdAt),
    ]);
    // Guard large exports client-side
    if (filteredLogs.length > 5000) {
      toastError("Export too large for client-side download. Please narrow the date range.");
      return;
    }
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""') }"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `price-adjustments-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess("CSV exported");
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      <Tour steps={TOUR_STEPS} isOpen={tourOpen} onComplete={completeTour} onSkip={skipTour} />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Price War Bot</h1>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-400/10 text-emerald-400 text-[10px] font-bold">RULE-BASED</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">Compare your prices against competitor listings and adjust them by rule while protecting your margin floors. Checks run on demand.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Tooltip content="Replay the guided tour" position="bottom">
            <button onClick={restartTour} className="px-3 py-1.5 rounded-xl bg-surface border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5">
              <Sparkles className="h-3 w-3" />
              Tour
            </button>
          </Tooltip>
          <Tooltip content="View competitor price alerts and notifications" position="bottom">
            <button data-tour="alerts" onClick={() => setShowAlerts(!showAlerts)} className="relative px-3 py-1.5 rounded-xl bg-surface border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5">
              <Bell className="h-3 w-3" />
              Alerts
            </button>
          </Tooltip>
          <Tooltip content="Configure auto-apply, check intervals, and limits" position="bottom">
            <button data-tour="settings" onClick={() => setShowSettings(!showSettings)} className="px-3 py-1.5 rounded-xl bg-surface border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5">
              <Settings className="h-3 w-3" />
              Settings
            </button>
          </Tooltip>
          <Tooltip content="Test all rules without changing any prices" position="bottom">
            <button data-tour="dry-run" onClick={() => handleExecute("dry")} disabled={executing} className="px-3 py-1.5 rounded-xl bg-surface border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5">
              {executing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Dry Run
            </button>
          </Tooltip>
          <Tooltip content="Fetch real competitor prices and apply adjustments" position="bottom">
            <button data-tour="execute-check" onClick={() => handleExecute("apply")} disabled={executing} className="px-3 py-1.5 rounded-xl bg-accent text-white text-[10px] font-semibold hover:bg-accent/80 transition-all flex items-center gap-1.5">
              {executing ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
              Execute Check
            </button>
          </Tooltip>
          <Tooltip content="Create a new price monitoring rule" position="bottom">
            <button data-tour="add-rule" onClick={() => { setShowAdd(!showAdd); setEditingRule(null); resetForm(); }} className="px-3 py-1.5 rounded-xl bg-accent text-white text-[10px] font-semibold hover:bg-accent/80 transition-all flex items-center gap-1.5">
              <Plus className="h-3 w-3" /> Add Rule
            </button>
          </Tooltip>
        </div>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          {[1, 2, 3, 4].map((i) => <KPICardSkeleton key={i} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <div className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground">Active Rules</p>
              <span className="text-[10px] text-emerald-400">{stats.activeRules}/{stats.totalRules}</span>
            </div>
            <p className="text-lg font-bold text-foreground">{stats.activeRules}</p>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground">Triggered Today</p>
              <TrendingUp className="h-3 w-3 text-emerald-400" />
            </div>
            <p className="text-lg font-bold text-foreground">{stats.triggeredToday}</p>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground">Avg Listing Margin</p>
              <span className={`text-[10px] font-bold ${getMarginStatus(stats.avgMarginMaintained) === "excellent" ? "text-emerald-400" : getMarginStatus(stats.avgMarginMaintained) === "healthy" ? "text-blue-400" : getMarginStatus(stats.avgMarginMaintained) === "warning" ? "text-amber-400" : "text-red-400"}`}>
                {getMarginStatus(stats.avgMarginMaintained)}
              </span>
            </div>
            <p className="text-lg font-bold text-foreground">{stats.avgMarginMaintained}%</p>
          </div>
          <div className="glass rounded-xl p-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[10px] text-muted-foreground">Price Reductions</p>
              <DollarSign className="h-3 w-3 text-accent" />
            </div>
            <p className="text-lg font-bold text-foreground">${stats.totalSavingsFromAdjustments?.toFixed(2) || "0.00"}</p>
          </div>
        </div>
      )}

      {showAlerts && (
        <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <Bell className="h-4 w-4" /> Competitor Alerts
            </h3>
            <div className="flex items-center gap-2">
              {priceAlerts.some((a) => !a.read) && (
                <button onClick={handleMarkAlertsRead} className="text-[10px] font-semibold text-accent hover:underline">
                  Mark all read
                </button>
              )}
              <button onClick={() => setShowAlerts(false)} className="p-1 rounded-lg hover:bg-surface-hover"><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
          </div>
          {alertsLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 text-muted-foreground mx-auto mb-2 animate-spin" />
              <p className="text-xs text-muted-foreground">Loading alerts…</p>
            </div>
          ) : alertsError ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-3">Couldn&apos;t load alerts.</p>
              <button onClick={() => mutateAlerts()} className="px-3 py-1.5 rounded-xl bg-surface border border-border text-[10px] font-semibold text-foreground hover:bg-surface-hover transition-all">
                Retry
              </button>
            </div>
          ) : priceAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <Info className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Alerts will appear here when competitor prices change significantly.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {priceAlerts.map((alert) => (
                <div key={alert.id} className={`p-3 rounded-xl border border-border flex items-start gap-3 ${alert.read ? "opacity-60" : ""}`}>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0 ${ALERT_SEVERITY_COLORS[alert.severity] || ALERT_SEVERITY_COLORS.low}`}>
                    {alert.severity}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${alert.read ? "text-muted-foreground" : "text-foreground"}`}>{alert.message}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Competitor ${alert.competitorPrice.toFixed(2)} · Yours ${alert.myPrice.toFixed(2)}
                      {formatAlertTime(alert.createdAt) && <> · {formatAlertTime(alert.createdAt)}</>}
                    </p>
                  </div>
                  {!alert.read && <span className="w-2 h-2 rounded-full bg-accent shrink-0 mt-1" aria-label="Unread alert" />}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showSettings && (
        <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" /> Price War Settings
            </h3>
            <button onClick={() => setShowSettings(false)} className="p-1 rounded-lg hover:bg-surface-hover"><X className="h-4 w-4 text-muted-foreground" /></button>
          </div>
          {settingsLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="h-6 w-6 text-muted-foreground mx-auto mb-2 animate-spin" />
              <p className="text-xs text-muted-foreground">Loading settings…</p>
            </div>
          ) : settingsError && !settingsData ? (
            <div className="p-8 text-center">
              <AlertTriangle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-3">Couldn&apos;t load settings.</p>
              <button onClick={() => mutateSettings()} className="px-3 py-1.5 rounded-xl bg-surface border border-border text-[10px] font-semibold text-foreground hover:bg-surface-hover transition-all">
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border">
                  <div>
                    <p className="text-xs font-medium text-foreground">Auto-Apply Changes</p>
                    <p className="text-[10px] text-muted-foreground">Apply suggestions when a check runs without an explicit dry run</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.autoApply}
                    aria-label="Auto-apply changes"
                    onClick={() => updateSetting("autoApply", !settings.autoApply)}
                    className={`w-9 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors ${settings.autoApply ? "bg-accent" : "bg-surface-hover"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.autoApply ? "translate-x-4" : ""}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border">
                  <div>
                    <p className="text-xs font-medium text-foreground">Notifications</p>
                    <p className="text-[10px] text-muted-foreground">Get notified on price adjustments</p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={settings.notifyOnAdjustment}
                    aria-label="Notify on price adjustments"
                    onClick={() => updateSetting("notifyOnAdjustment", !settings.notifyOnAdjustment)}
                    className={`w-9 h-5 rounded-full flex items-center p-0.5 cursor-pointer transition-colors ${settings.notifyOnAdjustment ? "bg-accent" : "bg-surface-hover"}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${settings.notifyOnAdjustment ? "translate-x-4" : ""}`} />
                  </button>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <label htmlFor="pw-check-interval" className="text-xs font-medium text-foreground mb-2 block">Check Interval</label>
                  <select
                    id="pw-check-interval"
                    value={settings.checkIntervalMinutes}
                    onChange={(e) => updateSetting("checkIntervalMinutes", Number(e.target.value))}
                    className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground"
                  >
                    <option value={15}>Every 15 minutes</option>
                    <option value={30}>Every 30 minutes</option>
                    <option value={60}>Every hour</option>
                    <option value={120}>Every 2 hours</option>
                    <option value={240}>Every 4 hours</option>
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1.5">Checks run when you click Execute Check — no scheduler is connected yet.</p>
                </div>
                <div className="p-3 rounded-xl bg-surface border border-border">
                  <label htmlFor="pw-max-daily" className="text-xs font-medium text-foreground mb-2 block">Max Daily Adjustments</label>
                  <input
                    id="pw-max-daily"
                    type="number"
                    value={settings.maxDailyAdjustments}
                    min={1}
                    max={100}
                    onChange={(e) => updateSetting("maxDailyAdjustments", Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                    className="w-full px-2 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all flex items-center gap-1.5"
                >
                  {savingSettings ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Save Settings
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {(showAdd || editingRule) && (
        <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
          <h3 className="font-display text-sm font-semibold text-foreground">{editingRule ? "Edit Price Rule" : "New Price Rule"}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.productTitle} onChange={(e) => setForm({ ...form, productTitle: e.target.value })} placeholder="Product title" className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <input value={form.productUrl} onChange={(e) => setForm({ ...form, productUrl: e.target.value })} placeholder="Product URL (optional)" className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <input value={form.myPrice} onChange={(e) => setForm({ ...form, myPrice: e.target.value })} placeholder="My price ($)" type="number" step="0.01" min="0" className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="Cost ($)" type="number" step="0.01" min="0" className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <input value={form.floorPrice} onChange={(e) => setForm({ ...form, floorPrice: e.target.value })} placeholder="Floor price ($)" type="number" step="0.01" min="0" className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <input value={form.minMargin} onChange={(e) => setForm({ ...form, minMargin: e.target.value })} placeholder="Min margin (%)" type="number" step="1" min="0" max="100" className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Strategy</label>
            <div className="flex flex-wrap gap-1.5">
              {STRATEGIES.map((s) => (
                <div key={s.id} className="relative">
                  <button
                    onClick={() => setForm({ ...form, strategy: s.id })}
                    onMouseEnter={() => setExpandedStrategy(s.id)}
                    onMouseLeave={() => setExpandedStrategy(null)}
                    className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${form.strategy === s.id ? "bg-accent text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}
                  >
                    {s.label}
                  </button>
                  {expandedStrategy === s.id && (
                    <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 rounded-lg bg-background border border-border text-[9px] text-muted-foreground w-max max-w-[85vw] whitespace-normal text-center shadow-lg">
                      {s.desc}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {(form.strategy === "undercut_percent" || form.strategy === "stay_below") && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={form.strategy === "undercut_percent" ? form.undercutPercent : form.belowPercent}
                onChange={(e) => setForm({ ...form, [form.strategy === "undercut_percent" ? "undercutPercent" : "belowPercent"]: e.target.value })}
                placeholder={form.strategy === "undercut_percent" ? "Undercut % (e.g. 3)" : "Stay below % (e.g. 5)"}
                type="number" step="0.5" min="0" max="50"
                className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            </div>
          )}
          {form.strategy === "maintain_margin" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={form.targetMargin} onChange={(e) => setForm({ ...form, targetMargin: e.target.value })}
                placeholder="Target margin %" type="number" step="1" min="0" max="100"
                className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.maxIncrease} onChange={(e) => setForm({ ...form, maxIncrease: e.target.value })}
              placeholder="Max increase % (optional)" type="number" step="1" min="0" max="100"
              className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <input value={form.maxDecrease} onChange={(e) => setForm({ ...form, maxDecrease: e.target.value })}
              placeholder="Max decrease % (optional)" type="number" step="1" min="0" max="100"
              className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
          </div>
          <input value={form.platforms} onChange={(e) => setForm({ ...form, platforms: e.target.value })}
            placeholder="Platforms (comma separated, e.g. amazon, ebay)" className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
          <textarea value={form.competitorUrls} onChange={(e) => setForm({ ...form, competitorUrls: e.target.value })}
            placeholder={"Competitor URLs (one per line)\ne.g. https://amazon.com/dp/B08N5WRWNW\nhttps://ebay.com/itm/123456"}
            rows={3} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40 resize-none" />
          {form.competitorUrls && (
            <div className="flex items-center gap-1 text-[10px]">
              {form.competitorUrls.split("\n").filter((u) => u.trim()).map((url, i) => {
                let valid = false;
                try { new URL(url.trim()); valid = true; } catch {}
                return (
                  <span key={i} className={`px-1.5 py-0.5 rounded ${valid ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
                    {valid ? <CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5" /> : <AlertTriangle className="h-2.5 w-2.5 inline mr-0.5" />}
                    {valid ? "Valid" : "Invalid"}
                  </span>
                );
              })}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Tooltip content="Discard changes and close form" position="top">
              <button onClick={() => { setShowAdd(false); setEditingRule(null); resetForm(); }} className="px-3 py-1.5 rounded-xl bg-surface border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all">Cancel</button>
            </Tooltip>
            <Tooltip content={editingRule ? "Save all changes to this rule" : "Create this price rule and start monitoring"} position="top">
              <button onClick={editingRule ? handleEdit : handleAdd} disabled={!form.productTitle || !form.myPrice}
                className="px-3 py-1.5 rounded-xl bg-accent text-white text-[10px] font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all flex items-center gap-1">
                {editingRule ? <><Save className="h-3 w-3" /> Save Changes</> : <><Plus className="h-3 w-3" /> Save Rule</>}
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      {selectedIds.size > 0 && (
        <div className="glass rounded-2xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-2">
          <span className="text-xs text-muted-foreground">{selectedIds.size} rule{selectedIds.size > 1 ? "s" : ""} selected</span>
          <div className="flex flex-wrap items-center gap-2">
            <Tooltip content="Pause all selected rules" position="top">
              <button onClick={() => handleBulkAction("pause")} className="px-2.5 py-1 rounded-lg bg-amber-400/10 text-amber-400 text-[10px] font-semibold hover:bg-amber-400/20 transition-all flex items-center gap-1">
                <Pause className="h-3 w-3" /> Pause
              </button>
            </Tooltip>
            <Tooltip content="Resume all selected rules" position="top">
              <button onClick={() => handleBulkAction("resume")} className="px-2.5 py-1 rounded-lg bg-emerald-400/10 text-emerald-400 text-[10px] font-semibold hover:bg-emerald-400/20 transition-all flex items-center gap-1">
                <Play className="h-3 w-3" /> Resume
              </button>
            </Tooltip>
            <Tooltip content="Permanently delete all selected rules" position="top">
              <button onClick={() => handleBulkAction("delete")} className="px-2.5 py-1 rounded-lg bg-red-400/10 text-red-400 text-[10px] font-semibold hover:bg-red-400/20 transition-all flex items-center gap-1">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </Tooltip>
            <Tooltip content="Clear selection" position="top">
              <button onClick={() => setSelectedIds(new Set())} className="px-2 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground transition-all">
                <X className="h-3 w-3" />
              </button>
            </Tooltip>
          </div>
        </div>
      )}

      <div data-tour="rules-table" className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold text-foreground">Price Rules ({filteredRules.length})</h3>
          </div>
          <FilterBar
            searchPlaceholder="Search rules..."
            searchValue={ruleFilters.search}
            onSearchChange={(v) => { setRuleFilters((p) => ({ ...p, search: v })); setRulePage(1); }}
            filters={[
              { key: "status", label: "All Status", options: [
                { label: "Active", value: "active" },
                { label: "Paused", value: "paused" },
                { label: "Triggered", value: "triggered" },
                { label: "Error", value: "error" },
              ], value: ruleFilters.status },
              { key: "strategy", label: "All Strategies", options: STRATEGIES.map((s) => ({ label: s.label, value: s.id })), value: ruleFilters.strategy },
              { key: "platform", label: "All Platforms", options: allPlatforms.map((p) => ({ label: p, value: p })), value: ruleFilters.platform },
            ]}
            onFilterChange={(key, value) => { setRuleFilters((p) => ({ ...p, [key]: value })); setRulePage(1); }}
          />
        </div>

        {rulesLoading ? (
          <TableSkeleton rows={5} cols={6} />
        ) : rulesError ? (
          <div className="p-12 text-center">
            <AlertTriangle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">Couldn&apos;t load price rules.</p>
            <button onClick={() => mutateRules()} className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-all">
              Retry
            </button>
          </div>
        ) : paginatedRules.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {rules.length === 0 ? "No price rules yet. Add your first rule to start monitoring." : "No rules match your filters."}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3 text-left">
                      <input type="checkbox" checked={selectedIds.size === paginatedRules.length && paginatedRules.length > 0} onChange={toggleSelectAll} className="rounded border-border" />
                    </th>
                    {[
                      { field: "productTitle" as SortField, label: "Product" },
                      { field: "myPrice" as SortField, label: "Price" },
                      { field: "cost" as SortField, label: "Cost" },
                      { field: "margin" as SortField, label: "Margin" },
                    ].map(({ field, label }) => (
                      <th key={field} className="p-3 text-left">
                        <button onClick={() => toggleSort(field)} className="flex items-center gap-1 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all">
                          {label} <SortIcon field={field} />
                        </button>
                      </th>
                    ))}
                    <th className="p-3 text-left text-[10px] font-semibold text-muted-foreground">Status</th>
                    <th className="p-3 text-right text-[10px] font-semibold text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedRules.map((rule) => {
                    const margin = getMargin(rule.myPrice, rule.cost);
                    const isSelected = selectedIds.has(rule.id);
                    return (
                      <tr key={rule.id} className={`border-b border-border/50 hover:bg-surface-hover transition-all ${isSelected ? "bg-accent/5" : ""}`}>
                        <td className="p-3">
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelectRule(rule.id)} className="rounded border-border" />
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-foreground truncate max-w-[200px]">{rule.productTitle}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${STRAT_COLORS[rule.strategy] || "bg-gray-400/10 text-gray-400"}`}>{rule.strategy.replace(/_/g, " ")}</span>
                                {rule.platforms.map((p) => (
                                  <span key={p} className="px-1 py-0.5 rounded bg-surface text-[8px] text-muted-foreground">{p}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-3 text-xs font-semibold text-foreground">${rule.myPrice.toFixed(2)}</td>
                        <td className="p-3 text-xs text-muted-foreground">${rule.cost.toFixed(2)}</td>
                        <td className="p-3">
                          <span className={`text-xs font-semibold ${margin >= 30 ? "text-emerald-400" : margin >= 15 ? "text-amber-400" : "text-red-400"}`}>
                            {margin}%
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${STATUS_COLORS[rule.status] || "bg-gray-400/10 text-gray-400"}`}>{rule.status}</span>
                        </td>
                        <td className="p-3">
                          <div data-tour="rule-actions" className="flex items-center justify-end gap-1">
                            <Tooltip content="Edit this rule's settings" position="top">
                              <button onClick={() => openEditForm(rule)} aria-label={`Edit price rule for ${rule.productTitle}`} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                                <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </Tooltip>
                            <Tooltip content={rule.status === "active" ? "Pause monitoring for this rule" : "Resume monitoring for this rule"} position="top">
                              <button onClick={() => handleToggle(rule)} aria-label={`${rule.status === "active" ? "Pause" : "Resume"} monitoring for ${rule.productTitle}`} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                                {rule.status === "active" ? <Pause className="h-3.5 w-3.5 text-amber-400" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
                              </button>
                            </Tooltip>
                            <Tooltip content="Permanently delete this rule" position="top">
                              <button onClick={() => handleDelete(rule.id)} aria-label={`Delete price rule for ${rule.productTitle}`} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                              </button>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {ruleTotalPages > 1 && (
              <div className="p-3 border-t border-border flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Showing {(rulePage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(rulePage * ITEMS_PER_PAGE, filteredRules.length)} of {filteredRules.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setRulePage((p) => Math.max(1, p - 1))} disabled={rulePage === 1} className="p-1 rounded-lg hover:bg-surface-hover disabled:opacity-30 transition-all">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {Array.from({ length: Math.min(ruleTotalPages, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(rulePage - 2, ruleTotalPages - 4));
                    const page = start + i;
                    if (page > ruleTotalPages) return null;
                    return (
                      <button key={page} onClick={() => setRulePage(page)} className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${rulePage === page ? "bg-accent text-white" : "hover:bg-surface-hover text-muted-foreground"}`}>
                        {page}
                      </button>
                    );
                  })}
                  <button onClick={() => setRulePage((p) => Math.min(ruleTotalPages, p + 1))} disabled={rulePage === ruleTotalPages} className="p-1 rounded-lg hover:bg-surface-hover disabled:opacity-30 transition-all">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div data-tour="adjustments-log" className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold text-foreground">Recent Adjustments ({filteredLogs.length})</h3>
            <Tooltip content="Download all adjustments as a CSV file" position="left">
              <button onClick={exportCsv} className="px-2.5 py-1 rounded-lg bg-surface border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1">
                <Download className="h-3 w-3" /> Export CSV
              </button>
            </Tooltip>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={logFilter.ruleId} onChange={(e) => { setLogFilter((p) => ({ ...p, ruleId: e.target.value })); setLogPage(1); }}
              className="appearance-none pl-2 pr-6 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none cursor-pointer">
              <option value="">All Rules</option>
              {rules.map((r) => <option key={r.id} value={r.id}>{r.productTitle}</option>)}
            </select>
            <input type="date" value={logFilter.dateFrom} onChange={(e) => { setLogFilter((p) => ({ ...p, dateFrom: e.target.value })); setLogPage(1); }}
              className="px-2 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none" />
            <span className="text-[10px] text-muted-foreground">to</span>
            <input type="date" value={logFilter.dateTo} onChange={(e) => { setLogFilter((p) => ({ ...p, dateTo: e.target.value })); setLogPage(1); }}
              className="px-2 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none" />
            {(logFilter.ruleId || logFilter.dateFrom || logFilter.dateTo) && (
              <button onClick={() => { setLogFilter({ ruleId: "", dateFrom: "", dateTo: "" }); setLogPage(1); }}
                className="px-2 py-1 rounded-lg text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                <X className="h-2.5 w-2.5" /> Clear
              </button>
            )}
          </div>
        </div>
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{logs.length === 0 ? "No adjustments yet. Run a price check to see results." : "No adjustments match your filters."}</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
              {paginatedLogs.map((log) => {
                const change = log.newPrice - log.previousPrice;
                const changePercent = log.previousPrice > 0 ? ((change / log.previousPrice) * 100).toFixed(1) : "0";
                return (
                  <div key={log.id} className="p-3 flex items-center justify-between text-[10px] hover:bg-surface-hover transition-all">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-foreground font-medium truncate">{log.productTitle}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${STRAT_COLORS[log.strategy] || "bg-gray-400/10 text-gray-400"}`}>{log.strategy.replace(/_/g, " ")}</span>
                      </div>
                      <p className="text-muted-foreground mt-0.5 truncate">{log.reason?.slice(0, 80)}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-3">
                      <div className="text-right">
                        <span className="text-muted-foreground block">${log.previousPrice.toFixed(2)}</span>
                        <span className={`block ${change > 0 ? "text-red-400" : change < 0 ? "text-emerald-400" : "text-muted-foreground"}`}>
                          {change > 0 ? "+" : ""}{changePercent}%
                        </span>
                      </div>
                      <span className={change > 0 ? "text-red-400" : change < 0 ? "text-emerald-400" : "text-muted-foreground"}>
                        {change > 0 ? <TrendingUp className="h-3 w-3" /> : change < 0 ? <TrendingDown className="h-3 w-3" /> : <span className="h-3 w-3 inline-block" />}
                      </span>
                      <div className="text-right">
                        <span className={`font-semibold block ${change > 0 ? "text-red-400" : change < 0 ? "text-emerald-400" : "text-foreground"}`}>${log.newPrice.toFixed(2)}</span>
                        <span className="text-muted-foreground block">{formatDate(log.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {logTotalPages > 1 && (
              <div className="p-3 border-t border-border flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">
                  Showing {(logPage - 1) * ITEMS_PER_PAGE + 1}-{Math.min(logPage * ITEMS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setLogPage((p) => Math.max(1, p - 1))} disabled={logPage === 1} className="p-1 rounded-lg hover:bg-surface-hover disabled:opacity-30 transition-all">
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  {Array.from({ length: Math.min(logTotalPages, 5) }, (_, i) => {
                    const start = Math.max(1, Math.min(logPage - 2, logTotalPages - 4));
                    const page = start + i;
                    if (page > logTotalPages) return null;
                    return (
                      <button key={page} onClick={() => setLogPage(page)} className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${logPage === page ? "bg-accent text-white" : "hover:bg-surface-hover text-muted-foreground"}`}>
                        {page}
                      </button>
                    );
                  })}
                  <button onClick={() => setLogPage((p) => Math.min(logTotalPages, p + 1))} disabled={logPage === logTotalPages} className="p-1 rounded-lg hover:bg-surface-hover disabled:opacity-30 transition-all">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete.open}
        title={confirmDelete.ids.length > 1 ? `Delete ${confirmDelete.ids.length} rules?` : "Delete this rule?"}
        description={confirmDelete.ids.length > 1 ? "This will permanently delete all selected rules. This action cannot be undone." : "This will permanently delete this price rule. This action cannot be undone."}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ open: false, ids: [] })}
      />
      <ConfirmDialog
        open={executeConfirm}
        title="Execute live price check?"
        description="This fetches current competitor prices and may apply automated price adjustments to live listings. Use Dry Run first to preview changes safely."
        confirmLabel="Execute"
        danger
        onConfirm={() => void runExecute("apply")}
        onCancel={() => setExecuteConfirm(false)}
      />
    </div>
  );
}
