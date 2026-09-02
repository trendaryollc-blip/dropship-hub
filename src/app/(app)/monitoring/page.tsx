"use client";

import { useState, useCallback } from "react";
import {
  Activity,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Package,
  RefreshCw,
  Trash2,
  ExternalLink,
  Bell,
  BellOff,
  Clock,
  Settings,
  Shield,
  Target,
  Zap,
  BarChart3,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";

interface PriceAlert {
  id: string;
  type: "price_drop" | "price_increase" | "out_of_stock" | "back_in_stock" | "competitor_undercut";
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
  priceDropThreshold?: number;
  autoDelist?: boolean;
  competitorUrls?: string[];
}

interface MonitoringMetrics {
  totalMonitored: number;
  inStock: number;
  outOfStock: number;
  unknown: number;
  avgPriceChangePercent: number;
  totalAlerts: number;
  unreadAlerts: number;
  priceDrops24h: number;
  priceIncreases24h: number;
  stockOutEvents24h: number;
  lastCheckTime: string | null;
}

interface MonitoringHealth {
  status: "healthy" | "degraded" | "critical";
  lastCheckAge: number | null;
  productsNeedingAttention: number;
  recommendations: string[];
}

const alertTypeConfig: Record<string, { icon: typeof TrendingDown; color: string; bg: string }> = {
  price_drop: { icon: TrendingDown, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  price_increase: { icon: TrendingUp, color: "text-red-400", bg: "bg-red-400/10" },
  out_of_stock: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10" },
  back_in_stock: { icon: Package, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  competitor_undercut: { icon: Target, color: "text-amber-400", bg: "bg-amber-400/10" },
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
  const { data: metricsData, mutate: mutateMetrics } = useAPI<{ metrics: MonitoringMetrics; health: MonitoringHealth }>("/api/monitoring?type=metrics");
  const products = productsData?.products ?? [];
  const alerts = alertsData?.alerts ?? [];
  const metrics = metricsData?.metrics;
  const health = metricsData?.health;
  const [activeTab, setActiveTab] = useState<"products" | "alerts" | "metrics">("products");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [thresholdValue, setThresholdValue] = useState<string>("5");
  const [autoDelistValue, setAutoDelistValue] = useState(false);

  const handleRemove = useCallback(async (monitoredId: string) => {
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
  }, [mutateProducts]);

  const handleMarkAlertRead = useCallback(async (monitoredId: string, alertIds: string[]) => {
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
  }, [mutateAlerts]);

  const handleRunCheck = useCallback(async () => {
    setChecking(true);
    try {
      await safeFetch("/api/monitoring/auto-check", { method: "POST" });
      mutateProducts();
      mutateAlerts();
      mutateMetrics();
    } catch {
      // Silently fail
    } finally {
      setChecking(false);
    }
  }, [mutateProducts, mutateAlerts, mutateMetrics]);

  const handleUpdateThreshold = useCallback(async (monitoredId: string) => {
    try {
      await safeFetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "updateThreshold",
          monitoredId,
          priceDropThreshold: Number(thresholdValue) || 5,
          autoDelist: autoDelistValue,
        }),
      });
      setEditingProduct(null);
      mutateProducts();
    } catch {
      // Silently fail
    }
  }, [thresholdValue, autoDelistValue, mutateProducts]);

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
            {health && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                health.status === "healthy" ? "bg-emerald-400/10 text-emerald-400" :
                health.status === "degraded" ? "bg-amber-400/10 text-amber-400" :
                "bg-red-400/10 text-red-400"
              }`}>
                {health.status}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Track price changes, stock status, and get alerts on your monitored products.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRunCheck}
            disabled={checking}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all disabled:opacity-50"
          >
            <Zap className={`h-3.5 w-3.5 ${checking ? "animate-pulse" : ""}`} />
            {checking ? "Checking..." : "Run Check"}
          </button>
          <button
            onClick={() => { mutateProducts(); mutateAlerts(); mutateMetrics(); }}
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
          <p className="font-display text-lg font-bold text-foreground">{metrics?.totalMonitored ?? products.length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Monitored</p>
        </div>
        <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
          <TrendingDown className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{metrics?.priceDrops24h ?? products.filter((p) => p.priceHistory.length > 1 && p.priceHistory[p.priceHistory.length - 1].price < p.priceHistory[0].price).length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Price Drops 24h</p>
        </div>
        <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
          <AlertTriangle className="h-4 w-4 text-amber-400 mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{metrics?.outOfStock ?? products.filter((p) => p.stockStatus === "out_of_stock").length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Out of Stock</p>
        </div>
        <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
          <Bell className="h-4 w-4 text-red-400 mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{metrics?.unreadAlerts ?? unreadAlertCount}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Unread Alerts</p>
        </div>
      </div>

      {/* Health Recommendations */}
      {health && health.recommendations.length > 0 && (
        <div className="glass rounded-xl p-4 border-l-4 border-amber-400">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-4 w-4 text-amber-400" />
            <span className="text-xs font-semibold text-foreground">Health Recommendations</span>
          </div>
          <ul className="space-y-1">
            {health.recommendations.map((rec, i) => (
              <li key={i} className="text-[11px] text-muted-foreground flex items-start gap-2">
                <span className="text-amber-400 mt-0.5">-</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
        {(["products", "alerts", "metrics"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab === "products" ? `Products (${products.length})` : tab === "alerts" ? `Alerts (${unreadAlertCount})` : "Metrics"}
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
              const isEditing = editingProduct === product.id;

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
                            {product.autoDelist && (
                              <>
                                <span className="text-[10px] text-muted-foreground/40">·</span>
                                <span className="text-[10px] text-accent font-medium">Auto-Delist</span>
                              </>
                            )}
                            {product.priceDropThreshold && product.priceDropThreshold !== 5 && (
                              <>
                                <span className="text-[10px] text-muted-foreground/40">·</span>
                                <span className="text-[10px] text-muted-foreground">Threshold: {product.priceDropThreshold}%</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              setEditingProduct(isEditing ? null : product.id);
                              setThresholdValue(String(product.priceDropThreshold || 5));
                              setAutoDelistValue(product.autoDelist || false);
                            }}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all"
                            title="Settings"
                          >
                            <Settings className="h-3.5 w-3.5" />
                          </button>
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

                      {/* Per-product settings panel */}
                      {isEditing && (
                        <div className="mt-3 p-3 rounded-lg bg-surface border border-border">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-muted-foreground">Price Drop Threshold:</label>
                              <select
                                value={thresholdValue}
                                onChange={(e) => setThresholdValue(e.target.value)}
                                className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground"
                              >
                                <option value="2">2%</option>
                                <option value="3">3%</option>
                                <option value="5">5%</option>
                                <option value="10">10%</option>
                                <option value="15">15%</option>
                                <option value="20">20%</option>
                              </select>
                            </div>
                            <div className="flex items-center gap-2">
                              <label className="text-[10px] text-muted-foreground">Auto-Delist on Stock-Out:</label>
                              <button
                                onClick={() => setAutoDelistValue(!autoDelistValue)}
                                className={`w-8 h-4 rounded-full transition-all ${autoDelistValue ? "bg-accent" : "bg-border"}`}
                              >
                                <div className={`w-3 h-3 rounded-full bg-white transition-all ${autoDelistValue ? "translate-x-4" : "translate-x-0.5"}`} />
                              </button>
                            </div>
                            <button
                              onClick={() => handleUpdateThreshold(product.id)}
                              className="px-3 py-1 rounded-lg bg-accent text-white text-[10px] font-semibold hover:bg-accent/90 transition-all"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      )}
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

      {/* Metrics Tab */}
      {activeTab === "metrics" && metrics && (
        <div className="space-y-4">
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
              <p className="text-2xl font-bold text-foreground">{metrics.avgPriceChangePercent > 0 ? "+" : ""}{metrics.avgPriceChangePercent}%</p>
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
        </div>
      )}
    </div>
  );
}
