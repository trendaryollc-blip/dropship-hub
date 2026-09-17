"use client";

import { BellOff } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import AlertItem from "./AlertItem";

interface AlertEntry {
  id: string;
  type: "price_drop" | "price_increase" | "out_of_stock" | "back_in_stock" | "competitor_undercut";
  message: string;
  oldPrice?: number;
  newPrice?: number;
  createdAt: string;
  read: boolean;
  productTitle: string;
  productId: string;
}

interface AlertListProps {
  alerts: AlertEntry[];
  loading: boolean;
  onDismiss: (monitoredId: string, alertIds: string[]) => void;
  products: Array<{ id: string; productId: string }>;
}

export default function AlertList({ alerts, loading, onDismiss, products }: AlertListProps) {
  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-xs text-muted-foreground mt-2">Loading alerts...</p>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <EmptyState
        icon={BellOff}
        title="No unread alerts"
        description="All caught up! Alerts will appear here when price changes or stock events are detected."
      />
    );
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert) => (
        <AlertItem
          key={alert.id}
          id={alert.id}
          type={alert.type}
          message={alert.message}
          createdAt={alert.createdAt}
          productTitle={alert.productTitle}
          onDismiss={() => {
            const product = products.find((p) => p.productId === alert.productId);
            if (product) onDismiss(product.id, [alert.id]);
          }}
        />
      ))}
    </div>
  );
}
