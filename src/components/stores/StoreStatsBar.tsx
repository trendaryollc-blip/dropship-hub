"use client";

import { Store, Package, RefreshCw, AlertTriangle } from "lucide-react";
import type { ConnectedStore } from "./ConnectedStoresList";
import type { PushedProduct } from "./PushedProductsList";

interface StoreStatsBarProps {
  connections: ConnectedStore[];
  pushedProducts: PushedProduct[];
}

export default function StoreStatsBar({ connections, pushedProducts }: StoreStatsBarProps) {
  if (connections.length === 0) return null;

  const liveCount = pushedProducts.filter((p) => p.status === "live" || p.status === "pushed").length;
  const errorCount = pushedProducts.filter((p) => p.status === "error").length;
  const lastSync = connections
    .filter((c) => c.lastSyncAt)
    .sort((a, b) => new Date(b.lastSyncAt!).getTime() - new Date(a.lastSyncAt!).getTime())[0]?.lastSyncAt;

  const stats = [
    {
      icon: Store,
      label: "Connected",
      value: connections.length.toString(),
      color: "text-emerald-400",
      bg: "bg-emerald-400/10 border-emerald-400/20",
    },
    {
      icon: Package,
      label: "Products Live",
      value: liveCount.toString(),
      color: "text-blue-400",
      bg: "bg-blue-400/10 border-blue-400/20",
    },
    {
      icon: RefreshCw,
      label: "Last Sync",
      value: lastSync ? timeAgo(lastSync) : "Never",
      color: "text-purple-400",
      bg: "bg-purple-400/10 border-purple-400/20",
    },
    {
      icon: AlertTriangle,
      label: "Errors",
      value: errorCount.toString(),
      color: errorCount > 0 ? "text-red-400" : "text-muted-foreground",
      bg: errorCount > 0 ? "bg-red-400/10 border-red-400/20" : "bg-surface border-border",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="glass rounded-xl p-4 flex items-center gap-3 hover:border-accent/20 transition-all">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${stat.bg}`}>
            <stat.icon className={`h-4.5 w-4.5 ${stat.color}`} />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-muted-foreground truncate">{stat.label}</p>
            <p className="font-display text-lg font-bold text-foreground truncate">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
