"use client";

import { useState } from "react";
import {
  Activity,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  RefreshCw,
  Trash2,
  Plus,
  ExternalLink,
  Bell,
  BellOff,
  Clock,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";

interface PriceAlert {
  id: string;
  type: "price_drop" | "price_increase" | "out_of_stock" | "back_in_stock";
  message: string;
  oldPrice?: number;
  newPrice?: number;
  createdAt: string;
  read: boolean;
}

interface MonitoredProduct {
  id: string;
  productId: string;
  productTitle: string;
  productImage?: string;
  source: string;
  sourceUrl: string;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  lastChecked: string;
  priceHistory: { date: string; price: number }[];
  stockStatus: "in_stock" | "out_of_stock" | "unknown";
  alerts: PriceAlert[];
}

const alertTypeConfig: Record<string, { icon: typeof TrendingDown; color: string; bg: string }> = {
  price_drop: { icon: TrendingDown, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  price_increase: { icon: TrendingUp, color: "text-red-400", bg: "bg-red-400/10" },
  out_of_stock: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10" },
  back_in_stock: { icon: Package, color: "text-emerald-400", bg: "bg-emerald-400/10" },
};

function MiniSparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 32;
  const w = 80;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(" ");
  const isDown = data[data.length - 1] < data[0];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-8">
      <polyline
        points={points}
        fill="none"
        stroke={isDown ? "#ef4444" : "#22c55e"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function MonitoringPage() {
  const { data: productsData, isLoading: loading, mutate: mutateProducts } = useAPI<{ products: MonitoredProduct[] }>("/api/monitoring?type=list");
  const { data: alertsData, mutate: mutateAlerts } = useAPI<{ alerts: (PriceAlert & { productTitle: string; productId: string })[] }>("/api/monitoring?type=alerts");
  const products = productsData?.products ?? [];
  const alerts = alertsData?.alerts ?? [];
  const [activeTab, setActiveTab] = useState<"products" | "alerts">("products");
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (monitoredId: string) => {
    setRemovingId(monitoredId);
    try {
      await safeFetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", monitoredId }),
      });
      mutateProducts();
    } catch {
      // Silently fail
    } finally {
      setRemovingId(null);
    }
  };

  const handleMarkAlertRead = async (monitoredId: string, alertIds: string[]) => {
    try {
      await safeFetch("/api/monitoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitoredId, alertIds }),
      });
      mutateAlerts();
    } catch {
      // Silently fail
    }
  };

  const unreadAlertCount = products.reduce((sum, p) => sum + p.alerts.filter((a) => !a.read).length, 0);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              Price Monitor
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track price changes, stock status, and get alerts on your monitored products.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { mutateProducts(); mutateAlerts(); }}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
          <Activity className="h-4 w-4 text-accent mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{products.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Monitored</p>
        </div>
        <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
          <TrendingDown className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">
            {products.filter((p) => p.priceHistory.length > 1 && p.priceHistory[p.priceHistory.length - 1].price < p.priceHistory[0].price).length}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Price Drops</p>
        </div>
        <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
          <AlertTriangle className="h-4 w-4 text-amber-400 mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">
            {products.filter((p) => p.stockStatus === "out_of_stock").length}
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Out of Stock</p>
        </div>
        <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
          <Bell className="h-4 w-4 text-red-400 mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{unreadAlertCount}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Unread Alerts</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
        {(["products", "alerts"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab === "products" ? `Products (${products.length})` : `Alerts (${unreadAlertCount})`}
          </button>
        ))}
      </div>

      {/* Products List */}
      {activeTab === "products" && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-xs text-muted-foreground mt-2">Loading monitored products...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="glass rounded-2xl py-12 text-center">
              <Activity className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">No products being monitored</p>
              <p className="text-[11px] text-muted-foreground/60">Visit a product page and click &quot;Monitor Price&quot; to start tracking.</p>
            </div>
          ) : (
            products.map((product) => {
              const priceChange = product.priceHistory.length > 1
                ? ((product.priceHistory[product.priceHistory.length - 1].price - product.priceHistory[0].price) / product.priceHistory[0].price) * 100
                : 0;
              const sparkData = product.priceHistory.map((h) => h.price);

              return (
                <div key={product.id} className="glass rounded-xl p-4 hover:border-accent/20 transition-all">
                  <div className="flex items-start gap-4">
                    {product.productImage && (
                      <img
                        src={product.productImage}
                        alt={product.productTitle}
                        className="h-14 w-14 rounded-lg object-cover border border-border shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate">{product.productTitle}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground capitalize">{product.source}</span>
                            <span className="text-[10px] text-muted-foreground/40">·</span>
                            <span className={`text-[10px] font-medium ${product.stockStatus === "in_stock" ? "text-emerald-400" : product.stockStatus === "out_of_stock" ? "text-red-400" : "text-muted-foreground"}`}>
                              {product.stockStatus === "in_stock" ? "In Stock" : product.stockStatus === "out_of_stock" ? "Out of Stock" : "Unknown"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {product.sourceUrl && (
                            <a
                              href={product.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleRemove(product.id)}
                            disabled={removingId === product.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-400/10 transition-all disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <p className="text-lg font-bold text-foreground">${product.currentPrice.toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">Current</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground">${product.lowestPrice.toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">Lowest</p>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-muted-foreground">${product.highestPrice.toFixed(2)}</p>
                          <p className="text-[10px] text-muted-foreground">Highest</p>
                        </div>
                        {priceChange !== 0 && (
                          <div className={`flex items-center gap-1 ${priceChange < 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {priceChange < 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                            <span className="text-xs font-semibold">{priceChange > 0 ? "+" : ""}{priceChange.toFixed(1)}%</span>
                          </div>
                        )}
                        <MiniSparkline data={sparkData} />
                      </div>

                      <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>Last checked: {new Date(product.lastChecked).toLocaleString()}</span>
                        {product.alerts.filter((a) => !a.read).length > 0 && (
                          <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[9px] font-semibold">
                            {product.alerts.filter((a) => !a.read).length} alert{product.alerts.filter((a) => !a.read).length > 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Alerts List */}
      {activeTab === "alerts" && (
        <div className="space-y-3">
          {loading ? (
            <div className="py-12 text-center">
              <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              <p className="text-xs text-muted-foreground mt-2">Loading alerts...</p>
            </div>
          ) : alerts.length === 0 ? (
            <div className="glass rounded-2xl py-12 text-center">
              <BellOff className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No unread alerts</p>
            </div>
          ) : (
            alerts.map((alert) => {
              const cfg = alertTypeConfig[alert.type] || alertTypeConfig.price_drop;
              const Icon = cfg.icon;
              return (
                <div key={alert.id} className="glass rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-1.5 rounded-lg ${cfg.bg} shrink-0 mt-0.5`}>
                      <Icon className={`h-4 w-4 ${cfg.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{alert.productTitle}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{alert.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => {
                        const product = products.find((p) => p.productId === alert.productId);
                        if (product) handleMarkAlertRead(product.id, [alert.id]);
                      }}
                      className="text-[10px] text-accent hover:text-accent/80 shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
