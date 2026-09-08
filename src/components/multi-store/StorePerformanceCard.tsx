"use client";

import { useInView } from "@/hooks/useInView";
import type { StorePerformance } from "@/types/multi-store";
import { platformColors } from "./constants";

interface StorePerformanceCardProps {
  perf: StorePerformance;
  delay: number;
}

export default function StorePerformanceCard({ perf, delay }: StorePerformanceCardProps) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const color = platformColors[perf.storePlatform] || "#6b7280";
  return (
    <div ref={ref} className={`glass rounded-xl p-4 border-l-2 transition-all duration-500 hover:border-accent/20 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ borderLeftColor: color, transitionDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-semibold text-foreground">{perf.storeName}</h4>
          <p className="text-[10px] text-muted-foreground capitalize">{perf.storePlatform}</p>
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground">{perf.period}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-2 rounded-lg bg-surface">
          <p className="text-[9px] text-muted-foreground">Orders</p>
          <p className="text-xs font-bold text-foreground">{perf.metrics.totalOrders}</p>
          <span className={`text-[9px] font-semibold ${perf.trends.ordersTrend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {perf.trends.ordersTrend >= 0 ? "+" : ""}{perf.trends.ordersTrend}%
          </span>
        </div>
        <div className="p-2 rounded-lg bg-surface">
          <p className="text-[9px] text-muted-foreground">Revenue</p>
          <p className="text-xs font-bold text-foreground">${perf.metrics.totalRevenue.toLocaleString()}</p>
          <span className={`text-[9px] font-semibold ${perf.trends.revenueTrend >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {perf.trends.revenueTrend >= 0 ? "+" : ""}{perf.trends.revenueTrend}%
          </span>
        </div>
        <div className="p-2 rounded-lg bg-surface">
          <p className="text-[9px] text-muted-foreground">Avg Order</p>
          <p className="text-xs font-bold text-foreground">${perf.metrics.avgOrderValue.toFixed(2)}</p>
        </div>
        <div className="p-2 rounded-lg bg-surface">
          <p className="text-[9px] text-muted-foreground">Conv. Rate</p>
          <p className="text-xs font-bold text-foreground">{perf.metrics.conversionRate}%</p>
        </div>
      </div>
    </div>
  );
}
