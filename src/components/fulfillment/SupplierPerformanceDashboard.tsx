"use client";

import { Loader2, TrendingUp, TrendingDown, Minus, Package, Truck, RefreshCw } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import type { SupplierPerformanceData } from "@/types/fulfillment";

interface Props {
  data: SupplierPerformanceData | null;
  loading: boolean;
  onRefresh: () => void;
}

const STATUS_STYLES = {
  excellent: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
  good: "bg-blue-500/20 text-blue-400 border-blue-500/20",
  warning: "bg-amber-500/20 text-amber-400 border-amber-500/20",
  poor: "bg-red-500/20 text-red-400 border-red-500/20",
  unknown: "bg-surface text-muted-foreground border-white/10",
} as const;

const TREND_ICONS = {
  improving: { icon: TrendingUp, color: "text-emerald-400" },
  stable: { icon: Minus, color: "text-muted-foreground" },
  declining: { icon: TrendingDown, color: "text-red-400" },
  unknown: { icon: Minus, color: "text-muted-foreground/60" },
} as const;

function StatCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: React.ElementType; color: string }) {
  return (
    <div className="glass rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-2xl font-bold text-foreground truncate">{value}</p>
    </div>
  );
}

export default function SupplierPerformanceDashboard({ data, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-xs text-muted-foreground">No supplier data available</div>
    );
  }

  const header = (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Truck className="h-4 w-4 text-accent" /> Supplier Performance
      </h2>
      <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );

  if (data.summary.totalSuppliers === 0) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          iconName="orders"
          title="No supplier performance data yet"
          description="On-time rate, cancellation rate, and quality scores appear once orders are assigned to suppliers."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Suppliers" value={data.summary.totalSuppliers} icon={Package} color="text-blue-400" />
        <StatCard label="Best Performer" value={data.summary.bestPerformer} icon={TrendingUp} color="text-emerald-400" />
        <StatCard label="Worst Performer" value={data.summary.worstPerformer} icon={TrendingDown} color="text-red-400" />
        <StatCard label="Avg Score (heuristic)" value={data.summary.avgOverallScore ?? "—"} icon={Package} color="text-purple-400" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.suppliers.map((supplier) => {
          const trend = TREND_ICONS[supplier.reliabilityTrend];
          const TrendIcon = trend.icon;

          return (
            <div key={supplier.supplierId} className="glass rounded-lg p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">{supplier.supplierName}</h3>
                  <p className="text-[10px] text-muted-foreground">{supplier.orderCount} orders</p>
                </div>
                <div className="flex items-center gap-2">
                  <TrendIcon className={`h-3 w-3 ${trend.color}`} />
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${STATUS_STYLES[supplier.status]}`}>
                    {supplier.status}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-muted-foreground">Avg Shipping</span>
                  <p className="text-foreground font-medium">
                    {supplier.avgShippingDays === null ? "—" : `${supplier.avgShippingDays}d`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">On-Time Rate</span>
                  <p
                    className={`font-medium ${
                      supplier.onTimeRate === null
                        ? "text-muted-foreground"
                        : supplier.onTimeRate >= 90
                        ? "text-emerald-400"
                        : supplier.onTimeRate >= 70
                        ? "text-amber-400"
                        : "text-red-400"
                    }`}
                  >
                    {supplier.onTimeRate === null ? "—" : `${supplier.onTimeRate}%`}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Cancellation Rate</span>
                  <p className={`font-medium ${supplier.cancellationRate > 10 ? "text-red-400" : "text-foreground"}`}>
                    {supplier.cancellationRate}%
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Quality Score (delivery-speed heuristic)</span>
                  <p className={`font-medium ${supplier.avgQualityScore === null ? "text-muted-foreground" : "text-foreground"}`}>
                    {supplier.avgQualityScore === null ? "—" : supplier.avgQualityScore}
                  </p>
                </div>
              </div>

              <div className="border-t border-white/5 pt-2 flex justify-between text-[10px]">
                <span className="text-muted-foreground">
                  Revenue: <span className="text-foreground">${supplier.totalRevenue.toLocaleString()}</span>
                </span>
                <span className="text-muted-foreground">
                  Profit: <span className={`font-medium ${supplier.totalProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${supplier.totalProfit.toLocaleString()}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Margin: <span className="text-foreground">{supplier.avgMargin === null ? "—" : `${supplier.avgMargin}%`}</span>
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
