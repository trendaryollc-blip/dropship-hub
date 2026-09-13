"use client";

import { CheckCircle2, Clock, Truck, Package, AlertCircle } from "lucide-react";
import type { FulfillmentOrder } from "@/types/fulfillment";

interface Step {
  label: string;
  icon: React.ReactNode;
  completed: boolean;
  current: boolean;
  time?: string;
}

export default function OrderTimeline({ order }: { order: FulfillmentOrder }) {
  const steps: Step[] = [
    {
      label: "Order Detected",
      icon: <Package className="h-3.5 w-3.5" />,
      completed: true,
      current: false,
      time: order.createdAt,
    },
    {
      label: "Routed to Supplier",
      icon: <Truck className="h-3.5 w-3.5" />,
      completed: ["in_progress", "shipped", "delivered"].includes(order.status),
      current: false,
      time: order.assignedSupplier ? order.updatedAt : undefined,
    },
    {
      label: "Order Placed",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      completed: ["shipped", "delivered"].includes(order.status),
      current: order.status === "in_progress",
      time: order.platformOrders?.some((po) => po.status === "placed" || po.status === "shipped") ? order.updatedAt : undefined,
    },
    {
      label: "Shipped",
      icon: <Truck className="h-3.5 w-3.5" />,
      completed: order.status === "delivered",
      current: order.status === "shipped",
      time: order.platformOrders?.find((po) => po.status === "shipped")?.shippedAt || undefined,
    },
    {
      label: "Delivered",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      completed: order.status === "delivered",
      current: false,
      time: order.platformOrders?.find((po) => po.status === "delivered")?.deliveredAt || undefined,
    },
  ];

  if (order.status === "cancelled") {
    steps.push({
      label: "Cancelled",
      icon: <AlertCircle className="h-3.5 w-3.5" />,
      completed: true,
      current: true,
      time: order.updatedAt,
    });
  }

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Clock className="h-4 w-4 text-accent" /> Order Timeline
      </h3>
      <div className="relative">
        {steps.map((step, i) => (
          <div key={i} className="flex items-start gap-3 pb-4 last:pb-0">
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className={`absolute left-[11px] top-[22px] w-[2px] h-[calc(100%-24px)] ${
                step.completed ? "bg-emerald-500/40" : "bg-surface"
              }`} />
            )}

            {/* Icon */}
            <div className={`relative z-10 shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
              step.completed
                ? "bg-emerald-500/20 text-emerald-400"
                : step.current
                  ? "bg-accent/20 text-accent"
                  : "bg-surface text-muted-foreground"
            }`}>
              {step.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${
                step.completed || step.current ? "text-foreground" : "text-muted-foreground"
              }`}>
                {step.label}
              </p>
              {step.time && (
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {new Date(step.time).toLocaleString()}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
