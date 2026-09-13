"use client";

import { useState } from "react";
import { Truck, ExternalLink, MapPin, Copy, Check, Clock, Package, CheckCircle2 } from "lucide-react";
import type { FulfillmentOrder } from "@/types/fulfillment";

const STATUS_STEPS = [
  { key: "ordered", label: "Ordered", icon: Package },
  { key: "shipped", label: "Shipped", icon: Truck },
  { key: "in_transit", label: "In Transit", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

function getStepIndex(status: string): number {
  const map: Record<string, number> = {
    placed: 0,
    processing: 0,
    ordered: 0,
    shipped: 1,
    in_transit: 2,
    transit: 2,
    out_for_delivery: 2,
    delivered: 3,
    cancelled: -1,
  };
  return map[status] ?? 0;
}

export default function TrackingTimeline({ order }: { order: FulfillmentOrder }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const hasTracking = order.platformOrders?.some((po) => po.trackingNumber);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const buildMapLink = () => {
    const addr = order.shippingAddress;
    if (!addr) return null;
    const query = encodeURIComponent(`${addr.street}, ${addr.city}, ${addr.state} ${addr.zipCode}, ${addr.country}`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  if (!hasTracking) {
    return (
      <div className="glass rounded-xl p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Truck className="h-4 w-4 text-accent" /> Tracking
        </h3>
        <div className="text-center py-6">
          <Truck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No tracking information available yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Truck className="h-4 w-4 text-accent" /> Tracking
      </h3>
      <div className="space-y-4">
        {order.platformOrders
          .filter((po) => po.trackingNumber)
          .map((po, i) => {
            const trackingUrl = po.carrier
              ? `https://trackingshipment.com/${po.carrier}/${po.trackingNumber}`
              : `https://trackingshipment.com/${po.trackingNumber}`;

            const currentStep = getStepIndex(po.status);
            const mapLink = buildMapLink();

            return (
              <div key={i} className="p-4 rounded-lg bg-surface/50 border border-white/5">
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-accent/10">
                      <Truck className="h-3.5 w-3.5 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{po.platform}</p>
                      <p className="text-[10px] text-muted-foreground">{po.carrier || "Unknown carrier"}</p>
                    </div>
                  </div>
                  <StatusBadge status={po.status} />
                </div>

                {/* Tracking number with copy */}
                <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-surface/80 border border-white/5">
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">Tracking:</span>
                  <code className="text-xs text-foreground font-mono flex-1 truncate">{po.trackingNumber}</code>
                  <button
                    onClick={() => copyToClipboard(po.trackingNumber!, `tracking-${i}`)}
                    className="p-1 rounded hover:bg-surface transition-colors flex-shrink-0"
                    title="Copy tracking number"
                  >
                    {copiedId === `tracking-${i}` ? (
                      <Check className="h-3 w-3 text-emerald-400" />
                    ) : (
                      <Copy className="h-3 w-3 text-muted-foreground" />
                    )}
                  </button>
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 rounded hover:bg-surface transition-colors flex-shrink-0"
                    title="Track shipment"
                  >
                    <ExternalLink className="h-3 w-3 text-accent" />
                  </a>
                </div>

                {/* Carrier info & estimated delivery */}
                <div className="flex items-center gap-3 mb-3">
                  {po.carrier && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-muted-foreground">Carrier:</span>
                      <span className="text-[10px] font-medium text-foreground">{po.carrier}</span>
                    </div>
                  )}
                  {po.estimatedDelivery && (
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-blue-400" />
                      <span className="text-[10px] text-muted-foreground">ETA:</span>
                      <span className="text-[10px] font-medium text-foreground">
                        {new Date(po.estimatedDelivery).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status progression visual */}
                <div className="mb-1">
                  <div className="flex items-center gap-0">
                    {STATUS_STEPS.map((step, j) => {
                      const StepIcon = step.icon;
                      const isCompleted = j <= currentStep && currentStep >= 0;
                      const isCurrent = j === currentStep;
                      const isLast = j === STATUS_STEPS.length - 1;

                      return (
                        <div key={step.key} className="flex items-center flex-1">
                          {/* Step dot */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                                isCompleted
                                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                                  : "bg-surface border-white/10 text-muted-foreground/40"
                              } ${isCurrent ? "ring-2 ring-emerald-500/30 scale-110" : ""}`}
                            >
                              <StepIcon className="h-3 w-3" />
                            </div>
                            <span
                              className={`text-[9px] mt-1 text-center leading-tight ${
                                isCompleted ? "text-foreground font-medium" : "text-muted-foreground/60"
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                          {/* Connector line */}
                          {!isLast && (
                            <div
                              className={`flex-1 h-0.5 mx-1 rounded-full ${
                                j < currentStep ? "bg-emerald-500" : "bg-white/10"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery address link */}
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 mt-3 p-2 rounded-lg bg-surface/80 border border-white/5 hover:border-accent/20 transition-all"
                  >
                    <MapPin className="h-3 w-3 text-accent flex-shrink-0" />
                    <span className="text-[10px] text-muted-foreground truncate">
                      {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                    </span>
                    <ExternalLink className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />
                  </a>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    placed: "bg-blue-500/20 text-blue-400",
    processing: "bg-amber-500/20 text-amber-400",
    shipped: "bg-purple-500/20 text-purple-400",
    in_transit: "bg-purple-500/20 text-purple-400",
    transit: "bg-purple-500/20 text-purple-400",
    out_for_delivery: "bg-blue-500/20 text-blue-400",
    delivered: "bg-emerald-500/20 text-emerald-400",
    cancelled: "bg-red-500/20 text-red-400",
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${styles[status] || "bg-surface text-muted-foreground"}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
