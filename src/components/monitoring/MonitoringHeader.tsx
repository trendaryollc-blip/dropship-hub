"use client";

import { Zap, RefreshCw, Download } from "lucide-react";
import Breadcrumbs from "@/components/ui/Breadcrumbs";

interface MonitoringHeaderProps {
  checking: boolean;
  loading: boolean;
  onRunCheck: () => void;
  onRefresh: () => void;
  onExport: () => void;
}

export default function MonitoringHeader({
  checking,
  loading,
  onRunCheck,
  onRefresh,
  onExport,
}: MonitoringHeaderProps) {
  return (
    <>
      <Breadcrumbs items={[{ label: "Dashboard", href: "/dashboard" }, { label: "Price Monitor" }]} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
            Price Monitor
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track price changes, stock status, and get alerts on your monitored products.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onRunCheck}
            disabled={checking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all disabled:opacity-50"
          >
            <Zap className={`h-3.5 w-3.5 ${checking ? "animate-pulse" : ""}`} />
            {checking ? "Checking..." : "Run Check"}
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            Export
          </button>
        </div>
      </div>
    </>
  );
}
