"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users, Globe, Key, TrendingUp, DollarSign, Activity,
  Shield, BarChart3, ArrowRight,
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
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      try {
        const token = await user.getIdToken();
        const data = await safeFetch<AdminStats>("/api/admin/stats", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data) setStats(data);
      } catch (err) {
        console.warn("[Admin] Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [user]);

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
    { label: "Active Subscriptions", value: stats?.activeSubscriptions ?? 0, icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    { label: "Platforms", value: stats?.totalPlatforms ?? 0, icon: Globe, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
    { label: "Healthy Platforms", value: stats?.healthyPlatforms ?? 0, icon: Activity, color: "text-cyan-400", bg: "bg-cyan-400/10", border: "border-cyan-400/20" },
    { label: "API Keys", value: stats?.totalApiKeys ?? 0, icon: Key, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
    { label: "Monthly Revenue", value: `$${stats?.monthlyRevenue ?? 0}`, icon: TrendingUp, color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
  ];

  const quickActions = [
    { label: "Platforms", href: "/admin/platforms", icon: Globe, color: "text-purple-400", description: "Manage data sources" },
    { label: "API Keys", href: "/admin/api-keys", icon: Key, color: "text-amber-400", description: "View all keys" },
    { label: "Users", href: "/admin/users", icon: Users, color: "text-blue-400", description: "Manage accounts" },
    { label: "Analytics", href: "/admin/analytics", icon: BarChart3, color: "text-pink-400", description: "View metrics" },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            Admin Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Platform overview and key metrics at a glance.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-red-400 bg-red-400/10 px-3 py-1.5 rounded-lg border border-red-400/20">
          <Shield className="h-3.5 w-3.5" />
          Owner Access
        </div>
      </div>

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
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-border">
          {quickActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex flex-col items-center gap-3 px-4 py-6 hover:bg-surface-hover transition-all group"
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
            status="healthy"
          />
          <StatusRow
            label="API Keys Active"
            value={`${stats?.totalApiKeys ?? 0} keys configured`}
            status="active"
          />
          <StatusRow
            label="Subscriptions"
            value={`${stats?.activeSubscriptions ?? 0} active paid plans`}
            status="active"
          />
        </div>
      </div>
    </div>
  );
}

function StatusRow({ label, value, status }: { label: string; value: string; status: "healthy" | "warning" | "error" | "active" }) {
  const colors = {
    healthy: "bg-emerald-400",
    active: "bg-blue-400",
    warning: "bg-amber-400",
    error: "bg-red-400",
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border">
      <div className="flex items-center gap-3">
        <div className={`w-2 h-2 rounded-full ${colors[status]} shadow-[0_0_6px_rgba(255,255,255,0.15)]`} />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className="text-xs text-muted-foreground">{value}</span>
    </div>
  );
}
