"use client";

import { useState, useMemo } from "react";
import { Activity, AlertTriangle, TrendingUp, TrendingDown, Minus, Bell, ChevronDown } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI } from "@/hooks/useAPI";
import type { SupplierHealthSnapshot, SupplierHealthAlert } from "@/types/supplier";

function Sparkline({ data, color = "#3b82f6" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 80;
  const h = 24;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-6">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  );
}

function HealthGauge({ value }: { value: number }) {
  const color = value >= 80 ? "#22c55e" : value >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative w-16 h-16">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="3" />
        <circle cx="18" cy="18" r="15" fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${(value / 100) * 94.25} 94.25`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-bold text-foreground">{value}</span>
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: "improving" | "stable" | "declining" }) {
  if (trend === "improving") return <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
  if (trend === "declining") return <TrendingDown className="h-3.5 w-3.5 text-red-400" />;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
}

function AlertItem({ alert }: { alert: SupplierHealthAlert }) {
  const severityColors = {
    info: "border-blue-400/20 bg-blue-400/5",
    warning: "border-amber-400/20 bg-amber-400/5",
    critical: "border-red-400/20 bg-red-400/5",
  };
  const severityText = {
    info: "text-blue-400",
    warning: "text-amber-400",
    critical: "text-red-400",
  };

  return (
    <div className={`glass rounded-xl p-3 border ${severityColors[alert.severity]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-semibold ${severityText[alert.severity]}`}>{alert.type.replace(/_/g, " ").toUpperCase()}</p>
          <p className="text-[11px] text-foreground mt-0.5">{alert.message}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{alert.recommendation}</p>
        </div>
        <span className="text-[9px] text-muted-foreground whitespace-nowrap">{new Date(alert.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}

export default function SupplierHealthPanel() {
  const { ref, isInView } = useInView();
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  const { data, isLoading } = useAPI<{ snapshots: (SupplierHealthSnapshot & { id: string })[]; alerts: SupplierHealthAlert[] }>(
    isInView ? "/api/suppliers/health-monitor?view=dashboard" : null
  );

  const { data: alertsData } = useAPI<{ alerts: SupplierHealthAlert[] }>(
    isInView ? "/api/suppliers/health-monitor?view=alerts" : null
  );

  const snapshots = data?.snapshots || [];
  const alerts = alertsData?.alerts || [];

  const overallHealth = useMemo(() => {
    if (snapshots.length === 0) return 0;
    return Math.round(snapshots.reduce((sum, s) => sum + s.overallHealth, 0) / snapshots.length);
  }, [snapshots]);

  return (
    <div ref={ref} className="space-y-4">
      <div className="glass rounded-2xl border border-border p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Supplier Health Monitor</h3>
          </div>
          <div className="flex items-center gap-2">
            <HealthGauge value={overallHealth} />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Overall Health</p>
              <p className="text-lg font-bold text-foreground">{overallHealth}%</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-8">
            <Activity className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">No health data yet. Place orders to start monitoring.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {snapshots.slice(0, 5).map((snapshot) => (
              <div key={snapshot.supplierId} className="glass rounded-xl p-3 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-foreground">{snapshot.supplierId}</p>
                  <div className="flex items-center gap-2">
                    <TrendIcon trend={snapshot.healthTrend} />
                    <span className="text-xs font-semibold text-foreground">{snapshot.overallHealth}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {Object.entries(snapshot.metrics).map(([key, metric]) => (
                    <div key={key} className="text-center">
                      <p className="text-[9px] text-muted-foreground capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
                      <p className="text-[10px] font-medium text-foreground">{metric.current}</p>
                      <Sparkline data={metric.trend} color={metric.alert ? "#ef4444" : "#3b82f6"} />
                    </div>
                  ))}
                </div>
                {snapshot.prediction && (
                  <div className="mt-2 p-2 rounded-lg bg-amber-400/5 border border-amber-400/10">
                    <p className="text-[9px] text-amber-400 font-medium">
                      Prediction: {snapshot.prediction.predictedIssue} ({snapshot.prediction.confidence}% confidence, ~{snapshot.prediction.daysUntilIssue} days)
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="glass rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">Health Alerts</h3>
          {alerts.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-red-400/15 text-red-400 text-[9px] font-bold">
              {alerts.length}
            </span>
          )}
        </div>

        {alerts.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No active alerts</p>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
