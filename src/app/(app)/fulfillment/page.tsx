"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import {
  Package, Clock, Truck, CheckCircle2, Settings, Loader2,
  Search, Globe, RefreshCw, X,
  FileText, Shield, LayoutTemplate,
  AlertCircle,
} from "lucide-react";
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
import FulfillmentAIBar from "@/components/fulfillment/FulfillmentAIBar";
import FulfillmentChatSidebar from "@/components/fulfillment/FulfillmentChatSidebar";

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
  const [managementTab, setManagementTab] = useState<"settings" | "audit" | "rules" | "templates">("settings");
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [rules, setRules] = useState<FulfillmentRule[]>(DEFAULT_FULFILLMENT_RULES);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [templates, setTemplates] = useState<FulfillmentTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  useEffect(() => {
    if (settingsData?.settings) setSettings(settingsData.settings);
  }, [settingsData?.settings]);

  useEffect(() => {
    if (!user || managementTab !== "audit") return;
    setAuditLoading(true);
    safeFetch<{ auditLog?: AuditLogEntry[] }>(`/api/fulfillment/audit?uid=${user.uid}`)
      .then((data) => { if (data?.auditLog) setAuditLog(data.auditLog); })
      .catch(() => { setAuditLog([]); })
      .finally(() => setAuditLoading(false));
  }, [user, managementTab]);

  useEffect(() => {
    if (!user || managementTab !== "rules") return;
    setRulesLoading(true);
    safeFetch<{ rules?: FulfillmentRule[] }>(`/api/fulfillment/rules?uid=${user.uid}`)
      .then((data) => { if (data?.rules) setRules(data.rules); })
      .catch(() => { setRules(DEFAULT_FULFILLMENT_RULES); })
      .finally(() => setRulesLoading(false));
  }, [user, managementTab]);

  useEffect(() => {
    if (!user || managementTab !== "templates") return;
    setTemplatesLoading(true);
    safeFetch<{ templates?: FulfillmentTemplate[] }>(`/api/fulfillment/templates?uid=${user.uid}`)
      .then((data) => { if (data?.templates) setTemplates(data.templates); })
      .catch(() => { setTemplates([]); })
      .finally(() => setTemplatesLoading(false));
  }, [user, managementTab]);

  const handleAction = useCallback(async (orderId: string, action: string, data?: Record<string, unknown>) => {
    if (!user) return;
    setActionLoading(orderId);
    try {
      if (action === "syncTracking") {
        await safeFetch<unknown>("/api/fulfillment/sync-tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, fulfillmentOrderId: orderId, trackingNumber: data?.trackingNumber, carrier: data?.carrier }),
        });
      } else {
        await safeFetch<unknown>("/api/fulfillment", {
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
      await safeFetch<unknown>("/api/fulfillment/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, settings: newSettings }),
      });
      setSettings(newSettings);
      mutateSettings();
      setShowSettings(false);
    } catch (err) { logger.error("Failed to save settings", { error: err instanceof Error ? err.message : String(err) }); setError("Failed to load data. Please try again."); }
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = !searchQuery ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSource = sourceFilter === "all" || o.items.some((i) => i.source === sourceFilter);
    const matchesStore = storeFilter === "all" || o.storePlatform === storeFilter;
    return matchesSearch && matchesSource && matchesStore;
  });

  const tabOrders = filteredOrders.filter((o) => {
    if (activeTab === "pending") return o.status === "pending";
    if (activeTab === "in_progress") return o.status === "in_progress";
    if (activeTab === "shipped") return o.status === "shipped";
    if (activeTab === "completed") return o.status === "delivered";
    return true;
  });

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
    setAiLoading(action);
    await new Promise((r) => setTimeout(r, 1200));
    setAiLoading(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
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

      <div className="flex gap-1 bg-surface/50 rounded-xl p-1 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
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
            <FulfillmentRulesTab rules={rules} loading={rulesLoading} onToggle={(ruleId, enabled) => {
              setRules((prev) => prev.map((r) => r.id === ruleId ? { ...r, enabled } : r));
              if (user) {
                safeFetch(`/api/fulfillment/rules`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ uid: user.uid, ruleId, enabled }),
                }).catch(() => {});
              }
            }} />
          )}
          {managementTab === "templates" && (
            <FulfillmentTemplatesTab templates={templates} loading={templatesLoading} />
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
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
          </div>
          {uniqueSources.length > 1 && (
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
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
            onChange={(e) => setStoreFilter(e.target.value)}
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
          <div className="relative group">
            <button
              onClick={async () => {
                if (!user) return;
                setSyncing(true);
                try {
                  await safeFetch<unknown>("/api/fulfillment/poll", {
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
                      await safeFetch<unknown>("/api/fulfillment/poll", {
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
            {tabOrders.map((order) => (
              <div key={order.id} className={actionLoading === order.id ? "opacity-50 pointer-events-none" : ""}>
                <OrderCard order={order} onAction={handleAction} storeName={order.storeName} />
              </div>
            ))}
          </div>
        )
      )}

      <FulfillmentChatSidebar orderCounts={counts} totalOrders={orders.length} />
    </div>
  );
}
