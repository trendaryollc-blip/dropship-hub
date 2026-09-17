"use client";

import { useState, useCallback, useMemo } from "react";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";
import MonitoringHeader from "./MonitoringHeader";
import MonitoringStatsBar from "./MonitoringStatsBar";
import HealthRecommendations from "./HealthRecommendations";
import MonitoringTabs, { type Tab } from "./MonitoringTabs";
import MonitoringSkeleton from "./MonitoringSkeleton";
import ProductList from "./ProductList";
import AlertList from "./AlertList";
import MetricsPanel from "./MetricsPanel";
import RepriceAuditLog from "./RepriceAuditLog";
import NotificationPreferencesPanel from "./NotificationPreferencesPanel";
import type { MonitoredProduct, MonitoringMetrics, MonitoringHealth, PriceAlert } from "@/lib/monitoring/types";

interface RepriceStats {
  totalReprices: number;
  successfulReprices: number;
  failedReprices: number;
  avgPriceChange: number;
  lastRepriceTime: string | null;
}

const PRODUCTS_PER_PAGE = 20;

export default function MonitoringPage() {
  const { error: toastError, success: toastSuccess } = useToast();
  const { data: productsData, isLoading: loadingProducts, mutate: mutateProducts } = useAPI<{ products: MonitoredProduct[] }>("/api/monitoring?type=list");
  const { data: alertsData, mutate: mutateAlerts } = useAPI<{ alerts: (PriceAlert & { productTitle: string; productId: string })[] }>("/api/monitoring?type=alerts");
  const { data: metricsData, mutate: mutateMetrics } = useAPI<{ metrics: MonitoringMetrics; health: MonitoringHealth; repriceStats: RepriceStats }>("/api/monitoring?type=metrics");

  const products = useMemo(() => productsData?.products ?? [], [productsData]);
  const alerts = useMemo(() => alertsData?.alerts ?? [], [alertsData]);
  const metrics = metricsData?.metrics;
  const health = metricsData?.health;
  const repriceStats = metricsData?.repriceStats;

  const [activeTab, setActiveTab] = useState<Tab>("products");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE);

  const unreadAlertCount = useMemo(
    () => products.reduce((sum, p) => sum + p.alerts.filter((a) => !a.read).length, 0),
    [products]
  );

  const handleRemove = useCallback(async (monitoredId: string) => {
    setRemovingId(monitoredId);
    try {
      await safeFetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove", monitoredId }),
      });
      mutateProducts();
      mutateAlerts();
      mutateMetrics();
    } catch {
      toastError("Failed to remove product");
    } finally {
      setRemovingId(null);
    }
  }, [mutateProducts, mutateAlerts, mutateMetrics, toastError]);

  const handleMarkAlertRead = useCallback(async (monitoredId: string, alertIds: string[]) => {
    try {
      await safeFetch("/api/monitoring", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitoredId, alertIds }),
      });
      mutateAlerts();
      mutateProducts();
    } catch {
      toastError("Failed to mark alerts as read");
    }
  }, [mutateAlerts, mutateProducts, toastError]);

  const handleRunCheck = useCallback(async () => {
    setChecking(true);
    try {
      await safeFetch("/api/monitoring/auto-check", { method: "POST" });
      mutateProducts();
      mutateAlerts();
      mutateMetrics();
    } catch {
      toastError("Failed to run price check");
    } finally {
      setChecking(false);
    }
  }, [mutateProducts, mutateAlerts, mutateMetrics, toastError]);

  const handleRefresh = useCallback(() => {
    mutateProducts();
    mutateAlerts();
    mutateMetrics();
  }, [mutateProducts, mutateAlerts, mutateMetrics]);

  const handleExport = useCallback(() => {
    if (products.length === 0) {
      toastError("No products to export");
      return;
    }

    const headers = ["Product", "Source", "Current Price", "Lowest", "Highest", "Stock Status", "Auto-Delist", "Threshold", "Last Checked", "Alerts"];
    const rows = products.map((p) => [
      p.productTitle,
      p.source,
      p.currentPrice.toFixed(2),
      p.lowestPrice.toFixed(2),
      p.highestPrice.toFixed(2),
      p.stockStatus,
      p.autoDelist ? "Yes" : "No",
      `${p.priceDropThreshold || 5}%`,
      new Date(p.lastChecked).toLocaleString(),
      String(p.alerts.filter((a) => !a.read).length),
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `monitored-products-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toastSuccess("Exported products to CSV");
  }, [products, toastError, toastSuccess]);

  const handleCheckProduct = useCallback(async (monitoredId: string) => {
    try {
      await safeFetch("/api/monitoring/auto-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monitoredId }),
      });
      mutateProducts();
      mutateAlerts();
    } catch {
      toastError("Failed to check product");
    }
  }, [mutateProducts, mutateAlerts, toastError]);

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PRODUCTS_PER_PAGE);
  }, []);

  if (loadingProducts && products.length === 0) {
    return <MonitoringSkeleton />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      <MonitoringHeader
        checking={checking}
        loading={loadingProducts}
        onRunCheck={handleRunCheck}
        onRefresh={handleRefresh}
        onExport={handleExport}
      />

      <MonitoringStatsBar
        metrics={metrics}
        products={products}
        unreadAlertCount={unreadAlertCount}
      />

      {health && <HealthRecommendations health={health} />}

      <MonitoringTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        productCount={products.length}
        alertCount={unreadAlertCount}
      />

      {activeTab === "products" && (
        <ProductList
          products={products}
          loading={loadingProducts}
          onRemove={handleRemove}
          onCheck={handleCheckProduct}
          onUpdate={handleRefresh}
          removingId={removingId}
          visibleCount={visibleCount}
          onLoadMore={handleLoadMore}
        />
      )}

      {activeTab === "alerts" && (
        <AlertList
          alerts={alerts}
          loading={loadingProducts}
          onDismiss={handleMarkAlertRead}
          products={products}
        />
      )}

      {activeTab === "metrics" && metrics && (
        <MetricsPanel metrics={metrics} repriceStats={repriceStats} />
      )}

      {activeTab === "audit" && (
        <RepriceAuditLog />
      )}

      {activeTab === "settings" && (
        <div className="glass rounded-xl p-6">
          <NotificationPreferencesPanel />
        </div>
      )}
    </div>
  );
}
