"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, Globe, Key, TrendingUp, DollarSign, Activity,
  Shield, BarChart3, ArrowRight, RefreshCw, AlertTriangle,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalPlatforms: number;
  healthyPlatforms: number;
  totalApiKeys: number;
  monthlyRevenue: number;
  estimates?: {
    activeSubscriptions?: boolean;
    healthyPlatforms?: boolean;
    monthlyRevenue?: boolean;
  };
}

type StatusKind = "healthy" | "warning" | "error" | "active";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    // Cleanup flag: a slow fetch must not setState after unmount.
    let cancelled = false;

    const fetchStats = async () => {
      try {
        const token = await user.getIdToken();
        const data = await safeFetch<AdminStats>("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        // A 2xx response without the expected numeric fields is treated as a
        // failure instead of silently rendering zeros.
        if (data != null && typeof data.totalUsers !== "number") {
          setFetchError(true);
          setStats(null);
          return;
        }
        setStats(data);
        setFetchError(false);
        setLastUpdated(Date.now());
      } catch (err) {
        console.warn("[Admin] Failed to fetch stats:", err);
        if (!cancelled) setFetchError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    setLoading(true);
    fetchStats();
    return () => {
      cancelled = true;
    };
  }, [user, reloadKey]);

  // Derive a truthful status from the actual values instead of hardcoding
  // "healthy"/"active" so a broken state isn't rendered as a green dot.
  const platformHealthStatus: StatusKind = (() => {
    const total = stats?.totalPlatforms ?? 0;
    const healthy = stats?.healthyPlatforms ?? 0;
    if (total === 0) return "warning";
    const ratio = healthy / total;
    if (ratio >= 0.8) return "healthy";
    if (ratio >= 0.5) return "warning";
    return "error";
  })();
  const apiKeysStatus: StatusKind = (stats?.totalApiKeys ?? 0) > 0 ? "active" : "warning";
  const subscriptionsStatus: StatusKind = (stats?.activeSubscriptions ?? 0) > 0 ? "active" : "warning";
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    { label: stats?.estimates?.activeSubscriptions ? "Active Subs (est.)" : "Active Subscriptions", value: stats?.activeSubscriptions ?? 0, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    { label: "Platforms", value: stats?.totalPlatforms ?? 0, icon: Globe, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
    { label: stats?.estimates?.healthyPlatforms ? "Healthy Platforms (est.)" : "Healthy Platforms", value: stats?.healthyPlatforms ?? 0, icon: Activity, color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20" },
    { label: "API Keys", value: stats?.totalApiKeys ?? 0, icon: Key, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    { label: stats?.estimates?.monthlyRevenue ? "Monthly Revenue (est.)" : "Monthly Revenue", value: `$${stats?.monthlyRevenue ?? 0}`, icon: TrendingUp, color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
  ];

  const quickActions = [
    { label: "Platforms", href: "/admin/platforms", icon: Globe, color: "text-purple-400", description: "Manage data sources" },
    { label: "API Keys", href: "/admin/api-keys", icon: Key, color: "text-amber-400", description: "View all keys" },
    { label: "Users", href: "/admin/users", icon: Users, color: "text-blue-400", description: "Manage accounts" },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3, color: "text-pink-400", description: "View metrics" },
    { label: "Supplier Providers", href: "/admin/supplier-providers", icon: Activity, color: "text-cyan-400", description: "Configure suppliers" },
    { label: "Settings", href: "/admin/settings", icon: Shield, color: "text-emerald-400", description: "System settings" },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Platform overview and key metrics at a glance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {lastUpdated != null && !loading && (
            <span className="hidden sm:inline text-[11px] text-muted-foreground">
              Updated {new Date(lastUpdated).toLocaleTimeString()}
            </span>
          )}
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            disabled={loading}
            aria-label="Refresh dashboard stats"
            title="Refresh stats"
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
          <div className="flex items-center gap-2 text-xs font-medium text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20">
            <Shield className="h-3.5 w-3.5" />
            Owner Access
          </div>
        </div>
      </div>

      {/* Error state — the page still renders (header, quick actions, zeros),
          but a clear banner + retry replaces the old silent all-zeros behavior. */}
      {fetchError && !loading && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-400/10 border border-red-400/20 text-red-400 text-xs"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">Couldn&apos;t load platform stats — showing placeholder values.</span>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="font-semibold underline underline-offset-2 hover:text-red-300 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="glass rounded-2xl p-5 border border-border hover:border-white/10 transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-xl ${card.bg} border ${card.border}`}>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">{card.label}</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display text-sm font-semibold text-foreground">Quick Actions</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-3 px-4 py-6 rounded-xl border border-border/50 hover:bg-surface-hover transition-all group"
            >
              <div className="p-3 rounded-xl bg-surface border border-border group-hover:border-accent/20 transition-all">
                <action.icon className={`h-5 w-5 ${action.color}`} />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{action.description}</p>
              </div>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-accent transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* System Status */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display text-sm font-semibold text-foreground">System Status</h3>
        </div>
        <div className="p-6 space-y-4">
          <StatusRow
            label="Platform Health"
            value={`${stats?.healthyPlatforms ?? 0}/${stats?.totalPlatforms ?? 0} healthy`}
            status={platformHealthStatus}
          />
          <StatusRow
            label="API Keys Active"
            value={`${stats?.totalApiKeys ?? 0} keys configured`}
            status={apiKeysStatus}
          />
          <StatusRow
            label="Subscriptions"
            value={`${stats?.activeSubscriptions ?? 0} active paid plans${stats?.estimates?.activeSubscriptions ? " (estimated)" : ""}`}
            status={subscriptionsStatus}
          />
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value, status }: { label: string; value: string; status: StatusKind }) {
  const colors = {
    healthy: "bg-emerald-400",
    active: "bg-blue-400",
    warning: "bg-amber-400",
    error: "bg-red-400",
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 p-3 rounded-xl bg-surface/50 border border-border">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-2 h-2 rounded-full ${colors[status]} shadow-[0_0_6px_rgba(255,255,255,0.15)] shrink-0`} />
        <span className="text-sm text-foreground truncate">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground shrink-0">{value}</span>
    </div>
  );
}
