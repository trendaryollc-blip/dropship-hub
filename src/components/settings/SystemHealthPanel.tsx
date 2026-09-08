"use client";

import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  Store,
  Brain,
  Shield,
} from "lucide-react";
import type { AIProvider, PlatformConnector } from "./constants";

interface SystemHealthPanelProps {
  providers: AIProvider[];
  stores: Array<{ id: string; name: string; platform: string; status: string }>;
  platformConnectors: PlatformConnector[];
}

export default function SystemHealthPanel({ providers, stores, platformConnectors }: SystemHealthPanelProps) {
  const configuredProviders = providers.filter((p) => p.configured).length;
  const activeProviders = providers.filter((p) => p.active).length;
  const connectedStores = stores.filter((s) => s.status === "connected").length;
  const configuredPlatforms = platformConnectors.filter((p) => p.configured).length;

  const totalProviders = providers.length;
  const totalStores = stores.length;
  const totalPlatforms = platformConnectors.length;

  const allConfigured = configuredProviders > 0 && connectedStores > 0;
  const someConfigured = configuredProviders > 0 || connectedStores > 0;
  const healthStatus = allConfigured ? "healthy" : someConfigured ? "partial" : "unconfigured";
  const healthColor = healthStatus === "healthy" ? "text-emerald-400" : healthStatus === "partial" ? "text-amber-400" : "text-muted-foreground";
  const healthBg = healthStatus === "healthy" ? "bg-emerald-400/10 border-emerald-400/20" : healthStatus === "partial" ? "bg-amber-400/10 border-amber-400/20" : "bg-surface border-border";
  const healthLabel = healthStatus === "healthy" ? "All Systems Operational" : healthStatus === "partial" ? "Partially Configured" : "Not Configured";

  return (
    <div className="glass rounded-2xl p-6 border border-border space-y-4 animate-slide-up">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-accent" />
        <h3 className="text-sm font-semibold text-foreground">System Health</h3>
      </div>

      {/* Overall Status */}
      <div className={`flex items-center gap-3 p-3 rounded-xl border ${healthBg}`}>
        {healthStatus === "healthy" ? (
          <CheckCircle2 className={`h-5 w-5 ${healthColor} shrink-0`} />
        ) : (
          <AlertTriangle className={`h-5 w-5 ${healthColor} shrink-0`} />
        )}
        <div>
          <p className={`text-sm font-semibold ${healthColor}`}>{healthLabel}</p>
          <p className="text-[10px] text-muted-foreground">
            {configuredProviders} provider{configuredProviders !== 1 ? "s" : ""} configured, {connectedStores} store{connectedStores !== 1 ? "s" : ""} connected
          </p>
        </div>
      </div>

      {/* Provider Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-surface border border-border text-center">
          <Brain className="h-4 w-4 text-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{configuredProviders}/{totalProviders}</p>
          <p className="text-[10px] text-muted-foreground">Providers</p>
        </div>
        <div className="p-3 rounded-xl bg-surface border border-border text-center">
          <Store className="h-4 w-4 text-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{connectedStores}/{totalStores}</p>
          <p className="text-[10px] text-muted-foreground">Stores</p>
        </div>
        <div className="p-3 rounded-xl bg-surface border border-border text-center">
          <Shield className="h-4 w-4 text-accent mx-auto mb-1" />
          <p className="text-lg font-bold text-foreground">{configuredPlatforms}/{totalPlatforms}</p>
          <p className="text-[10px] text-muted-foreground">Platforms</p>
        </div>
      </div>

      {/* Active Providers Bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground">Active providers: {activeProviders}/{totalProviders}</span>
          <span className="text-[10px] text-muted-foreground">{totalProviders > 0 ? Math.round((activeProviders / totalProviders) * 100) : 0}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${totalProviders > 0 ? (activeProviders / totalProviders) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
