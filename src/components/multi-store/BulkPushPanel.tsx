"use client";

import { useState } from "react";
import { Send, Globe, Loader2, Package, Plus } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import type { ConnectedStore } from "@/components/stores/ConnectedStoresList";
import type { PushedProduct } from "@/components/stores/PushedProductsList";
import ProductPicker from "./ProductPicker";

interface BulkPushPanelProps {
  stores: ConnectedStore[];
  pushedProducts: PushedProduct[];
  onPushComplete: () => void;
}

export default function BulkPushPanel({ stores, pushedProducts, onPushComplete }: BulkPushPanelProps) {
  const [mode, setMode] = useState<"new" | "existing">("new");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<PushedProduct[]>([]);
  const [productTitle, setProductTitle] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productImage, setProductImage] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [pushing, setPushing] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const toggleStore = (storeId: string) => {
    setSelectedStores((prev) => prev.includes(storeId) ? prev.filter((id) => id !== storeId) : [...prev, storeId]);
  };

  const toggleProduct = (product: PushedProduct) => {
    setSelectedProducts((prev) =>
      prev.find((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product]
    );
  };

  const handleBulkPush = async () => {
    if (selectedStores.length === 0) return;
    if (mode === "new" && !productTitle) return;
    if (mode === "existing" && selectedProducts.length === 0) return;

    setPushing(true);
    setResult(null);
    try {
      if (mode === "new") {
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
      } else {
        for (const product of selectedProducts) {
          await safeFetch("/api/multi-store/bulk-push", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              productTitle: product.productTitle,
              productPrice: product.productPrice,
              productImage: product.productImage,
              productUrl: product.productUrl,
              targetStoreIds: selectedStores,
            }),
          });
        }
        setResult({ success: true, message: `Pushed ${selectedProducts.length} products to ${selectedStores.length} stores` });
        setSelectedProducts([]);
      }
      setSelectedStores([]);
      onPushComplete();
    } catch {
      setResult({ success: false, message: "Failed to create bulk push job" });
    }
    setPushing(false);
  };

  const canSubmit = mode === "new"
    ? productTitle && selectedStores.length > 0
    : selectedProducts.length > 0 && selectedStores.length > 0;

  return (
    <div className="glass rounded-2xl p-4 sm:p-5">
      <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
        <Send className="h-4 w-4 text-accent" /> Bulk Push to Stores
      </h3>

      <div className="flex gap-1 p-1 rounded-lg bg-surface border border-border mb-3">
        <button
          onClick={() => setMode("new")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${
            mode === "new" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Plus className="h-3 w-3" /> New Product
        </button>
        <button
          onClick={() => setMode("existing")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${
            mode === "existing" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Package className="h-3 w-3" /> Existing ({pushedProducts.length})
        </button>
      </div>

      <div className="space-y-3">
        {mode === "new" ? (
          <>
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
          </>
        ) : (
          <ProductPicker
            products={pushedProducts}
            selected={selectedProducts}
            onToggle={toggleProduct}
            onClear={() => setSelectedProducts([])}
          />
        )}

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
          disabled={!canSubmit || pushing}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pushing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Push to {selectedStores.length} Store{selectedStores.length !== 1 ? "s" : ""}
        </button>
      </div>
    </div>
  );
}
