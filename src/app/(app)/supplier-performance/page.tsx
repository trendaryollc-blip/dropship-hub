"use client";

import { useState, useRef } from "react";
import {
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle2,
  Clock, Package, Star, ArrowRight,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import type { SupplierPerformance, SupplierAlert } from "@/types/supplier";

function SupplierScoreCard({ supplier, delay }: { supplier: SupplierPerformance; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const count = useAnimatedCounter(supplier.reliabilityScore, 1500, isInView);
  const statusColors: Record<string, string> = {
    excellent: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    good: "text-blue-400 bg-blue-400/10 border-blue-400/20",
    warning: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    critical: "text-red-400 bg-red-400/10 border-red-400/20",
  };
  const trendIcon = (val: number) =>
    val >= 0
      ? <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400" />
      : <TrendingDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-red-400" />;
  return (
    <div ref={ref} className={`glass rounded-xl p-3 sm:p-4 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="font-display text-sm font-semibold text-foreground">{supplier.supplierName}</h4>
          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] sm:text-[10px] font-semibold border ${statusColors[supplier.status] || ""}`}>{supplier.status}</span>
        </div>
        <div className="text-right">
          <p className="font-display text-xl sm:text-2xl font-bold text-foreground">{count}</p>
          <div className="flex items-center gap-1">
            {trendIcon(supplier.reliabilityTrend)}
            <span className={`text-[10px] font-semibold ${supplier.reliabilityTrend >= 0 ? "text-emerald-400" : "text-red-400"}`}>{supplier.reliabilityTrend >= 0 ? "+" : ""}{supplier.reliabilityTrend}%</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <div className="p-2 rounded-lg bg-surface">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Refund Rate</p>
          <div className="flex items-center gap-1">
            <p className="text-xs sm:text-sm font-bold text-foreground">{supplier.refundRate}%</p>
            {trendIcon(-supplier.refundRateTrend)}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-surface">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Avg Shipping</p>
          <div className="flex items-center gap-1">
            <p className="text-xs sm:text-sm font-bold text-foreground">{supplier.avgShippingDays}d</p>
            {trendIcon(-supplier.shippingTrend)}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-surface">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Complaints</p>
          <div className="flex items-center gap-1">
            <p className="text-xs sm:text-sm font-bold text-foreground">{supplier.complaintRate}%</p>
            {trendIcon(-supplier.complaintTrend)}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-surface">
          <p className="text-[9px] sm:text-[10px] text-muted-foreground">Stock Reliability</p>
          <div className="flex items-center gap-1">
            <p className="text-xs sm:text-sm font-bold text-foreground">{supplier.stockReliability}%</p>
            {trendIcon(supplier.stockTrend)}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert, delay }: { alert: SupplierAlert; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const sevColors: Record<string, { bg: string; border: string; icon: string }> = {
    low: { bg: "bg-blue-400/10", border: "border-blue-400/20", icon: "text-blue-400" },
    medium: { bg: "bg-amber-400/10", border: "border-amber-400/20", icon: "text-amber-400" },
    high: { bg: "bg-red-400/10", border: "border-red-400/20", icon: "text-red-400" },
  };
  const c = sevColors[alert.severity] || sevColors.low;
  const icons: Record<string, typeof AlertTriangle> = {
    quality_degradation: AlertTriangle,
    shipping_delay: Clock,
    stock_low: Package,
    refund_spike: TrendingDown,
    communication_issue: Star,
  };
  const Icon = icons[alert.type] || AlertTriangle;
  return (
    <div ref={ref} className={`p-3 sm:p-4 rounded-xl ${c.bg} border ${c.border} transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className={`flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg ${c.bg} shrink-0`}>
          <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${c.icon}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h4 className="text-xs sm:text-sm font-semibold text-foreground truncate">{alert.title}</h4>
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${c.bg} ${c.icon}`}>{alert.severity}</span>
          </div>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground mb-1.5">{alert.supplierName}</p>
          <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-relaxed mb-2">{alert.description}</p>
          <div className="flex items-center gap-2 text-[9px] sm:text-[10px]">
            <span className="text-muted-foreground">{alert.metric}:</span>
            <span className="text-foreground font-semibold">{alert.previousValue}</span>
            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">{alert.currentValue}</span>
            <span className={`${alert.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              ({alert.changePercent >= 0 ? "+" : ""}{alert.changePercent}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComparisonTable({ suppliers }: { suppliers: { name: string; reliabilityScore: number; refundRate: number; avgShippingDays: number; complaintRate: number; stockReliability: number; priceCompetitiveness: number; totalOrders: number }[] }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const metrics = [
    { key: "reliabilityScore", label: "Reliability", better: "higher" as const },
    { key: "refundRate", label: "Refund Rate", better: "lower" as const },
    { key: "avgShippingDays", label: "Shipping Days", better: "lower" as const },
    { key: "complaintRate", label: "Complaints", better: "lower" as const },
    { key: "stockReliability", label: "Stock Reliability", better: "higher" as const },
    { key: "priceCompetitiveness", label: "Price Score", better: "higher" as const },
  ];
  const getBest = (key: string, better: "higher" | "lower") => {
    const vals = suppliers.map((s) => (s as Record<string, unknown>)[key] as number);
    return better === "higher" ? Math.max(...vals) : Math.min(...vals);
  };
  return (
    <div ref={ref} className={`glass rounded-2xl p-3 sm:p-5 transition-all duration-700 overflow-x-auto ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="mb-4">
        <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Supplier Comparison</h3>
        <p className="text-[10px] sm:text-[11px] text-muted-foreground">Side-by-side performance comparison</p>
      </div>
      <table className="w-full min-w-[600px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 text-[10px] sm:text-[11px] font-semibold text-muted-foreground">Metric</th>
            {suppliers.map((s) => (
              <th key={s.name} className="text-center py-2 text-[10px] sm:text-[11px] font-semibold text-foreground">{s.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {metrics.map((m) => {
            const best = getBest(m.key, m.better);
            return (
              <tr key={m.key} className="border-b border-border/50">
                <td className="py-2 text-[10px] sm:text-[11px] text-muted-foreground">{m.label}</td>
                {suppliers.map((s) => {
                  const val = (s as Record<string, unknown>)[m.key] as number;
                  const isBest = val === best;
                  return (
                    <td key={s.name} className="text-center py-2">
                      <span className={`text-[10px] sm:text-[11px] font-semibold ${isBest ? "text-emerald-400" : "text-foreground"}`}>
                        {m.key === "avgShippingDays" ? `${val}d` : m.key.includes("Rate") || m.key === "stockReliability" || m.key === "reliabilityScore" ? `${val}%` : val}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
          <tr>
            <td className="py-2 text-[10px] sm:text-[11px] text-muted-foreground">Total Orders</td>
            {suppliers.map((s) => (
              <td key={s.name} className="text-center py-2 text-[10px] sm:text-[11px] font-semibold text-foreground">{s.totalOrders}</td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function PerformanceChart({ supplier }: { supplier: SupplierPerformance }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; date: string; value: number } | null>(null);
  const snapshots = supplier.dailySnapshots || [];
  if (snapshots.length === 0) {
    return (
      <div ref={ref} className="glass rounded-2xl p-3 sm:p-4">
        <h4 className="font-display text-xs sm:text-sm font-semibold text-foreground">{supplier.supplierName} - Reliability Trend</h4>
        <p className="text-[10px] text-muted-foreground mt-2">No snapshot data available yet.</p>
      </div>
    );
  }
  const maxVal = Math.max(...snapshots.map((s) => s.reliabilityScore));
  const minVal = Math.min(...snapshots.map((s) => s.reliabilityScore));
  const range = maxVal - minVal || 1;
  const padding = { top: 15, right: 10, bottom: 25, left: 35 };
  const w = 800;
  const h = 200;
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const getX = (i: number) => padding.left + (i / Math.max(snapshots.length - 1, 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - ((val - minVal) / range) * chartH;
  const path = snapshots.map((s, i) => `${i === 0 ? "M" : "L"} ${getX(i)} ${getY(s.reliabilityScore)}`).join(" ");
  const area = `${path} L ${getX(snapshots.length - 1)} ${padding.top + chartH} L ${padding.left} ${padding.top + chartH} Z`;
  const yTicks = [0, 0.5, 1].map((p) => +(minVal + range * p).toFixed(1));
  return (
    <div ref={ref} className={`glass rounded-2xl p-3 sm:p-4 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="mb-3">
        <h4 className="font-display text-xs sm:text-sm font-semibold text-foreground">{supplier.supplierName} - Reliability Trend</h4>
      </div>
      <div className="relative">
        <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" onMouseMove={(e) => {
          if (!svgRef.current) return;
          const rect = svgRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const idx = Math.round(((x - padding.left) / chartW) * (snapshots.length - 1));
          if (idx >= 0 && idx < snapshots.length) {
            setTooltip({ x: getX(idx), y: getY(snapshots[idx].reliabilityScore), date: snapshots[idx].date, value: snapshots[idx].reliabilityScore });
          }
        }} onMouseLeave={() => setTooltip(null)}>
          <defs>
            <linearGradient id={`grad-${supplier.supplierId}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((tick) => (
            <g key={tick}>
              <line x1={padding.left} y1={getY(tick)} x2={w - padding.right} y2={getY(tick)} stroke="rgba(255,255,255,0.04)" />
              <text x={padding.left - 5} y={getY(tick) + 3} textAnchor="end" className="fill-muted-foreground text-[8px]">{tick}%</text>
            </g>
          ))}
          {isInView && <path d={area} fill={`url(#grad-${supplier.supplierId})`} className="animate-fade-in" />}
          {isInView && <path d={path} fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" className="animate-chart-draw" />}
          {tooltip && (
            <g>
              <line x1={tooltip.x} y1={padding.top} x2={tooltip.x} y2={padding.top + chartH} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <circle cx={tooltip.x} cy={tooltip.y} r="4" fill="#3b82f6" stroke="#fff" strokeWidth="2" />
              <rect x={tooltip.x - 40} y={tooltip.y - 28} width="80" height="20" rx="5" fill="#16161f" stroke="rgba(255,255,255,0.1)" />
              <text x={tooltip.x} y={tooltip.y - 14} textAnchor="middle" className="fill-foreground text-[8px] font-bold">{tooltip.value}% — {tooltip.date.slice(5)}</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  );
}

export default function SupplierPerformancePage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const { data: sData } = useAPI<{ suppliers?: SupplierPerformance[] }>(uid ? `/api/suppliers/performance?type=overview&uid=${uid}` : null);
  const { data: aData } = useAPI<{ alerts?: SupplierAlert[] }>(uid ? `/api/suppliers/performance?type=alerts&uid=${uid}` : null);
  const { data: cData } = useAPI<{ comparison?: { name: string; reliabilityScore: number; refundRate: number; avgShippingDays: number; complaintRate: number; stockReliability: number; priceCompetitiveness: number; totalOrders: number }[] }>(uid ? `/api/suppliers/performance?type=comparison&uid=${uid}` : null);
  const suppliers = sData?.suppliers || [];
  const alerts = aData?.alerts || [];
  const comparison = cData?.comparison || [];
  const loading = !user || (!sData && !cData);
  const [activeTab, setActiveTab] = useState<"overview" | "alerts" | "comparison">("overview");

  const criticalAlerts = alerts.filter((a) => a.severity === "high").length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1">Supplier Intelligence</h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">Track supplier performance over time, get AI-powered alerts, and compare alternatives.</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {criticalAlerts > 0 && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-red-400/10 border border-red-400/20 text-[10px] sm:text-[11px] font-semibold text-red-400">
              <AlertTriangle className="h-3 w-3" />
              {criticalAlerts} Critical
            </span>
          )}
          <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
            {(["overview", "alerts", "comparison"] as const).map((tab) => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-semibold capitalize transition-all ${activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}>
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading supplier data...</p>
        </div>
      ) : (
        <>
          {activeTab === "overview" && (
            <>
              {suppliers.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No supplier data yet</p>
                  <p className="text-xs text-muted-foreground">Start tracking suppliers to see performance metrics here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                  {suppliers.map((s, i) => (
                    <SupplierScoreCard key={s.supplierId} supplier={s} delay={i * 100} />
                  ))}
                </div>
              )}
              {suppliers.filter((s) => s.dailySnapshots && s.dailySnapshots.length > 0).map((s) => (
                <PerformanceChart key={s.supplierId} supplier={s} />
              ))}
            </>
          )}

          {activeTab === "alerts" && (
            <>
              {alerts.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No alerts</p>
                  <p className="text-xs text-muted-foreground">All suppliers are performing within normal ranges.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                  {alerts.map((a, i) => (
                    <AlertCard key={a.id} alert={a} delay={i * 80} />
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "comparison" && (
            <>
              {comparison.length === 0 ? (
                <div className="glass rounded-2xl p-12 text-center">
                  <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">No suppliers to compare</p>
                  <p className="text-xs text-muted-foreground">Add at least 2 suppliers to see a side-by-side comparison.</p>
                </div>
              ) : (
                <ComparisonTable suppliers={comparison} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
