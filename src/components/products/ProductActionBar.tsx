"use client";

import { useState, useEffect } from "react";
import { Heart, BarChart3, ExternalLink, Calculator, Award, ShoppingCart, Rocket, Loader2, Check, Store, Activity } from "lucide-react";
import { useSavedProducts, type SavedProduct } from "@/components/saved/SavedProductsProvider";
import { safeFetch } from "@/lib/safe-fetch";

interface ProductActionBarProps {
  platform: string;
  platformUrl?: string;
  productTitle: string;
  category?: string;
  id?: string;
  price?: number | null;
  image?: string | null;
  images?: string[];
  rating?: number | null;
  reviews?: number | null;
}

export default function ProductActionBar({ platform, platformUrl, productTitle, category, id, price, image, images, rating, reviews }: ProductActionBarProps) {
  const { isSaved, toggleSave } = useSavedProducts();
  const savedProductId = id || productTitle;
  const saved = isSaved(savedProductId);

  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showStartSellingModal, setShowStartSellingModal] = useState(false);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [monitoring, setMonitoring] = useState(false);
  const [monitorAdded, setMonitorAdded] = useState(false);

  const toggleFavorite = () => {
    const savedProduct: SavedProduct = {
      id: savedProductId,
      title: productTitle,
      price: price ?? null,
      image: image ?? null,
      images: images,
      link: platformUrl || "",
      source: platform,
      rating: rating ?? undefined,
      reviews: reviews ?? undefined,
      savedAt: Date.now(),
    };
    toggleSave(savedProduct);
  };

  const handleOrderSample = async (shippingAddress: {
    fullName: string; phone: string; street: string; city: string; state: string; zipCode: string; country: string;
  }) => {
    setOrdering(true);
    try {
      await safeFetch("/api/orders/sample", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: id || "",
          productTitle,
          productImage: image || "",
          productPrice: price || 0,
          source: platform,
          shippingAddress,
        }),
      });
      setOrderSuccess(true);
      setTimeout(() => {
        setShowOrderModal(false);
        setOrderSuccess(false);
      }, 2000);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to place order");
    } finally {
      setOrdering(false);
    }
  };

  const handleStartSelling = async (storeId: string) => {
    setOrdering(true);
    try {
      await safeFetch("/api/orders/start-selling", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productTitle,
          productImage: image || "",
          productPrice: price || 0,
          productUrl: platformUrl || "",
          productDescription: `High-quality ${category || "product"} from ${platform}`,
          storeId,
          autoOrder: false,
        }),
      });
      setOrderSuccess(true);
      setTimeout(() => {
        setShowStartSellingModal(false);
        setOrderSuccess(false);
      }, 2000);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to start selling");
    } finally {
      setOrdering(false);
    }
  };

  const handleMonitor = async () => {
    setMonitoring(true);
    try {
      await safeFetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "add",
          productId: id || productTitle,
          productTitle,
          productImage: image || "",
          source: platform,
          sourceUrl: platformUrl || "",
          currentPrice: price || 0,
        }),
      });
      setMonitorAdded(true);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to add to monitor");
    } finally {
      setMonitoring(false);
    }
  };

  return (
    <>
      {/* Desktop: frosted toolbar */}
      <div className="hidden md:block action-bar">
        <div className="flex items-center gap-1">
          <button onClick={toggleFavorite} className={`action-btn ${saved ? "action-btn-danger" : ""}`}>
            <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
            <span className="hidden lg:inline">{saved ? "Saved" : "Save"}</span>
          </button>
          <a href="#price-comparison" className="action-btn">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden lg:inline">Compare</span>
          </a>
          <a href={`/suppliers?product=${encodeURIComponent(productTitle)}&category=${encodeURIComponent(category || "")}`} className="action-btn">
            <Award className="h-4 w-4" />
            <span className="hidden lg:inline">Suppliers</span>
          </a>
          <div className="w-px h-5 bg-border/50 mx-1 hidden lg:block" />
          <button onClick={() => setShowOrderModal(true)} className="action-btn bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20">
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden lg:inline">Order Sample</span>
          </button>
          <button onClick={() => setShowStartSellingModal(true)} className="action-btn bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">
            <Rocket className="h-4 w-4" />
            <span className="hidden lg:inline">Start Selling</span>
          </button>
          <button
            onClick={handleMonitor}
            disabled={monitoring || monitorAdded}
            className={`action-btn ${monitorAdded ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"}`}
          >
            {monitoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            <span className="hidden lg:inline">{monitorAdded ? "Monitoring" : "Monitor"}</span>
          </button>
          <a href={platformUrl || "#"} target="_blank" rel="noopener noreferrer" className="action-btn">
            <ExternalLink className="h-4 w-4" />
            <span className="hidden lg:inline">{platform}</span>
          </a>
          <a href="#calculator" className="action-btn">
            <Calculator className="h-4 w-4" />
            <span className="hidden lg:inline">Analyze</span>
          </a>
        </div>
      </div>

      {/* Mobile: sticky bottom bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 safe-area-bottom">
        <div className="glass border-t border-border px-3 py-2 flex items-center gap-1.5">
          <button onClick={toggleFavorite} className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all ${saved ? "bg-red-400/10 text-red-400" : "text-muted-foreground active:bg-surface"}`}>
            <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
            <span className="text-[9px]">{saved ? "Saved" : "Save"}</span>
          </button>
          <a href="#price-comparison" className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-muted-foreground active:bg-surface">
            <BarChart3 className="h-4 w-4" />
            <span className="text-[9px]">Compare</span>
          </a>
          <button onClick={() => setShowOrderModal(true)} className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-emerald-400 active:bg-surface">
            <ShoppingCart className="h-4 w-4" />
            <span className="text-[9px]">Order</span>
          </button>
          <button onClick={() => setShowStartSellingModal(true)} className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-blue-400 active:bg-surface">
            <Rocket className="h-4 w-4" />
            <span className="text-[9px]">Sell</span>
          </button>
          <button
            onClick={handleMonitor}
            disabled={monitoring || monitorAdded}
            className={`flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl ${monitorAdded ? "text-emerald-400" : "text-amber-400"} active:bg-surface`}
          >
            {monitoring ? <Loader2 className="h-4 w-4 animate-spin" /> : <Activity className="h-4 w-4" />}
            <span className="text-[9px]">{monitorAdded ? "Watching" : "Monitor"}</span>
          </button>
          <a href={platformUrl || "#"} target="_blank" rel="noopener noreferrer" className="flex-1 flex flex-col items-center gap-0.5 py-2 rounded-xl text-muted-foreground active:bg-surface">
            <ExternalLink className="h-4 w-4" />
            <span className="text-[9px]">{platform}</span>
          </a>
        </div>
      </div>

      {/* Order Sample Modal */}
      {showOrderModal && (
        <OrderSampleModal
          productTitle={productTitle}
          productPrice={price || 0}
          ordering={ordering}
          success={orderSuccess}
          onClose={() => { setShowOrderModal(false); setOrderSuccess(false); }}
          onOrder={handleOrderSample}
        />
      )}

      {/* Start Selling Modal */}
      {showStartSellingModal && (
        <StartSellingModal
          productTitle={productTitle}
          productPrice={price || 0}
          ordering={ordering}
          success={orderSuccess}
          onClose={() => { setShowStartSellingModal(false); setOrderSuccess(false); }}
          onStartSelling={handleStartSelling}
        />
      )}
    </>
  );
}

