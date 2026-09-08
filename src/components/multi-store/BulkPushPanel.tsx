"use client";

import { useState } from "react";
import { Send, Globe, Loader2 } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import type { ConnectedStore } from "@/components/stores/ConnectedStoresList";

interface BulkPushPanelProps {
  stores: ConnectedStore[];
  onPushComplete: () => void;
}

export default function BulkPushPanel({ stores, onPushComplete }: BulkPushPanelProps) {
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [productTitle, setProductTitle] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const toggleStore = (storeId: string) => {
    setSelectedStores((prev) => prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]);
  };

  const handleBulkPush = async () => {
    if (!productTitle || selectedStores.length === 0) return;
    setPushing(true);
    setResult(null);
    try {
      await safeFetch("/api/multi-store/bulk-push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productTitle,
          productPrice: parseFloat(productPrice) || 0,
          productImage,
          productUrl,
          targetStoreIds: selectedStores,
        }),
      });
      setResult({ success: true, message: `Bulk push job created for ${selectedStores.length} stores` });
      setProductTitle("");
      setProductPrice("");
      setProductImage("");
      setProductUrl("");
      setSelectedStores([]);
      onPushComplete();
    } catch {
      setResult({ success: false, message: "Failed to create bulk push job" });
    }
    setPushing(false);
  };

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Send className="h-4 w-4 text-accent" /> Bulk Push to Stores
      </h3>
      <div className="space-y-3">
        <input
          type="text"
          placeholder="Product title"
          value={productTitle}
          onChange={(e) => setProductTitle(e.target.value)}
          className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            placeholder="Price"
            value={productPrice}
            onChange={(e) => setProductPrice(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
          />
          <input
            type="url"
            placeholder="Image URL"
            value={productImage}
            onChange={(e) => setProductImage(e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
          />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground mb-2">Select target stores:</p>
          <div className="flex flex-wrap gap-2">
            {stores.filter((s) => s.status === "connected").map((store) => (
              <button
                key={store.id}
                onClick={() => toggleStore(store.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                  selectedStores.includes(store.id)
                    ? "bg-accent/10 border-accent/30 text-accent"
                    : "bg-surface border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="h-3 w-3" />
                {store.name}
              </button>
            ))}
          </div>
        </div>
        {result && (
          <div className={`p-2 rounded-lg text-[10px] font-medium ${result.success ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"}`}>
            {result.message}
          </div>
        )}
        <button
          onClick={handleBulkPush}
          disabled={!productTitle || selectedStores.length === 0 || pushing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pushing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Push to {selectedStores.length} Store{selectedStores.length !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
