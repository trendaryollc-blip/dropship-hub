"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2,
} from "lucide-react";
import type { ConnectedStore } from "./ConnectedStoresList";
import { safeFetch } from "@/lib/safe-fetch";

interface StoreHealthPanelProps {
  connections: ConnectedStore[];
}

interface HealthStatus {
  storeId: string;
  storeName: string;
  platform: string;
  status: "healthy" | "degraded" | "error" | "credentials_expired" | "unknown";
  message: string;
  responseTimeMs?: number;
  lastChecked: string;
}

export default function StoreHealthPanel({ connections }: StoreHealthPanelProps) {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Latest-value refs so the check can read current data without depending
  // on object identities. The effect below is keyed on stable primitives
  // (user id + store-id set) — re-rendering with a new user/connection
  // object (Firebase re-emits, parent inline arrays) must not retrigger
  // the network check, otherwise the component refetches forever.
  const userRef = useRef(user);
  const connectionsRef = useRef(connections);
  useEffect(() => {
    userRef.current = user;
    connectionsRef.current = connections;
  }, [user, connections]);

  const runHealthCheck = useCallback(async () => {
    const currentUser = userRef.current;
    const currentConnections = connectionsRef.current;
    if (!currentUser?.uid || currentConnections.length === 0) {
      setLoading(false);
      return;
    }
    try {
      const token = await currentUser.getIdToken();
      const result = await safeFetch<{ health: HealthStatus[] }>("/api/store/health", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setHealth(result.health || []);
    } catch {
      const fallback: HealthStatus[] = currentConnections.map((conn) => ({
        storeId: conn.id,
        storeName: conn.name,
        platform: conn.platform,
        status: conn.status === "error" ? "error" : "unknown",
        message: "Health check unavailable",
        lastChecked: new Date().toISOString(),
      }));
      setHealth(fallback);
    } finally {
      setLoading(false);
    }
  }, []);

  // Only re-run when the signed-in user or the set of stores actually changes.
  const storeKey = connections.map((c) => c.id).join("|");
  useEffect(() => {
    runHealthCheck();
  }, [runHealthCheck, user?.uid, storeKey]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await runHealthCheck();
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
  const warningCount = health.filter((h) => h.status === "degraded").length;
  const errorCount = health.filter((h) => h.status === "error" || h.status === "credentials_expired").length;

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
                : h.status === "degraded"
                ? "bg-amber-500/5 border-amber-400/20"
                : "bg-red-500/5 border-red-400/20"
            }`}
          >
            {h.status === "healthy" ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            ) : h.status === "degraded" ? (
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 text-red-400 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{h.storeName}</p>
              <p className="text-[10px] text-muted-foreground truncate">{h.message}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {h.responseTimeMs !== undefined && (
                <span className="text-[9px] text-muted-foreground">{h.responseTimeMs}ms</span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                h.status === "healthy"
                  ? "bg-emerald-400/10 text-emerald-400"
                  : h.status === "degraded"
                  ? "bg-amber-400/10 text-amber-400"
                  : "bg-red-400/10 text-red-400"
              }`}>
                {h.status === "credentials_expired" ? "expired" : h.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
