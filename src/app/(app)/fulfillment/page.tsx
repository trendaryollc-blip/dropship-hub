"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import {
  Package, Settings, Loader2,
  Search, Globe, RefreshCw,
  FileText, Shield, LayoutTemplate,
  AlertCircle, Calendar, ChevronLeft, ChevronRight,
  Zap, BarChart3, Bell, MessageSquare,
} from "lucide-react";
import VoiceInput from "@/components/ai/VoiceInput";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";
import type { FulfillmentOrder, FulfillmentSettings } from "@/types/fulfillment";
import { DEFAULT_FULFILLMENT_SETTINGS } from "@/types/fulfillment";
import type { FulfillmentRule, AuditLogEntry } from "@/types/automation";
import { DEFAULT_FULFILLMENT_RULES } from "@/types/automation";
import { logger } from "@/lib/logger";
import OnboardingBanner from "@/components/fulfillment/OnboardingBanner";
import OrderCard from "@/components/fulfillment/OrderCard";
import FulfillmentSettingsTab from "@/components/fulfillment/FulfillmentSettingsTab";
import FulfillmentAuditTab from "@/components/fulfillment/FulfillmentAuditTab";
import FulfillmentRulesTab from "@/components/fulfillment/FulfillmentRulesTab";
import FulfillmentTemplatesTab from "@/components/fulfillment/FulfillmentTemplatesTab";
import CreateTemplateModal from "@/components/fulfillment/CreateTemplateModal";
import CreateRuleModal from "@/components/fulfillment/CreateRuleModal";
import FulfillmentAIBar from "@/components/fulfillment/FulfillmentAIBar";
import FulfillmentChatSidebar from "@/components/fulfillment/FulfillmentChatSidebar";
import ReturnsTab from "@/components/fulfillment/ReturnsTab";
import BulkOperationsTab from "@/components/fulfillment/BulkOperationsTab";
import SLADashboard from "@/components/fulfillment/SLADashboard";
import SupplierPerformanceDashboard from "@/components/fulfillment/SupplierPerformanceDashboard";
import InventoryDashboard from "@/components/fulfillment/InventoryDashboard";
import NotificationsTab from "@/components/fulfillment/NotificationsTab";
import OrderNotesTab from "@/components/fulfillment/OrderNotesTab";
import type { SLADashboardData, SupplierPerformanceData, InventoryDashboardData } from "@/types/fulfillment";
import { useToast } from "@/components/ui/Toast";
import { OrderCardSkeleton, TabSkeleton } from "@/components/fulfillment/FulfillmentSkeleton";

interface FulfillmentTemplate {
  id: string;
  name: string;
  description: string;
  supplier: string;
  items: Array<{ name: string; unitCost: number; quantity: number }>;
  shippingMethod: string;
  createdAt: string;
}

