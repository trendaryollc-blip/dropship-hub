"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight, Package, Plus, ChevronLeft, ChevronRight,
  TrendingUp, BookmarkPlus, BookmarkCheck, Star,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { TrendingProduct } from "@/types/dashboard";

function TrendingProductCard({ product, rank, onAddCompare, onToggleSave, isSaved }: {
  product: TrendingProduct;
  rank: number;
  onAddCompare: (item: { name: string; price: number; margin: number; image: string }) => void;
  onToggleSave: (name: string) => void;
  isSaved: boolean;
}) {
  const { ref, isInView } = useInView({ threshold: 0.2 });

  const rankGradients = [
    "from-yellow-400 to-amber-500",
    "from-slate-300 to-slate-400",
    "from-orange-400 to-orange-500",
    "from-blue-400/60 to-blue-500",
    "from-purple-400/60 to-purple-500",
  ];
  const rankBg = rankGradients[Math.min(rank - 1, rankGradients.length - 1)];

  return (
    <div
      ref={ref}
      className={`flex-[0_0_calc((100%-24px)/3)] transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
    >
      <div className="glass-card-animated rounded-2xl overflow-hidden h-full flex flex-col">
        {/* Product Image */}
        <div className="relative h-44 bg-gradient-to-br from-accent/10 via-purple-500/5 to-accent/10 overflow-hidden">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="h-16 w-16 text-accent/20" />
            </div>
          )}
          {/* Rank Badge */}
          <div className={`absolute top-3 left-3 w-8 h-8 rounded-lg bg-gradient-to-br ${rankBg} flex items-center justify-center shadow-lg`}>
            <span className="text-[11px] font-black text-white">#{rank}</span>
          </div>
          {/* Trend Badge */}
          <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm">
            <TrendingUp className="h-3 w-3 text-emerald-400" />
            <span className="text-[11px] font-bold text-emerald-400">+{product.trend}%</span>
          </div>
          {/* Save Button */}
          <button
            onClick={() => onToggleSave(product.name)}
            className={`absolute bottom-3 right-3 p-2 rounded-lg transition-all ${isSaved ? "bg-accent/20 text-accent" : "bg-black/40 text-white/70 hover:text-white"}`}
          >
            {isSaved ? <BookmarkCheck className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
          </button>
        </div>

        {/* Product Info */}
        <div className="p-4 flex flex-col flex-1">
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[9px] px-2 py-0.5 rounded bg-accent/10 text-accent font-bold uppercase">{product.platform}</span>
            {product.demandLevel === "high" && (
              <span className="text-[9px] px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-400 font-bold uppercase">Hot</span>
            )}
          </div>
          <h4 className="text-xs font-semibold text-foreground leading-snug line-clamp-2 mb-3">{product.name}</h4>
          <div className="mt-auto">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">Price</span>
              <span className="text-base font-bold text-foreground">${product.price.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-muted-foreground">Margin</span>
              <span className="text-xs font-bold text-emerald-400">{product.margin}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">AI Score</span>
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                <span className="text-xs font-bold text-foreground">{product.confidence}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="px-4 pb-4 flex gap-2">
          <Link
            href="/products"
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-all active:scale-[0.97]"
          >
            View Product
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
          <button
            onClick={() => onAddCompare({ name: product.name, price: product.price, margin: product.margin, image: "https://placehold.co/60x60/0f0f17/3b82f6?text=P" })}
            className="p-2.5 rounded-xl border border-border text-muted-foreground hover:text-accent hover:border-accent/20 hover:bg-accent/10 transition-all"
            title="Add to compare"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TrendingProducts({
  products,
  onAddCompare,
}: {
  products: TrendingProduct[];
  onAddCompare: (item: { name: string; price: number; margin: number; image: string }) => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [currentIndex, setCurrentIndex] = useState(0);
  const [savedProducts, setSavedProducts] = useState<Set<string>>(new Set());

  const toggleSave = (name: string) => {
    setSavedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const cardsVisible = 3;
  const maxIndex = Math.max(0, products.length - cardsVisible);

  const goNext = () => setCurrentIndex((prev) => Math.min(prev + 1, maxIndex));
  const goPrev = () => setCurrentIndex((prev) => Math.max(prev - 1, 0));

  const getCardOffset = () => {
    if (typeof window === "undefined") return 0;
    const container = document.getElementById("trending-carousel");
    if (!container) return 0;
    const w = container.offsetWidth;
    return (w - 24) / 3 + 12;
  };

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent-warm/10 border border-accent-warm/20">
            <TrendingUp className="h-4 w-4 text-accent-warm" />
          </div>
          <div>
            <h3 className="font-display text-sm font-bold text-foreground">Trending Products</h3>
            <p className="text-[10px] text-muted-foreground">{products.length} products tracked</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-warm/10 text-accent-warm font-medium animate-pulse-badge">
            {products.length} hot
          </span>
          <Link href="/products" className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
            View all <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Carousel */}
      <div className="flex items-center gap-3">
        {/* Prev Button */}
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className={`shrink-0 p-2.5 rounded-xl border transition-all ${
            currentIndex === 0
              ? "border-border bg-surface/30 text-muted-foreground/30 cursor-not-allowed"
              : "border-border bg-surface hover:bg-surface-hover hover:border-accent/20 text-foreground hover:text-accent"
          }`}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Cards Container */}
        <div id="trending-carousel" className="flex-1 overflow-hidden">
          <div
            className="flex gap-3 transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${currentIndex * getCardOffset()}px)` }}
          >
            {products.map((product, i) => (
              <TrendingProductCard
                key={`${product.name}-${product.platform}-${i}`}
                product={product}
                rank={i + 1}
                onAddCompare={onAddCompare}
                onToggleSave={toggleSave}
                isSaved={savedProducts.has(product.name)}
              />
            ))}
          </div>
        </div>

        {/* Next Button */}
        <button
          onClick={goNext}
          disabled={currentIndex >= maxIndex}
          className={`shrink-0 p-2.5 rounded-xl border transition-all ${
            currentIndex >= maxIndex
              ? "border-border bg-surface/30 text-muted-foreground/30 cursor-not-allowed"
              : "border-border bg-surface hover:bg-surface-hover hover:border-accent/20 text-foreground hover:text-accent"
          }`}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Dots Indicator */}
      {products.length > cardsVisible && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {Array.from({ length: maxIndex + 1 }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === currentIndex ? "w-6 bg-accent" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/50"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
