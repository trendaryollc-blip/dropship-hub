"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import Link from "next/link";
import {
  ArrowLeft, Package, Loader2, AlertCircle, Copy, Check,
  Truck, MapPin, CreditCard, Clock,
} from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import type { FulfillmentOrder } from "@/types/fulfillment";
import { PLATFORM_CONFIGS } from "@/types/fulfillment";
import { statusConfig, getSourceIcon, getSourceColor } from "@/components/fulfillment/constants";
import OrderTimeline from "@/components/fulfillment/OrderTimeline";
import TrackingTimeline from "@/components/fulfillment/TrackingTimeline";
import OrderCostBreakdown from "@/components/fulfillment/OrderCostBreakdown";

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const { user } = useAuth();
  const [order, setOrder] = useState<FulfillmentOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const authFetch = useCallback(async <T = unknown>(url: string, init?: RequestInit): Promise<T> => {
    const token = await user?.getIdToken();
    const headers: Record<string, string> = {
      ...(init?.headers as Record<string, string>),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return safeFetch<T>(url, { ...init, headers });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    authFetch<{ orders?: FulfillmentOrder[] }>(`/api/fulfillment?uid=${user.uid}`)
      .then((data) => {
        const found = data?.orders?.find((o) => o.id === orderId);
        if (found) {
          setOrder(found);
        } else {
          setError("Order not found");
        }
      })
      .catch(() => setError("Failed to load order"))
      .finally(() => setLoading(false));
  }, [user, orderId]);

  const handleAction = async (action: string, data?: Record<string, unknown>) => {
    if (!user || !order) return;
    setActionLoading(true);
    try {
      if (action === "syncTracking") {
        await authFetch("/api/fulfillment/sync-tracking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, fulfillmentOrderId: order.id, trackingNumber: data?.trackingNumber, carrier: data?.carrier }),
        });
      } else {
        await authFetch("/api/fulfillment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uid: user.uid, orderId: order.id, action, ...data }),
        });
      }
      // Reload order
      const reload = await authFetch<{ orders?: FulfillmentOrder[] }>(`/api/fulfillment?uid=${user.uid}`);
      const found = reload?.orders?.find((o) => o.id === orderId);
      if (found) setOrder(found);
    } catch {
      setError("Action failed");
    }
    setActionLoading(false);
  };

  const copyAddress = () => {
    if (!order) return;
    const addr = order.shippingAddress;
    navigator.clipboard.writeText(`${addr.fullName}\n${addr.street}\n${addr.city}, ${addr.state} ${addr.zipCode}\n${addr.country}\n${addr.phone}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-24">
        <Link href="/fulfillment" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Fulfillment
        </Link>
        <div className="text-center py-16">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <p className="text-foreground">{error || "Order not found"}</p>
        </div>
      </div>
    );
  }

  const st = statusConfig[order.status] || statusConfig.pending;
  const source = order.items[0]?.source || "custom";
  const platformConfig = PLATFORM_CONFIGS.find((p) => p.id === source);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24">
      {/* Back Link */}
      <Link href="/fulfillment" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Fulfillment
      </Link>

      {/* Header */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{getSourceIcon(source)}</span>
              <div>
                <h1 className="font-display text-xl font-bold text-foreground">{order.orderNumber}</h1>
                <p className="text-sm text-muted-foreground">
                  {new Date(order.createdAt).toLocaleDateString()} · {order.customerName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${st.bg} ${st.color}`}>
                {st.icon} {order.status.replace("_", " ")}
              </span>
              {platformConfig && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium" style={{ color: platformConfig.color, background: `${platformConfig.color}15` }}>
                  {platformConfig.icon} {platformConfig.name}
                </span>
              )}
              {order.storeName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-accent/10 text-accent">
                  {order.storeName}
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-accent">${order.profit.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">profit</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          {order.status === "pending" && (
            <button
              onClick={() => handleAction("approve")}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-400/20 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Clock className="h-3 w-3" />}
              Approve & Process
            </button>
          )}
          {order.status === "in_progress" && (
            <button
              onClick={() => handleAction("markDelivered")}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 text-emerald-400 border border-emerald-400/20 rounded-lg text-xs font-medium hover:bg-emerald-500/30 transition-all disabled:opacity-50"
            >
              {actionLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              Mark Delivered
            </button>
          )}
          {order.status !== "delivered" && order.status !== "cancelled" && (
            <button
              onClick={() => handleAction("cancel")}
              disabled={actionLoading}
              className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-medium hover:bg-red-500/20 transition-all disabled:opacity-50"
            >
              Cancel Order
            </button>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Package className="h-4 w-4 text-accent" /> Items ({order.items.length})
            </h3>
            <div className="space-y-3">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-surface/50 border border-white/5">
                  {item.imageUrl && (
                    <img src={item.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      ${item.price.toFixed(2)} × {item.quantity}
                    </p>
                    {item.supplierName && item.supplierName !== "No supplier assigned" && (
                      <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent">
                        → {item.supplierName}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-foreground">${(item.price * item.quantity).toFixed(2)}</p>
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ color: getSourceColor(source), background: `${getSourceColor(source)}15` }}>
                      {getSourceIcon(source)} {item.source}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tracking Timeline */}
          <TrackingTimeline order={order} />

          {/* Platform Sub-Orders */}
          {order.platformOrders && order.platformOrders.length > 0 && (
            <div className="glass rounded-xl p-5">
              <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                <Truck className="h-4 w-4 text-accent" /> Platform Orders
              </h3>
              <div className="space-y-3">
                {order.platformOrders.map((po, i) => (
                  <div key={i} className="p-3 rounded-lg bg-surface/50 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">{po.platform}</p>
                        <p className="text-xs text-muted-foreground">ID: {po.platformOrderId}</p>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        po.status === "shipped" ? "bg-purple-500/20 text-purple-400" :
                        po.status === "delivered" ? "bg-emerald-500/20 text-emerald-400" :
                        po.status === "placed" ? "bg-blue-500/20 text-blue-400" :
                        "bg-surface text-muted-foreground"
                      }`}>
                        {po.status}
                      </span>
                    </div>
                    {po.trackingNumber && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Tracking: <span className="text-foreground font-mono">{po.trackingNumber}</span>
                        {po.carrier && <span className="ml-1">({po.carrier})</span>}
                      </div>
                    )}
                    {po.error && (
                      <p className="mt-2 text-xs text-red-400">{po.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Order Timeline */}
          <OrderTimeline order={order} />

          {/* Cost Breakdown */}
          <OrderCostBreakdown order={order} />

          {/* Shipping Address */}
          <div className="glass rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4 text-accent" /> Shipping Address
              </h3>
              <button
                onClick={copyAddress}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
                title="Copy address"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="text-foreground font-medium">{order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.street}</p>
              <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
              <p>{order.shippingAddress.country}</p>
              {order.shippingAddress.phone && <p className="mt-2">{order.shippingAddress.phone}</p>}
            </div>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${order.shippingAddress.street}, ${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.zipCode}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              <MapPin className="h-3 w-3" /> Open in Maps
            </a>
          </div>

          {/* Customer Info */}
          <div className="glass rounded-xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-accent" /> Customer
            </h3>
            <div className="text-sm space-y-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Name</p>
                <p className="text-foreground">{order.customerName}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Email</p>
                <p className="text-foreground">{order.customerEmail}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
