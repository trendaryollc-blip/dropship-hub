"use client";

import { useState, useEffect } from "react";
import {
  HeartPulse, Loader2, CheckCircle2, XCircle, AlertTriangle,
  Globe, Activity, RefreshCw, Clock,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";

interface PlatformHealth {
  id: string;
  name: string;
  method: string;
  enabled: boolean;
  lastHealth: "healthy" | "error" | "untested";
  lastError: string | null;
  lastSearched: { seconds: number; nanoseconds: number } | null;
  cooldownUntil: { seconds: number; nanoseconds: number } | null;
  keysCount: number;
}

export default function AdminHealthPage() {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState<PlatformHealth[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHealth = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const data = await safeFetch<{ platforms?: PlatformHealth[] }>("/api/platforms/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.platforms) setPlatforms(data.platforms);
    } catch (err) {
      console.warn("[AdminHealth] Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchHealth(); }, [user]);

  const healthyCount = platforms.filter((p) => p.lastHealth === "healthy").length;
  const errorCount = platforms.filter((p) => p.lastHealth === "error").length;
  const untestedCount = platforms.filter((p) => p.lastHealth === "untested").length;
  const enabledCount = platforms.filter((p) => p.enabled).length;
  const cooldownCount = platforms.filter((p) => p.cooldownUntil).length;

  const overallStatus = errorCount === 0 ? "healthy" : errorCount <= 2 ? "degraded" : "critical";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Checking health...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            System Health
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor platform connections and system status.
          </p>
        </div>
        <button onClick={fetchHealth}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground hover:border-white/10 transition-all">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Overall Status Banner */}
      <div className={`glass rounded-2xl p-6 border ${
        overallStatus === "healthy" ? "border-emerald-400/20"
        : overallStatus === "degraded" ? "border-amber-400/20" : "border-red-400/20"
      }`}>
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${
            overallStatus === "healthy" ? "bg-emerald-400/10 border border-emerald-400/20"
            : overallStatus === "degraded" ? "bg-amber-400/10 border border-amber-400/20"
            : "bg-red-400/10 border border-red-400/20"
          }`}>
            {overallStatus === "healthy" ? <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            : overallStatus === "degraded" ? <AlertTriangle className="h-8 w-8 text-amber-400" />
            : <XCircle className="h-8 w-8 text-red-400" />}
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              System {overallStatus === "healthy" ? "Operational" : overallStatus === "degraded" ? "Degraded" : "Critical"}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {healthyCount} healthy, {errorCount} with errors, {untestedCount} untested
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={CheckCircle2} label="Healthy" value={healthyCount} color="text-emerald-400" bg="bg-emerald-400/10" border="border-emerald-400/20" />
        <StatCard icon={XCircle} label="Errors" value={errorCount} color="text-red-400" bg="bg-red-400/10" border="border-red-400/20" />
        <StatCard icon={Activity} label="Enabled" value={enabledCount} color="text-blue-400" bg="bg-blue-400/10" border="border-blue-400/20" />
        <StatCard icon={Clock} label="Cooldowns" value={cooldownCount} color="text-amber-400" bg="bg-amber-400/10" border="border-amber-400/20" />
      </div>

      {/* Platform Health List */}
      <div className="glass rounded-2xl border border-border overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="font-display text-sm font-semibold text-foreground">Platform Status</h3>
        </div>
        <div className="divide-y divide-border">
          {platforms.map((p) => (
            <div key={p.id} className="px-6 py-4 hover:bg-surface-hover/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    p.lastHealth === "healthy" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                    : p.lastHealth === "error" ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]"
                    : "bg-muted-foreground/40"
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-foreground">{p.name}</h4>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface border border-border text-muted-foreground uppercase">
                        {p.method}
                      </span>
                      {!p.enabled && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-muted-foreground/10 text-muted-foreground border border-border">
                          DISABLED
                        </span>
                      )}
                    </div>
                    {p.lastError && (
                      <p className="text-xs text-red-400 mt-1 flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />{p.lastError}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">{p.keysCount} key{p.keysCount !== 1 ? "s" : ""}</p>
                    {p.lastSearched && (
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                        {new Date(p.lastSearched.seconds * 1000).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {p.cooldownUntil && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20">
                      <Clock className="h-3 w-3 text-amber-400" />
                      <span className="text-[10px] text-amber-400 font-medium">Cooldown</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {platforms.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Globe className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No platforms configured</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color, bg, border }: {
  icon: typeof CheckCircle2;
  label: string;
  value: number;
  color: string;
  bg: string;
  border: string;
}) {
  return (
    <div className="glass rounded-2xl p-5 border border-border">
      <div className="flex items-center gap-2 mb-3">
        <div className={`p-1.5 rounded-lg ${bg} border ${border}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}
