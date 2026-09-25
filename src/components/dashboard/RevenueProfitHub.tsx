"use client";

import Link from "next/link";
import {
  DollarSign, ShoppingCart, TrendingUp, Store, Truck, Package, BarChart3, ArrowUpRight,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { SectionDivider } from "./SectionDivider";

export function RevenueProfitHub({ stats, chartData, storesConnected, suppliersActive, pendingOrders, marginPct }: {
  stats: { revenue: number; growth: number; orders: number; avgOrder: number; profit: number };
  chartData: { date: string; value: number }[];
  storesConnected: number;
  suppliersActive: number;
  pendingOrders: number;
  marginPct: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const revenue = stats.revenue ?? 0;
  const orders = stats.orders ?? 0;
  const avgOrder = stats.avgOrder ?? 0;
  const profitTotal = stats.profit ?? 0;
  const profitPerOrder = orders > 0 ? profitTotal / orders : 0;
  const growth = stats.growth ?? 0;

  const chartMax = chartData.length > 0 ? Math.max(...chartData.map(d => d.value), 1) : 1;

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Revenue & Profit" icon={DollarSign} />

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2 mt-4 mb-3">
        {storesConnected > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Store className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">{storesConnected} store{storesConnected !== 1 ? "s" : ""}</span>
          </div>
        )}
        {suppliersActive > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Truck className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-400">{suppliersActive} supplier{suppliersActive !== 1 ? "s" : ""}</span>
          </div>
        )}
        {pendingOrders > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Package className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">{pendingOrders} pending</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]" title="Revenue and order totals from your Firestore entries">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-gray-400">Your data</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {[
          { icon: DollarSign, label: "Revenue", value: revenue, prefix: "$", change: growth, color: "emerald" },
          { icon: ShoppingCart, label: "Orders", value: orders, color: "blue" },
          { icon: TrendingUp, label: "Avg Order Value", value: avgOrder, prefix: "$", color: "purple" },
        ].map((kpi) => {
          const cMap: Record<string, string> = { emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", blue: "text-blue-400 bg-blue-400/10 border-blue-400/20", purple: "text-purple-400 bg-purple-400/10 border-purple-400/20" };
          const bgMap: Record<string, string> = { emerald: "from-emerald-500/[0.06] to-emerald-600/[0.02] border-emerald-500/15", blue: "from-blue-500/[0.06] to-blue-600/[0.02] border-blue-500/15", purple: "from-purple-500/[0.06] to-purple-600/[0.02] border-purple-500/15" };
          const kpiValue = kpi.value ?? 0;
          return (
            <div key={kpi.label} className={`p-4 rounded-2xl bg-gradient-to-br ${bgMap[kpi.color]} border hover:brightness-110 transition-all duration-300`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl border ${cMap[kpi.color]}`}>
                  <kpi.icon className="h-4 w-4" />
                </div>
                {kpi.change !== undefined && kpi.change !== 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${kpi.change >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {kpi.change >= 0 ? "+" : ""}{kpi.change}%
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{kpi.label}</p>
              <p className="font-display text-xl font-bold text-white">{kpi.prefix}{kpiValue.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Revenue Chart Card */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Revenue Overview</span>
              {growth !== 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${growth >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                  {growth >= 0 ? "+" : ""}{growth}%
                </span>
              )}
            </div>
            <Link href="/revenue" className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              Full Report <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {chartData.length > 0 ? (
            <>
              <div className="flex items-end gap-1 h-32">
                {chartData.map((d, i) => (
                  <div key={d.date} className="flex-1 rounded-t-sm bg-gradient-to-t from-cyan-500/40 to-cyan-400/20 transition-all duration-500 hover:from-cyan-500/60 hover:to-cyan-400/40 relative group/bar"
                    style={{ height: `${(d.value / chartMax) * 100}%`, opacity: isInView ? 1 : 0, transitionDelay: `${i * 30}ms` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/bar:block px-2 py-1 rounded bg-black/80 text-[9px] text-white whitespace-nowrap">
                      ${d.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 text-[9px] text-gray-600">
                <span>{chartData[0]?.date}</span>
                <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>
                <span>{chartData[chartData.length - 1]?.date}</span>
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-[11px] text-gray-600">No revenue data yet</div>
          )}
        </div>

        {/* Profit Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] to-emerald-600/[0.03] border border-emerald-500/20 hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Profit Tracker</span>
          </div>
          <div className="text-center mb-4">
            <p className="font-display text-3xl font-bold text-emerald-400">${profitPerOrder.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-emerald-400/70 mt-1">Profit per Order</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Margin</span>
              <span className="font-semibold text-white">{marginPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
                style={{ width: `${Math.min(100, marginPct)}%` }} />
            </div>
            <div className="h-px bg-emerald-500/10" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Avg. Order Value</span>
              <span className="font-semibold text-white">${avgOrder.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Total Profit</span>
              <span className="font-semibold text-white">${profitTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Total Revenue</span>
              <span className="font-semibold text-white">${revenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Total Orders</span>
              <span className="font-semibold text-white">{orders.toLocaleString()}</span>
            </div>
          </div>
          <Link href="/profit-tracker" className="mt-4 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all">
            View Tracker <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
