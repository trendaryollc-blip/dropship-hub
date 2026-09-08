"use client";

import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, Shield, Truck, Package, RefreshCw } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI } from "@/hooks/useAPI";
import type { SupplierMetricSnapshot } from "@/types/supplier";

interface PerformanceData {
  supplierId: string;
  supplierName: string;
  reliabilityScore: number;
  reliabilityTrend: number;
  refundRate: number;
  refundRateTrend: number;
  avgShippingDays: number;
  shippingTrend: number;
  complaintRate: number;
  complaintTrend: number;
  stockReliability: number;
  stockTrend: number;
  dailySnapshots: SupplierMetricSnapshot[];
  status: "excellent" | "good" | "warning" | "critical";
}

function TrendIcon({ trend, size = 14 }: { trend: number; size?: number }) {
  if (trend > 2) return <TrendingUp className={`text-emerald-400`} style={{ width: size, height: size }} />;
  if (trend < -2) return <TrendingDown className={`text-red-400`} style={{ width: size, height: size }} />;
  return <Minus className={`text-neutral-500`} style={{ width: size, height: size }} />;
}

function TrendBadge({ trend, suffix = "" }: { trend: number; suffix?: string }) {
  const isPositive = trend > 2;
  const isNegative = trend < -2;
  return (
    <span className={`text-[10px] font-medium ${
      isPositive ? "text-emerald-400" : isNegative ? "text-red-400" : "text-neutral-500"
    }`}>
      {isPositive ? "+" : ""}{trend.toFixed(1)}{suffix}
    </span>
  );
}

function MiniSparkline({ data, color = "#22c55e", height = 32, width = 80 }: { data: number[]; color?: string; height?: number; width?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} className="shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AreaChart({ snapshots, metric, color, label, unit = "" }: {
  snapshots: SupplierMetricSnapshot[];
  metric: keyof SupplierMetricSnapshot;
  color: string;
  label: string;
  unit?: string;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const values = snapshots.map((s) => s[metric] as number).filter((v) => v !== undefined);
  if (values.length < 2) {
    return (
      <div ref={ref} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <p className="text-xs text-neutral-400 mb-2">{label}</p>
        <p className="text-xl font-bold text-white">{values[0]?.toFixed(1) ?? "—"}{unit}</p>
        <p className="text-[10px] text-neutral-500 mt-1">Need more data for trends</p>
      </div>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const chartW = 280;
  const chartH = 60;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * chartW;
    const y = chartH - ((v - min) / range) * (chartH - 8) - 4;
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${chartW} ${chartH} L 0 ${chartH} Z`;

  const latest = values[values.length - 1];
  const prev = values[values.length - 2];
  const change = prev !== 0 ? ((latest - prev) / prev) * 100 : 0;

  return (
    <div ref={ref} className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] text-neutral-400 uppercase tracking-wider">{label}</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-bold text-white">{latest.toFixed(1)}{unit}</span>
            {Math.abs(change) > 0.5 && (
              <span className={`text-[10px] font-medium ${change > 0 ? "text-emerald-400" : "text-red-400"}`}>
                {change > 0 ? "+" : ""}{change.toFixed(1)}%
              </span>
            )}
          </div>
        </div>
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      </div>
      <svg width="100%" height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="overflow-visible">
        <defs>
          <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#grad-${metric})`} />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="3" fill={color} />
      </svg>
    </div>
  );
}

