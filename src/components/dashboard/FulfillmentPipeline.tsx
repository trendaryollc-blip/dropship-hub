"use client";

import Link from "next/link";
import {
  Package, ArrowUpRight, Clock, Truck, CheckCircle2, CircleDot,
  DollarSign, TrendingUp,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import type { FulfillmentPipelineData } from "@/types/dashboard";

const statusConfig = {
  pending: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20", barColor: "from-amber-400 to-amber-500", label: "Pending" },
  in_progress: { icon: CircleDot, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20", barColor: "from-blue-400 to-blue-500", label: "Processing" },
  shipped: { icon: Truck, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20", barColor: "from-purple-400 to-purple-500", label: "Shipped" },
  delivered: { icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", barColor: "from-emerald-400 to-emerald-500", label: "Delivered" },
};

function PipelineBar({ label, count, maxCount, barColor, delay }: {
  label: string;
  count: number;
  maxCount: number;
  barColor: string;
  delay: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const animatedCount = useAnimatedCounter(count, 600, isInView);
  const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;

  return (
    <div ref={ref} className={`transition-all duration-500 ${isInView ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
        <span className="font-display text-sm font-bold text-foreground">{animatedCount}</span>
      </div>
      <div className="h-2 rounded-full bg-surface overflow-hidden">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-1000 ease-out`}
          style={{ width: isInView ? `${widthPct}%` : "0%" }}
        />
      </div>
    </div>
  );
}

function OrderRow({ order, index }: { order: FulfillmentPipelineData["recentOrders"][0]; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const cfg = statusConfig[order.status];
  const Icon = cfg.icon;

  return (
    <div
      ref={ref}
      className={`flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface/50 transition-all duration-300 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
      style={{ transitionDelay: `${index * 60}ms` }}
    >
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${cfg.bg}`}>
        <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{order.customer}</p>
        <p className="text-[10px] text-muted-foreground truncate">{order.product}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs font-semibold text-foreground">${order.amount.toFixed(2)}</p>
        <p className={`text-[10px] font-medium ${cfg.color}`}>{cfg.label}</p>
      </div>
      <span className="text-[9px] text-muted-foreground/60 shrink-0 w-10 text-right">{order.time}</span>
    </div>
  );
}

export default function FulfillmentPipeline({ data }: { data: FulfillmentPipelineData }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const total = data.pending + data.processing + data.shipped + data.delivered;
  const maxCount = Math.max(data.pending, data.processing, data.shipped, data.delivered, 1);
  const marginPct = data.totalRevenue > 0 ? Math.round((data.totalProfit / data.totalRevenue) * 100) : 0;

  return (
    <div ref={ref} className={`glass rounded-2xl overflow-hidden transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 border border-accent/20">
            <Package className="h-4.5 w-4.5 text-accent" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Fulfillment Pipeline</h3>
            <p className="text-[10px] text-muted-foreground">{total} total orders</p>
          </div>
        </div>
        <Link href="/fulfillment" className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors font-medium">
          View All <ArrowUpRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Pipeline Bars */}
      <div className="p-4 sm:p-5 space-y-3 border-b border-border/50">
        <PipelineBar label="Pending" count={data.pending} maxCount={maxCount} barColor="from-amber-400 to-amber-500" delay={0} />
        <PipelineBar label="Processing" count={data.processing} maxCount={maxCount} barColor="from-blue-400 to-blue-500" delay={80} />
        <PipelineBar label="Shipped" count={data.shipped} maxCount={maxCount} barColor="from-purple-400 to-purple-500" delay={160} />
        <PipelineBar label="Delivered" count={data.delivered} maxCount={maxCount} barColor="from-emerald-400 to-emerald-500" delay={240} />
      </div>

      {/* Recent Orders */}
      <div className="p-4 sm:p-5 border-b border-border/50">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent Orders</p>
        <div className="space-y-1">
          {data.recentOrders.slice(0, 3).map((order, i) => (
            <OrderRow key={order.id} order={order} index={i} />
          ))}
          {data.recentOrders.length === 0 && (
            <p className="text-[11px] text-muted-foreground text-center py-4">No recent orders</p>
          )}
        </div>
      </div>

      {/* Revenue Footer */}
      <div className="p-4 sm:p-5 flex items-center gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10">
            <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase">Revenue</p>
            <p className="text-sm font-bold text-foreground">${data.totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex items-center gap-2 flex-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-400/10">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase">Profit</p>
            <p className="text-sm font-bold text-emerald-400">${data.totalProfit.toLocaleString()}</p>
          </div>
        </div>
        <div className="w-px h-8 bg-border" />
        <div className="flex items-center gap-2 flex-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
            <TrendingUp className="h-3.5 w-3.5 text-accent" />
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground uppercase">Margin</p>
            <p className="text-sm font-bold text-accent">{marginPct}%</p>
          </div>
        </div>
      </div>
    </div>
  );
}
