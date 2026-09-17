"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import {
  Brain, TrendingUp, AlertTriangle, Package, Truck,
  DollarSign, ShoppingCart, RefreshCw, Send, Mail, Clock, Zap,
  BarChart3, ArrowRight, Download, Share2, Printer,
  Settings, Bell, TrendingDown, Minus,
  Trash2, ExternalLink, Target, Megaphone,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useToast } from "@/components/ui/Toast";
import { useDigest } from "@/hooks/useDigest";
import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import { KPICardSkeleton, ChartSkeleton } from "@/components/ui/Skeleton";
import EmptyState from "@/components/ui/EmptyState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import DashboardAreaChart from "@/components/ui/charts/DashboardAreaChart";
import type { DigestData, DigestAlert, WeeklyTrend, TopProduct, TopCampaign } from "@/types/digest";

// ─── Sub-components ──────────────────────────────────────────────

function DateSelector({ history, selectedDate, onSelect }: {
  history: DigestData[];
  selectedDate: string | null;
  onSelect: (date: string | null) => void;
}) {
  const recentDates = history.slice(0, 7);
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <button
        onClick={() => onSelect(null)}
        className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          selectedDate === null
            ? "bg-accent text-white shadow-lg shadow-accent/20"
            : "text-muted-foreground hover:text-foreground hover:bg-surface"
        }`}
      >
        Latest
      </button>
      {recentDates.map((d) => (
        <button
          key={d.date}
          onClick={() => onSelect(d.date)}
          className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            selectedDate === d.date
              ? "bg-accent text-white shadow-lg shadow-accent/20"
              : "text-muted-foreground hover:text-foreground hover:bg-surface"
          }`}
        >
          {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </button>
      ))}
    </div>
  );
}

