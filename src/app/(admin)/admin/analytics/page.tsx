"use client";

import { useState, useEffect } from "react";
import {
  BarChart3, Loader2, Users, Globe, DollarSign,
  Activity, Clock,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalSearches: number;
  totalAiCalls: number;
  revenue: number;
  platformUsage: Array<{ platform: string; searches: number }>;
  recentActivity: Array<{ type: string; description: string; timestamp: string }>;
}

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchAnalytics = async () => {
      try {
        const token = await user.getIdToken();
        const result = await safeFetch<AnalyticsData>("/api/admin/analytics", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (result) setData(result);
      } catch (err) {
        console.warn("[AdminAnalytics] Failed to fetch:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const metrics = [
    { label: "Total Users", value: data?.totalUsers ?? 0, icon: Users, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
    { label: "Active (30d)", value: data?.activeUsers ?? 0, icon: Activity, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
    { label: "Total Searches", value: (data?.totalSearches ?? 0).toLocaleString(), icon: Globe, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
    { label: "Revenue", value: `$${(data?.revenue ?? 0).toLocaleString()}`, icon: DollarSign, color: "text-pink-400", bg: "bg-pink-400/10", border: "border-pink-400/20" },
  ];

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          Analytics
        </h1>
        <p className="text-sm text-muted-foreground">
          Platform usage and performance metrics.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="glass rounded-2xl p-5 border border-border">
            <div className="flex items-center gap-2 mb-4">
              <div className={`p-2 rounded-xl ${m.bg} border ${m.border}`}>
                <m.icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">{m.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Platform Usage */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display text-sm font-semibold text-foreground">Platform Usage</h3>
        </div>
        <div className="p-6">
          {data?.platformUsage && data.platformUsage.length > 0 ? (
            <div className="space-y-4">
              {data.platformUsage.map((p) => {
                const maxSearches = Math.max(...data.platformUsage.map((x) => x.searches));
                const percentage = maxSearches > 0 ? (p.searches / maxSearches) * 100 : 0;
                return (
                  <div key={p.platform} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground font-medium">{p.platform}</span>
                      <span className="text-xs text-muted-foreground">{p.searches.toLocaleString()} searches</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-warm transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Globe className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No platform usage data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display text-sm font-semibold text-foreground">Recent Activity</h3>
        </div>
        <div className="divide-y divide-border">
          {data?.recentActivity && data.recentActivity.length > 0 ? (
            data.recentActivity.map((a, i) => (
              <div key={i} className="px-6 py-4 flex items-center gap-4 hover:bg-surface-hover/50 transition-colors">
                <div className="p-2 rounded-lg bg-accent/10 border border-accent/20">
                  <Clock className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{a.description}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(a.timestamp).toLocaleString()}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
