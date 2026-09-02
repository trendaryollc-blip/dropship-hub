"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  DollarSign, Loader2, AlertCircle, TrendingUp,
  BarChart3, PieChart, Download, ArrowUpRight, ArrowDownRight,
  ShoppingCart, Package, Users, Activity,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";
import { logger } from "@/lib/logger";

interface FinancialSummary {
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  totalOrders: number;
  avgOrderValue: number;
  revenueGrowth: number;
  profitGrowth: number;
}

interface ProductPerformance {
  productId: string;
  name: string;
  revenue: number;
  profit: number;
  unitsSold: number;
  margin: number;
}

interface SupplierBreakdown {
  supplierId: string;
  supplierName: string;
  revenue: number;
  cost: number;
  profit: number;
  orders: number;
}

interface PlatformBreakdown {
  platform: string;
  revenue: number;
  orders: number;
}

interface DailyRevenue {
  date: string;
  revenue: number;
  profit: number;
  orders: number;
}

function StatCard({
  label,
  value,
  change,
  icon: Icon,
  gradient,
  borderColor,
}: {
  label: string;
  value: string;
  change?: number;
  icon: React.ComponentType<{ className?: string }>;
  gradient: string;
  borderColor: string;
}) {
  return (
    <div className={`bg-gradient-to-br ${gradient} border ${borderColor} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        {change !== undefined && (
          <span className={`flex items-center gap-0.5 text-[10px] font-semibold ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(change).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { user } = useAuth();
  const reportsUrl = user ? `/api/fulfillment/reports?uid=${user.uid}` : null;

  const { data: reportsData, isLoading, error: fetchError } = useAPI<{
    summary?: FinancialSummary;
    topProducts?: ProductPerformance[];
    supplierBreakdown?: SupplierBreakdown[];
    platformBreakdown?: PlatformBreakdown[];
    dailyRevenue?: DailyRevenue[];
  }>(reportsUrl);

  const summary = reportsData?.summary ?? {
    totalRevenue: 0, totalCost: 0, totalProfit: 0, profitMargin: 0,
    totalOrders: 0, avgOrderValue: 0, revenueGrowth: 0, profitGrowth: 0,
  };
  const topProducts = reportsData?.topProducts ?? [];
  const supplierBreakdown = reportsData?.supplierBreakdown ?? [];
  const platformBreakdown = reportsData?.platformBreakdown ?? [];
  const dailyRevenue = reportsData?.dailyRevenue ?? [];

  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "all">("30d");
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const data = await safeFetch<{ csv?: string }>(`/api/fulfillment/reports?uid=${user.uid}&export=csv&range=${dateRange}`);
      if (data?.csv) {
        const blob = new Blob([data.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `financial-report-${dateRange}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      logger.error("Export failed", { error: err instanceof Error ? err.message : String(err) });
    }
    setExporting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-24">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-400">Failed to load reports</p>
          <p className="text-xs text-muted-foreground mt-1">Try refreshing the page</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-3">
            <BarChart3 className="h-6 w-6 text-accent" />
            Financial Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Revenue, profit, and performance analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as typeof dateRange)}
            className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="all">All time</option>
          </select>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-2 bg-accent/20 text-accent rounded-lg text-xs font-medium hover:bg-accent/30 transition-all disabled:opacity-50"
          >
            {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          label="Total Revenue"
          value={`$${summary.totalRevenue.toFixed(2)}`}
          change={summary.revenueGrowth}
          icon={DollarSign}
          gradient="from-emerald-500/15 to-emerald-500/5"
          borderColor="border-emerald-500/20"
        />
        <StatCard
          label="Total Profit"
          value={`$${summary.totalProfit.toFixed(2)}`}
          change={summary.profitGrowth}
          icon={TrendingUp}
          gradient="from-accent/15 to-accent/5"
          borderColor="border-accent/20"
        />
        <StatCard
          label="Profit Margin"
          value={`${summary.profitMargin.toFixed(1)}%`}
          icon={PieChart}
          gradient="from-purple-500/15 to-purple-500/5"
          borderColor="border-purple-500/20"
        />
        <StatCard
          label="Avg Order Value"
          value={`$${summary.avgOrderValue.toFixed(2)}`}
          icon={ShoppingCart}
          gradient="from-blue-500/15 to-blue-500/5"
          borderColor="border-blue-500/20"
        />
      </div>

      {/* Revenue Chart (placeholder bars) */}
      {dailyRevenue.length > 0 && (
        <div className="glass rounded-xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-accent" /> Daily Revenue
          </h3>
          <div className="flex items-end gap-1 h-32">
            {dailyRevenue.slice(-14).map((day, i) => {
              const maxRevenue = Math.max(...dailyRevenue.map((d) => d.revenue), 1);
              const height = (day.revenue / maxRevenue) * 100;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: $${day.revenue.toFixed(2)}`}>
                  <div
                    className="w-full bg-accent/30 rounded-t transition-all hover:bg-accent/50"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  {i % Math.ceil(dailyRevenue.length / 7) === 0 && (
                    <span className="text-[8px] text-muted-foreground">
                      {new Date(day.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-accent" /> Top Products
          </h3>
          {topProducts.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No product data yet</p>
          ) : (
            <div className="space-y-2">
              {topProducts.slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.unitsSold} units</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-bold text-foreground">${p.revenue.toFixed(2)}</p>
                    <p className={`text-[10px] ${p.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {p.margin.toFixed(1)}% margin
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Supplier Breakdown */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" /> By Supplier
          </h3>
          {supplierBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No supplier data yet</p>
          ) : (
            <div className="space-y-2">
              {supplierBreakdown.map((s, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
                  <div>
                    <p className="text-xs font-medium text-foreground">{s.supplierName}</p>
                    <p className="text-[10px] text-muted-foreground">{s.orders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-foreground">${s.revenue.toFixed(2)}</p>
                    <p className="text-[10px] text-accent">${s.profit.toFixed(2)} profit</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Platform Breakdown */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <PieChart className="h-4 w-4 text-accent" /> By Platform
          </h3>
          {platformBreakdown.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">No platform data yet</p>
          ) : (
            <div className="space-y-2">
              {platformBreakdown.map((p, i) => {
                const totalRevenue = platformBreakdown.reduce((sum, pl) => sum + pl.revenue, 0);
                const percentage = totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={i} className="p-2 rounded-lg bg-surface/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground capitalize">{p.platform}</span>
                      <span className="text-xs font-bold text-foreground">${p.revenue.toFixed(2)}</span>
                    </div>
                    <div className="w-full h-1.5 bg-surface rounded-full overflow-hidden">
                      <div className="h-full bg-accent/50 rounded-full" style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-muted-foreground">{p.orders} orders</span>
                      <span className="text-[10px] text-muted-foreground">{percentage.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Cost Breakdown */}
        <div className="glass rounded-xl p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-accent" /> Cost Breakdown
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
              <span className="text-xs text-muted-foreground">Total Revenue</span>
              <span className="text-xs font-bold text-emerald-400">${summary.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
              <span className="text-xs text-muted-foreground">Total Cost</span>
              <span className="text-xs font-bold text-red-400">-${summary.totalCost.toFixed(2)}</span>
            </div>
            <div className="border-t border-white/5 pt-2 flex items-center justify-between">
              <span className="text-xs font-medium text-foreground">Net Profit</span>
              <span className={`text-sm font-bold ${summary.totalProfit >= 0 ? "text-accent" : "text-red-400"}`}>
                ${summary.totalProfit.toFixed(2)}
              </span>
            </div>
            <div className="w-full h-2 bg-surface rounded-full overflow-hidden">
              <div className="flex h-full">
                <div
                  className="bg-emerald-400/50 h-full"
                  style={{ width: `${summary.totalRevenue > 0 ? (summary.totalCost / summary.totalRevenue) * 100 : 0}%` }}
                />
                <div
                  className="bg-accent/50 h-full"
                  style={{ width: `${summary.totalRevenue > 0 ? (summary.totalProfit / summary.totalRevenue) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Cost: {summary.totalRevenue > 0 ? ((summary.totalCost / summary.totalRevenue) * 100).toFixed(1) : 0}%</span>
              <span>Profit: {summary.profitMargin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
