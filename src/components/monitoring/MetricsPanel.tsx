"use client";

import { CheckCircle, XCircle, BarChart3, TrendingDown, TrendingUp, AlertTriangle, Clock, DollarSign, Zap, Check, X } from "lucide-react";
import type { MonitoringMetrics } from "@/lib/monitoring/types";

interface RepriceStats {
  totalReprices: number;
  successfulReprices: number;
  failedReprices: number;
  avgPriceChange: number;
  lastRepriceTime: string | null;
}

interface MetricsPanelProps {
  metrics: MonitoringMetrics;
  repriceStats?: RepriceStats;
}

export default function MetricsPanel({ metrics, repriceStats }: MetricsPanelProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold text-foreground">In Stock</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.inStock}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="h-4 w-4 text-red-400" />
            <span className="text-xs font-semibold text-foreground">Out of Stock</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.outOfStock}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="h-4 w-4 text-accent" />
            <span className="text-xs font-semibold text-foreground">Avg Price Change</span>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {metrics.avgPriceChangePercent > 0 ? "+" : ""}{metrics.avgPriceChangePercent}%
          </p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-4 w-4 text-emerald-400" />
            <span className="text-xs font-semibold text-foreground">Drops 24h</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.priceDrops24h}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-red-400" />
            <span className="text-xs font-semibold text-foreground">Increases 24h</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.priceIncreases24h}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-foreground">Stock-Outs 24h</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{metrics.stockOutEvents24h}</p>
        </div>
      </div>

      {metrics.lastCheckTime && (
        <div className="glass rounded-xl p-4 flex items-center gap-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div>
            <p className="text-xs font-semibold text-foreground">Last Price Check</p>
            <p className="text-[11px] text-muted-foreground">{new Date(metrics.lastCheckTime).toLocaleString()}</p>
          </div>
        </div>
      )}

      {repriceStats && repriceStats.totalReprices > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Repricing Stats</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-accent" />
                <span className="text-xs font-semibold text-foreground">Total Reprices</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{repriceStats.totalReprices}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-xs font-semibold text-foreground">Successful</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{repriceStats.successfulReprices}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <X className="h-4 w-4 text-red-400" />
                <span className="text-xs font-semibold text-foreground">Failed</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{repriceStats.failedReprices}</p>
            </div>
            <div className="glass rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-foreground">Avg Price Change</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {repriceStats.avgPriceChange > 0 ? "+" : ""}{repriceStats.avgPriceChange}%
              </p>
            </div>
            {repriceStats.lastRepriceTime && (
              <div className="glass rounded-xl p-4 sm:col-span-2">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-semibold text-foreground">Last Reprice</span>
                </div>
                <p className="text-sm text-muted-foreground">{new Date(repriceStats.lastRepriceTime).toLocaleString()}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
