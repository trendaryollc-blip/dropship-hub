"use client";

import { Loader2, AlertTriangle, Shield, Clock, TrendingUp, RefreshCw } from "lucide-react";
import type { SLADashboardData } from "@/types/fulfillment";

interface Props {
  data: SLADashboardData | null;
  loading: boolean;
  onRefresh: () => void;
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

function OnTimeRateDisplay({ rate }: { rate: number }) {
  const color = rate >= 90 ? "text-emerald-400" : rate >= 70 ? "text-amber-400" : "text-red-400";
  return <span className={`text-2xl font-bold ${color}`}>{rate}%</span>;
}

function TimelineChart({ data }: { data: SLADashboardData["timeline"] }) {
  const maxTotal = Math.max(...data.map((d) => d.total), 1);
  return (
    <div className="glass rounded-lg p-4">
      <h3 className="text-xs font-semibold text-foreground mb-3">Last 7 Days</h3>
      <div className="flex items-end gap-1 h-32">
        {data.map((d) => {
          const onTimePct = d.total > 0 ? (d.onTime / maxTotal) * 100 : 0;
          const latePct = d.total > 0 ? (d.late / maxTotal) * 100 : 0;
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full flex flex-col justify-end h-full">
                <div
                  className="w-full bg-emerald-500/60 rounded-t"
                  style={{ height: `${onTimePct}%`, minHeight: onTimePct > 0 ? 2 : 0 }}
                />
                <div
                  className="w-full bg-red-500/60"
                  style={{ height: `${latePct}%`, minHeight: latePct > 0 ? 2 : 0 }}
                />
              </div>
              <span className="text-[9px] text-muted-foreground">{d.date.slice(5)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex gap-4 mt-2 justify-center">
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="w-2 h-2 rounded-sm bg-emerald-500/60" /> On Time
        </span>
        <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <span className="w-2 h-2 rounded-sm bg-red-500/60" /> Late
        </span>
      </div>
    </div>
  );
}

export default function SLADashboard({ data, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-xs text-muted-foreground">No SLA data available</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent" /> SLA Dashboard
        </h2>
        <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total Orders" value={data.summary.totalOrders} icon={Clock} color="text-blue-400" />
        <div className="glass rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-muted-foreground">On-Time Rate</span>
          </div>
          <OnTimeRateDisplay rate={data.summary.onTimeRate} />
        </div>
        <StatCard label="Avg Fulfillment" value={`${data.summary.avgFulfillmentHours}h`} icon={Clock} color="text-purple-400" />
        <StatCard label="At Risk" value={data.summary.atRiskOrders} icon={AlertTriangle} color="text-amber-400" />
        <StatCard label="Overdue" value={data.summary.overdueOrders} icon={AlertTriangle} color="text-red-400" />
      </div>

      <TimelineChart data={data.timeline} />

      {data.alerts.length > 0 && (
        <div className="glass rounded-lg p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3">
            Alerts ({data.alerts.length})
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {data.alerts.map((alert) => (
              <div
                key={alert.orderId}
                className={`flex items-start gap-2 p-2 rounded ${
                  alert.severity === "critical" ? "bg-red-500/10 border border-red-500/20" : "bg-amber-500/10 border border-amber-500/20"
                }`}
              >
                <AlertTriangle
                  className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                    alert.severity === "critical" ? "text-red-400" : "text-amber-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-foreground">
                    <span className="font-mono text-muted-foreground">#{alert.orderNumber}</span>{" "}
                    {alert.message}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {alert.hoursElapsed}h elapsed — {alert.customerName}
                  </p>
                </div>
                <span
                  className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                    alert.severity === "critical"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-amber-500/20 text-amber-400"
                  }`}
                >
                  {alert.severity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-lg p-4">
        <h3 className="text-xs font-semibold text-foreground mb-3">Status Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 text-muted-foreground font-medium">Status</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Count</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Avg Hours</th>
                <th className="text-right py-2 text-muted-foreground font-medium">On-Time Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.breakdown.map((row) => (
                <tr key={row.status} className="border-b border-white/5">
                  <td className="py-2 text-foreground capitalize">{row.status.replace(/_/g, " ")}</td>
                  <td className="py-2 text-right text-foreground">{row.count}</td>
                  <td className="py-2 text-right text-foreground">{row.avgHours}h</td>
                  <td className="py-2 text-right">
                    <span
                      className={`${
                        row.onTimeRate >= 90
                          ? "text-emerald-400"
                          : row.onTimeRate >= 70
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {row.onTimeRate}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
