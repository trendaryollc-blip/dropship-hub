"use client";

import { Loader2, Package, RefreshCw } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import DataUnavailable from "@/components/ui/DataUnavailable";
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

  const header = (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Package className="h-4 w-4 text-accent" /> Inventory Dashboard
      </h2>
      <button onClick={onRefresh} className="p-1.5 rounded-lg hover:bg-surface transition-colors">
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
      </button>
    </div>
  );

  if (data.summary.totalSKUs === 0) {
    return (
      <div className="space-y-4">
        {header}
        <EmptyState
          iconName="products"
          title="No products sold in the last 30 days"
          description="SKU counts, units per order, and 30-day COGS appear once your fulfillment orders contain line items."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Total SKUs" value={data.summary.totalSKUs} icon={Package} color="text-blue-400" />
        <StatCard label="Avg units/order" value={data.summary.avgUnitsPerOrder} icon={Package} color="text-purple-400" />
        <StatCard label="30-day COGS" value={`$${data.summary.totalCogs30d.toLocaleString()}`} icon={Package} color="text-emerald-400" />
      </div>

      <DataUnavailable
        title="Stock levels not tracked"
        reason="These numbers come from your last 30 days of fulfillment orders. Per-SKU stock counts aren't stored, so low-stock, out-of-stock, and days-of-stock can't be shown honestly yet."
        setup={{ what: "Per-SKU stock counts from a supplier or inventory feed" }}
      />

      <div className="glass rounded-lg p-4">
        <h3 className="text-xs font-semibold text-foreground mb-3">Top Products by Revenue</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 text-muted-foreground font-medium">Product</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Units sold (30d)</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Revenue</th>
                <th className="text-right py-2 text-muted-foreground font-medium">Daily demand (30d avg)</th>
              </tr>
            </thead>
            <tbody>
              {data.topProducts.map((product) => (
                <tr key={product.productId} className="border-b border-white/5">
                  <td className="py-2 text-foreground truncate max-w-[160px]">{product.productName}</td>
                  <td className="py-2 text-right text-foreground">{product.totalSold}</td>
                  <td className="py-2 text-right text-foreground">${product.revenue.toLocaleString()}</td>
                  <td className="py-2 text-right text-foreground">{product.avgDailyDemand}/d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
