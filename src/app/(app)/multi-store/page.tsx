"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import {
  Store, Package, RefreshCw, Send, BarChart3, Zap,
  ShoppingCart, DollarSign, TrendingUp, Settings,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { UnifiedOrder, StorePerformance, BulkPushJob, StoreInventoryItem } from "@/types/multi-store";
import type { ConnectedStore } from "@/components/stores/ConnectedStoresList";
import type { PushedProduct } from "@/components/stores/PushedProductsList";
import { BULK_JOBS_DISPLAY_LIMIT, SWR_REFRESH_INTERVALS, ORDER_PAGE_SIZE } from "@/components/stores/constants";
import { MultiStorePageSkeleton } from "@/components/stores/StoreSkeletons";
import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import Pagination from "@/components/ui/Pagination";
import KpiCard from "@/components/multi-store/KpiCard";
import UnifiedOrderRow from "@/components/multi-store/UnifiedOrderRow";
import StorePerformanceCard from "@/components/multi-store/StorePerformanceCard";
import PerformanceCharts from "@/components/multi-store/PerformanceCharts";
import BulkPushPanel from "@/components/multi-store/BulkPushPanel";
import InventorySyncPanel from "@/components/multi-store/InventorySyncPanel";
import OrderFilters, { type OrderFilterState } from "@/components/multi-store/OrderFilters";
import StoreAIBar from "@/components/stores/StoreAIBar";
import StoreChat from "@/components/stores/StoreChat";
import DataSourceBadge from "@/components/ui/DataSourceBadge";
import EmptyState from "@/components/ui/EmptyState";
import { safeFetch } from "@/lib/safe-fetch";
import { getAuthHeaders } from "@/lib/auth-headers";

