"use client";

import "./dashboard-styles.css";
import { useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import { SectionErrorBoundary } from "@/components/ui/SectionErrorBoundary";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSavedProducts } from "@/components/saved/SavedProductsProvider";
import { setContextualActions } from "@/hooks/useContextualActions";
import { HeroSkeleton } from "@/components/dashboard/Skeletons";
import { HeroCommandCenter } from "@/components/dashboard/HeroCommandCenter";
import { RevenueProfitHub } from "@/components/dashboard/RevenueProfitHub";
import { AIIntelligenceHub } from "@/components/dashboard/AIIntelligenceHub";
import { ProductDiscovery } from "@/components/dashboard/ProductDiscovery";
import { SupplierNetwork } from "@/components/dashboard/SupplierNetwork";
import { OrderOperations } from "@/components/dashboard/OrderOperations";
import { MarketIntelligence } from "@/components/dashboard/MarketIntelligence";
import { StoreOperations } from "@/components/dashboard/StoreOperations";
import { GrowthTools } from "@/components/dashboard/GrowthTools";
import { MarketTickerFooter } from "@/components/dashboard/MarketTickerFooter";
import type { TrendingProduct } from "@/types/dashboard";

/* ═══════════════════════════════════════════════
   MAIN DASHBOARD PAGE
   ═══════════════════════════════════════════════ */
export default function DashboardHome() {
  const { data, markAlertRead, markAllAlertsRead, addToCompare, loading, error, hasData, refresh } = useDashboardData();
  const { user } = useAuth();
  const { toggleSave, isSaved, savedProducts } = useSavedProducts();
  const router = useRouter();

  useEffect(() => {
    if (data.contextualActions?.length) {
      setContextualActions(data.contextualActions);
    }
    return () => setContextualActions([]);
  }, [data.contextualActions]);

  // Stable derivations so memoized sections don't re-render needlessly.
  const stats = useMemo(() => ({
    revenue: data.revenueStats?.revenue ?? 0,
    growth: data.revenueStats?.growth ?? 0,
    orders: data.revenueStats?.orders ?? 0,
    avgOrder: data.revenueStats?.avgOrder ?? 0,
  }), [data.revenueStats]);

  const onlineSuppliers = useMemo(
    () => data.suppliers.filter((s) => s.status === "online").length,
    [data.suppliers]
  );

  const marginPct = useMemo(
    () =>
      data.fulfillmentPipeline.totalRevenue > 0
        ? Math.round((data.fulfillmentPipeline.totalProfit / data.fulfillmentPipeline.totalRevenue) * 100)
        : 0,
    [data.fulfillmentPipeline]
  );

  const handleSaveTrending = useCallback((product: TrendingProduct) => {
    toggleSave({
      id: product.name,
      title: product.name,
      price: product.price,
      image: product.image || null,
      link: product.sourceUrl || "",
      source: product.platform,
      savedAt: Date.now(),
    });
  }, [toggleSave]);

  const isTrendingSaved = useCallback((name: string) => {
    return isSaved(name);
  }, [isSaved]);

  const handleViewTrending = useCallback((product: TrendingProduct) => {
    const productId =
      product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "product";
    const params = new URLSearchParams({
      t: product.name,
      p: String(product.price),
      src: "cj",
    });
    if (product.image) params.set("img", product.image);
    if (product.sourceUrl) params.set("link", product.sourceUrl);
    if (product.confidence != null) params.set("r", String(product.confidence));
    router.push(`/products/${productId}?${params.toString()}`);
  }, [router]);

  const handleRetry = useCallback(() => {
    refresh?.();
  }, [refresh]);

  // ── Hard failure: the feed never loaded and there is nothing cached.
  // Show a real error state instead of a silent all-zeros dashboard. ────
  if (error && !hasData) {
    return (
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div
          className="flex flex-col items-center justify-center py-24 px-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-center"
          role="alert"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-400/10 border border-red-400/20 mb-4">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <h2 className="font-display text-lg font-semibold text-white mb-1">Dashboard couldn&apos;t load</h2>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            {error instanceof Error ? error.message : "Something went wrong while loading your dashboard."}
          </p>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-semibold hover:bg-accent/20 transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6" aria-busy="true" aria-label="Loading dashboard">
        <HeroSkeleton />
        {/* Mirrors the real section layout to avoid layout shift when data arrives */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 h-64 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          <div className="h-64 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 h-72 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          <div className="h-72 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-56 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <PageErrorBoundary>
      <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6">
        {/* Soft failure: refresh failed but we still have the last good data */}
        {error != null && hasData && (
          <div
            role="status"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs"
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="flex-1">Couldn&apos;t reach the live data feed — showing the last successful data.</span>
            <button
              type="button"
              onClick={handleRetry}
              className="font-semibold underline underline-offset-2 hover:text-amber-200 shrink-0"
            >
              Retry
            </button>
          </div>
        )}

        <SectionErrorBoundary name="Command Center">
          <HeroCommandCenter
            username={user?.displayName || user?.email?.split("@")[0] || "there"}
            healthScore={data.healthScore}
            trendingCount={data.trending?.length}
            suppliersCount={onlineSuppliers}
            savedCount={savedProducts.length}
          />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Revenue & Profit">
          <RevenueProfitHub stats={stats} chartData={data.revenueChart ?? []} storesConnected={data.storesCount} suppliersActive={onlineSuppliers} pendingOrders={data.fulfillmentPipeline.pending ?? 0} marginPct={marginPct} />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="AI Intelligence">
          <AIIntelligenceHub
            dailyPick={data.dailyPick}
            briefing={data.briefing}
            alerts={data.alerts}
            onAlertRead={markAlertRead}
            onMarkAllRead={markAllAlertsRead}
          />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Product Discovery">
          <ProductDiscovery trending={data.trending} onAddCompare={addToCompare} onSaveProduct={handleSaveTrending} isProductSaved={isTrendingSaved} onViewProduct={handleViewTrending} />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Supplier Network">
          <SupplierNetwork suppliers={data.suppliers} />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Order Operations">
          <OrderOperations pipeline={data.fulfillmentPipeline} />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Market Intelligence">
          <MarketIntelligence heatmap={data.heatmap} ticker={data.ticker} />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Store Operations">
          <StoreOperations storesConnected={data.storesCount} />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Growth Tools">
          <GrowthTools />
        </SectionErrorBoundary>

        <SectionErrorBoundary name="Market Ticker">
          <MarketTickerFooter ticker={data.ticker} />
        </SectionErrorBoundary>
      </div>
    </PageErrorBoundary>
  );
}