function OrderSampleModal({
  productTitle,
  productPrice,
  ordering,
  success,
  onClose,
  onOrder,
}: {
  productTitle: string;
  productPrice: number;
  ordering: boolean;
  success: boolean;
  onClose: () => void;
  onOrder: (address: { fullName: string; phone: string; street: string; city: string; state: string; zipCode: string; country: string }) => void;
}) {
  const [form, setForm] = useState({
    fullName: "", phone: "", street: "", city: "", state: "", zipCode: "", country: "US",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onOrder(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Order Placed!</h3>
            <p className="text-sm text-muted-foreground">Your sample order has been placed via CJ Dropshipping.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Order Sample</h3>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
            </div>
            <div className="bg-surface-secondary rounded-xl p-3 mb-4">
              <p className="text-sm font-medium truncate">{productTitle}</p>
              <p className="text-emerald-400 font-semibold">${productPrice.toFixed(2)} × 1</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" placeholder="Full Name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm" />
              <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm" />
              <input type="text" placeholder="Street Address" required value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} className="w-full bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="City" required value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm" />
                <input type="text" placeholder="State" required value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className="bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="text" placeholder="ZIP Code" required value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} className="bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm" />
                <select value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className="bg-surface-secondary border border-border rounded-lg px-3 py-2 text-sm">
                  <option value="US">United States</option>
                  <option value="CA">Canada</option>
                  <option value="GB">United Kingdom</option>
                  <option value="AU">Australia</option>
                  <option value="DE">Germany</option>
                  <option value="FR">France</option>
                </select>
              </div>
              <button type="submit" disabled={ordering} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {ordering ? <><Loader2 className="h-4 w-4 animate-spin" /> Placing Order...</> : <><ShoppingCart className="h-4 w-4" /> Order Sample — ${productPrice.toFixed(2)}</>}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function StartSellingModal({
  productTitle,
  productPrice,
  ordering,
  success,
  onClose,
  onStartSelling,
}: {
  productTitle: string;
  productPrice: number;
  ordering: boolean;
  success: boolean;
  onClose: () => void;
  onStartSelling: (storeId: string) => void;
}) {
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
