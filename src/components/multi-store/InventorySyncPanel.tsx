"use client";

import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import { getAuthHeaders } from "@/lib/auth-headers";
import { useToast } from "@/components/ui/Toast";
import type { StoreInventoryItem } from "@/types/multi-store";
import { INVENTORY_DISPLAY_LIMIT } from "@/components/stores/constants";

interface InventorySyncPanelProps {
  inventory: StoreInventoryItem[];
}

export default function InventorySyncPanel({ inventory }: InventorySyncPanelProps) {
  const { success, error: toastError } = useToast();
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncProgress, setSyncProgress] = useState<{ current: number; total: number } | null>(null);

  const syncItem = async (item: StoreInventoryItem): Promise<boolean> => {
    const source = item.stores[0];
    await safeFetch("/api/multi-store/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await getAuthHeaders()) },
      body: JSON.stringify({
        action: "sync",
        productId: item.productId,
        sourceStoreId: source.storeId,
        newStock: source.stock,
        productTitle: item.title,
        sourceStoreName: source.storeName,
      }),
    });
    return true;
  };

  const handleSync = async (item: StoreInventoryItem) => {
    if (!item.stores.length) return;
    setSyncing(item.id);
    try {
      await syncItem(item);
      success(`Synced "${item.title}" stock to other stores`);
    } catch { toastError("Failed to sync inventory"); }
    setSyncing(null);
  };

  const handleSyncAll = async () => {
    if (!inventory.length) return;
    setSyncingAll(true);
    setSyncProgress({ current: 0, total: inventory.length });
    let synced = 0;
    let failed = 0;

    for (let i = 0; i < inventory.length; i++) {
      const item = inventory[i];
      setSyncProgress({ current: i + 1, total: inventory.length });
      if (!item.stores.length) { failed++; continue; }
      try {
        await syncItem(item);
        synced++;
      } catch { failed++; }
    }

    setSyncProgress(null);
    setSyncingAll(false);
    success(`Synced ${synced} items${failed > 0 ? `, ${failed} failed` : ""}`);
  };

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-accent" /> Cross-Store Inventory
        </h3>
        {inventory.length > 0 && (
          <button
            onClick={handleSyncAll}
            disabled={syncingAll}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[10px] font-medium hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            {syncingAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            {syncingAll && syncProgress ? `Syncing ${syncProgress.current}/${syncProgress.total}` : "Sync All"}
          </button>
        )}
      </div>

      {syncingAll && syncProgress && (
        <div className="mb-3">
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-300"
              style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {inventory.length === 0 ? (
        <p className="text-[10px] text-muted-foreground text-center py-4">No inventory data yet. Sync products to track across stores.</p>
      ) : (
        <div className="space-y-2">
          {inventory.slice(0, INVENTORY_DISPLAY_LIMIT).map((item) => {
            const isLowStock = item.stores.some((s) => s.status === "low_stock");
            const isOutOfStock = item.stores.some((s) => s.status === "out_of_stock");
            return (
              <div key={item.id} className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                isOutOfStock ? "bg-red-500/5 border border-red-400/20" :
                isLowStock ? "bg-amber-500/5 border border-amber-400/20" :
                "bg-surface/50 hover:bg-surface"
              }`}>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-foreground truncate">{item.title}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {item.stores.length} store{item.stores.length !== 1 ? "s" : ""} · Total stock: {item.totalStock}
                    {isOutOfStock && <span className="text-red-400 ml-1">· Out of stock</span>}
                    {isLowStock && !isOutOfStock && <span className="text-amber-400 ml-1">· Low stock</span>}
                  </p>
                </div>
                <button
                  onClick={() => handleSync(item)}
                  disabled={syncing === item.id}
                  className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-all disabled:opacity-50"
                >
                  {syncing === item.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
