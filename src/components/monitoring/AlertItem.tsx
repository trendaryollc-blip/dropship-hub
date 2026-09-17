"use client";

import { TrendingDown, TrendingUp, AlertTriangle, Package, Target } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface AlertItemProps {
  id: string;
  type: "price_drop" | "price_increase" | "out_of_stock" | "back_in_stock" | "competitor_undercut";
  message: string;
  createdAt: string;
  productTitle: string;
  onDismiss: () => void;
}

const alertTypeConfig: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  price_drop: { icon: TrendingDown, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  price_increase: { icon: TrendingUp, color: "text-red-400", bg: "bg-red-400/10" },
  out_of_stock: { icon: AlertTriangle, color: "text-red-400", bg: "bg-red-400/10" },
  back_in_stock: { icon: Package, color: "text-emerald-400", bg: "bg-emerald-400/10" },
  competitor_undercut: { icon: Target, color: "text-amber-400", bg: "bg-amber-400/10" },
};

export default function AlertItem({ id: _id, type, message, createdAt, productTitle, onDismiss }: AlertItemProps) {
  const cfg = alertTypeConfig[type] || alertTypeConfig.price_drop;
  const Icon = cfg.icon;

  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className={`p-1.5 rounded-lg ${cfg.bg} shrink-0 mt-0.5`}>
          <Icon className={`h-4 w-4 ${cfg.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{productTitle}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{message}</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">{new Date(createdAt).toLocaleString()}</p>
        </div>
        <button
          onClick={onDismiss}
          className="text-[10px] text-accent hover:text-accent/80 shrink-0"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
