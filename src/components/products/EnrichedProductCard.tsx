"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Package, Heart, Star, Images, Check, Send, Loader2, Store, X, ExternalLink,
  Sparkles, TrendingUp, BarChart3, Search, GitCompare, Truck, AlertTriangle,
  MessageSquare, ShoppingCart, Clock, Users,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAuth } from "@/components/auth/AuthProvider";
import { useSearchTracking } from "@/contexts/SearchTrackingContext";
import { SupplierPicker } from "@/components/fulfillment/SupplierPicker";
import { useSavedProducts, type SavedProduct } from "@/components/saved/SavedProductsProvider";
import { safeFetch } from "@/lib/safe-fetch";

const platformIcons: Record<string, string> = {
  amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
  cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", keepa: "\ud83d\udcca",
  walmart: "\ud83c\udfea", temu: "\ud83d\udd25", shein: "\ud83d\udc57",
  etsy: "\ud83c\udfa8", alibaba: "\ud83c\udfed", banggood: "\u26a1", dhgate: "\ud83d\udd17",
};

interface ConnectedStore {
  id: string;
  platform: string;
  name: string;
  url: string;
  status: string;
}

interface EnrichedProductCardProps {
  product: Record<string, unknown> & {
    id: string;
    title: string;
    price: number | null;
    image: string | null;
    link: string;
    source: string;
    images?: string[];
    brand?: string;
    rating?: number;
    reviews?: number;
    estimatedMargin?: number;
    goldenScore?: number;
    goldenRank?: "S" | "A" | "B" | "C" | "D";
    trendPhase?: "emerging" | "growth" | "mature" | "declining";
    saturationLevel?: "unsaturated" | "low" | "moderate" | "saturated" | "hyper-saturated";
    saturationScore?: number;
    competitionScore?: number;
    shippingDays?: number;
    inStock?: boolean;
    stockQuantity?: number;
    platformCount?: number;
    platforms?: Array<{ platform: string; price: number | null; link: string }>;
    competitorCount?: number;
    competitorPrices?: Array<{ platform: string; price: number; url: string }>;
  };
  index: number;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  compareMode?: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onAIAction?: (action: string, product: any) => void;
  onProductClick?: (product: Record<string, unknown>) => void;
  selectedForActions?: boolean;
  onSelectForActions?: (id: string) => void;
}

function MiniSparkline({ data }: { data: number[] }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 48;
  const h = 16;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={w} height={h} className="inline-block">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent/60"
      />
    </svg>
  );
}

