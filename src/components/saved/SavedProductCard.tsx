"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Heart, Star, Package, MoreVertical, Brain, Search, FileText,
  DollarSign, GitCompare, MessageSquare, Check,
} from "lucide-react";
import { useSavedProducts, type SavedProduct } from "./SavedProductsProvider";

const platformIcons: Record<string, string> = {
  amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
  cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", keepa: "\ud83d\udcca",
  walmart: "\ud83c\udfea", temu: "\ud83d\udd25", shein: "\ud83d\udc57",
  etsy: "\ud83c\udfa8", alibaba: "\ud83c\udfed", banggood: "\u26a1", dhgate: "\ud83d\udd17",
};

function timeAgo(savedAt: number): string {
  const diff = Date.now() - savedAt;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

interface SavedProductCardProps {
  product: SavedProduct;
  viewMode: "grid" | "list";
  onAIAction: (action: string, product: SavedProduct) => void;
}

export default function SavedProductCard({ product, viewMode, onAIAction }: SavedProductCardProps) {
  const router = useRouter();
  const { toggleSave, isSelectMode, toggleSelect, selectedIds } = useSavedProducts();
  const [menuOpen, setMenuOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const isSelected = selectedIds.has(product.id);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const openProduct = () => {
    if (isSelectMode) {
      toggleSelect(product.id);
      return;
    }
    sessionStorage.setItem("selectedProduct", JSON.stringify({
      id: product.id, title: product.title, price: product.price,
      image: product.image, images: product.images || (product.image ? [product.image] : []),
      link: product.link, source: product.source, rating: product.rating, reviews: product.reviews,
    }));
    const params = new URLSearchParams({ t: product.title, src: product.source });
    if (product.price != null) params.set("p", String(product.price));
    if (product.image) params.set("img", product.image);
    if (product.link) params.set("link", product.link);
    if (product.rating != null) params.set("r", String(product.rating));
    if (product.reviews != null) params.set("rev", String(product.reviews));
    router.push(`/products/${encodeURIComponent(product.id)}?${params.toString()}`);
  };

  const handleAIAction = async (action: string) => {
    setMenuOpen(false);
    setActionLoading(action);
    try {
      await onAIAction(action, product);
    } finally {
      setActionLoading(null);
    }
  };

  const aiActions = [
    { id: "analyze", label: "Analyze product", icon: Brain, color: "text-purple-400" },
    { id: "similar", label: "Find similar", icon: Search, color: "text-blue-400" },
    { id: "listing", label: "Generate listing", icon: FileText, color: "text-emerald-400" },
    { id: "profit", label: "Calculate profit", icon: DollarSign, color: "text-amber-400" },
    { id: "suppliers", label: "Compare suppliers", icon: GitCompare, color: "text-cyan-400" },
    { id: "ask", label: "Ask AI about this", icon: MessageSquare, color: "text-pink-400" },
  ];

  if (viewMode === "list") {
    return (
      <div
        className={`glass rounded-xl flex items-center gap-4 p-3 group transition-all cursor-pointer ${
          isSelected ? "ring-2 ring-accent/50 border-accent/30" : "hover:border-accent/20"
        }`}
        onClick={openProduct}
      >
        {isSelectMode && (
          <div
            onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}
            className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
              isSelected ? "bg-accent border-accent" : "border-muted-foreground/30"
            }`}
          >
            {isSelected && <Check className="h-3 w-3 text-white" />}
          </div>
        )}

        <div className="shrink-0 w-16 h-16 rounded-lg bg-surface overflow-hidden relative">
          {product.image ? (
            <Image src={product.image} alt={product.title} width={64} height={64} unoptimized className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
              <Package className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm text-foreground line-clamp-1 group-hover:text-accent transition-colors">
            {product.title}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-[10px] font-medium text-muted-foreground">
              {platformIcons[product.source] || "\ud83d\udd17"} {product.source}
            </span>
            {product.rating != null && (
              <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                <Star className="h-2.5 w-2.5 text-amber-400 fill-current" />
                {product.rating.toFixed(1)}
              </span>
            )}
            <span className="text-[10px] text-muted-foreground/60">{timeAgo(product.savedAt)}</span>
          </div>
        </div>

        {product.price != null && (
          <span className="font-display text-base font-bold text-accent shrink-0">${product.price.toFixed(2)}</span>
        )}

        <div className="shrink-0 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              disabled={!!actionLoading}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
            >
              {actionLoading ? (
                <div className="h-4 w-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
            </button>
            {menuOpen && <AIDropdownMenu actions={aiActions} onAction={handleAIAction} />}
          </div>
          <button
            onClick={() => toggleSave(product)}
            className="p-1.5 rounded-lg text-accent hover:bg-accent/10 transition-all"
            title="Remove from saved"
          >
            <Heart className="h-4 w-4 fill-current" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`glass-card-animated rounded-2xl overflow-hidden group transition-all ${
        isSelected ? "ring-2 ring-accent/50 border-accent/30" : ""
      }`}
      onClick={openProduct}
    >
      <div className="aspect-square bg-surface relative overflow-hidden">
        {isSelectMode && (
          <div
            onClick={(e) => { e.stopPropagation(); toggleSelect(product.id); }}
            className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all backdrop-blur-sm ${
              isSelected
                ? "bg-accent border-accent"
                : "bg-black/40 border-white/40"
            }`}
          >
            {isSelected && <Check className="h-3.5 w-3.5 text-white" />}
          </div>
        )}

        {product.image ? (
          <Image
            src={product.image}
            alt={product.title}
            width={400}
            height={400}
            unoptimized
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
            <Package className="h-12 w-12" />
          </div>
        )}

        <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm flex items-center gap-1 max-w-[calc(100%-16px)] truncate">
          {platformIcons[product.source] || "\ud83d\udd17"} {product.source}
        </span>

        <button
          onClick={(e) => { e.stopPropagation(); toggleSave(product); }}
          className="absolute top-2 right-2 p-2.5 rounded-lg bg-accent text-white transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
          title="Remove from saved"
        >
          <Heart className="h-4 w-4 fill-current" />
        </button>
      </div>

      <div className="p-4 space-y-2">
        <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-accent transition-colors">
          {product.title}
        </h3>
        <div className="flex items-center justify-between">
          {product.price != null ? (
            <span className="text-lg font-bold text-accent">${product.price.toFixed(2)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">Price N/A</span>
          )}
          {product.rating != null && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3 text-amber-400 fill-current" />
              {product.rating.toFixed(1)}
              {product.reviews != null && <span>({product.reviews.toLocaleString()})</span>}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-muted-foreground/60">Saved {timeAgo(product.savedAt)}</span>
          <div className="relative" ref={menuRef}>
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              disabled={!!actionLoading}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all"
              title="AI Actions"
            >
              {actionLoading ? (
                <div className="h-4 w-4 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              ) : (
                <MoreVertical className="h-4 w-4" />
              )}
            </button>
            {menuOpen && <AIDropdownMenu actions={aiActions} onAction={handleAIAction} />}
          </div>
        </div>
      </div>
    </div>
  );
}

function AIDropdownMenu({
  actions,
  onAction,
}: {
  actions: { id: string; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[];
  onAction: (id: string) => void;
}) {
  return (
    <div
      className="absolute right-0 bottom-full mb-1 z-50 w-48 bg-neutral-800 border border-neutral-700 rounded-xl shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b border-neutral-700/50">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">AI Actions</p>
      </div>
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={() => onAction(action.id)}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-700/50 hover:text-white transition-colors"
        >
          <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
          {action.label}
        </button>
      ))}
    </div>
  );
}
