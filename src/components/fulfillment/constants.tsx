"use client";

import React from "react";
import { Clock, Loader2, Truck, CheckCircle2, X } from "lucide-react";
import { PLATFORM_CONFIGS } from "@/types/fulfillment";

export const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  pending: { color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20", icon: <Clock className="h-3 w-3" /> },
  in_progress: { color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  shipped: { color: "text-purple-400", bg: "bg-purple-400/10 border-purple-400/20", icon: <Truck className="h-3 w-3" /> },
  delivered: { color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { color: "text-red-400", bg: "bg-red-400/10 border-red-400/20", icon: <X className="h-3 w-3" /> },
};

export const supplierBorders: Record<string, string> = {
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

export const supplierGradients: Record<string, string> = {
  cj: "from-emerald-500/8 to-emerald-500/2",
  aliexpress: "from-rose-500/8 to-rose-500/2",
  amazon: "from-amber-500/8 to-amber-500/2",
  alibaba: "from-orange-500/8 to-orange-500/2",
};

export const ruleActionLabels: Record<string, string> = {
  route_to_supplier: "Route to Supplier",
  set_priority: "Set Priority",
  auto_approve: "Auto-Approve",
  require_manual: "Require Manual Review",
  set_max_cost: "Set Max Cost",
  notify: "Send Notification",
  cancel_order: "Cancel Order",
};

export function getSourceIcon(source: string): string {
  const config = PLATFORM_CONFIGS.find((p) => p.id === source);
  return config?.icon || "🔗";
}

export function getSourceColor(source: string): string {
  const config = PLATFORM_CONFIGS.find((p) => p.id === source);
  return config?.color || "#6b7280";
}