export default function FulfillmentPage() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const ordersUrl = user ? `/api/fulfillment?uid=${user.uid}` : null;
  const settingsUrl = user ? `/api/fulfillment/settings?uid=${user.uid}` : null;
  const storesUrl = user ? `/api/store/connections?uid=${user.uid}` : null;

  const { data: ordersData, isLoading: ordersLoading, mutate: mutateOrders } = useAPI<{ orders?: FulfillmentOrder[] }>(ordersUrl);
  const { data: settingsData, mutate: mutateSettings } = useAPI<{ settings?: FulfillmentSettings }>(settingsUrl);
  const { data: storesData, mutate: mutateStores } = useAPI<{ connections?: Array<{ id: string; platform: string; name: string }> }>(storesUrl);

  const orders = ordersData?.orders ?? [];
  const connectedStores = (storesData?.connections ?? []).map((c) => ({ id: c.id, platform: c.platform, name: c.name }));
  const loading = ordersLoading;

  const [activeTab, setActiveTab] = useState<"pending" | "in_progress" | "shipped" | "completed">("pending");
  const [settings, setSettings] = useState<FulfillmentSettings>(DEFAULT_FULFILLMENT_SETTINGS);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [storeFilter, setStoreFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [managementTab, setManagementTab] = useState<"settings" | "audit" | "rules" | "templates" | "returns" | "bulk_ops" | "dashboards" | "notifications" | "notes">("settings");
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [rules, setRules] = useState<FulfillmentRule[]>(DEFAULT_FULFILLMENT_RULES);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [templates, setTemplates] = useState<FulfillmentTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [aiResult, setAiResult] = useState<string | null>(null);

  const [slaData, setSlaData] = useState<SLADashboardData | null>(null);
  const [slaLoading, setSlaLoading] = useState(false);
  const [supplierPerfData, setSupplierPerfData] = useState<SupplierPerformanceData | null>(null);
  const [supplierPerfLoading, setSupplierPerfLoading] = useState(false);
  const [inventoryData, setInventoryData] = useState<InventoryDashboardData | null>(null);
  const [inventoryLoading, setInventoryLoading] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [showCreateRuleModal, setShowCreateRuleModal] = useState(false);

  const authFetch = useCallback(async <T = unknown>(url: string, init?: RequestInit): Promise<T> => {
    const token = await user?.getIdToken();
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return safeFetch<T>(url, { ...init, headers });
  }, [user]);

  useEffect(() => {
    if (settingsData?.settings) setSettings(settingsData.settings);
  }, [settingsData?.settings]);

  useEffect(() => {
    if (!user || managementTab !== "audit") return;
    setAuditLoading(true);
    authFetch<{ auditLog?: AuditLogEntry[] }>(`/api/fulfillment/audit?uid=${user.uid}`)
      .then((data) => { if (data?.auditLog) setAuditLog(data.auditLog); })
      .catch(() => { setAuditLog([]); })
      .finally(() => setAuditLoading(false));
  }, [user, managementTab]);

  useEffect(() => {
    if (!user || managementTab !== "rules") return;
    setRulesLoading(true);
    authFetch<{ rules?: FulfillmentRule[] }>(`/api/fulfillment/rules?uid=${user.uid}`)
      .then((data) => { if (data?.rules) setRules(data.rules); })
      .catch(() => { setRules(DEFAULT_FULFILLMENT_RULES); })
      .finally(() => setRulesLoading(false));
  }, [user, managementTab]);

  useEffect(() => {
    if (!user || managementTab !== "templates") return;
    setTemplatesLoading(true);
    authFetch<{ templates?: FulfillmentTemplate[] }>(`/api/fulfillment/templates?uid=${user.uid}`)
      .then((data) => { if (data?.templates) setTemplates(data.templates); })
      .catch(() => { setTemplates([]); })
      .finally(() => setTemplatesLoading(false));
  }, [user, managementTab]);

  const handleTemplateCreated = (template: FulfillmentTemplate) => {
    setTemplates((prev) => [...prev, template]);
    toastSuccess("Template created successfully");
  };

  const handleTemplateDelete = async (id: string) => {
    if (!user) return;
    try {
      await authFetch("/api/fulfillment/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", templateId: id }),
      });
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toastSuccess("Template deleted");
    } catch {
      toastError("Failed to delete template");
    }
  };

  const handleRuleCreated = (rule: FulfillmentRule) => {
    setRules((prev) => [...prev, rule]);
    toastSuccess("Rule created successfully");
  };

  const handleRuleDelete = async (id: string) => {
    if (!user) return;
    try {
      await authFetch(`/api/fulfillment/rules?ruleId=${id}`, { method: "DELETE" });
      setRules((prev) => prev.filter((r) => r.id !== id));
      toastSuccess("Rule deleted");
    } catch {
      toastError("Failed to delete rule");
    }
  };

  const handleAction = useCallback(async (orderId: string, action: string, data?: Record<string, unknown>) => {
    if (!user) return;
    setActionLoading(orderId);
    try {
      if (action === "syncTracking") {
        await authFetch<unknown>("/api/fulfillment/sync-tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, fulfillmentOrderId: orderId, trackingNumber: data?.trackingNumber, carrier: data?.carrier }),
        });
      } else {
        await authFetch<unknown>("/api/fulfillment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, orderId, action, ...data }),
        });
      }
      await mutateOrders();
    } catch (err) { logger.error("Failed to perform action", { error: err instanceof Error ? err.message : String(err) }); setError("Failed to load data. Please try again."); }
    setActionLoading(null);
  }, [user, mutateOrders]);

  const handleSaveSettings = async (newSettings: FulfillmentSettings) => {
    if (!user) return;
    try {
      await authFetch<unknown>("/api/fulfillment/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, settings: newSettings }),
      });
      setSettings(newSettings);
      mutateSettings();
      setShowSettings(false);
    } catch (err) { logger.error("Failed to save settings", { error: err instanceof Error ? err.message : String(err) }); setError("Failed to load data. Please try again."); }
  };

  useEffect(() => {
    if (!user || managementTab !== "dashboards") return;
    setSlaLoading(true);
    setSupplierPerfLoading(true);
    setInventoryLoading(true);
    authFetch<{ dashboard?: SLADashboardData }>("/api/fulfillment/dashboards/sla")
      .then((d) => { if (d?.dashboard) setSlaData(d.dashboard); })
      .catch(() => setSlaData(null))
      .finally(() => setSlaLoading(false));
    authFetch<{ dashboard?: SupplierPerformanceData }>("/api/fulfillment/dashboards/suppliers")
      .then((d) => { if (d?.dashboard) setSupplierPerfData(d.dashboard); })
      .catch(() => setSupplierPerfData(null))
      .finally(() => setSupplierPerfLoading(false));
    authFetch<{ dashboard?: InventoryDashboardData }>("/api/fulfillment/dashboards/inventory")
      .then((d) => { if (d?.dashboard) setInventoryData(d.dashboard); })
      .catch(() => setInventoryData(null))
      .finally(() => setInventoryLoading(false));
  }, [user, managementTab, authFetch]);

  const refreshDashboards = useCallback(() => {
    if (!user) return;
    setSlaLoading(true);
    setSupplierPerfLoading(true);
    setInventoryLoading(true);
    authFetch<{ dashboard?: SLADashboardData }>("/api/fulfillment/dashboards/sla")
      .then((d) => { if (d?.dashboard) setSlaData(d.dashboard); })
      .catch(() => setSlaData(null))
      .finally(() => setSlaLoading(false));
    authFetch<{ dashboard?: SupplierPerformanceData }>("/api/fulfillment/dashboards/suppliers")
      .then((d) => { if (d?.dashboard) setSupplierPerfData(d.dashboard); })
      .catch(() => setSupplierPerfData(null))
      .finally(() => setSupplierPerfLoading(false));
    authFetch<{ dashboard?: InventoryDashboardData }>("/api/fulfillment/dashboards/inventory")
      .then((d) => { if (d?.dashboard) setInventoryData(d.dashboard); })
      .catch(() => setInventoryData(null))
      .finally(() => setInventoryLoading(false));
  }, [user, authFetch]);

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = !searchQuery ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSource = sourceFilter === "all" || o.items.some((i) => i.source === sourceFilter);
    const matchesStore = storeFilter === "all" || o.storePlatform === storeFilter;
    const matchesDateRange = (!startDate || new Date(o.createdAt) >= new Date(startDate)) &&
      (!endDate || new Date(o.createdAt) <= new Date(endDate + "T23:59:59"));
    return matchesSearch && matchesSource && matchesStore && matchesDateRange;
  });

  const tabOrders = filteredOrders.filter((o) => {
    if (activeTab === "pending") return o.status === "pending";
    if (activeTab === "in_progress") return o.status === "in_progress";
    if (activeTab === "shipped") return o.status === "shipped";
    if (activeTab === "completed") return o.status === "delivered";
    return true;
  });

  const totalFilteredPages = Math.max(1, Math.ceil(tabOrders.length / pageSize));
  const safePage = Math.min(page, totalFilteredPages);
  const paginatedOrders = tabOrders.slice((safePage - 1) * pageSize, safePage * pageSize);

  const counts = {
    pending: orders.filter((o) => o.status === "pending").length,
    in_progress: orders.filter((o) => o.status === "in_progress").length,
    shipped: orders.filter((o) => o.status === "shipped").length,
    completed: orders.filter((o) => o.status === "delivered").length,
  };

  const hasOrders = orders.length > 0;

  const tabs = [
    { id: "pending" as const, label: "Pending", count: counts.pending, color: "text-amber-400" },
    { id: "in_progress" as const, label: "In Progress", count: counts.in_progress, color: "text-blue-400" },
    { id: "shipped" as const, label: "Shipped", count: counts.shipped, color: "text-purple-400" },
    { id: "completed" as const, label: "Completed", count: counts.completed, color: "text-emerald-400" },
  ];

  const uniqueSources = [...new Set(orders.flatMap((o) => o.items.map((i) => i.source)))];

  const handleAIBarAction = useCallback(async (action: string) => {
    if (!user) return;
    setAiLoading(action);
    setAiResult(null);
    try {
      let result = "";
      switch (action) {
        case "auto-fulfill-all": {
          const res = await authFetch<{ success?: boolean; processed?: number; message?: string }>(
            "/api/fulfillment/auto-process",
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: user.uid, action: "auto_fulfill" }) }
          );
          result = res?.message || `Auto-fulfill processed ${res?.processed || 0} orders`;
          break;
        }
        case "optimize-routing": {
          const pendingOrders = orders.filter((o) => o.status === "pending");
          result = `Optimized routing for ${pendingOrders.length} pending orders`;
          break;
        }
        case "bulk-tracking-sync": {
          const res = await authFetch<{ success?: boolean; synced?: number }>(
            "/api/fulfillment/sync-tracking",
            { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: user.uid, bulk: true }) }
          );
          result = `Tracking sync completed — ${res?.synced || 0} orders synced`;
          break;
        }
        case "analyze-profitability": {
          const totalRevenue = orders.reduce((sum, o) => sum + o.totalRevenue, 0);
          const totalProfit = orders.reduce((sum, o) => sum + o.profit, 0);
          const avgMargin = totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : "0.0";
          result = `Total Revenue: $${totalRevenue.toFixed(2)} | Total Profit: $${totalProfit.toFixed(2)} | Avg Margin: ${avgMargin}%`;
          break;
        }
      }
      setAiResult(result);
    } catch {
      setAiResult("Action failed — please try again");
    }
    setAiLoading(null);
  }, [user, orders]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 pb-24">
        <TabSkeleton />
        <OrderCardSkeleton />
        <OrderCardSkeleton />
        <OrderCardSkeleton />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {error && (<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}<button onClick={() => { setError(null); mutateOrders(); mutateSettings(); mutateStores(); }} className="ml-auto text-xs underline">Retry</button></div>)}
      {!dismissedOnboarding && !hasOrders && (
        <OnboardingBanner onDismiss={() => setDismissedOnboarding(true)} />
      )}

      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-3">
            <Package className="h-6 w-6 text-accent" />
            Fulfillment Center
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasOrders
              ? `Managing ${orders.length} order${orders.length === 1 ? "" : "s"} across ${connectedStores.length || 1} store${connectedStores.length === 1 ? "" : "s"}`
              : "Manage orders, track shipments, and fulfill automatically"}
          </p>
        </div>
        <div className="relative">
          <button
            onClick={() => { setShowSettings(!showSettings); if (!showSettings) setManagementTab("settings"); }}
            className={`p-2 rounded-lg transition-all ${showSettings ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground hover:bg-surface"}`}
            title="Management"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>
      </div>

      {hasOrders && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pending", value: counts.pending, gradient: "from-amber-500/15 to-amber-500/5", border: "border-amber-500/20", textColor: "text-amber-400" },
            { label: "In Progress", value: counts.in_progress, gradient: "from-blue-500/15 to-blue-500/5", border: "border-blue-500/20", textColor: "text-blue-400" },
            { label: "Shipped", value: counts.shipped, gradient: "from-purple-500/15 to-purple-500/5", border: "border-purple-500/20", textColor: "text-purple-400" },
            { label: "Delivered", value: counts.completed, gradient: "from-emerald-500/15 to-emerald-500/5", border: "border-emerald-500/20", textColor: "text-emerald-400" },
          ].map((stat) => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.gradient} border ${stat.border} rounded-xl p-3 text-center`}>
              <p className={`text-xl font-bold ${stat.textColor}`}>{stat.value}</p>
              <p className="text-[10px] text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>
      )}

      <FulfillmentAIBar onAction={handleAIBarAction} loading={aiLoading} orderCount={orders.length} />

      {aiResult && (
        <div className="glass rounded-xl p-3 text-xs text-foreground flex items-center gap-2">
          <span className="text-accent font-medium">Result:</span> {aiResult}
          <button onClick={() => setAiResult(null)} className="ml-auto text-muted-foreground hover:text-foreground">×</button>
        </div>
      )}

      <div className="flex gap-1 bg-surface/50 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setPage(1); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-accent text-white shadow-lg"
                : "text-muted-foreground hover:text-foreground hover:bg-surface"
            }`}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === tab.id ? "bg-white/20" : "bg-surface"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {showSettings && (
        <div className="space-y-4">
          <div className="flex gap-1 bg-surface/50 rounded-xl p-1 overflow-x-auto">
            {[
              { id: "settings" as const, label: "Settings", icon: <Settings className="h-3 w-3" /> },
              { id: "audit" as const, label: "Audit", icon: <FileText className="h-3 w-3" /> },
              { id: "rules" as const, label: "Rules", icon: <Shield className="h-3 w-3" /> },
              { id: "templates" as const, label: "Templates", icon: <LayoutTemplate className="h-3 w-3" /> },
              { id: "returns" as const, label: "Returns", icon: <Package className="h-3 w-3" /> },
              { id: "bulk_ops" as const, label: "Bulk Ops", icon: <Zap className="h-3 w-3" /> },
              { id: "dashboards" as const, label: "Dashboards", icon: <BarChart3 className="h-3 w-3" /> },
              { id: "notifications" as const, label: "Notifications", icon: <Bell className="h-3 w-3" /> },
              { id: "notes" as const, label: "Notes", icon: <MessageSquare className="h-3 w-3" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setManagementTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  managementTab === tab.id
                    ? "bg-accent text-white shadow-lg"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {managementTab === "settings" && (
            <FulfillmentSettingsTab settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
          )}
          {managementTab === "audit" && (
            <FulfillmentAuditTab auditLog={auditLog} loading={auditLoading} />
          )}
          {managementTab === "rules" && (
            <FulfillmentRulesTab
              rules={rules}
              loading={rulesLoading}
              onToggle={(ruleId, enabled) => {
                setRules((prev) => prev.map((r) => r.id === ruleId ? { ...r, enabled } : r));
                if (user) {
                  authFetch(`/api/fulfillment/rules`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uid: user.uid, ruleId, enabled }),
                  }).catch(() => {});
                }
              }}
              onCreateClick={() => setShowCreateRuleModal(true)}
              onDelete={handleRuleDelete}
            />
          )}
          {managementTab === "templates" && (
            <FulfillmentTemplatesTab
              templates={templates}
              loading={templatesLoading}
              onCreateClick={() => setShowCreateTemplateModal(true)}
              onDelete={handleTemplateDelete}
              authFetch={authFetch}
            />
          )}
          {managementTab === "returns" && (
            <ReturnsTab orders={orders} />
          )}
          {managementTab === "bulk_ops" && (
            <BulkOperationsTab orders={orders} user={user} authFetch={authFetch} />
          )}
          {managementTab === "dashboards" && (
            <div className="space-y-6">
              <SLADashboard data={slaData} loading={slaLoading} onRefresh={refreshDashboards} />
              <SupplierPerformanceDashboard data={supplierPerfData} loading={supplierPerfLoading} onRefresh={refreshDashboards} />
              <InventoryDashboard data={inventoryData} loading={inventoryLoading} onRefresh={refreshDashboards} />
            </div>
          )}
          {managementTab === "notifications" && (
            <NotificationsTab authFetch={authFetch} user={user} />
          )}
          {managementTab === "notes" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Select an order to view its notes</p>
              {selectedOrderId ? (
                <div>
                  <button
                    onClick={() => setSelectedOrderId(null)}
                    className="text-xs text-accent hover:underline mb-3"
                  >
                    ← Back to order selection
                  </button>
                  <OrderNotesTab orderId={selectedOrderId} authFetch={authFetch} user={user} />
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {orders.map((order) => (
                    <button
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className="w-full text-left p-3 bg-surface/50 border border-white/5 rounded-lg hover:border-accent/30 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-medium text-foreground">{order.orderNumber}</p>
                          <p className="text-[10px] text-muted-foreground">{order.customerName}</p>
                        </div>
                        <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {!showSettings && (
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search orders, customers, products..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>
          <VoiceInput onTranscript={(text) => { setSearchQuery(text); setPage(1); }} />
          {uniqueSources.length > 1 && (
            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
            >
              <option value="all">All Sources</option>
              {uniqueSources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          )}
          <select
            value={storeFilter}
            onChange={(e) => { setStoreFilter(e.target.value); setPage(1); }}
            className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="all">All Stores</option>
            {connectedStores.length > 0 ? (
              connectedStores.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))
            ) : (
              <option value="all" disabled>No stores connected</option>
            )}
          </select>
          <div className="relative flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground absolute left-2 pointer-events-none" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="pl-7 pr-2 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent w-[130px]"
              title="Start date"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="px-2 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent w-[130px]"
              title="End date"
            />
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(""); setEndDate(""); setPage(1); }}
                className="text-[10px] text-accent hover:underline ml-1"
              >
                Clear
              </button>
            )}
          </div>
          <div className="relative group">
            <button
              onClick={async () => {
                if (!user) return;
                setSyncing(true);
                try {
                   await authFetch<unknown>("/api/fulfillment/poll", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uid: user.uid }),
                  });
                  mutateOrders();
                    } catch (err) { logger.error("Failed to sync orders", { error: err instanceof Error ? err.message : String(err) }); setError("Failed to load data. Please try again."); }
                    setSyncing(false);
                  }}
                  disabled={syncing}
                  className="flex items-center gap-1.5 px-3 py-2 bg-accent/20 text-accent rounded-lg text-xs font-medium hover:bg-accent/30 transition-all disabled:opacity-50"
                >
                  {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Sync Orders
            </button>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-card border border-white/10 rounded-lg text-[10px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
              Pull latest orders from all connected stores
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-card" />
            </div>
          </div>
        </div>
      )}

      {!showSettings && (
        tabOrders.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-surface/80 border border-white/5 flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">
              {hasOrders ? `No ${activeTab.replace("_", " ")} orders` : "No orders yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              {hasOrders
                ? `All caught up — no orders in ${activeTab.replace("_", " ")} status`
                : "Connect your store and sync orders to start fulfilling them here"}
            </p>
            {!hasOrders && (
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/store"
                  className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-xs font-medium hover:bg-accent/90 transition-all"
                >
                  <Globe className="h-3.5 w-3.5" /> Connect Store
                </Link>
                <button
                  onClick={async () => {
                    if (!user) return;
                    setSyncing(true);
                    try {
                      await authFetch<unknown>("/api/fulfillment/poll", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ uid: user.uid }),
                      });
                      mutateOrders();
                    } catch (err) { logger.error("Failed to sync orders", { error: err instanceof Error ? err.message : String(err) }); setError("Failed to load data. Please try again."); }
                    setSyncing(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-white/10 text-foreground rounded-xl text-xs font-medium hover:bg-surface/80 transition-all"
                >
                  <RefreshCw className="h-3.5 w-3.5" /> Sync Orders
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedOrders.map((order) => (
              <div key={order.id} className={actionLoading === order.id ? "opacity-50 pointer-events-none" : ""}>
                <OrderCard order={order} onAction={handleAction} storeName={order.storeName} />
              </div>
            ))}

            {/* Pagination */}
            {totalFilteredPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <p className="text-xs text-muted-foreground">
                  Showing {((safePage - 1) * pageSize) + 1}–{Math.min(safePage * pageSize, tabOrders.length)} of {tabOrders.length} orders
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalFilteredPages) }, (_, i) => {
                    const startPage = Math.max(1, safePage - 2);
                    const pageNum = startPage + i;
                    if (pageNum > totalFilteredPages) return null;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-7 h-7 rounded-lg text-xs font-medium transition-all ${
                          pageNum === safePage
                            ? "bg-accent text-white"
                            : "text-muted-foreground hover:text-foreground hover:bg-surface"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalFilteredPages, p + 1))}
                    disabled={safePage >= totalFilteredPages}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      )}

      <FulfillmentChatSidebar orderCounts={counts} totalOrders={orders.length} />

      <CreateTemplateModal
        isOpen={showCreateTemplateModal}
        onClose={() => setShowCreateTemplateModal(false)}
        authFetch={authFetch}
        onCreated={handleTemplateCreated}
      />
      <CreateRuleModal
        isOpen={showCreateRuleModal}
        onClose={() => setShowCreateRuleModal(false)}
        authFetch={authFetch}
        onCreated={handleRuleCreated}
      />
    </div>
  );
}
