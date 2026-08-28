"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  Package, Clock, Truck, CheckCircle2, Settings, Loader2,
  ExternalLink, Copy, Check, AlertCircle, Search, Filter,
  DollarSign, ArrowRight, Globe, Send, RefreshCw, X,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type {
  FulfillmentOrder, FulfillmentSettings, PlatformConfig,
} from "@/types/fulfillment";
import { PLATFORM_CONFIGS, DEFAULT_FULFILLMENT_SETTINGS } from "@/types/fulfillment";

const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  pending: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", icon: <Clock className="h-3 w-3" /> },
  in_progress: { color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  shipped: { color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20", icon: <Truck className="h-3 w-3" /> },
  delivered: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { color: "text-red-400", bg: "bg-red-400/10 border-red-400/20", icon: <X className="h-3 w-3" /> },
};

function getSourceIcon(source: string): string {
  const config = PLATFORM_CONFIGS.find((p) => p.id === source);
  return config?.icon || "🔗";
}

function getSourceColor(source: string): string {
  const config = PLATFORM_CONFIGS.find((p) => p.id === source);
  return config?.color || "#6b7280";
}

function OrderCard({ order, onAction }: { order: FulfillmentOrder; onAction: (orderId: string, action: string, data?: Record<string, unknown>) => void }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [copied, setCopied] = useState(false);
  const [trackingInput, setTrackingInput] = useState("");
  const [carrierInput, setCarrierInput] = useState("");
  const [showManualOrder, setShowManualOrder] = useState(false);
  const st = statusConfig[order.status] || statusConfig.pending;

  const copyAddress = () => {
    const addr = order.shippingAddress;
    navigator.clipboard.writeText(`${addr.fullName}\n${addr.street}\n${addr.city}, ${addr.state} ${addr.zipCode}\n${addr.country}\n${addr.phone}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const primaryItem = order.items[0];
  const source = primaryItem?.source || "custom";
  const isCJ = source === "cj";
  const platformConfig = PLATFORM_CONFIGS.find((p) => p.id === source);

  return (
    <div ref={ref} className={`glass rounded-xl p-4 sm:p-5 transition-all duration-500 hover:border-accent/20 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{getSourceIcon(source)}</span>
            <h4 className="font-display text-sm font-semibold text-foreground">{order.orderNumber}</h4>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.bg} ${st.color}`}>
              {st.icon} {order.status.replace("_", " ")}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {new Date(order.createdAt).toLocaleDateString()} · {order.customerName}
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-accent">${order.profit.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">profit</p>
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2 mb-3">
        {order.items.map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-surface/50">
            {item.imageUrl && (
              <img src={item.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{item.name}</p>
              <p className="text-[10px] text-muted-foreground">
                ${item.price.toFixed(2)} x {item.quantity} · Cost: ${item.unitCost.toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-medium" style={{ color: getSourceColor(source), background: `${getSourceColor(source)}15` }}>
                {getSourceIcon(source)} {item.source}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-3 gap-2 mb-3 p-2 rounded-lg bg-surface/50">
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Revenue</p>
          <p className="text-xs font-bold text-foreground">${order.totalRevenue.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Cost</p>
          <p className="text-xs font-bold text-foreground">${order.totalCost.toFixed(2)}</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-muted-foreground">Profit</p>
          <p className="text-xs font-bold text-accent">${order.profit.toFixed(2)}</p>
        </div>
      </div>

      {/* Shipping Address */}
      <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-surface/50">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-muted-foreground">Ship to</p>
          <p className="text-xs text-foreground truncate">
            {order.shippingAddress.fullName}, {order.shippingAddress.city}, {order.shippingAddress.country}
          </p>
        </div>
        <button onClick={copyAddress} className="p-1.5 rounded-lg hover:bg-surface transition-colors" title="Copy address">
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
        </button>
      </div>

      {/* Platform Orders */}
      {order.platformOrders.length > 0 && (
        <div className="space-y-2 mb-3">
          {order.platformOrders.map((po, i) => (
            <div key={i} className="p-2 rounded-lg border border-white/5 bg-surface/30">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">{po.platform.toUpperCase()} Order</span>
                {po.trackingNumber && (
                  <span className="text-[10px] text-purple-400 font-mono">{po.trackingNumber}</span>
                )}
              </div>
              {po.estimatedDelivery && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  ETA: {new Date(po.estimatedDelivery).toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {order.status === "pending" && (
          <>
            {isCJ ? (
              <button
                onClick={() => onAction(order.id, "autoOrder")}
                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-all"
              >
                <Zap className="h-3 w-3" /> Auto-Order via CJ
              </button>
            ) : (
              <>
                <button
                  onClick={() => {
                    const url = platformConfig?.id
                      ? `https://www.${platformConfig.id}.com`
                      : "";
                    if (url) window.open(url, "_blank");
                    setShowManualOrder(!showManualOrder);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition-all"
                >
                  <Globe className="h-3 w-3" /> Open {platformConfig?.name || "Supplier"}
                </button>
                <button
                  onClick={() => onAction(order.id, "approve")}
                  className="flex items-center gap-1.5 px-3 py-2 bg-accent/20 text-accent rounded-lg text-xs font-medium hover:bg-accent/30 transition-all"
                >
                  <Check className="h-3 w-3" /> Mark as Ordered
                </button>
              </>
            )}
          </>
        )}

        {order.status === "in_progress" && (
          <div className="flex flex-wrap gap-2 w-full">
            <input
              type="text"
              placeholder="Tracking number"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              className="flex-1 min-w-[150px] px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
            <input
              type="text"
              placeholder="Carrier"
              value={carrierInput}
              onChange={(e) => setCarrierInput(e.target.value)}
              className="w-24 px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
            />
            <button
              onClick={() => {
                if (trackingInput) {
                  onAction(order.id, "updateTracking", { trackingNumber: trackingInput, carrier: carrierInput || "Unknown" });
                  setTrackingInput("");
                  setCarrierInput("");
                }
              }}
              disabled={!trackingInput}
              className="flex items-center gap-1.5 px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-xs font-medium hover:bg-purple-500/30 transition-all disabled:opacity-50"
            >
              <Send className="h-3 w-3" /> Save Tracking
            </button>
          </div>
        )}

        {order.status === "shipped" && (
          <button
            onClick={() => onAction(order.id, "markDelivered")}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-all"
          >
            <CheckCircle2 className="h-3 w-3" /> Mark Delivered
          </button>
        )}

        {order.status !== "delivered" && order.status !== "cancelled" && (
          <button
            onClick={() => onAction(order.id, "cancel")}
            className="flex items-center gap-1.5 px-3 py-2 text-muted-foreground hover:text-red-400 rounded-lg text-xs font-medium hover:bg-red-500/10 transition-all ml-auto"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        )}
      </div>

      {/* Manual Order Instructions */}
      {showManualOrder && (
        <div className="mt-3 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-blue-400">Manual Order Steps</p>
            <button onClick={() => setShowManualOrder(false)} className="text-muted-foreground hover:text-foreground">
              <X className="h-3 w-3" />
            </button>
          </div>
          <ol className="text-[10px] text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Open the product on {platformConfig?.name || "supplier"}</li>
            <li>Select quantity: {primaryItem?.quantity || 1}</li>
            <li>Click &quot;Buy Now&quot;</li>
            <li>Paste shipping address (click copy above)</li>
            <li>Complete payment</li>
            <li>Copy order confirmation number</li>
            <li>Enter it as tracking number above and save</li>
          </ol>
        </div>
      )}
    </div>
  );
}

