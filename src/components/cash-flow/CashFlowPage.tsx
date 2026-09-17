"use client";

import { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Wallet,
  Zap,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import type { CashFlowSnapshot, CashFlowForecast, CashFlowAlert } from "@/types/cash-flow";

export default function CashFlowPage() {
  const { data: snapshotData } = useAPI<{ snapshot: CashFlowSnapshot }>("/api/cash-flow?type=snapshot");
  const { data: forecastData } = useAPI<{ forecast: CashFlowForecast[] }>("/api/cash-flow?type=forecast");
  const { data: alertsData } = useAPI<{ alerts: CashFlowAlert[] }>("/api/cash-flow?type=alerts");

  const snapshot = snapshotData?.snapshot;
  const forecast = forecastData?.forecast || [];
  const alerts = alertsData?.alerts || [];

  const maxBalance = useMemo(() => {
    if (forecast.length === 0) return 1000;
    return Math.max(...forecast.map((f) => Math.abs(f.runningBalance)), snapshot?.currentBalance || 0) * 1.2;
  }, [forecast, snapshot]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <DollarSign className="h-6 w-6 text-accent" />
          Cash Flow Timing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track when money comes in vs. when it goes out. Avoid cash crunches.
        </p>
      </div>

      {/* KPI Cards */}
      {snapshot && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Current Balance", value: `$${snapshot.currentBalance.toLocaleString()}`, icon: Wallet, color: "text-accent", sub: `${snapshot.runwayDays} days runway` },
            { label: "Pending Inflows", value: `$${snapshot.pendingInflows.toLocaleString()}`, icon: ArrowUpRight, color: "text-emerald-400", sub: `Expected from sales` },
            { label: "Pending Outflows", value: `$${snapshot.pendingOutflows.toLocaleString()}`, icon: ArrowDownRight, color: "text-red-400", sub: `Supplier + fees` },
            { label: "Burn Rate", value: `$${snapshot.burnRate.toFixed(0)}/day`, icon: Zap, color: snapshot.burnRate > 100 ? "text-amber-400" : "text-emerald-400", sub: `Daily net outflow` },
          ].map((kpi) => (
            <div key={kpi.label} className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground uppercase">{kpi.label}</span>
                <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              </div>
              <div className="font-display text-xl font-bold text-foreground">{kpi.value}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* Cash Conversion Cycle */}
      {snapshot && (
        <div className="glass rounded-2xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-sm font-semibold text-foreground">Cash Conversion Cycle</h3>
            <span className="text-xs text-muted-foreground">{snapshot.cashConversionCycle} days</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex-1 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
              <p className="font-semibold text-emerald-400">You get paid</p>
              <p className="text-muted-foreground mt-0.5">Day 0</p>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex-1 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="font-semibold text-amber-400">Pay supplier</p>
              <p className="text-muted-foreground mt-0.5">Day {Math.round(snapshot.cashConversionCycle * 0.3)}</p>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex-1 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
              <p className="font-semibold text-blue-400">Customer receives</p>
              <p className="text-muted-foreground mt-0.5">Day {Math.round(snapshot.cashConversionCycle * 0.7)}</p>
            </div>
            <div className="text-muted-foreground">→</div>
            <div className="flex-1 p-3 rounded-xl bg-accent/10 border border-accent/20 text-center">
              <p className="font-semibold text-accent">Platform payout</p>
              <p className="text-muted-foreground mt-0.5">Day {snapshot.cashConversionCycle}</p>
            </div>
          </div>
        </div>
      )}

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${
              alert.severity === "critical" ? "bg-red-500/5 border-red-500/20" :
              alert.severity === "warning" ? "bg-amber-500/5 border-amber-500/20" :
              "bg-blue-500/5 border-blue-500/20"
            }`}>
              <AlertTriangle className={`h-4 w-4 mt-0.5 shrink-0 ${
                alert.severity === "critical" ? "text-red-400" :
                alert.severity === "warning" ? "text-amber-400" : "text-blue-400"
              }`} />
              <div>
                <p className="text-sm font-medium text-foreground">{alert.title}</p>
                <p className="text-xs text-muted-foreground">{alert.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forecast Chart (simplified bar chart) */}
      {forecast.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4">30-Day Cash Flow Forecast</h3>
          <div className="flex items-end gap-1 h-48">
            {forecast.slice(0, 30).map((day, i) => {
              const inflowHeight = maxBalance > 0 ? (day.inflows / maxBalance) * 100 : 0;
              const outflowHeight = maxBalance > 0 ? (day.outflows / maxBalance) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${day.date}: In $${day.inflows}, Out $${day.outflows}, Balance $${day.runningBalance.toFixed(0)}`}>
                  <div className="w-full flex flex-col items-center gap-0.5" style={{ height: "100%" }}>
                    <div className="flex-1" />
                    <div className="w-full bg-emerald-500/60 rounded-t" style={{ height: `${inflowHeight}%`, minHeight: day.inflows > 0 ? "2px" : "0" }} />
                    <div className="w-full bg-red-500/60 rounded-b" style={{ height: `${outflowHeight}%`, minHeight: day.outflows > 0 ? "2px" : "0" }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>Today</span>
            <span>+15 days</span>
            <span>+30 days</span>
          </div>
          <div className="flex gap-4 mt-3 text-xs">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500/60" /> Inflows</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500/60" /> Outflows</span>
          </div>
        </div>
      )}

      {/* Running Balance Line */}
      {forecast.length > 0 && (
        <div className="glass rounded-2xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4">Running Balance Projection</h3>
          <div className="relative h-40">
            <svg viewBox="0 0 300 100" className="w-full h-full" preserveAspectRatio="none">
              {/* Zero line */}
              <line x1="0" y1="50" x2="300" y2="50" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="4" />
              {/* Balance line */}
              <polyline
                fill="none"
                stroke="rgb(99, 102, 241)"
                strokeWidth="2"
                points={forecast.slice(0, 30).map((f, i) => {
                  const x = (i / 29) * 300;
                  const normalized = maxBalance > 0 ? 50 - (f.runningBalance / maxBalance) * 50 : 50;
                  return `${x},${Math.max(0, Math.min(100, normalized))}`;
                }).join(" ")}
              />
              {/* Fill under line */}
              <polygon
                fill="url(#gradient)"
                points={`0,50 ${forecast.slice(0, 30).map((f, i) => {
                  const x = (i / 29) * 300;
                  const normalized = maxBalance > 0 ? 50 - (f.runningBalance / maxBalance) * 50 : 50;
                  return `${x},${Math.max(0, Math.min(100, normalized))}`;
                }).join(" ")} 300,50`}
              />
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(99, 102, 241)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(99, 102, 241)" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <div className="flex justify-between mt-2 text-[10px] text-muted-foreground">
            <span>Today: ${snapshot?.currentBalance.toLocaleString()}</span>
            <span>Day 30: ${forecast[29]?.runningBalance.toFixed(0) || "—"}</span>
          </div>
        </div>
      )}
    </div>
  );
}
