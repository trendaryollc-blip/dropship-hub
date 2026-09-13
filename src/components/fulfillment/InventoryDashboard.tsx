"use client";

import { Loader2, Package, AlertTriangle, RefreshCw } from "lucide-react";
import type { InventoryDashboardData } from "@/types/fulfillment";

interface Props {
  data: InventoryDashboardData | null;
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

const SEVERITY_STYLES = {
  out_of_stock: { icon: "●", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
  critical: { icon: "▲", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  low: { icon: "◆", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
} as const;

const STATUS_STYLES = {
  healthy: "bg-emerald-500/20 text-emerald-400",
  low: "bg-amber-500/20 text-amber-400",
  critical: "bg-orange-500/20 text-orange-400",
  stockout: "bg-red-500/20 text-red-400",
} as const;

export default function InventoryDashboard({ data, loading, onRefresh }: Props) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 text-accent animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12 text-xs text-muted-foreground">No inventory data available</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-accent" /> Inventory Dashboard
        </h2>
        <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard label="Total SKUs" value={data.summary.totalSKUs} icon={Package} color="text-blue-400" />
        <StatCard label="Low Stock" value={data.summary.lowStockCount} icon={AlertTriangle} color="text-amber-400" />
        <StatCard label="Out of Stock" value={data.summary.outOfStockCount} icon={AlertTriangle} color="text-red-400" />
        <StatCard label="Avg Stock Level" value={data.summary.avgStockLevel} icon={Package} color="text-purple-400" />
        <StatCard label="Total Value" value={`$${data.summary.totalInventoryValue.toLocaleString()}`} icon={Package} color="text-emerald-400" />
      </div>

      {data.alerts.length > 0 && (
        <div className="glass rounded-lg p-4">
          <h3 className="text-xs font-semibold text-foreground mb-3">
            Stock Alerts ({data.alerts.length})
          </h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {data.alerts.map((alert) => {
              const sev = SEVERITY_STYLES[alert.severity];
              return (
                <div
                  key={alert.productId}
                  className={`flex items-start gap-2 p-2 rounded border ${sev.bg}`}
                >
                  <span className={`${sev.color} text-xs mt-0.5`}>{sev.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-foreground">{alert.productName}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {alert.supplierName} — Stock: {alert.currentStock} (reorder: {alert.reorderPoint})
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="glass rounded-lg p-4">
        <h3 className="text-xs font-semibold text-foreground mb-3">Top Products by Revenue</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 text-muted-foreground font-medium">Product</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Sold</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Revenue</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Daily Demand</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Days of Stock</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((product) => (
                <tr key={product.productId} className="border-b border-white/5">
                  <td className="py-2 text-foreground truncate max-w-[160px]">{product.productName}</td>
                  <td className="py-2 text-right text-foreground">{product.totalSold}</td>
                  <td className="py-2 text-right text-foreground">${product.revenue.toLocaleString()}</td>
                  <td className="py-2 text-right text-foreground">{product.avgDailyDemand}/d</td>
                  <td className="py-2 text-right text-foreground">{product.daysOfStock}d</td>
                  <td className="py-2 text-right">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${STATUS_STYLES[product.status]}`}>
                      {product.status}
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
