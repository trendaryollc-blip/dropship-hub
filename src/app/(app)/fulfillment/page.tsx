"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
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

const supplierBorders: Record<string, string> = {
  cj: "border-l-emerald-400",
  aliexpress: "border-l-rose-400",
  amazon: "border-l-amber-400",
  alibaba: "border-l-orange-400",
  ebay: "border-l-blue-400",
  dhgate: "border-l-purple-400",
  temu: "border-l-red-400",
  shein: "border-l-pink-400",
  banggood: "border-l-yellow-400",
  custom: "border-l-gray-400",
  manual: "border-l-gray-400",
};

const supplierGradients: Record<string, string> = {
  cj: "from-emerald-500/8 to-emerald-500/2",
  aliexpress: "from-rose-500/8 to-rose-500/2",
  amazon: "from-amber-500/8 to-amber-500/2",
  alibaba: "from-orange-500/8 to-orange-500/2",
};

function getSourceIcon(source: string): string {
  const config = PLATFORM_CONFIGS.find((p) => p.id === source);
  return config?.icon || "🔗";
}

function getSourceColor(source: string): string {
  const config = PLATFORM_CONFIGS.find((p) => p.id === source);
  return config?.color || "#6b7280";
}

function OnboardingBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="glass rounded-xl p-5 border border-accent/20 bg-gradient-to-r from-accent/5 to-transparent">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-display text-sm font-semibold text-foreground">Welcome to Fulfillment Center</h3>
          <p className="text-xs text-muted-foreground mt-1">Get started in 3 simple steps</p>
        </div>
        <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors p-1">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { step: 1, title: "Connect your store", desc: "Link Shopify, Etsy, or WooCommerce", href: "/store", icon: <Globe className="h-4 w-4" /> },
          { step: 2, title: "Assign suppliers", desc: "Pick who fulfills each product", href: "/products", icon: <Package className="h-4 w-4" /> },
          { step: 3, title: "Sync orders", desc: "Orders auto-appear here", href: null, icon: <RefreshCw className="h-4 w-4" /> },
        ].map((s) => (
          <div key={s.step} className="flex items-center gap-3 p-3 rounded-lg bg-surface/50">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">
              {s.step}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground">{s.title}</p>
              <p className="text-[10px] text-muted-foreground">{s.desc}</p>
            </div>
            {s.href ? (
              <Link href={s.href} className="flex-shrink-0 p-1.5 rounded-lg hover:bg-accent/20 text-accent transition-colors">
                <ArrowRight className="h-3 w-3" />
              </Link>
            ) : (
              <div className="flex-shrink-0 p-1.5 text-muted-foreground">
                {s.icon}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function OrderCard({ order, onAction, storeName }: { order: FulfillmentOrder; onAction: (orderId: string, action: string, data?: Record<string, unknown>) => void; storeName?: string }) {
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
  const borderColor = supplierBorders[source] || "border-l-gray-400";
  const gradient = supplierGradients[source] || "from-gray-500/8 to-gray-500/2";

  return (
    <div ref={ref} className={`glass rounded-xl border-l-4 ${borderColor} bg-gradient-to-r ${gradient} p-4 sm:p-5 transition-all duration-500 hover:border-accent/20 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
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
            {storeName && <span className="ml-2 text-accent">← {storeName}</span>}
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
              {item.supplierName && item.supplierName !== "No supplier assigned" && (
                <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[9px] font-medium bg-accent/10 text-accent">
                  → {item.supplierName}
                </span>
              )}
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
            <button
              onClick={async () => {
                if (!trackingInput) return;
                onAction(order.id, "syncTracking", { trackingNumber: trackingInput, carrier: carrierInput || "Other" });
                setTrackingInput("");
                setCarrierInput("");
              }}
              disabled={!trackingInput}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50"
            >
              <CheckCircle2 className="h-3 w-3" /> Sync to Store
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

function SettingsTab({ settings, onSave, onClose }: { settings: FulfillmentSettings; onSave: (s: FulfillmentSettings) => void; onClose: () => void }) {
  const [local, setLocal] = useState<FulfillmentSettings>(settings);

  const toggleAutoApprove = (platformId: string) => {
    const updated = { ...local, autoApprove: { ...local.autoApprove, [platformId]: !local.autoApprove[platformId] } };
    setLocal(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Settings className="h-4 w-4 text-accent" /> Fulfillment Settings
        </h2>
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface transition-colors">
          <X className="h-3 w-3" /> Close
        </button>
      </div>

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
  const [activeTab, setActiveTab] = useState<"pending" | "in_progress" | "shipped" | "completed">("pending");
  const [orders, setOrders] = useState<FulfillmentOrder[]>([]);
  const [settings, setSettings] = useState<FulfillmentSettings>(DEFAULT_FULFILLMENT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [storeFilter, setStoreFilter] = useState("all");
  const [showSettings, setShowSettings] = useState(false);
  const [dismissedOnboarding, setDismissedOnboarding] = useState(false);
  const [connectedStores, setConnectedStores] = useState<Array<{ id: string; platform: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/fulfillment?uid=${user.uid}`);
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) { console.error("Failed to fetch orders:", err); setError("Failed to load data. Please try again."); }
  }, [user]);

  const fetchSettings = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/fulfillment/settings?uid=${user.uid}`);
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
    } catch (err) { console.error("Failed to fetch settings:", err); setError("Failed to load data. Please try again."); }
  }, [user]);

  const fetchConnectedStores = useCallback(async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/store/connections?uid=${user.uid}`);
      const data = await res.json();
      const stores: Array<{ id: string; platform: string; name: string }> = (data.connections || []).map((c: { id: string; platform: string; name: string }) => ({
        id: c.id,
        platform: c.platform,
        name: c.name,
      }));
      setConnectedStores(stores);
    } catch (err) { console.error("Failed to fetch connected stores:", err); setError("Failed to load data. Please try again."); }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    Promise.all([fetchOrders(), fetchSettings(), fetchConnectedStores()]).then(() => setLoading(false));
  }, [user, fetchOrders, fetchSettings, fetchConnectedStores]);

  const handleAction = async (orderId: string, action: string, data?: Record<string, unknown>) => {
    if (!user) return;
    setActionLoading(orderId);
    try {
      if (action === "syncTracking") {
        await fetch("/api/fulfillment/sync-tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, fulfillmentOrderId: orderId, trackingNumber: data?.trackingNumber, carrier: data?.carrier }),
        });
      } else {
        await fetch("/api/fulfillment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, orderId, action, ...data }),
        });
      }
      await fetchOrders();
    } catch (err) { console.error("Failed to perform action:", err); setError("Failed to load data. Please try again."); }
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
      setShowSettings(false);
    } catch (err) { console.error("Failed to save settings:", err); setError("Failed to load data. Please try again."); }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {error && (<div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-center gap-2"><AlertCircle className="h-4 w-4 shrink-0" />{error}<button onClick={() => { setError(null); fetchOrders(); fetchSettings(); fetchConnectedStores(); }} className="ml-auto text-xs underline">Retry</button></div>)}
      {/* Onboarding Banner */}
      {!dismissedOnboarding && !hasOrders && (
        <OnboardingBanner onDismiss={() => setDismissedOnboarding(true)} />
      )}

      {/* Header */}
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
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-all ${showSettings ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground hover:bg-surface"}`}
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </div>

      {/* Stats Bar — only show when there are orders */}
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
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${activeTab === tab.id ? "bg-white/20" : "bg-surface"}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <SettingsTab settings={settings} onSave={handleSaveSettings} onClose={() => setShowSettings(false)} />
      )}

      {/* Filters — only when not in settings */}
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
                <option key={s} value={s}>{getSourceIcon(s)} {s}</option>
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
                  await fetch("/api/fulfillment/poll", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ uid: user.uid }),
                  });
                  await fetchOrders();
                } catch (err) { console.error("Failed to sync orders:", err); setError("Failed to load data. Please try again."); }
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

      {/* Tab Content */}
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
                      await fetch("/api/fulfillment/poll", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ uid: user.uid }),
                      });
                      await fetchOrders();
                    } catch (err) { console.error("Failed to sync orders:", err); setError("Failed to load data. Please try again."); }
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
    </div>
  );
}