function KPIMetricCard({ label, value, prevValue, prefix, suffix, icon: Icon, color, delay }: {
  label: string; value: number; prevValue?: number; prefix?: string; suffix?: string;
  icon: typeof DollarSign; color: string; delay: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const count = useAnimatedCounter(value, 1500, isInView);

  const delta = prevValue !== undefined && prevValue > 0
    ? ((value - prevValue) / prevValue) * 100
    : undefined;
  const isUp = delta !== undefined && delta > 0;
  const isDown = delta !== undefined && delta < 0;

  return (
    <div
      ref={ref}
      className={`glass rounded-2xl p-4 sm:p-5 transition-all duration-500 hover:border-accent/20 group ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`p-1.5 rounded-lg bg-surface group-hover:scale-110 transition-transform`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-display text-2xl font-bold text-foreground">
            {prefix || ""}{count.toLocaleString()}{suffix || ""}
          </p>
          {delta !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {isUp && <TrendingUp className="h-3 w-3 text-emerald-400" />}
              {isDown && <TrendingDown className="h-3 w-3 text-red-400" />}
              {!isUp && !isDown && <Minus className="h-3 w-3 text-amber-400" />}
              <span className={`text-[11px] font-medium ${
                isUp ? "text-emerald-400" : isDown ? "text-red-400" : "text-amber-400"
              }`}>
                {isUp ? "+" : ""}{delta.toFixed(1)}% vs yesterday
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendCard({ trend, delay }: { trend: WeeklyTrend; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const colors = { up: "text-emerald-400", down: "text-red-400", stable: "text-amber-400" };
  const bgColors = { up: "bg-emerald-400/10 border-emerald-400/20", down: "bg-red-400/10 border-red-400/20", stable: "bg-amber-400/10 border-amber-400/20" };
  const arrows = { up: "\u2191", down: "\u2193", stable: "\u2192" };

  return (
    <div ref={ref} className={`glass rounded-2xl p-4 sm:p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-accent" />
        <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Weekly Trend</h3>
      </div>
      <div className={`p-4 rounded-xl border ${bgColors[trend.direction]}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-3xl font-bold ${colors[trend.direction]}`}>{arrows[trend.direction]}</span>
          <div>
            <span className={`text-xl font-bold ${colors[trend.direction]}`}>{trend.direction === "up" ? "+" : ""}{trend.percentage}%</span>
            <span className="text-xs text-muted-foreground ml-2">vs last week</span>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{trend.insight}</p>
      </div>
    </div>
  );
}

function AlertCard({ alert, delay }: { alert: DigestAlert; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const sevColors = {
    low: { bg: "bg-blue-400/10", border: "border-blue-400/20", icon: "text-blue-400", badge: "text-blue-400 bg-blue-400/10" },
    medium: { bg: "bg-amber-400/10", border: "border-amber-400/20", icon: "text-amber-400", badge: "text-amber-400 bg-amber-400/10" },
    high: { bg: "bg-red-400/10", border: "border-red-400/20", icon: "text-red-400", badge: "text-red-400 bg-red-400/10" },
  };
  const c = sevColors[alert.severity];
  const typeIcons = { stock: Package, supplier: Truck, adSpend: DollarSign, trend: TrendingUp };
  const TypeIcon = typeIcons[alert.type] || AlertTriangle;
  const typeLabels = { stock: "Low Stock", supplier: "Supplier Delay", adSpend: "Ad Spend", trend: "Market Trend" };

  const actionMap: Record<string, { label: string; href: string }> = {
    stock: { label: "Find Alternative", href: "/products" },
    supplier: { label: "View Suppliers", href: "/suppliers" },
    adSpend: { label: "View Ad ROI", href: "/ad-roi" },
    trend: { label: "View Trends", href: "/trend-predictor" },
  };
  const action = actionMap[alert.type];

  return (
    <div ref={ref} className={`p-3 sm:p-4 rounded-xl ${c.bg} border ${c.border} transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg ${c.bg} shrink-0`}>
          <TypeIcon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${c.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">{alert.title}</h4>
            <span className={`px-1.5 py-0.5 rounded text-[8px] sm:text-[9px] font-semibold ${c.badge}`}>{alert.severity}</span>
          </div>
          <p className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">{typeLabels[alert.type]}</p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed">{alert.description}</p>
          {action && (
            <a
              href={action.href}
              className="inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-lg bg-surface border border-border text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all"
            >
              {action.label} <ExternalLink className="h-2.5 w-2.5" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function RecommendationCard({ text, delay }: { text: string; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  return (
    <div ref={ref} className={`flex items-start gap-2.5 sm:gap-3 p-3 rounded-xl bg-surface border border-border hover:border-accent/20 transition-all duration-500 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent/10 shrink-0">
        <Zap className="h-3 w-3 text-accent" />
      </div>
      <p className="text-xs sm:text-sm text-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function TopProductsCard({ products, delay }: { products: TopProduct[]; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  if (products.length === 0) return null;
  return (
    <div ref={ref} className={`glass rounded-2xl p-4 sm:p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-accent" />
        <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Top Products</h3>
      </div>
      <div className="space-y-2">
        {products.map((p, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface/50 hover:bg-surface transition-colors">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 shrink-0 text-xs font-bold text-accent">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-foreground truncate">{p.name}</p>
              <p className="text-[10px] text-muted-foreground">{p.units} units sold</p>
            </div>
            <span className="text-xs sm:text-sm font-semibold text-emerald-400">${p.revenue.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopCampaignsCard({ campaigns, delay }: { campaigns: TopCampaign[]; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  if (campaigns.length === 0) return null;
  return (
    <div ref={ref} className={`glass rounded-2xl p-4 sm:p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center gap-2 mb-3">
        <Megaphone className="h-4 w-4 text-accent" />
        <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Top Campaigns</h3>
      </div>
      <div className="space-y-2">
        {campaigns.map((c, i) => {
          const roasColor = c.roas >= 2 ? "text-emerald-400" : c.roas >= 1 ? "text-amber-400" : "text-red-400";
          return (
            <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-surface/50 hover:bg-surface transition-colors">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 shrink-0 text-xs font-bold text-accent">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-foreground truncate">{c.name}</p>
                <p className="text-[10px] text-muted-foreground">${c.spend.toLocaleString()} spent</p>
              </div>
              <span className={`text-xs sm:text-sm font-bold ${roasColor}`}>{c.roas}x ROAS</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PreferencesPanel({ preferences, onUpdate, onClose }: {
  preferences: { autoGenerate: boolean; emailEnabled: boolean; pushEnabled: boolean; preferredTime: string; emailAddress: string };
  onUpdate: (prefs: Record<string, unknown>) => Promise<boolean>;
  onClose: () => void;
}) {
  const { success, error: toastError } = useToast();
  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const ok = await onUpdate(localPrefs);
    setSaving(false);
    if (ok) {
      success("Preferences saved");
      onClose();
    } else {
      toastError("Failed to save preferences");
    }
  };

  return (
    <div className="glass rounded-2xl p-4 sm:p-5 border border-accent/20">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-accent" />
          <h3 className="font-display text-sm font-semibold text-foreground">Digest Preferences</h3>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xs">Close</button>
      </div>
      <div className="space-y-3">
        <label className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border cursor-pointer">
          <div className="flex items-center gap-2">
            <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs sm:text-sm text-foreground">Auto-generate daily</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={localPrefs.autoGenerate}
            onClick={() => setLocalPrefs({ ...localPrefs, autoGenerate: !localPrefs.autoGenerate })}
            className={`relative w-9 h-5 rounded-full transition-colors ${localPrefs.autoGenerate ? "bg-accent" : "bg-surface"}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${localPrefs.autoGenerate ? "translate-x-4" : ""}`} />
          </button>
        </label>
        <label className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border cursor-pointer">
          <div className="flex items-center gap-2">
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs sm:text-sm text-foreground">Email notifications</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={localPrefs.emailEnabled}
            onClick={() => setLocalPrefs({ ...localPrefs, emailEnabled: !localPrefs.emailEnabled })}
            className={`relative w-9 h-5 rounded-full transition-colors ${localPrefs.emailEnabled ? "bg-accent" : "bg-surface"}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${localPrefs.emailEnabled ? "translate-x-4" : ""}`} />
          </button>
        </label>
        <label className="flex items-center justify-between p-3 rounded-xl bg-surface border border-border cursor-pointer">
          <div className="flex items-center gap-2">
            <Bell className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs sm:text-sm text-foreground">Push notifications</span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={localPrefs.pushEnabled}
            onClick={() => setLocalPrefs({ ...localPrefs, pushEnabled: !localPrefs.pushEnabled })}
            className={`relative w-9 h-5 rounded-full transition-colors ${localPrefs.pushEnabled ? "bg-accent" : "bg-surface"}`}
          >
            <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${localPrefs.pushEnabled ? "translate-x-4" : ""}`} />
          </button>
        </label>
        {localPrefs.emailEnabled && (
          <div className="p-3 rounded-xl bg-surface border border-border">
            <label className="text-[10px] text-muted-foreground mb-1 block">Email address</label>
            <input
              type="email"
              value={localPrefs.emailAddress}
              onChange={(e) => setLocalPrefs({ ...localPrefs, emailAddress: e.target.value })}
              placeholder="your@email.com"
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40"
            />
          </div>
        )}
        {localPrefs.autoGenerate && (
          <div className="p-3 rounded-xl bg-surface border border-border">
            <label className="text-[10px] text-muted-foreground mb-1 block">Preferred time</label>
            <select
              value={localPrefs.preferredTime}
              onChange={(e) => setLocalPrefs({ ...localPrefs, preferredTime: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-background border border-border text-xs text-foreground focus:outline-none focus:border-accent/40"
            >
              <option value="06:00">6:00 AM</option>
              <option value="09:00">9:00 AM</option>
              <option value="12:00">12:00 PM</option>
              <option value="18:00">6:00 PM</option>
            </select>
          </div>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all"
        >
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────

export default function DigestPage() {
  const {
    currentDigest: digest,
    history,
    historyChart,
    generating,
    isLoading,
    preferences,
    selectedDate,
    setSelectedDate,
    generateDigest,
    deleteDigest,
    updatePreferences,
  } = useDigest();

  const { success, error: toastError, info } = useToast();
  const [email, setEmail] = useState("");
  const [showPreferences, setShowPreferences] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Prefill email from preferences (only on initial load)
  useEffect(() => {
    if (preferences?.emailAddress) {
      setEmail((prev) => prev || preferences.emailAddress);
    }
  }, [preferences?.emailAddress]);

  const handleGenerate = useCallback(async () => {
    const result = await generateDigest({
      date: selectedDate || undefined,
      email: email || undefined,
      notify: !!email,
    });
    if (result) {
      success("Digest generated successfully");
    } else {
      toastError("Failed to generate digest. Please try again.");
    }
  }, [generateDigest, selectedDate, email, success, toastError]);

  const handleGenerateWithEmail = useCallback(async () => {
    if (!email) return;
    const result = await generateDigest({ email, notify: true });
    if (result) {
      success("Digest generated and sent to your email");
    } else {
      toastError("Failed to generate digest");
    }
  }, [generateDigest, email, success, toastError]);

  const handleExportCSV = useCallback(() => {
    if (!digest) return;
    const rows = [
      ["Date", "Orders", "Revenue", "Profit", "Stock Alerts", "Supplier Delays"],
      [digest.date, digest.metrics.orders, digest.metrics.revenue, digest.metrics.profit, digest.metrics.stockAlerts, digest.metrics.supplierDelays],
      [],
      ["Alerts"],
      ["Type", "Title", "Severity", "Description"],
      ...digest.alerts.map((a) => [a.type, a.title, a.severity, a.description]),
      [],
      ["Recommendations"],
      ...digest.recommendations.map((r) => [r]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `digest-${digest.date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    success("CSV downloaded");
  }, [digest, success]);

  const handleShare = useCallback(async () => {
    if (!digest) return;
    const url = `${window.location.origin}/digest?date=${digest.date}`;
    try {
      await navigator.clipboard.writeText(url);
      success("Link copied to clipboard");
    } catch {
      info(`Share link: ${url}`);
    }
  }, [digest, success, info]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    const ok = await deleteDigest(deleteTarget);
    if (ok) {
      success("Digest deleted");
      setSelectedDate(null);
    } else {
      toastError("Failed to delete digest");
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteDigest, success, toastError, setSelectedDate]);

  const chartData = useMemo(() => {
    return historyChart.map((d) => ({ date: d.date, value: d.revenue }));
  }, [historyChart]);

  return (
    <PageErrorBoundary>
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24 print:pb-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
          <div>
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1">Daily Intelligence Digest</h1>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">AI-generated daily summary of your business performance, alerts, and actionable recommendations.</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => setShowPreferences(!showPreferences)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Preferences</span>
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-accent text-white text-xs sm:text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-all"
            >
              {generating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
              {generating ? "Generating..." : "Generate Digest"}
            </button>
          </div>
        </div>

        {/* Preferences Panel */}
        {showPreferences && preferences && (
          <PreferencesPanel
            key={`${preferences.autoGenerate}-${preferences.emailEnabled}-${preferences.pushEnabled}`}
            preferences={preferences}
            onUpdate={updatePreferences}
            onClose={() => setShowPreferences(false)}
          />
        )}

        {/* Date Selector */}
        {history.length > 0 && (
          <div className="print:hidden">
            <DateSelector history={history} selectedDate={selectedDate} onSelect={setSelectedDate} />
          </div>
        )}

        {/* Email Digest + Export Row */}
        <div className="flex flex-col sm:flex-row gap-3 print:hidden">
          <div className="glass rounded-2xl p-4 sm:p-5 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Mail className="h-4 w-4 text-accent shrink-0" />
                <p className="text-xs sm:text-sm text-foreground font-medium">Get digest via email</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="px-3 py-2 rounded-xl bg-surface border border-border text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40 w-48 sm:w-56"
                />
                <button
                  onClick={handleGenerateWithEmail}
                  disabled={generating || !email}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs sm:text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover disabled:opacity-50 transition-all"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </button>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleExportCSV} disabled={!digest} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-50 transition-all">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button onClick={handleShare} disabled={!digest} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-50 transition-all">
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
            <button onClick={handlePrint} disabled={!digest} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-surface disabled:opacity-50 transition-all">
              <Printer className="h-3.5 w-3.5" /> Print
            </button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <ChartSkeleton height={200} />
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => <KPICardSkeleton key={i} />)}
            </div>
          </div>
        )}

        {/* Generating State - only show full spinner when no digest exists */}
        {generating && !digest && !isLoading && (
          <div className="glass rounded-2xl p-8 sm:p-16 text-center">
            <RefreshCw className="h-12 w-12 text-accent mx-auto mb-4 animate-spin" />
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">Generating your digest...</h3>
            <p className="text-sm text-muted-foreground">Analyzing your business data and generating insights.</p>
          </div>
        )}

        {/* Digest Content */}
        {digest && !isLoading && (
          <div className="relative">
            {/* Regenerating overlay */}
            {generating && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 rounded-2xl backdrop-blur-sm">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass border border-border">
                  <RefreshCw className="h-4 w-4 text-accent animate-spin" />
                  <span className="text-xs font-medium text-foreground">Regenerating...</span>
                </div>
              </div>
            )}
            {/* Date Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-xs sm:text-sm">{new Date(digest.date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</span>
              </div>
              <button
                onClick={() => setDeleteTarget(digest.date)}
                className="text-muted-foreground hover:text-red-400 transition-colors p-1.5 rounded-lg hover:bg-red-400/10 print:hidden"
                title="Delete digest"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Revenue Trend Chart */}
            {chartData.length > 1 && (
              <div className="glass rounded-2xl p-4 sm:p-5 print:hidden">
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="h-4 w-4 text-accent" />
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">7-Day Revenue Trend</h3>
                </div>
                <DashboardAreaChart
                  data={chartData}
                  height={200}
                  valuePrefix="$"
                  gradientId="digestRevenueGrad"
                />
              </div>
            )}

            {/* AI Summary */}
            <div className="glass rounded-2xl p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="h-4 w-4 text-accent" />
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">AI Summary</h3>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{digest.summary}</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3">
              <KPIMetricCard label="Orders" value={digest.metrics.orders} prevValue={digest.previousMetrics?.orders} icon={ShoppingCart} color="text-blue-400" delay={0} />
              <KPIMetricCard label="Revenue" value={digest.metrics.revenue} prevValue={digest.previousMetrics?.revenue} prefix="$" icon={DollarSign} color="text-emerald-400" delay={100} />
              <KPIMetricCard label="Profit" value={digest.metrics.profit} prevValue={digest.previousMetrics?.profit} prefix="$" icon={TrendingUp} color="text-purple-400" delay={200} />
              <KPIMetricCard label="Stock Alerts" value={digest.metrics.stockAlerts} icon={Package} color="text-amber-400" delay={300} />
              <KPIMetricCard label="Supplier Delays" value={digest.metrics.supplierDelays} icon={Truck} color="text-red-400" delay={400} />
            </div>

            {/* Weekly Trend */}
            {digest.weeklyTrend && <TrendCard trend={digest.weeklyTrend} delay={0} />}

            {/* Top Products + Top Campaigns */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {digest.topProducts && digest.topProducts.length > 0 && (
                <TopProductsCard products={digest.topProducts} delay={0} />
              )}
              {digest.topCampaigns && digest.topCampaigns.length > 0 && (
                <TopCampaignsCard campaigns={digest.topCampaigns} delay={100} />
              )}
            </div>

            {/* Alerts */}
            {digest.alerts.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Proactive Alerts ({digest.alerts.length})</h3>
                </div>
                <div className="space-y-2 sm:space-y-3">
                  {digest.alerts.map((a, i) => (
                    <AlertCard key={i} alert={a} delay={i * 80} />
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="h-4 w-4 text-accent" />
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Suggested Actions ({digest.recommendations.length})</h3>
              </div>
              <div className="space-y-2">
                {digest.recommendations.map((r, i) => (
                  <RecommendationCard key={i} text={r} delay={i * 60} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!digest && !isLoading && !generating && (
          <div className="glass rounded-2xl p-8 sm:p-16 text-center">
            <EmptyState
              iconName="analytics"
              title="No digest generated yet"
              description="Generate your first AI-powered daily intelligence digest with metrics, alerts, and recommendations."
              action={{ label: "Generate First Digest", onClick: handleGenerate }}
            />
          </div>
        )}

        {/* History */}
        {history.length > 1 && (
          <div className="glass rounded-2xl p-4 sm:p-5 print:hidden">
            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground mb-3">Recent Digests</h3>
            <div className="space-y-2">
              {history.slice(1).map((d, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-2.5 rounded-xl transition-colors cursor-pointer ${
                    selectedDate === d.date ? "bg-accent/10 border border-accent/20" : "hover:bg-surface-hover"
                  }`}
                  onClick={() => setSelectedDate(d.date)}
                >
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs sm:text-sm text-foreground">{new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] sm:text-[11px] text-muted-foreground">{d.metrics.orders} orders</span>
                    <span className="text-[10px] sm:text-[11px] text-emerald-400 font-semibold">${d.metrics.revenue.toLocaleString()}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation */}
        <ConfirmDialog
          open={!!deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete Digest"
          description={`Are you sure you want to delete the digest for ${deleteTarget}? This cannot be undone.`}
          confirmLabel="Delete"
          danger
        />
      </div>
    </PageErrorBoundary>
  );
}
