"use client";

import { useState, useCallback } from "react";
import {
  Check, X, Download, Send, Loader2, Store, Package,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";

interface BulkActionsBarProps {
  selectedIds: string[];
  selectedProducts: Array<{ id: string; title: string; price: number | null; source: string; image: string | null }>;
  onClearSelection: () => void;
  onSelectAll: (ids: string[]) => void;
  totalResults: number;
}

interface ConnectedStore {
  id: string;
  name: string;
  url: string;
  status: string;
}

export default function BulkActionsBar({
  selectedIds, selectedProducts, onClearSelection, onSelectAll, totalResults,
}: BulkActionsBarProps) {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [showPushMenu, setShowPushMenu] = useState(false);
  const [stores, setStores] = useState<ConnectedStore[]>([]);
  const [pushingStore, setPushingStore] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchStores = useCallback(async () => {
    if (!user) return;
    try {
      const data = await safeFetch<{ connections?: ConnectedStore[] }>(`/api/store/connections?uid=${user.uid}`);
      setStores((data.connections || []).filter((s) => s.status === "connected"));
    } catch { /* ignore */ }
  }, [user]);

  const handleExportCSV = async () => {
    setExporting(true);
    try {
      const headers = ["Title", "Price", "Platform", "Rating", "Reviews", "Image URL", "Product URL"];
      const rows = selectedProducts.map((p) => [
        `"${p.title.replace(/"/g, '""')}"`,
        p.price != null ? p.price.toFixed(2) : "N/A",
        p.source,
        "",
        "",
        p.image || "",
        "",
      ]);
      const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `products-export-${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExporting(false);
  };

  const handleBulkPush = async (store: ConnectedStore) => {
    if (!user) return;
    setPushingStore(store.id);
    setPushResult(null);
    let successCount = 0;
    let failCount = 0;

    for (const product of selectedProducts) {
      try {
        const data = await safeFetch<{ success?: boolean }>(`/api/store/push`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            uid: user.uid,
            storeId: store.id,
            productTitle: product.title,
            productImage: product.image || "",
            productPrice: product.price || 0,
            productUrl: "",
            productDescription: `${product.title} - Found on ${product.source}`,
          }),
        });
        if (data.success) successCount++;
        else failCount++;
      } catch { failCount++; }
    }

    setPushResult({
      success: failCount === 0,
      message: failCount === 0
        ? `Pushed ${successCount} products to ${store.name}!`
        : `Pushed ${successCount}/${selectedProducts.length} products (${failCount} failed)`,
    });
    setPushingStore(null);
  };

  if (selectedIds.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-3 border border-accent/20 bg-accent/5 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/15">
          <Check className="h-3.5 w-3.5 text-accent" />
        </div>
        <span className="text-xs font-semibold text-foreground">
          {selectedIds.length} selected
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={() => {
            const allIds = selectedProducts.map((p) => p.id);
            onSelectAll(allIds);
          }}
          className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all"
        >
          Select All ({totalResults})
        </button>

        <button
          onClick={handleExportCSV}
          disabled={exporting}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all disabled:opacity-50"
        >
          {exporting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          Export CSV
        </button>

        {user && (
          <div className="relative">
            <button
              onClick={() => { setShowPushMenu(!showPushMenu); fetchStores(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs font-medium text-blue-400 hover:bg-blue-500/15 transition-all"
            >
              <Send className="h-3 w-3" />
              Bulk Push to Store
            </button>

            {showPushMenu && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                <div className="p-1">
                  {pushResult && (
                    <div className={`px-3 py-2 text-xs font-medium m-1 rounded-lg ${
                      pushResult.success ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                    }`}>
                      {pushResult.message}
                    </div>
                  )}
                  {stores.length === 0 ? (
                    <div className="px-3 py-4 text-center">
                      <Store className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                      <p className="text-xs text-gray-400">No stores connected</p>
                    </div>
                  ) : (
                    stores.map((store) => (
                      <button
                        key={store.id}
                        onClick={() => handleBulkPush(store)}
                        disabled={pushingStore !== null}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left disabled:opacity-50"
                      >
                        {pushingStore === store.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                        ) : (
                          <Send className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" />
                        )}
                        <span className="truncate">{store.name}</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        onClick={onClearSelection}
        className="ml-auto p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
