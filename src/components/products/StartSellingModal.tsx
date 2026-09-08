"use client";

import { useState, useEffect } from "react";
import { Rocket, Loader2, Check, Store } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";

interface StartSellingModalProps {
  productTitle: string;
  productPrice: number;
  ordering: boolean;
  success: boolean;
  onClose: () => void;
  onStartSelling: (storeId: string) => void;
}

export default function StartSellingModal({ productTitle, productPrice, ordering, success, onClose, onStartSelling }: StartSellingModalProps) {
  const [stores, setStores] = useState<Array<{ id: string; name: string; platform: string }>>([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [loadingStores, setLoadingStores] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await safeFetch<{ connections?: Array<{ id: string; name: string; platform: string }> }>("/api/store/connections");
        setStores(data.connections || []);
        if (data.connections?.length === 1) setSelectedStore(data.connections[0].id);
      } catch {
        // ignore
      } finally {
        setLoadingStores(false);
      }
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Start Selling">
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Product Listed!</h3>
            <p className="text-sm text-muted-foreground">Product has been pushed to your store.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Start Selling</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="bg-surface-secondary rounded-xl p-3 mb-4">
              <p className="text-sm font-medium truncate">{productTitle}</p>
              <p className="text-blue-400 font-semibold">Sell at ${productPrice.toFixed(2)}</p>
            </div>
            {loadingStores ? (
              <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
            ) : stores.length === 0 ? (
              <div className="text-center py-4">
                <Store className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-3">No stores connected yet.</p>
                <a href="/store" className="text-sm text-blue-400 hover:underline">Connect a store →</a>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-2">Select a store to list this product on:</p>
                <div className="space-y-2 mb-4">
                  {stores.map((store) => (
                    <button key={store.id} onClick={() => setSelectedStore(store.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedStore === store.id ? "border-blue-500 bg-blue-500/10" : "border-border hover:border-border/80"}`}>
                      <Store className="h-5 w-5 text-muted-foreground" />
                      <div className="text-left">
                        <p className="text-sm font-medium">{store.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{store.platform}</p>
                      </div>
                    </button>
                  ))}
                </div>
                <button disabled={!selectedStore || ordering} onClick={() => onStartSelling(selectedStore)} className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {ordering ? <><Loader2 className="h-4 w-4 animate-spin" /> Pushing to Store...</> : <><Rocket className="h-4 w-4" /> Push to Store & Start Selling</>}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
