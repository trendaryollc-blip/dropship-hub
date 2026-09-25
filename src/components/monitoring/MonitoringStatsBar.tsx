"use client";

import { Activity, TrendingDown, AlertTriangle, Bell } from "lucide-react";
import type { MonitoringMetrics, MonitoredProduct } from "@/lib/monitoring/types";

interface MonitoringStatsBarProps {
  metrics?: MonitoringMetrics;
  products: MonitoredProduct[];
  unreadAlertCount: number;
}

export default function MonitoringStatsBar({ metrics, products, unreadAlertCount }: MonitoringStatsBarProps) {
  const fallbackDrops = products.filter(
    (p) => p.priceHistory.length > 1 && p.priceHistory[p.priceHistory.length - 1].price < p.priceHistory[0].price
  ).length;
  const fallbackOutOfStock = products.filter((p) => p.stockStatus === "out_of_stock").length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
        <Activity className="h-4 w-4 text-accent mx-auto mb-1" />
        <p className="font-display text-lg font-bold text-foreground">{metrics?.totalMonitored ?? products.length}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Monitored</p>
      </div>
      <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
        <TrendingDown className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
        <p className="font-display text-lg font-bold text-foreground">{metrics?.priceDrops24h ?? fallbackDrops}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{metrics?.priceDrops24h != null ? "Price Drops 24h" : "Price Drops (all-time)"}</p>
      </div>
      <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
        <AlertTriangle className="h-4 w-4 text-amber-400 mx-auto mb-1" />
        <p className="font-display text-lg font-bold text-foreground">{metrics?.outOfStock ?? fallbackOutOfStock}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Out of Stock</p>
      </div>
      <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
        <Bell className="h-4 w-4 text-red-400 mx-auto mb-1" />
        <p className="font-display text-lg font-bold text-foreground">{metrics?.unreadAlerts ?? unreadAlertCount}</p>
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Unread Alerts</p>
      </div>
    </div>
  );
}