export default function MultiStorePage() {
  const { user } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const uid = user?.uid || "";
  const [activeTab, setActiveTab] = useState<"orders" | "inventory" | "performance" | "bulk-push">("orders");
  const [orderFilters, setOrderFilters] = useState<OrderFilterState>({ search: "", sortBy: "date", sortOrder: "desc" });
  const [orderPage, setOrderPage] = useState(1);
  const [performancePeriod, setPerformancePeriod] = useState<"7d" | "30d" | "90d">("30d");
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const { data: connData, mutate: refetchConnections } = useAPI<{ connections?: ConnectedStore[] }>(uid ? `/api/store/connections?uid=${uid}` : null, { refreshInterval: SWR_REFRESH_INTERVALS.connections });
  const { data: orderData } = useAPI<{ orders?: UnifiedOrder[] }>(uid ? `/api/multi-store/orders?uid=${uid}` : null, { refreshInterval: SWR_REFRESH_INTERVALS.orders });
  const { data: invData } = useAPI<{ inventory?: StoreInventoryItem[] }>(uid ? `/api/multi-store/inventory?uid=${uid}` : null, { refreshInterval: SWR_REFRESH_INTERVALS.inventory });
  const { data: perfData, mutate: refetchPerf } = useAPI<{ performances?: StorePerformance[] }>(uid ? `/api/multi-store/performance?uid=${uid}&period=${performancePeriod}` : null, { refreshInterval: SWR_REFRESH_INTERVALS.performance });
  const { data: pushData } = useAPI<{ jobs?: BulkPushJob[] }>(uid ? `/api/multi-store/bulk-push?uid=${uid}` : null, { refreshInterval: SWR_REFRESH_INTERVALS.connections });
  const { data: pushedData } = useAPI<{ products?: PushedProduct[] }>(uid ? `/api/store/push?uid=${uid}` : null, { refreshInterval: SWR_REFRESH_INTERVALS.connections });

  const stores = useMemo(() => connData?.connections || [], [connData]);
  const orders = useMemo(() => orderData?.orders || [], [orderData]);
  const inventory = useMemo(() => invData?.inventory || [], [invData]);
  const performances = useMemo(() => perfData?.performances || [], [perfData]);
  const bulkJobs = useMemo(() => pushData?.jobs || [], [pushData]);
  const pushedProducts = useMemo(() => pushedData?.products || [], [pushedData]);
  const loading = !user || (!connData && !orderData);

  const filteredOrders = useMemo(() => {
    const result = orders.filter((o) => {
      if (orderFilters.storeId && o.storeId !== orderFilters.storeId) return false;
      if (orderFilters.status && o.status !== orderFilters.status) return false;
      if (orderFilters.fulfillmentStatus && o.fulfillmentStatus !== orderFilters.fulfillmentStatus) return false;
      if (orderFilters.dateFrom && new Date(o.createdAt) < new Date(orderFilters.dateFrom)) return false;
      if (orderFilters.dateTo && new Date(o.createdAt) > new Date(orderFilters.dateTo + "T23:59:59")) return false;
      if (orderFilters.search) {
        const q = orderFilters.search.toLowerCase();
        const match = o.orderNumber.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerEmail.toLowerCase().includes(q) ||
          o.storeName.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      const dir = orderFilters.sortOrder === "asc" ? 1 : -1;
      switch (orderFilters.sortBy) {
        case "amount": return (a.totalAmount - b.totalAmount) * dir;
        case "store": return a.storeName.localeCompare(b.storeName) * dir;
        case "date":
        default: return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      }
    });

    return result;
  }, [orders, orderFilters]);

  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * ORDER_PAGE_SIZE;
    return filteredOrders.slice(start, start + ORDER_PAGE_SIZE);
  }, [filteredOrders, orderPage]);

  const totalOrderPages = Math.ceil(filteredOrders.length / ORDER_PAGE_SIZE);

  const totalRevenue = performances.reduce((sum, p) => sum + p.metrics.totalRevenue, 0);
  const totalOrders = performances.reduce((sum, p) => sum + p.metrics.totalOrders, 0);
  const totalProfit = performances.reduce((sum, p) => sum + p.metrics.totalProfit, 0);

  const executeAITool = useCallback(async (toolId: string, input: Record<string, unknown>) => {
    try {
      const token = await user?.getIdToken();
      return await safeFetch<{ success: boolean; summary?: string; data?: unknown; error?: string }>(
        "/api/ai/execute", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ tool: toolId, input }),
        }
      );
    } catch { return { success: false, summary: "Failed" }; }
  }, [user]);

  const handleAIBarAction = useCallback(async (action: string, context?: { productIds?: string[]; storeIds?: string[] }) => {
    setAiLoading(action);
    const storeIds = context?.storeIds || stores.map((s) => s.id);

    try {
      if (action === "sync-inventory") {
        // Real sync via the inventory API (the same path the Inventory Sync
        // panel uses) — the old AI tool call failed zod validation (missing
        // storePlatform + productMappings) and synced nothing.
        if (inventory.length === 0) {
          toastError("Nothing to sync — no inventory items found.");
        } else {
          const targets = inventory.filter((item) => item.stores.length > 0).slice(0, 25);
          let ok = 0;
          let failed = 0;
          for (const item of targets) {
            try {
              await safeFetch("/api/multi-store/inventory", {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
                body: JSON.stringify({
                  action: "sync",
                  productId: item.productId,
                  sourceStoreId: item.stores[0].storeId,
                  newStock: item.stores[0].stock,
                  productTitle: item.title,
                  sourceStoreName: item.stores[0].storeName,
                }),
              });
              ok++;
            } catch { failed++; }
          }
          if (ok > 0) {
            success(`Inventory synced for ${ok} items${failed > 0 ? `, ${failed} failed` : ""}${inventory.length > targets.length ? ` (capped at ${targets.length})` : ""}`);
            refetchConnections();
          } else {
            toastError("Inventory sync failed — please try again.");
          }
        }
      } else if (action === "store-performance") {
        // Fetch real performance per store (schema-valid tool) and surface the
        // aggregate — previously only the first store was queried and the
        // result was discarded.
        const targets = storeIds.slice(0, 10);
        let orders = 0;
        let revenue = 0;
        let ok = 0;
        for (const storeId of targets) {
          const result = await executeAITool("get_store_performance", { storeId, period: "30d" });
          if (result?.success) {
            const data = result.data as { totalOrders?: number; totalRevenue?: number } | undefined;
            orders += data?.totalOrders ?? 0;
            revenue += data?.totalRevenue ?? 0;
            ok++;
          }
        }
        if (ok > 0) {
          success(`${ok} store${ok !== 1 ? "s" : ""} (30d, via store tools): ${orders} orders, $${revenue.toFixed(2)} revenue`);
        } else {
          toastError("Couldn't fetch store performance. Please try again.");
        }
      } else if (action === "bulk-push") {
        // Bulk push needs concrete products; the real job API is the same one
        // the Bulk Push panel uses. Without a product selection there is
        // nothing to push — guide the user instead of failing a tool call.
        const productIds = context?.productIds || [];
        if (productIds.length === 0) {
          toastError("Select products in the Bulk Push tab first — nothing to push yet.");
        } else {
          const byId = new Map(pushedProducts.map((p) => [p.id, p]));
          const products = productIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => !!p).slice(0, 25);
          if (products.length === 0) {
            toastError("Selected products could not be found — refresh and try again.");
          } else {
            const authHeaders = await getAuthHeaders();
            let ok = 0;
            let failed = 0;
            for (const product of products) {
              try {
                await safeFetch("/api/multi-store/bulk-push", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", ...authHeaders },
                  body: JSON.stringify({
                    productTitle: product.productTitle,
                    productPrice: product.productPrice,
                    productImage: product.productImage,
                    productUrl: product.productUrl,
                    targetStoreIds: storeIds,
                  }),
                });
                ok++;
              } catch { failed++; }
            }
            if (ok > 0) success(`Bulk push started for ${ok} products × ${storeIds.length} stores${failed > 0 ? ` (${failed} failed)` : ""}`);
            else toastError("Bulk push failed — please try again.");
          }
        }
      } else if (action === "optimize-listings") {
        // Listing generation lives in AI Listings; deep-link with the first
        // selected product pre-filled. The old tool call failed zod
        // validation (generate_listing needs title/description/price/category).
        const productIds = context?.productIds || [];
        const byId = new Map(pushedProducts.map((p) => [p.id, p]));
        const first = productIds.map((id) => byId.get(id)).find((p): p is NonNullable<typeof p> => !!p);
        const params = new URLSearchParams();
        if (first) {
          params.set("title", first.productTitle);
          if (first.productPrice) params.set("price", String(first.productPrice));
          if (first.productImage) params.set("img", first.productImage);
        }
        router.push(`/product-listings${params.toString() ? `?${params.toString()}` : ""}`);
      }
    } finally {
      setAiLoading(null);
    }
  }, [executeAITool, success, toastError, stores, inventory, pushedProducts, refetchConnections, router]);

  if (loading) {
    return <MultiStorePageSkeleton />;
  }

  if (stores.length === 0) {
    return (
      <PageErrorBoundary>
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
        </div>

        <div className="glass rounded-2xl">
          <EmptyState
            iconName="orders"
            title="No stores connected yet"
            description="Connect your first store to start managing orders, inventory, and performance from one dashboard."
            action={{ label: "Connect Your First Store", href: "/store" }}
          />
        </div>
      </div>
      </PageErrorBoundary>
    );
  }

  return (
    <PageErrorBoundary>
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
          <Link
            href="/store"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-[10px] sm:text-[11px] font-medium text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all"
          >
            <Settings className="h-3 w-3" /> Manage Connections
          </Link>
        </div>
      </div>

        <div className="flex items-center gap-1.5">
          <DataSourceBadge source="firestore" />
          <span className="text-[10px] text-muted-foreground/70">Computed from your performance data</span>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard label="Total Orders" value={totalOrders} icon={<ShoppingCart className="h-4 w-4 text-accent" />} delay={0} empty={performances.length === 0} emptyHint="No orders yet" />
          <KpiCard label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} icon={<DollarSign className="h-4 w-4 text-emerald-400" />} delay={50} empty={performances.length === 0} emptyHint="No sales yet" />
          <KpiCard label="Total Profit" value={`$${totalProfit.toLocaleString()}`} icon={<TrendingUp className="h-4 w-4 text-emerald-400" />} delay={100} empty={performances.length === 0} emptyHint="No profit yet" />
          <KpiCard label="Active Stores" value={stores.filter((s) => s.status === "connected").length} icon={<Store className="h-4 w-4 text-violet-400" />} delay={150} />
        </div>

      <StoreAIBar onAction={handleAIBarAction} loading={aiLoading} storeCount={stores.length} />

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
          <OrderFilters
            stores={stores.map((s) => ({ id: s.id, name: s.name }))}
            filters={orderFilters}
            onFiltersChange={(f) => { setOrderFilters(f); setOrderPage(1); }}
          />

          {paginatedOrders.length === 0 ? (
            <div className="glass rounded-2xl">
              <EmptyState
                iconName="orders"
                title="No orders found"
                description={
                  filteredOrders.length === 0
                    ? "Orders from all connected stores will appear here."
                    : "No orders match your filters. Try adjusting them."
                }
              />
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedOrders.map((order, i) => (
                <UnifiedOrderRow key={order.id} order={order} delay={i * 50} onOrderUpdated={() => refetchConnections()} />
              ))}
            </div>
          )}

          <Pagination
            currentPage={orderPage}
            totalPages={totalOrderPages}
            totalItems={filteredOrders.length}
            pageSize={ORDER_PAGE_SIZE}
            onPageChange={setOrderPage}
          />
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
            <div className="glass rounded-2xl">
              <EmptyState
                iconName="analytics"
                title="No performance data"
                description="Store performance metrics will appear here once orders are tracked."
              />
            </div>
          ) : (
            <>
              <PerformanceCharts performances={performances} />
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {performances.map((perf, i) => (
                  <StorePerformanceCard key={perf.storeId} perf={perf} delay={i * 100} />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === "bulk-push" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <BulkPushPanel stores={stores} pushedProducts={pushedProducts} onPushComplete={() => refetchConnections()} />
          <div className="glass rounded-2xl p-4 sm:p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Zap className="h-4 w-4 text-accent" /> Recent Push Jobs
            </h3>
            {bulkJobs.length === 0 ? (
              <p className="text-[10px] text-muted-foreground text-center py-4">No push jobs yet.</p>
            ) : (
              <div className="space-y-2">
                {bulkJobs.slice(0, BULK_JOBS_DISPLAY_LIMIT).map((job) => (
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

      <StoreChat mode="global" connections={stores} pushedProducts={pushedProducts} orderCount={orders.length} totalRevenue={totalRevenue} />
    </div>
    </PageErrorBoundary>
  );
}
