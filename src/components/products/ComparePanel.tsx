"use client";

import { useState } from "react";
import Image from "next/image";
import { X, GitCompare, Loader2, Sparkles, Star, Package, ChevronDown } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  link: string;
  source: string;
  brand?: string;
  rating?: number;
  reviews?: number;
}

interface ComparePanelProps {
  selectedProducts: SearchResult[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onAICompare?: (products: SearchResult[]) => void;
}

export default function ComparePanel({ selectedProducts, onRemove, onClearAll, onAICompare }: ComparePanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  if (selectedProducts.length === 0) return null;

  const handleAICompare = async () => {
    if (!onAICompare) return;
    setAiLoading(true);
    onAICompare(selectedProducts);
    setAiLoading(false);
  };

  const platformIcons: Record<string, string> = {
    amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
    cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", walmart: "\ud83c\udfea",
    etsy: "\ud83c\udfa8", temu: "\ud83d\udce8", shein: "\ud83d\udc57",
  };

  return (
    <div className="glass rounded-2xl border border-accent/20 bg-accent/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
            <GitCompare className="h-4.5 w-4.5 text-accent" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">
              Compare ({selectedProducts.length}/4)
            </p>
            <p className="text-[10px] text-muted-foreground">
              {selectedProducts.length < 2 ? "Select at least 2 products to compare" : "Ready to compare"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); onClearAll(); }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
          >
            Clear all
          </button>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {selectedProducts.map((product) => (
              <div
                key={product.id}
                className="relative flex-shrink-0 w-32 glass rounded-xl overflow-hidden group"
              >
                <button
                  onClick={() => onRemove(product.id)}
                  className="absolute top-1 right-1 z-10 p-1 rounded-full bg-black/60 text-white hover:bg-red-500/80 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="aspect-square bg-surface relative">
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.title}
                      width={128}
                      height={128}
                      unoptimized
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="h-8 w-8 text-muted-foreground/20" />
                    </div>
                  )}
                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-black/60 text-white text-[8px] font-medium backdrop-blur-sm">
                    {platformIcons[product.source] || ""} {product.source}
                  </span>
                </div>
                <div className="p-2">
                  <p className="text-[10px] font-medium text-foreground line-clamp-2 leading-tight mb-1">{product.title}</p>
                  {product.price != null && (
                    <p className="text-xs font-bold text-accent">${product.price.toFixed(2)}</p>
                  )}
                  {product.rating != null && (
                    <div className="flex items-center gap-0.5 mt-0.5">
                      <Star className="h-2.5 w-2.5 text-amber-400 fill-current" />
                      <span className="text-[9px] text-muted-foreground">{product.rating.toFixed(1)}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {selectedProducts.length < 4 && (
              <div className="flex-shrink-0 w-32 border-2 border-dashed border-border rounded-xl flex items-center justify-center h-[140px]">
                <div className="text-center">
                  <Package className="h-6 w-6 text-muted-foreground/30 mx-auto mb-1" />
                  <p className="text-[9px] text-muted-foreground/50">Add product</p>
                </div>
              </div>
            )}
          </div>

          {selectedProducts.length >= 2 && onAICompare && (
            <button
              onClick={handleAICompare}
              disabled={aiLoading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {aiLoading ? "AI is comparing..." : "AI Compare Products"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