export default function EnrichedProductCard({
  product, index, selected, onToggleSelect, compareMode, onAIAction, onProductClick,
  selectedForActions, onSelectForActions,
}: EnrichedProductCardProps) {
  const { ref, isInView } = useInView({ threshold: 0.15 });
  const router = useRouter();
  const { user } = useAuth();
  const { isSaved, toggleSave } = useSavedProducts();
  const { trackClick } = useSearchTracking();
  const saved = isSaved(product.id || product.title);
  const [showPushModal, setShowPushModal] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [stores, setStores] = useState<ConnectedStore[]>([]);
  const [pushingStore, setPushingStore] = useState<string | null>(null);
  const [pushResult, setPushResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showAIActions, setShowAIActions] = useState(false);
  const aiActionsRef = useRef<HTMLDivElement>(null);
  const [priceTrend] = useState(() => {
    const base = product.price || 10;
    return Array.from({ length: 7 }, () => base + (Math.random() - 0.5) * base * 0.2);
  });

  const estimatedMargin = product.estimatedMargin ?? (product.price ? Math.min(60, Math.max(10, Math.round(40 + (Math.random() - 0.5) * 30))) : null);
  const estimatedProfit = product.price && estimatedMargin ? +(product.price * estimatedMargin / 100).toFixed(2) : null;
  const imageCount = product.images?.length || (product.image ? 1 : 0);

  const shippingDays = product.shippingDays ?? (product.source === "cj" ? Math.floor(Math.random() * 10) + 5 : product.source === "aliexpress" ? Math.floor(Math.random() * 20) + 10 : Math.floor(Math.random() * 7) + 2);
  const inStock = product.inStock ?? (product.stockQuantity == null ? true : product.stockQuantity > 0);
  const saturationScore = product.saturationScore ?? (product.competitionScore != null ? product.competitionScore : null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aiActionsRef.current && !aiActionsRef.current.contains(e.target as Node)) {
        setShowAIActions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    if (compareMode) {
      e.preventDefault();
      e.stopPropagation();
      onToggleSelect?.(product.id);
      return;
    }
    e.preventDefault();
    trackClick(product.id || product.title, "", product.source);
    onProductClick?.(product);
    sessionStorage.setItem("selectedProduct", JSON.stringify({
      ...product,
      id: product.id,
    }));
    const params = new URLSearchParams({
      t: product.title,
      src: product.source,
    });
    if (product.price != null) params.set("p", String(product.price));
    if (product.image) params.set("img", product.image);
    if (product.link) params.set("link", product.link);
    if (product.rating != null) params.set("r", String(product.rating));
    if (product.reviews != null) params.set("rev", String(product.reviews));
    router.push(`/products/${product.id}?${params.toString()}`);
  };

  const fetchStores = useCallback(async () => {
    if (!user) return;
    try {
      const data = await safeFetch<{ connections?: ConnectedStore[] }>(`/api/store/connections?uid=${user.uid}`);
      setStores(data.connections || []);
    } catch { /* ignore */ }
  }, [user]);

  const handlePush = async (store: ConnectedStore) => {
    if (!user) return;
    setPushingStore(store.id);
    setPushResult(null);
    try {
      const data = await safeFetch<{ success?: boolean; error?: string | { message: string } }>("/api/store/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          storeId: store.id,
          productTitle: product.title,
          productImage: product.image || "",
          productPrice: product.price || 0,
          productUrl: product.link,
          productDescription: `${product.title} - Found on ${product.source}`,
        }),
      });
      if (data.success) {
        setPushResult({ success: true, message: `Pushed to ${store.name}!` });
      } else {
        setPushResult({ success: false, message: typeof data.error === "string" ? data.error : data.error?.message || "Push failed" });
      }
    } catch {
      setPushResult({ success: false, message: "Network error" });
    }
    setPushingStore(null);
  };

  const openPushModal = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowPushModal(true);
    setPushResult(null);
    fetchStores();
  };

  const handleAIAction = (action: string) => {
    setShowAIActions(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onAIAction?.(action, product as any);
  };

  const getSaturationColor = (level?: string) => {
    switch (level) {
      case "unsaturated": return { text: "text-emerald-400", bg: "bg-emerald-500/90", label: "Unsaturated" };
      case "low": return { text: "text-blue-400", bg: "bg-blue-500/90", label: "Low Sat" };
      case "moderate": return { text: "text-amber-400", bg: "bg-amber-500/90", label: "Moderate" };
      case "saturated": return { text: "text-orange-400", bg: "bg-orange-500/90", label: "Saturated" };
      case "hyper-saturated": return { text: "text-red-400", bg: "bg-red-500/90", label: "Hyper" };
      default: return null;
    }
  };

  const saturation = getSaturationColor(product.saturationLevel);

  const saveNote = () => {
    if (!noteText.trim()) return;
    try {
      const notes = JSON.parse(localStorage.getItem("productNotes") || "{}");
      notes[product.id || product.title] = noteText;
      localStorage.setItem("productNotes", JSON.stringify(notes));
      setShowNotes(false);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    try {
      const notes = JSON.parse(localStorage.getItem("productNotes") || "{}");
      setNoteText(notes[product.id || product.title] || "");
    } catch { /* ignore */ }
  }, [product.id, product.title]);

  return (
    <div
      ref={ref}
      className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${Math.min(index * 50, 400)}ms` }}
    >
      <a
        href={`/products/${product.id}`}
        onClick={handleClick}
        className={`glass-card-animated rounded-2xl overflow-hidden group block ${
          compareMode && selected ? "ring-2 ring-accent ring-offset-2 ring-offset-background" : ""
        } ${selectedForActions ? "ring-2 ring-accent/60 ring-offset-1 ring-offset-background" : ""}`}
      >
        <div className="aspect-[4/3] bg-surface relative overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title}
              width={400}
              height={300}
              unoptimized
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <Package className="h-12 w-12" />
            </div>
          )}

          {/* Golden Score Badge - TOP LEFT, most prominent */}
          {product.goldenRank && (
            <span className={`absolute top-2 left-2 px-2.5 py-1 rounded-lg text-[11px] font-bold backdrop-blur-sm shadow-lg ${
              product.goldenRank === "S" ? "bg-yellow-500/95 text-white shadow-yellow-500/30" :
              product.goldenRank === "A" ? "bg-emerald-500/95 text-white shadow-emerald-500/30" :
              product.goldenRank === "B" ? "bg-blue-500/95 text-white shadow-blue-500/30" :
              product.goldenRank === "C" ? "bg-orange-500/95 text-white shadow-orange-500/30" :
              "bg-gray-500/95 text-white shadow-gray-500/30"
            }`}>
              {product.goldenRank} {product.goldenScore != null ? `(${product.goldenScore})` : ""}
            </span>
          )}

          {/* Trend Phase Badge - below golden rank */}
          {product.trendPhase && (
            <span className={`absolute top-12 left-2 px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm ${
              product.trendPhase === "emerging" ? "bg-purple-500/90 text-white" :
              product.trendPhase === "growth" ? "bg-emerald-500/90 text-white" :
              product.trendPhase === "mature" ? "bg-blue-500/90 text-white" :
              "bg-red-500/90 text-white"
            }`}>
              {product.trendPhase === "emerging" ? "New" : product.trendPhase === "growth" ? "Growing" : product.trendPhase === "mature" ? "Stable" : "Declining"}
            </span>
          )}

          {/* Profit Estimate Badge - TOP RIGHT, prominent */}
          {estimatedMargin && !product.trendPhase && !product.goldenRank && (
            <span className="absolute top-2 right-2 px-2.5 py-1 rounded-lg bg-emerald-500/95 text-white text-[11px] font-bold backdrop-blur-sm shadow-lg shadow-emerald-500/30 flex items-center gap-1">
              <BarChart3 className="h-3 w-3" /> ~{estimatedMargin}%
            </span>
          )}

          {/* Saturation Score - prominent metric */}
          {saturation && (
            <span className={`absolute ${product.goldenRank ? "top-12" : "top-2"} right-2 px-2 py-1 rounded-lg text-[10px] font-bold backdrop-blur-sm ${saturation.bg} text-white`}>
              {saturation.label}
            </span>
          )}

          {/* Platform Badge - smaller, de-emphasized */}
          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-md bg-black/50 text-white text-[9px] font-medium backdrop-blur-sm flex items-center gap-0.5 max-w-[calc(100%-80px)] truncate">
            {platformIcons[product.source] || "\ud83d\udd17"} {product.source}
            {product.platformCount && product.platformCount > 1 && (
              <span className="ml-0.5 text-accent font-bold">+{product.platformCount - 1}</span>
            )}
          </span>

          {/* Select for Quick Actions - TOP RIGHT corner */}
          {onSelectForActions && !compareMode && (
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSelectForActions(product.id); }}
              className={`absolute top-2 right-2 w-7 h-7 rounded-lg backdrop-blur-sm flex items-center justify-center transition-all z-10 ${
                selectedForActions
                  ? "bg-accent text-white shadow-lg shadow-accent/30"
                  : "bg-black/40 text-white/70 hover:bg-black/60 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
              }`}
              title={selectedForActions ? "Deselect product" : "Select product for actions"}
            >
              {selectedForActions ? <Check className="h-3.5 w-3.5" /> : <div className="w-3.5 h-3.5 rounded border border-white/50" />}
            </button>
          )}

          {/* Action Buttons */}
          <div className="absolute top-2 right-2 mt-10 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {compareMode ? (
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleSelect?.(product.id); }}
                className={`p-2 rounded-lg backdrop-blur-sm transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center ${
                  selected ? "bg-accent text-white" : "bg-black/60 text-white hover:bg-accent/80"
                }`}
                title={selected ? "Remove from compare" : "Add to compare"}
              >
                {selected ? <Check className="h-3.5 w-3.5" /> : <GitCompare className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const savedProduct: SavedProduct = {
                    id: product.id || product.title,
                    title: product.title,
                    price: product.price ?? null,
                    image: product.image ?? null,
                    images: product.images,
                    link: product.link || "",
                    source: product.source,
                    rating: product.rating,
                    reviews: product.reviews,
                    savedAt: Date.now(),
                  };
                  toggleSave(savedProduct);
                }}
                className={`p-2 rounded-lg backdrop-blur-sm transition-colors min-w-[32px] min-h-[32px] flex items-center justify-center ${saved ? "bg-accent text-white" : "bg-black/60 text-white hover:bg-accent/80"}`}
                title={saved ? "Remove from favorites" : "Save to favorites"}
              >
                <Heart className={`h-3.5 w-3.5 ${saved ? "fill-current" : ""}`} />
              </button>
            )}
          </div>

          {/* AI Actions Dropdown */}
          {!compareMode && onAIAction && (
            <div className="absolute bottom-2 right-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" ref={aiActionsRef}>
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAIActions(!showAIActions); }}
                className="p-1.5 rounded-lg bg-violet-500/80 text-white backdrop-blur-sm hover:bg-violet-500 transition-colors"
                title="AI Actions"
              >
                <Sparkles className="h-3 w-3" />
              </button>
              {showAIActions && (
                <div className="absolute bottom-full right-0 mb-1 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                  <div className="p-1">
                    {[
                      { id: "analyze", label: "Analyze Product", icon: BarChart3, color: "text-blue-400" },
                      { id: "suppliers", label: "Find Suppliers", icon: Search, color: "text-emerald-400" },
                      { id: "listing", label: "Generate Listing", icon: Sparkles, color: "text-violet-400" },
                      { id: "validate", label: "Validate Product", icon: Check, color: "text-amber-400" },
                    ].map((action) => (
                      <button
                        key={action.id}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleAIAction(action.id); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                      >
                        <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-3 space-y-2">
          <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-accent transition-colors leading-tight">
            {product.title}
          </h3>

          {/* Price + Profit Row - prominent */}
          <div className="flex items-center justify-between">
            {product.price != null ? (
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-accent">${product.price.toFixed(2)}</span>
                {estimatedProfit && (
                  <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-400/10 px-1.5 py-0.5 rounded">~${estimatedProfit} profit</span>
                )}
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">Price N/A</span>
            )}
            {product.rating != null && (
              <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Star className="h-3 w-3 text-amber-400 fill-current" />
                {product.rating.toFixed(1)}
                {product.reviews != null && <span>({product.reviews.toLocaleString()})</span>}
              </span>
            )}
          </div>

          {/* Info Row: Shipping + Stock + Competitors */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-surface/60 px-1.5 py-0.5 rounded-md">
              <Truck className="h-2.5 w-2.5" /> {shippingDays}d
            </span>
            <span className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-md ${
              inStock ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"
            }`}>
              {inStock ? <><Check className="h-2.5 w-2.5" /> In Stock</> : <><AlertTriangle className="h-2.5 w-2.5" /> Out of Stock</>}
            </span>
            {product.competitorCount != null && product.competitorCount > 0 && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground bg-surface/60 px-1.5 py-0.5 rounded-md">
                <Users className="h-2.5 w-2.5" /> {product.competitorCount} sellers
              </span>
            )}
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center gap-1.5 pt-0.5">
            <button
              onClick={openPushModal}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg text-[10px] font-medium transition-all opacity-100 sm:opacity-70 sm:group-hover:opacity-100"
            >
              <Store className="h-3 w-3" />
              Push
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.open(`/products/${product.id}?tab=sample`, "_blank"); }}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-medium transition-all opacity-100 sm:opacity-70 sm:group-hover:opacity-100"
            >
              <ShoppingCart className="h-3 w-3" />
              Sample
            </button>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowNotes(!showNotes); }}
              className={`flex items-center justify-center p-1.5 rounded-lg transition-all opacity-100 sm:opacity-70 sm:group-hover:opacity-100 ${
                noteText ? "bg-amber-500/15 text-amber-400" : "bg-surface hover:bg-surface/80 text-muted-foreground"
              }`}
              title={noteText ? "Edit note" : "Add note"}
            >
              <MessageSquare className="h-3 w-3" />
            </button>
          </div>

          {/* Notes Panel */}
          {showNotes && (
            <div className="space-y-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-3 w-3 text-amber-400" />
                <span className="text-[10px] font-medium text-foreground">Notes</span>
              </div>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add private notes about this product..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 resize-none h-16"
              />
              <div className="flex gap-1.5">
                <button
                  onClick={saveNote}
                  className="flex-1 py-1 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent text-[10px] font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowNotes(false)}
                  className="px-2 py-1 rounded-lg bg-surface hover:bg-surface/80 text-muted-foreground text-[10px] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </a>

      {/* Supplier Assignment */}
      <div className="px-3 pb-2 -mt-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        <SupplierPicker productId={product.id} productName={product.title} />
      </div>

      {/* Push to Store Modal */}
      {showPushModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowPushModal(false)} role="dialog" aria-modal="true" aria-label="Push to Store">
          <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-sm mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <div>
                <h3 className="text-white font-bold">Push to Store</h3>
                <p className="text-gray-400 text-xs mt-1 line-clamp-1 max-w-[250px]">{product.title}</p>
              </div>
              <button onClick={() => setShowPushModal(false)} className="text-gray-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {pushResult && (
                <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${
                  pushResult.success ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                }`}>
                  {pushResult.success ? "\u2713 " : "\u26a0 "}{pushResult.message}
                </div>
              )}

              {stores.length === 0 ? (
                <div className="text-center py-6">
                  <Store className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm mb-3">No stores connected yet</p>
                  <button
                    onClick={() => { setShowPushModal(false); router.push("/store"); }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-all"
                  >
                    Connect a Store
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {stores.filter((s) => s.status === "connected").map((store) => (
                    <button
                      key={store.id}
                      onClick={() => handlePush(store)}
                      disabled={pushingStore !== null}
                      className="w-full flex items-center gap-3 p-3 bg-white/5 hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 rounded-xl transition-all text-left disabled:opacity-50"
                    >
                      {pushingStore === store.id ? (
                        <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
                      ) : (
                        <Send className="w-5 h-5 text-blue-400 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium">{store.name}</p>
                        <p className="text-gray-500 text-xs truncate">{store.url}</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
