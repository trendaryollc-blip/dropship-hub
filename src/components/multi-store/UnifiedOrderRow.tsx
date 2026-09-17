"use client";

import { useState } from "react";
import { useInView } from "@/hooks/useInView";
import { Globe, ChevronDown, ChevronUp, CheckCircle2, XCircle, ExternalLink, Loader2 } from "lucide-react";
import type { UnifiedOrder } from "@/types/multi-store";
import { statusColors, platformColors } from "./constants";
import TrackingInput from "./TrackingInput";
import { safeFetch } from "@/lib/safe-fetch";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";

interface UnifiedOrderRowProps {
  order: UnifiedOrder;
  delay: number;
  onOrderUpdated?: () => void;
}

export default function UnifiedOrderRow({ order, delay, onOrderUpdated }: UnifiedOrderRowProps) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const [expanded, setExpanded] = useState(false);
  const [acting, setActing] = useState<string | null>(null);
  const st = statusColors[order.status] || statusColors.pending;

  const handleAction = async (action: "fulfill" | "cancel") => {
    if (!user) return;
    setActing(action);
    try {
      const token = await user.getIdToken();
      const result = await safeFetch<{ success: boolean; error?: string }>("/api/multi-store/orders/action", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, orderId: order.id }),
      });
      if (result.success) {
        success(action === "fulfill" ? "Order marked as fulfilled" : "Order cancelled");
        onOrderUpdated?.();
      } else {
        toastError(result.error || `Failed to ${action} order`);
      }
    } catch {
      toastError(`Failed to ${action} order`);
    }
    setActing(null);
  };

  const canFulfill = order.fulfillmentStatus === "unfulfilled" && order.status !== "cancelled" && order.status !== "delivered";
  const canCancel = order.status === "pending" || order.status === "processing";

  return (
    <div ref={ref} className={`glass rounded-xl border border-border transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${delay}ms` }}>
      <div className="p-3 sm:p-4 cursor-pointer hover:bg-surface-hover transition-colors" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: `${platformColors[order.storePlatform] || "#6b7280"}20` }}>
              <Globe className="h-4 w-4" style={{ color: platformColors[order.storePlatform] || "#6b7280" }} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{order.orderNumber}</p>
              <p className="text-[10px] text-muted-foreground truncate">{order.storeName} · {order.customerName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${st.bg} ${st.text}`}>
              {st.icon} {order.status}
            </span>
            <p className="text-xs font-bold text-foreground">${order.totalAmount.toFixed(2)}</p>
            {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
            <div><span className="text-muted-foreground">Platform:</span> <span className="font-semibold text-foreground capitalize">{order.storePlatform}</span></div>
            <div><span className="text-muted-foreground">Items:</span> <span className="font-semibold text-foreground">{order.items.length}</span></div>
            <div><span className="text-muted-foreground">Fulfillment:</span> <span className="font-semibold text-foreground capitalize">{order.fulfillmentStatus}</span></div>
            <div><span className="text-muted-foreground">Created:</span> <span className="font-semibold text-foreground">{new Date(order.createdAt).toLocaleDateString()}</span></div>
          </div>

          {order.trackingNumber && (
            <div className="flex items-center gap-2 text-[10px]">
              <span className="text-muted-foreground">Tracking:</span>
              <span className="font-semibold text-accent">{order.trackingNumber}</span>
              {order.shippingAddress && (
                <a
                  href={`https://www.google.com/search?q=${encodeURIComponent(order.trackingNumber)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent hover:text-accent-hover"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {order.items.length > 0 && (
            <div className="space-y-1">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-[10px] p-2 rounded-lg bg-surface/50">
                  <span className="text-foreground">{item.title} x{item.quantity}</span>
                  <span className="font-semibold text-foreground">${item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/50">
            {canFulfill && (
              <button
                onClick={() => handleAction("fulfill")}
                disabled={!!acting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-medium hover:bg-emerald-400/20 transition-all disabled:opacity-50"
              >
                {acting === "fulfill" ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                Mark Fulfilled
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => handleAction("cancel")}
                disabled={!!acting}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-[10px] font-medium hover:bg-red-400/20 transition-all disabled:opacity-50"
              >
                {acting === "cancel" ? <Loader2 className="h-3 w-3 animate-spin" /> : <XCircle className="h-3 w-3" />}
                Cancel
              </button>
            )}
            {canFulfill && !order.trackingNumber && (
              <TrackingInput orderId={order.id} onTrackingAdded={() => onOrderUpdated?.()} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
