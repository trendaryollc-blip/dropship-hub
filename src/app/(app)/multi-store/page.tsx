"use client";

import { useState, useMemo } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import {
  Store, Package, RefreshCw, Send, BarChart3, Loader2, Globe, Zap,
  ShoppingCart, DollarSign, TrendingUp,
} from "lucide-react";
import type { UnifiedOrder, StorePerformance, BulkPushJob, StoreInventoryItem } from "@/types/multi-store";
import type { ConnectedStore } from "@/components/stores/ConnectedStoresList";
import KpiCard from "@/components/multi-store/KpiCard";
import UnifiedOrderRow from "@/components/multi-store/UnifiedOrderRow";
import StorePerformanceCard from "@/components/multi-store/StorePerformanceCard";
import BulkPushPanel from "@/components/multi-store/BulkPushPanel";
import InventorySyncPanel from "@/components/multi-store/InventorySyncPanel";
import MultiStoreAIBar from "@/components/multi-store/MultiStoreAIBar";
import MultiStoreChatSidebar from "@/components/multi-store/MultiStoreChatSidebar";

export default function MultiStorePage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const [activeTab, setActiveTab] = useState<"orders" | "inventory" | "performance" | "bulk-push">("orders");
  const [orderFilter, setOrderFilter] = useState<{ storeId?: string; status?: string }>({});
  const [performancePeriod, setPerformancePeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const { data: connData, mutate: refetchConnections } = useAPI<{ connections?: ConnectedStore[] }>(uid ? `/api/store/connections?uid=${uid}` : null);
  const { data: orderData } = useAPI<{ orders?: UnifiedOrder[] }>(uid ? `/api/multi-store/orders?uid=${uid}` : null);
  const { data: invData } = useAPI<{ inventory?: StoreInventoryItem[] }>(uid ? `/api/multi-store/inventory?uid=${uid}` : null);
  const { data: perfData, mutate: refetchPerf } = useAPI<{ performances?: StorePerformance[] }>(uid ? `/api/multi-store/performance?uid=${uid}&period=${performancePeriod}` : null);
  const { data: pushData } = useAPI<{ jobs?: BulkPushJob[] }>(uid ? `/api/multi-store/bulk-push?uid=${uid}` : null);

  const stores = connData?.connections || [];
  const orders = useMemo(() => orderData?.orders || [], [orderData]);
  const inventory = invData?.inventory || [];
  const performances = perfData?.performances || [];
  const bulkJobs = pushData?.jobs || [];
  const loading = !user || (!connData && !orderData);

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderFilter.storeId && o.storeId !== orderFilter.storeId) return false;
      if (orderFilter.status && o.status !== orderFilter.status) return false;
      return true;
    });
  }, [orders, orderFilter]);

  const totalRevenue = performances.reduce((sum, p) => sum + p.metrics.totalRevenue, 0);
  const totalOrders = performances.reduce((sum, p) => sum + p.metrics.totalOrders, 0);
  const totalProfit = performances.reduce((sum, p) => sum + p.metrics.totalProfit, 0);

  const handleAIBarAction = async (action: string) => {
    setAiLoading(action);
    await new Promise((r) => setTimeout(r, 1200));
    setAiLoading(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
            <Store className="h-7 w-7 text-accent" /> Multi-Store Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
            Unified view across all connected stores. Manage orders, sync inventory, and compare performance.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-[10px] sm:text-[11px] font-semibold text-emerald-400">
            <Store className="h-3 w-3" />
            {stores.filter((s) => s.status === "connected").length} stores
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Orders" value={totalOrders} trend={5} icon={<ShoppingCart className="h-4 w-4 text-accent" />} delay={0} />
        <KpiCard label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} trend={12} icon={<DollarSign className="h-4 w-4 text-emerald-400" />} delay={100} />
        <KpiCard label="Total Profit" value={`$${totalProfit.toLocaleString()}`} trend={8} icon={<TrendingUp className="h-4 w-4 text-blue-400" />} delay={200} />
        <KpiCard label="Active Stores" value={stores.filter((s) => s.status === "connected").length} icon={<Globe className="h-4 w-4 text-purple-400" />} delay={300} />
      </div>

      <MultiStoreAIBar onAction={handleAIBarAction} loading={aiLoading} storeCount={stores.length} totalOrders={totalOrders} totalRevenue={totalRevenue} />

      <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border overflow-x-auto">
        {[
          { id: "orders" as const, label: "Unified Orders", icon: <Package className="h-3.5 w-3.5" /> },
          { id: "inventory" as const, label: "Inventory Sync", icon: <RefreshCw className="h-3.5 w-3.5" /> },
          { id: "performance" as const, label: "Performance", icon: <BarChart3 className="h-3.5 w-3.5" /> },
          { id: "bulk-push" as const, label: "Bulk Push", icon: <Send className="h-3.5 w-3.5" /> },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id ? "bg-accent text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "orders" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <select
              value={orderFilter.storeId || ""}
              onChange={(e) => setOrderFilter((prev) => ({ ...prev, storeId: e.target.value || undefined }))}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50"
            >
              <option value="">All Stores</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            <select
              value={orderFilter.status || ""}
              onChange={(e) => setOrderFilter((prev) => ({ ...prev, status: e.target.value || undefined }))}
              className="px-3 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Package className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No orders found</p>
              <p className="text-xs text-muted-foreground">Orders from all connected stores will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredOrders.map((order, i) => (
                <UnifiedOrderRow key={order.id} order={order} delay={i * 50} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "inventory" && (
        <InventorySyncPanel inventory={inventory} />
      )}

      {activeTab === "performance" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => { setPerformancePeriod(p); refetchPerf(); }}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${
                  performancePeriod === p ? "bg-accent text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
          {performances.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">No performance data</p>
              <p className="text-xs text-muted-foreground">Store performance metrics will appear here once orders are tracked.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {performances.map((perf, i) => (
                <StorePerformanceCard key={perf.storeId} perf={perf} delay={i * 100} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === "bulk-push" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BulkPushPanel stores={stores} onPushComplete={() => refetchConnections()} />
          <div className="glass rounded-2xl p-4 sm:p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" /> Recent Push Jobs
            </h3>
            {bulkJobs.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-4">No push jobs yet.</p>
            ) : (
              <div className="space-y-2">
                {bulkJobs.slice(0, 10).map((job) => (
                  <div key={job.id} className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] font-semibold text-foreground truncate">{job.productTitle}</p>
                      <p className="text-[9px] text-muted-foreground">{job.targetStores.length} stores · {new Date(job.createdAt).toLocaleDateString()}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
                      job.status === "completed" ? "bg-emerald-400/10 text-emerald-400" :
                      job.status === "failed" ? "bg-red-400/10 text-red-400" :
                      job.status === "partial" ? "bg-amber-400/10 text-amber-400" :
                      "bg-blue-400/10 text-blue-400"
                    }`}>
                      {job.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <MultiStoreChatSidebar storeCount={stores.length} totalOrders={orders.length} totalRevenue={totalRevenue} storeNames={stores.map((s) => s.name)} />
    </div>
  );
}
