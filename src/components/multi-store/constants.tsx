"use client";

import { Clock, Loader2, Truck, CheckCircle2, XCircle, ArrowDownRight } from "lucide-react";
import React from "react";

export const statusColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  pending: { bg: "bg-amber-400/10 border-amber-400/20", text: "text-amber-400", icon: <Clock className="h-3 w-3" /> },
  processing: { bg: "bg-blue-400/10 border-blue-400/20", text: "text-blue-400", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  shipped: { bg: "bg-purple-400/10 border-purple-400/20", text: "text-purple-400", icon: <Truck className="h-3 w-3" /> },
  delivered: { bg: "bg-emerald-400/10 border-emerald-400/20", text: "text-emerald-400", icon: <CheckCircle2 className="h-3 w-3" /> },
  cancelled: { bg: "bg-red-400/10 border-red-400/20", text: "text-red-400", icon: <XCircle className="h-3 w-3" /> },
  refunded: { bg: "bg-orange-400/10 border-orange-400/20", text: "text-orange-400", icon: <ArrowDownRight className="h-3 w-3" /> },
};

export const platformColors: Record<string, string> = {
  shopify: "#96bf48",
  woocommerce: "#7b5ea7",
  trendaryo: "#f43f5e",
  etsy: "#f1641e",
  custom: "#6b7280",
};
