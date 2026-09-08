"use client";

import { useState } from "react";
import { Heart, BarChart3, ExternalLink, Calculator, Award, ShoppingCart, Rocket, Loader2, Activity } from "lucide-react";
import { useSavedProducts, type SavedProduct } from "@/components/saved/SavedProductsProvider";
import { safeFetch } from "@/lib/safe-fetch";
import OrderSampleModal from "./OrderSampleModal";
import StartSellingModal from "./StartSellingModal";

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
          <a href={`/suppliers?product=${encodeURIComponent(productTitle)}&category=${encodeURIComponent(category || "")}&source=${encodeURIComponent(platform || "")}&price=${price || ""}`} className="action-btn">
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