function StatusBadge({ status }: { status: PerformanceData["status"] }) {
  const config = {
    excellent: { color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle2, label: "Excellent" },
    good: { color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: Shield, label: "Good" },
    warning: { color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: AlertTriangle, label: "Warning" },
    critical: { color: "text-red-400 bg-red-400/10 border-red-400/20", icon: AlertTriangle, label: "Critical" },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] px-2.5 py-1 rounded-full border font-bold uppercase ${c.color}`}>
      <c.icon className="h-3 w-3" />
      {c.label}
    </span>
  );
}

export default function SupplierPerformanceTab({ supplierId, supplierName }: { supplierId: string; supplierName: string }) {
  const { data, isLoading, error } = useAPI<{ performance?: PerformanceData }>(
    `/api/suppliers/performance?supplierId=${encodeURIComponent(supplierId)}&type=overview`
  );
  const performance = data?.performance;

  const { ref, isInView } = useInView({ threshold: 0.05 });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 animate-pulse">
            <div className="h-3 w-24 bg-white/5 rounded mb-3" />
            <div className="h-8 w-16 bg-white/5 rounded mb-3" />
            <div className="h-[60px] bg-white/5 rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (error || !performance) {
    return (
      <div ref={ref} className={`rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 text-center transition-all duration-500 ${isInView ? "opacity-100" : "opacity-0"}`}>
        <Shield className="h-10 w-10 text-neutral-700 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-white mb-1">No Performance Data</h4>
        <p className="text-xs text-neutral-400 max-w-xs mx-auto">
          Performance tracking will appear once {supplierName} has order history in your store.
        </p>
      </div>
    );
  }

  const snapshots = performance.dailySnapshots || [];

  return (
    <div ref={ref} className={`space-y-4 transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      {/* Status Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white">Performance Overview</h3>
          <StatusBadge status={performance.status} />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
          <RefreshCw className="h-3 w-3" />
          {snapshots.length} data points
        </div>
      </div>

      {/* Key Metrics with Trends */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Reliability", value: performance.reliabilityScore, trend: performance.reliabilityTrend, suffix: "%", color: "#22c55e", icon: Shield },
          { label: "Refund Rate", value: performance.refundRate, trend: performance.refundRateTrend, suffix: "%", color: "#f59e0b", icon: RefreshCw },
          { label: "Avg Shipping", value: performance.avgShippingDays, trend: performance.shippingTrend, suffix: "d", color: "#3b82f6", icon: Truck },
          { label: "Complaint Rate", value: performance.complaintRate, trend: performance.complaintTrend, suffix: "%", color: "#ef4444", icon: AlertTriangle },
        ].map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-2">
              <metric.icon className="h-3.5 w-3.5" style={{ color: metric.color }} />
              <TrendIcon trend={metric.trend} />
            </div>
            <p className="text-lg font-bold text-white">{metric.value.toFixed(1)}{metric.suffix}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-neutral-500">{metric.label}</p>
              <TrendBadge trend={metric.trend} />
            </div>
            <div className="mt-2">
              <MiniSparkline
                data={snapshots.map((s) => s[metric.label === "Reliability" ? "reliabilityScore" : metric.label === "Refund Rate" ? "refundRate" : metric.label === "Avg Shipping" ? "shippingDays" : "complaintRate"] as number)}
                color={metric.color}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Stock Reliability */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs text-neutral-400">Stock Reliability</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{performance.stockReliability}%</span>
            <TrendIcon trend={performance.stockTrend} />
          </div>
        </div>
        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${performance.stockReliability}%`,
              backgroundColor: performance.stockReliability >= 90 ? "#22c55e" : performance.stockReliability >= 75 ? "#3b82f6" : "#f59e0b",
            }}
          />
        </div>
      </div>

      {/* Trend Charts */}
      {snapshots.length >= 3 && (
        <div className="space-y-3">
          <p className="text-[10px] text-neutral-500 uppercase tracking-wider">Trend Analysis</p>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <AreaChart snapshots={snapshots} metric="reliabilityScore" color="#22c55e" label="Reliability Score" unit="%" />
            <AreaChart snapshots={snapshots} metric="refundRate" color="#f59e0b" label="Refund Rate" unit="%" />
            <AreaChart snapshots={snapshots} metric="shippingDays" color="#3b82f6" label="Shipping Days" unit="d" />
            <AreaChart snapshots={snapshots} metric="complaintRate" color="#ef4444" label="Complaint Rate" unit="%" />
          </div>
        </div>
      )}
    </div>
  );
}