function SettingsTab({ settings, onSave }: { settings: FulfillmentSettings; onSave: (s: FulfillmentSettings) => void }) {
  const [local, setLocal] = useState<FulfillmentSettings>(settings);

  const toggleAutoApprove = (platformId: string) => {
    const updated = { ...local, autoApprove: { ...local.autoApprove, [platformId]: !local.autoApprove[platformId] } };
    setLocal(updated);
  };

  return (
    <div className="space-y-6">
      {/* Automation */}
      <div className="glass rounded-xl p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" /> Auto-Fulfillment by Platform
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Enable auto-ordering for platforms with API support. When new orders arrive, they&apos;ll be placed automatically.
        </p>
        <div className="space-y-2">
          {PLATFORM_CONFIGS.map((platform) => (
            <div key={platform.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50 hover:bg-surface transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg">{platform.icon}</span>
                <div>
                  <p className="text-xs font-medium text-foreground">{platform.name}</p>
                  <p className="text-[10px] text-muted-foreground">{platform.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {platform.autoOrderSupported ? (
                  <button
                    onClick={() => toggleAutoApprove(platform.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${local.autoApprove[platform.id] ? "bg-accent" : "bg-surface"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${local.autoApprove[platform.id] ? "left-5.5 translate-x-0" : "left-0.5"}`} />
                  </button>
                ) : (
                  <span className="text-[10px] text-muted-foreground px-2 py-1 rounded bg-surface">No API</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="glass rounded-xl p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-accent" /> Fulfillment Rules
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Min Supplier Reliability Score (%)</label>
            <input
              type="number"
              value={local.minReliabilityScore}
              onChange={(e) => setLocal({ ...local, minReliabilityScore: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 bg-surface border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max Shipping Days</label>
            <input
              type="number"
              value={local.maxShippingDays}
              onChange={(e) => setLocal({ ...local, maxShippingDays: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 bg-surface border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Auto-switch supplier on degradation</p>
              <p className="text-[10px] text-muted-foreground">Switch if reliability drops below {local.degradationThreshold}%</p>
            </div>
            <button
              onClick={() => setLocal({ ...local, autoSwitchOnDegradation: !local.autoSwitchOnDegradation })}
              className={`relative w-10 h-5 rounded-full transition-colors ${local.autoSwitchOnDegradation ? "bg-accent" : "bg-surface"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${local.autoSwitchOnDegradation ? "left-5.5" : "left-0.5"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass rounded-xl p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4">Notifications</h3>
        <div className="space-y-3">
          {[
            { key: "emailOnNewOrder" as const, label: "Email on new order" },
            { key: "emailOnShipment" as const, label: "Email on shipment" },
            { key: "emailOnDelivery" as const, label: "Email on delivery" },
            { key: "browserNotifications" as const, label: "Browser notifications" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <p className="text-xs text-foreground">{item.label}</p>
              <button
                onClick={() => setLocal({ ...local, [item.key]: !local[item.key] })}
                className={`relative w-10 h-5 rounded-full transition-colors ${local[item.key] ? "bg-accent" : "bg-surface"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${local[item.key] ? "left-5.5" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onSave(local)}
        className="w-full py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-all"
      >
        Save Settings
      </button>
    </div>
  );
}

function Zap({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export default function FulfillmentPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"pending" | "in_progress" | "shipped" | "completed" | "settings">("pending");
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [settings, setSettings] = useState<FulfillmentSettings>(DEFAULT_FULFILLMENT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/fulfillment?uid=${user.uid}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch {}
  }, [user]);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/fulfillment/settings?uid=${user.uid}`);
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch {}
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchOrders(), fetchSettings()]).then(() => setLoading(false));
  }, [user, fetchOrders, fetchSettings]);

  const handleAction = async (orderId: string, action: string, data?: Record<string, unknown>) => {
    if (!user) return;
    setActionLoading(orderId);
    try {
      await fetch("/api/fulfillment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, orderId, action, ...data }),
      });
      await fetchOrders();
    } catch {}
    setActionLoading(null);
  };

  const handleSaveSettings = async (newSettings: FulfillmentSettings) => {
    if (!user) return;
    try {
      await fetch("/api/fulfillment/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.uid, settings: newSettings }),
      });
      setSettings(newSettings);
    } catch {}
  };

  const filteredOrders = orders.filter((o) => {
    const matchesSearch = !searchQuery ||
      o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.items.some((i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSource = sourceFilter === "all" || o.items.some((i) => i.source === sourceFilter);
    return matchesSearch && matchesSource;
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

  const tabs = [
    { id: "pending" as const, label: "Pending", count: counts.pending, color: "text-amber-400" },
    { id: "in_progress" as const, label: "In Progress", count: counts.in_progress, color: "text-blue-400" },
    { id: "shipped" as const, label: "Shipped", count: counts.shipped, color: "text-purple-400" },
    { id: "completed" as const, label: "Completed", count: counts.completed, color: "text-emerald-400" },
    { id: "settings" as const, label: "Settings", count: null, color: "text-muted-foreground" },
  ];

  const uniqueSources = [...new Set(orders.flatMap((o) => o.items.map((i) => i.source)))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="font-display text-xl font-bold text-foreground flex items-center gap-3">
          <Package className="h-6 w-6 text-accent" />
          Fulfillment Center
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage orders, track shipments, and fulfill automatically
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Pending", value: counts.pending, color: "text-amber-400", bg: "bg-amber-400/10" },
          { label: "In Progress", value: counts.in_progress, color: "text-blue-400", bg: "bg-blue-400/10" },
          { label: "Shipped", value: counts.shipped, color: "text-purple-400", bg: "bg-purple-400/10" },
          { label: "Delivered", value: counts.completed, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.bg} border border-white/5 rounded-xl p-3 text-center`}>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
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
            {tab.count !== null && (
              <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === tab.id ? "bg-white/20" : "bg-surface"}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Filters (non-settings tabs) */}
      {activeTab !== "settings" && (
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
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent"
          >
            <option value="all">All Sources</option>
            {uniqueSources.map((s) => (
              <option key={s} value={s}>{getSourceIcon(s)} {s}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === "settings" ? (
        <SettingsTab settings={settings} onSave={handleSaveSettings} />
      ) : tabOrders.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No {activeTab.replace("_", " ")} orders</h3>
          <p className="text-sm text-muted-foreground">
            {activeTab === "pending"
              ? "Orders from Trendaryo will appear here when customers place them"
              : `No orders in ${activeTab.replace("_", " ")} status`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tabOrders.map((order) => (
            <div key={order.id} className={actionLoading === order.id ? "opacity-50 pointer-events-none" : ""}>
              <OrderCard order={order} onAction={handleAction} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
