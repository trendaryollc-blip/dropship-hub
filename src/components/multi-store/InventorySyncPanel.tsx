"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";
import type { StoreInventoryItem } from "@/types/multi-store";

interface InventorySyncPanelProps {
  inventory: StoreInventoryItem[];
}

export default function InventorySyncPanel({ inventory }: InventorySyncPanelProps) {
  const { error: toastError } = useToast();
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleSync = async (item: StoreInventoryItem) => {
    if (!item.stores.length) return;
    setSyncing(item.id);
    try {
      const source = item.stores[0];
      await safeFetch("/api/multi-store/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "sync",
          productId: item.productId,
          sourceStoreId: source.storeId,
          newStock: source.stock,
          productTitle: item.title,
          sourceStoreName: source.storeName,
        }),
      });
    } catch { toastError("Failed to sync inventory"); }
    setSyncing(null);
  };

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-accent" /> Cross-Store Inventory
      </h3>
      {inventory.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-4">No inventory data yet. Sync products to track across stores.</p>
      ) : (
        <div className="space-y-2">
          {inventory.slice(0, 10).map((item) => (
            <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-surface/50 hover:bg-surface transition-colors">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-foreground truncate">{item.title}</p>
                <p className="text-[9px] text-muted-foreground">{item.stores.length} store{item.stores.length !== 1 ? "s" : ""} · Total stock: {item.totalStock}</p>
              </div>
              <button
                onClick={() => handleSync(item)}
                disabled={syncing === item.id}
                className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all disabled:opacity-50"
              >
                {syncing === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
