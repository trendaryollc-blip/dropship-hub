"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2,
} from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import type { ConnectedStore } from "./ConnectedStoresList";

interface StoreHealthPanelProps {
  connections: ConnectedStore[];
}

interface HealthStatus {
  storeId: string;
  storeName: string;
  platform: string;
  status: "healthy" | "warning" | "error" | "unknown";
  lastChecked: string;
  issues: string[];
}

export default function StoreHealthPanel({ connections }: StoreHealthPanelProps) {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const checkHealth = useCallback(async () => {
    if (!user?.uid || connections.length === 0) { setLoading(false); return; }
    try {
      const statuses: HealthStatus[] = connections.map((conn) => {
        const issues: string[] = [];
        if (conn.status === "error") issues.push("Connection has errors");
        if (!conn.lastSyncAt) issues.push("Never synced");
        else {
          const daysSinceSync = (Date.now() - new Date(conn.lastSyncAt).getTime()) / (1000 * 60 * 60 * 24);
          if (daysSinceSync > 7) issues.push("Synced over 7 days ago");
        }
        if (conn.productCount === 0) issues.push("No products pushed");

        return {
          storeId: conn.id,
          storeName: conn.name,
          platform: conn.platform,
          status: conn.status === "error" ? "error" : issues.length > 0 ? "warning" : "healthy",
          lastChecked: new Date().toISOString(),
          issues,
        };
      });
      setHealth(statuses);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user?.uid, connections]);

  useEffect(() => { checkHealth(); }, [checkHealth]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkHealth();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-accent animate-spin" />
          <span className="text-xs text-muted-foreground">Checking store health...</span>
        </div>
      </div>
    );
  }

  const healthyCount = health.filter((h) => h.status === "healthy").length;
  const warningCount = health.filter((h) => h.status === "warning").length;
  const errorCount = health.filter((h) => h.status === "error").length;

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-accent" />
          <h3 className="text-xs font-semibold text-foreground">Store Health</h3>
          <span className="text-[10px] text-muted-foreground">
            {healthyCount} healthy{warningCount > 0 ? ` · ${warningCount} warnings` : ""}{errorCount > 0 ? ` · ${errorCount} errors` : ""}
          </span>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="space-y-2">
        {health.map((h) => (
          <div
            key={h.storeId}
            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
              h.status === "healthy"
                ? "bg-emerald-500/5 border-emerald-400/20"
                : h.status === "warning"
                ? "bg-amber-500/5 border-amber-400/20"
                : "bg-red-500/5 border-red-400/20"
            }`}
          >
            {h.status === "healthy" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : h.status === "warning" ? (
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{h.storeName}</p>
              {h.issues.length > 0 && (
                <p className="text-[10px] text-muted-foreground truncate">{h.issues.join(" · ")}</p>
              )}
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
              h.status === "healthy"
                ? "bg-emerald-400/10 text-emerald-400"
                : h.status === "warning"
                ? "bg-amber-400/10 text-amber-400"
                : "bg-red-400/10 text-red-400"
            }`}>
              {h.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
