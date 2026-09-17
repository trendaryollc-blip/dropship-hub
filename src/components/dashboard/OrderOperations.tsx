"use client";

import Link from "next/link";
import {
  Package, ShoppingCart, Clock, RefreshCw, Truck, CheckCircle2, DollarSign,
  GitBranch, ChevronRight, RotateCcw, Map, Globe, ArrowUpRight,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { SectionDivider } from "./SectionDivider";
import type { FulfillmentPipelineData } from "@/types/dashboard";

export function OrderOperations({ pipeline }: { pipeline: FulfillmentPipelineData }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const pending = pipeline.pending ?? 0;
  const processing = pipeline.processing ?? 0;
  const shipped = pipeline.shipped ?? 0;
  const delivered = pipeline.delivered ?? 0;
  const total = pending + processing + shipped + delivered;
  const totalRevenue = pipeline.totalRevenue ?? 0;
  const totalProfit = pipeline.totalProfit ?? 0;
  const marginPct = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  const stages = [
    { label: "Pending", count: pending, color: "#f59e0b", icon: Clock },
    { label: "Processing", count: processing, color: "#3b82f6", icon: RefreshCw },
    { label: "Shipped", count: shipped, color: "#a855f7", icon: Truck },
    { label: "Delivered", count: delivered, color: "#22c55e", icon: CheckCircle2 },
  ];
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  const statusCfg: Record<string, { color: string; label: string }> = {
    pending: { color: "text-amber-400", label: "Pending" },
    in_progress: { color: "text-blue-400", label: "Processing" },
    shipped: { color: "text-purple-400", label: "Shipped" },
    delivered: { color: "text-emerald-400", label: "Delivered" },
  };

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Order Operations" icon={Package} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
        {/* Pipeline Visual */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Fulfillment Pipeline</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-medium">{total} orders</span>
            </div>
            <Link href="/fulfillment" className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              View Pipeline <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Pipeline Bars */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {stages.map((stage) => (
              <div key={stage.label} className="text-center">
                <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden mb-2">
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                    style={{ width: isInView ? `${(stage.count / maxCount) * 100}%` : "0%", backgroundColor: stage.color }} />
                </div>
                <p className="font-display text-lg font-bold text-white">{stage.count}</p>
                <p className="text-[9px] text-gray-500">{stage.label}</p>
              </div>
            ))}
          </div>

          {/* Recent Orders */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Orders</p>
            {(pipeline.recentOrders ?? []).length === 0 ? (
              <p className="text-[10px] text-gray-600 text-center py-4">No recent orders</p>
            ) : (
              <div className="space-y-1.5">
                {(pipeline.recentOrders ?? []).slice(0, 4).map((order) => {
                  const cfg = statusCfg[order.status] || statusCfg.pending;
                  return (
                    <div key={order.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-all">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{order.customer}</p>
                        <p className="text-[9px] text-gray-500 truncate">{order.product}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-white">${order.amount.toFixed(2)}</p>
                        <p className={`text-[9px] font-medium ${cfg.color}`}>{cfg.label}</p>
                      </div>
                      <span className="text-[9px] text-gray-600 shrink-0 w-12 text-right">{order.time}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/[0.06] to-emerald-600/[0.03] border border-emerald-500/15">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">Pipeline Revenue</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Total Revenue</span>
                <span className="text-sm font-bold text-white">${totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Total Profit</span>
                <span className="text-sm font-bold text-emerald-400">${totalProfit.toLocaleString()}</span>
              </div>
              <div className="h-px bg-emerald-500/10" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Margin</span>
                <span className="text-sm font-bold text-emerald-400">{marginPct}%</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="space-y-1.5">
              {[
                { icon: Package, label: "Bulk Orders", href: "/bulk-orders", color: "text-blue-400" },
                { icon: RotateCcw, label: "Returns", href: "/returns", color: "text-amber-400" },
                { icon: Map, label: "Order Router", href: "/order-router", color: "text-purple-400" },
                { icon: Globe, label: "Shipping Optimizer", href: "/shipping-optimizer", color: "text-cyan-400" },
              ].map((l) => (
                <Link key={l.href} href={l.href} aria-label={`Open ${l.label}`} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-all group">
                  <l.icon className={`h-4 w-4 ${l.color}`} />
                  <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">{l.label}</span>
                  <ChevronRight className="h-3 w-3 text-gray-600 ml-auto group-hover:text-gray-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
