"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Copy, Check, Globe, Send, CheckCircle2, X, Zap,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { PLATFORM_CONFIGS } from "@/types/fulfillment";
import type { FulfillmentOrder } from "@/types/fulfillment";
import { statusConfig, supplierBorders, supplierGradients, getSourceIcon, getSourceColor } from "./constants";

export default function OrderCard({ order, onAction, storeName }: { order: FulfillmentOrder; onAction: (orderId: string, action: string, data?: Record<string, unknown>) => void; storeName?: string }) {
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
              <Image src={item.imageUrl} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover" />
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
