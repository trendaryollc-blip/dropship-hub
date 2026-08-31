"use client";

import { useState, useMemo, useEffect, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, Loader2, Compass, Zap, ArrowRight,
  Flame, TrendingUp, Sparkles, ShoppingCart, Package, Heart,
} from "lucide-react";
import Image from "next/image";
import { useInView } from "@/hooks/useInView";
import SearchHeader from "@/components/products/SearchHeader";
import FilterPanel, { Filters } from "@/components/products/FilterPanel";
import ViewToggle from "@/components/ui/ViewToggle";
import EnrichedProductCard from "@/components/products/EnrichedProductCard";
import ListItemCard from "@/components/products/ListItemCard";
import ResultsHeader from "@/components/products/ResultsHeader";
import { useSavedProducts } from "@/components/saved/SavedProductsProvider";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";
import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";

interface SearchResult {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  images?: string[];
  link: string;
  source: string;
  brand?: string;
  rating?: number;
  reviews?: number;
}

interface PlatformResult {
  platform: string;
  name: string;
  resultCount: number;
  data: unknown;
}

interface PlatformError {
  platform: string;
  name: string;
  error: string;
}

interface PlatformInfo {
  id: string;
  name: string;
  enabled: boolean;
  configured: boolean;
}

interface TrendingProduct {
  id: string;
  name: string;
  fullName: string;
  category: string;
  price: number;
  sellPrice: number;
  profit: number;
  margin: number;
  platform: string;
  platformId: string;
  link: string;
  trend: number;
  sparkline: number[];
  confidence: number;
  demandLevel: "low" | "medium" | "high";
  competitionLevel: "low" | "medium" | "high";
  image: string;
  tags: string[];
  rating: number | null;
  reviews: number | null;
}

interface NicheData {
  id: string;
  name: string;
  icon: string;
  image: string;
  category: string;
  heat: number;
  productCount: number;
  avgMargin: number;
  growth: number;
  trend: "up" | "down" | "stable";
  avgSellingPrice: number;
}

interface CategoryData {
  id: string;
  name: string;
  icon: string;
  image: string;
  productCount: number;
  avgMargin: number;
  trending: boolean;
  query: string;
}

function normalizeResults(platform: string, data: unknown): SearchResult[] {
  const results: SearchResult[] = [];
  const sourceData = data as Record<string, unknown>;
  const items = Array.isArray(data)
    ? data
    : (sourceData?.search_results as unknown[]) ?? (sourceData?.data as unknown[]) ?? (sourceData?.products as unknown[]) ?? [];
  if (!Array.isArray(items)) return results;
  items.forEach((item, i) => {
    if (!item || typeof item !== "object") return;
    const product = item as Record<string, unknown>;
    if (product.code && product.message && !product.title && !product.name) return;
    if ("code" in product && "message" in product && Object.keys(product).length <= 3) return;
    const price =
      typeof product.price === "number"
        ? product.price
        : typeof product.sellPrice === "number"
          ? product.sellPrice
          : typeof product.extracted_price === "number"
            ? product.extracted_price
            : null;
    const rawImages = product.images;
    const imagesArray = Array.isArray(rawImages)
      ? rawImages.map((img) => {
          if (typeof img === "string") return img;
          if (typeof img === "object" && img !== null) {
            const o = img as Record<string, unknown>;
            return String(o.link || o.url || o.large || o.high_res || o.thumbnail || "");
          }
          return "";
        }).filter((u) => u && u !== "null" && u !== "")
      : undefined;

    const primaryImage = (() => {
      const raw = product.image || product.thumbnail || product.imageUrl || product.productImage || "";
      const s = String(raw);
      return s && s !== "null" && s !== "undefined" ? s : null;
    })();
    const allImages = imagesArray && imagesArray.length > 0 ? imagesArray : (primaryImage ? [primaryImage] : undefined);

    results.push({
      id: `${platform}-${encodeURIComponent(String(product.link || product.itemWebUrl || product.url || product.product_link || "")).slice(0, 80)}-${i}`,
      title: String(product.title || product.productName || product.name || "Product"),
      price,
      image: primaryImage,
      images: allImages && allImages.length > 0 ? allImages : undefined,
      link: String(product.link || product.itemWebUrl || product.url || product.product_link || "#"),
      source: platform,
      brand: typeof product.brand === "string" && product.brand ? String(product.brand) : undefined,
      rating: typeof product.rating === "number" ? product.rating : undefined,
      reviews: typeof product.reviews === "number" ? product.reviews : typeof product.total_ratings === "number" ? product.total_ratings : undefined,
    });
  });
  return results;
}

function HowItWorksSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const steps = [
    { icon: Search, title: "Search Across Platforms", desc: "Find products from Amazon, eBay, AliExpress, and more in one search", color: "text-blue-400", bg: "bg-blue-400/10" },
    { icon: TrendingUp, title: "Compare & Analyze", desc: "Compare prices, margins, and demand data to find winning products", color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { icon: ShoppingCart, title: "Source & Sell", desc: "Connect with verified suppliers and start selling with confidence", color: "text-purple-400", bg: "bg-purple-400/10" },
  ];
  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-accent" />
        <h3 className="font-display text-sm font-semibold text-foreground">How It Works</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className={`glass rounded-2xl p-5 transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${step.bg} mb-3`}>
              <step.icon className={`h-5 w-5 ${step.color}`} />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-muted-foreground/40">STEP {i + 1}</span>
              {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/20 hidden md:block" />}
            </div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-1">{step.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  const suggestions = ["wireless earbuds", "phone accessories", "pet supplies", "kitchen gadgets", "led strip lights"];
  return (
    <div className="glass rounded-2xl p-4 sm:p-8 md:p-16 text-center">
      <Compass className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/30 mx-auto mb-4" />
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">No products found</h3>
      <p className="text-sm text-muted-foreground mb-4">Try a different search query or enable more platforms</p>
      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground">Try:</span>
        {suggestions.map((s) => (
          <Link
            key={s}
            href={`/products?q=${encodeURIComponent(s)}`}
            className="text-xs px-3 py-2.5 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors min-h-[36px] flex items-center"
          >
            {s}
          </Link>
        ))}
      </div>
    </div>
  );
}

function TrendingSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const router = useRouter();
  const { data, isLoading: loading } = useAPI<{ products?: TrendingProduct[] }>("/api/products/trending");
  const products = data?.products || [];

  const viewProduct = (product: TrendingProduct) => {
    sessionStorage.setItem("selectedProduct", JSON.stringify({
      id: product.id,
      title: product.fullName,
      price: product.price,
      image: product.image,
      images: product.image ? [product.image] : [],
      link: product.link || "#",
      source: product.platformId,
      category: product.category,
      tags: product.tags,
      rating: product.rating,
      reviews: product.reviews,
    }));
    const params = new URLSearchParams({
      t: product.fullName,
      p: String(product.price),
      src: product.platformId,
    });
    if (product.image) params.set("img", product.image);
    if (product.link) params.set("link", product.link);
    if (product.rating != null) params.set("r", String(product.rating));
    if (product.reviews != null) params.set("rev", String(product.reviews));
    router.push(`/products/${product.id}?${params.toString()}`);
  };

  const demandConfig: Record<string, { label: string; cls: string }> = {
    low: { label: "Low", cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    medium: { label: "Med", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
    high: { label: "High", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  };
  const compConfig: Record<string, { label: string; cls: string }> = {
    low: { label: "Low", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
    medium: { label: "Med", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
    high: { label: "High", cls: "text-red-400 bg-red-400/10 border-red-400/20" },
  };
  const rankGradients = [
    "from-yellow-400 to-amber-500", "from-slate-300 to-slate-400",
    "from-orange-400 to-orange-500", "from-blue-400/60 to-blue-500",
    "from-purple-400/60 to-purple-500", "from-pink-400/60 to-pink-500",
  ];

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent-warm" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Trending Right Now</h3>
            <p className="text-[10px] text-muted-foreground">Real products with highest profit potential</p>
          </div>
          {products.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-warm/10 text-accent-warm font-medium animate-pulse-badge">
              {products.length} hot
            </span>
          )}
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!loading && products.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center">
          <Package className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No trending data available right now</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Try searching for products above</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product, i) => {
            const demand = demandConfig[product.demandLevel];
            const comp = compConfig[product.competitionLevel];
            const rankBg = rankGradients[Math.min(i, rankGradients.length - 1)];
            return (
              <div key={product.id} className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="glass-card-animated rounded-2xl overflow-hidden group hover:ring-1 hover:ring-accent/30 transition-all duration-300 flex flex-col h-full">
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); viewProduct(product); }} className="block w-full text-left">
                    <div className="relative aspect-[3/4] bg-surface overflow-hidden">
                      {product.image ? (
                        <Image
                          src={product.image}
                          alt={product.name}
                          fill
                          unoptimized
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-10 w-10 text-muted-foreground/20" />
                        </div>
                      )}
                      <div className={`absolute top-2 left-2 w-7 h-7 rounded-lg bg-gradient-to-br ${rankBg} flex items-center justify-center shadow-lg`}>
                        <span className="text-[10px] font-black text-white">#{i + 1}</span>
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                          <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
                          +{product.trend}%
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                        <div className="flex items-center gap-1">
                          {demand && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${demand.cls}`}>{demand.label}</span>}
                          {comp && <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${comp.cls}`}>{comp.label}</span>}
                        </div>
                        <span className="text-[9px] text-white/80 bg-black/40 backdrop-blur-sm px-1.5 py-0.5 rounded-full">{product.platform}</span>
                      </div>
                    </div>
                  </button>

                  <div className="p-3 flex flex-col flex-1">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); viewProduct(product); }} className="block w-full text-left">
                      <p className="text-xs font-semibold text-foreground line-clamp-2 leading-tight mb-1.5 min-h-[2rem]">{product.name}</p>
                    </button>

                    <div className="mt-auto space-y-2">
                      <div className="flex items-baseline justify-between">
                        <div>
                          <p className="text-[10px] text-muted-foreground line-through">${product.sellPrice.toFixed(2)}</p>
                          <p className="text-sm font-bold text-emerald-400">${product.profit.toFixed(2)} <span className="text-[10px] font-normal text-muted-foreground">profit</span></p>
                        </div>
                        <span className="text-[10px] text-muted-foreground bg-surface/80 px-1.5 py-0.5 rounded-full">{product.margin}%</span>
                      </div>

                      <div className="h-px bg-border/50" />

                      <div className="flex items-center gap-1.5">
                        <Flame className="h-3 w-3 text-accent-warm shrink-0" />
                        <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400" style={{ width: `${product.confidence}%` }} />
                        </div>
                        <span className="text-[9px] text-muted-foreground shrink-0">{product.confidence}</span>
                      </div>

                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); viewProduct(product); }}
                        className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold transition-colors"
                      >
                        <ShoppingCart className="h-3.5 w-3.5" />
                        View Product
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function NichesSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const { data, isLoading: loading } = useAPI<{ niches?: NicheData[] }>("/api/niches");
  const niches = (data?.niches || []).slice(0, 8);

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Popular Niches</h3>
            <p className="text-[10px] text-muted-foreground">Real CJ categories ranked by profit potential</p>
          </div>
        </div>
        <Link href="/products/niches" className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-xl border border-border bg-surface/50 overflow-hidden animate-pulse">
              <div className="h-28 bg-surface" />
              <div className="p-3 space-y-2"><div className="h-4 bg-surface rounded w-2/3" /><div className="h-3 bg-surface rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && niches.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No niche data available</p>
        </div>
      )}

      {!loading && niches.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {niches.map((niche, i) => {
            const trendColor = niche.trend === "up" ? "text-emerald-400" : niche.trend === "down" ? "text-red-400" : "text-muted-foreground";
            const trendBg = niche.trend === "up" ? "bg-emerald-400/10" : niche.trend === "down" ? "bg-red-400/10" : "bg-surface/50";
            return (
              <div key={niche.id} className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${i * 60}ms` }}>
                <Link href={`/products?q=${encodeURIComponent(niche.name)}`} className="group block rounded-xl border border-border overflow-hidden bg-surface/50 hover:border-accent/20 hover:bg-accent/5 transition-all duration-300 hover:scale-[1.02]">
                  <div className="relative h-28 overflow-hidden bg-surface">
                    {niche.image ? (
                      <Image
                        src={niche.image}
                        alt={niche.name}
                        fill
                        unoptimized
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-muted/20">
                        <span className="text-4xl opacity-20">{niche.icon}</span>
                      </div>
                    )}
                    <div className={`absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md backdrop-blur-sm ${trendBg}`}>
                      <span className={`text-[9px] font-bold ${trendColor}`}>{niche.growth > 0 ? "+" : ""}{niche.growth}%</span>
                    </div>
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors mb-1 line-clamp-1">{niche.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{niche.productCount} products</span>
                      <span className="text-[10px] text-muted-foreground">${niche.avgSellingPrice.toFixed(0)} avg</span>
                    </div>
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function CategoriesSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const { data, isLoading: loading } = useAPI<{ categories?: CategoryData[] }>("/api/products/categories");
  const categories = data?.categories || [];

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-cyan-400" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Browse by Category</h3>
            <p className="text-[10px] text-muted-foreground">Real categories with live product counts</p>
          </div>
        </div>
      </div>

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
              <div className="h-32 bg-surface" />
              <div className="p-4 space-y-2"><div className="h-4 bg-surface rounded w-2/3" /><div className="h-3 bg-surface rounded w-1/2" /></div>
            </div>
          ))}
        </div>
      )}

      {!loading && categories.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center">
          <Compass className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No category data available</p>
        </div>
      )}

      {!loading && categories.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {categories.map((cat, i) => (
            <div key={cat.id} className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${i * 60}ms` }}>
              <Link href={`/products?q=${encodeURIComponent(cat.query)}`} className="group relative block rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.02]">
                <div className="relative h-32 overflow-hidden bg-surface">
                  {cat.image ? (
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      unoptimized
                      className="object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-surface to-muted/20">
                      <span className="text-5xl opacity-20">{cat.icon}</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  {cat.trending && (
                    <span className="absolute top-2 right-2 flex items-center gap-0.5 text-[10px] font-bold text-accent-warm bg-accent-warm/10 px-2 py-0.5 rounded-full border border-accent-warm/20 backdrop-blur-sm">
                      <TrendingUp className="h-2.5 w-2.5" /> Hot
                    </span>
                  )}
                </div>
                <div className="relative p-4 bg-surface/50 border border-border/50 border-t-0 rounded-b-2xl">
                  <h3 className="font-display text-sm font-semibold text-foreground mb-1 group-hover:text-accent transition-colors flex items-center gap-1.5">
                    {cat.name}
                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-muted-foreground">{cat.productCount.toLocaleString()} products</span>
                    <span className="text-[10px] text-muted-foreground">~{cat.avgMargin}% margin</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<div className="max-w-7xl mx-auto p-4 md:p-8 text-center text-muted-foreground">Loading...</div>}>
        <ProductsContent />
      </Suspense>
    </PageErrorBoundary>
  );
}

// Module-level cache — survives component remounts (e.g., back navigation)
let _lastQuery = "";
let _lastResults: SearchResult[] = [];
let _lastPlatformResults: PlatformResult[] = [];
let _lastPlatformErrors: PlatformError[] = [];

// Static fallback platform list — used only until the backend platform list loads.
const DEFAULT_PLATFORMS: PlatformInfo[] = [
  { id: "amazon", name: "Amazon", enabled: true, configured: true },
  { id: "ebay", name: "Ebay", enabled: true, configured: true },
  { id: "aliexpress", name: "Aliexpress", enabled: true, configured: true },
  { id: "cj", name: "CJ", enabled: true, configured: true },
  { id: "google_shopping", name: "Google Shopping", enabled: true, configured: true },
  { id: "walmart", name: "Walmart", enabled: true, configured: true },
  { id: "etsy", name: "Etsy", enabled: true, configured: true },
  { id: "temu", name: "Temu", enabled: true, configured: true },
  { id: "shein", name: "Shein", enabled: true, configured: true },
  { id: "banggood", name: "Banggood", enabled: true, configured: true },
  { id: "dhgate", name: "DHgate", enabled: true, configured: true },
  { id: "alibaba", name: "Alibaba", enabled: true, configured: true },
];

function ProductsContent() {
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<SearchResult[]>(() => _lastResults);
  const [platformResults, setPlatformResults] = useState<PlatformResult[]>(() => _lastPlatformResults);
  const [platformErrors, setPlatformErrors] = useState<PlatformError[]>(() => _lastPlatformErrors);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(() => _lastResults.length > 0 || _lastQuery !== "");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<PlatformInfo[]>(DEFAULT_PLATFORMS);
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "rating" | "reviews">("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({ brands: [], priceMin: "", priceMax: "", minRating: 0 });
  const { savedProducts } = useSavedProducts();
  const searchAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("recentSearches") || "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe localStorage hydration
      if (Array.isArray(stored)) setRecentSearches(stored);
    } catch (e) { if (process.env.NODE_ENV === "development") console.warn("[Products] silently caught", e); }
  }, []);

  const saveRecentSearch = (q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  // Single search function — the ONLY place API calls are made.
  // No useEffect auto-trigger: eliminates stale closures, race conditions, and cache key mismatches.
  const handleSearch = useCallback(async (searchQuery?: string, platformsOverride?: string[]) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    // Abort any in-flight search
    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const platforms = platformsOverride ?? selectedPlatforms;
    const platformKey = [...platforms].sort().join(",") || "all";
    const cacheKey = `search_${platformKey}_${q}`;

    // Check sessionStorage cache first
    try {
      const cached = JSON.parse(sessionStorage.getItem(cacheKey) || "null");
      if (cached && cached.query === q && cached.results?.length > 0) {
        const cleanResults = cached.results.filter((r: Record<string, unknown>) => {
          if (!r || typeof r !== "object") return false;
          if (r.code && r.message && !r.title && !r.name) return false;
          if ("code" in r && "message" in r && Object.keys(r).length <= 3) return false;
          return true;
        });
        setResults(cleanResults);
        setPlatformResults(cached.platformResults || []);
        setSearched(true);
        setLoading(false);
        setQuery(q);
        // Update module-level cache
        _lastQuery = q;
        _lastResults = cleanResults;
        _lastPlatformResults = cached.platformResults || [];
        _lastPlatformErrors = [];
        return;
      }
    } catch (e) { if (process.env.NODE_ENV === "development") console.warn("[Products] silently caught", e); }

    setLoading(true);
    setError(null);
    setResults([]);
    setPlatformResults([]);
    setPlatformErrors([]);
    setSearched(true);
    setQuery(q);
    saveRecentSearch(q);

    try {
      const data = await safeFetch<{ platforms?: PlatformResult[]; platformErrors?: PlatformError[] }>("/api/platforms/search-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          platforms: platforms.length > 0 ? platforms : undefined,
        }),
        signal: controller.signal,
      });
      const allResults: SearchResult[] = [];
      const platformData: PlatformResult[] = data.platforms || [];
      platformData.forEach((p: PlatformResult) => {
        allResults.push(...normalizeResults(p.platform, p.data));
      });
      const errs = data.platformErrors || [];
      setPlatformResults(platformData);
      setPlatformErrors(errs);
      setResults(allResults);
      // Save to module-level cache for back-button persistence
      _lastQuery = q;
      _lastResults = allResults;
      _lastPlatformResults = platformData;
      _lastPlatformErrors = errs;
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({ query: q, results: allResults, platformResults: platformData }));
      } catch (e) { if (process.env.NODE_ENV === "development") console.warn("[Products] silently caught", e); }

      // Background: fetch missing images from product URLs
      const missingImages = allResults.filter((r) => !r.image && r.link && r.link !== "#");
      if (missingImages.length > 0) {
        const urlsToFetch = missingImages.map((r) => r.link);
        safeFetch<{ images?: (string | undefined)[] }>("/api/platforms/batch-images", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls: urlsToFetch }),
        })
          .then((imgData) => {
            if (!imgData.images) return;
            setResults((prev) => {
              const updated = prev.map((item) => {
                if (item.image) return item;
                const idx = missingImages.findIndex((m) => m.link === item.link);
                if (idx >= 0 && imgData.images && imgData.images[idx]) {
                  return { ...item, image: imgData.images[idx] };
                }
                return item;
              });
              _lastResults = updated;
              try {
                sessionStorage.setItem(cacheKey, JSON.stringify({ query: q, results: updated, platformResults: platformData }));
              } catch (e) { if (process.env.NODE_ENV === "development") console.warn("[Products] silently caught", e); }
              return updated;
            });
          })
          .catch((e) => { if (process.env.NODE_ENV === "development") console.warn("[ProductsPage] silently caught", e); });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Network error - please try again");
    } finally {
      setLoading(false);
    }
  }, [query, selectedPlatforms]);

  // On mount: if URL has ?q=, trigger a search using current platform selection
  // If we already have cached results for this query, skip re-fetching
  const initialSearchDone = useRef(false);
  const lastSearchParam = useRef<string | null>(null);
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q) return;
    
    // Skip if this is the same query we already processed
    if (q === lastSearchParam.current && initialSearchDone.current) return;
    lastSearchParam.current = q;
    initialSearchDone.current = true;
    
    // If we already have results for this query (from module-level cache), skip fetch
    if (_lastQuery === q && _lastResults.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- cache hit guard, not a data sync
      setSearched(true);
      setQuery(q);
      return;
    }
    handleSearch(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const { data: platformData } = useAPI<{ platforms?: PlatformInfo[] }>("/api/platforms/search-all");
  useEffect(() => {
    if (platformData?.platforms) {
      const list = platformData.platforms.filter((p: PlatformInfo) => p.enabled && p.configured).map((p: PlatformInfo) => ({ id: p.id, name: p.name, enabled: true, configured: true }));
      if (list.length > 0) setAvailablePlatforms(list);
      setSelectedPlatforms(prev => prev.filter(id => list.some(p => p.id === id)));
    }
  }, [platformData]);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const sortedResults = useMemo(() => {
    const sorted = [...results];
    switch (sortBy) {
      case "price-asc":
        return sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
      case "price-desc":
        return sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
      case "rating":
        return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case "reviews":
        return sorted.sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
      default:
        return sorted;
    }
  }, [results, sortBy]);

  const availableBrands = useMemo(() => {
    const brandSet = new Set<string>();
    results.forEach((r) => {
      if (r.brand) brandSet.add(r.brand);
    });
    return Array.from(brandSet);
  }, [results]);

  const filteredResults = useMemo(() => {
    return sortedResults.filter((r) => {
      if (filters.brands.length > 0 && (!r.brand || !filters.brands.includes(r.brand))) return false;
      if (filters.priceMin && (r.price == null || r.price < Number(filters.priceMin))) return false;
      if (filters.priceMax && (r.price == null || r.price > Number(filters.priceMax))) return false;
      if (filters.minRating > 0 && (r.rating == null || r.rating < filters.minRating)) return false;
      return true;
    });
  }, [sortedResults, filters]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-16 md:pb-24">
      <SearchHeader
        query={query}
        setQuery={setQuery}
        onSearch={() => handleSearch()}
        loading={loading}
        platforms={availablePlatforms}
        selectedPlatforms={selectedPlatforms}
        togglePlatform={togglePlatform}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        recentSearches={recentSearches}
        onRecentClick={(q) => handleSearch(q)}
      />

      {savedProducts.length > 0 && (
        <Link
          href="/saved"
          className="flex items-center gap-2.5 p-3 rounded-2xl bg-accent/8 border border-accent/15 hover:bg-accent/15 transition-all"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15">
            <Heart className="h-4 w-4 text-accent fill-current" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground">
              {savedProducts.length} saved product{savedProducts.length === 1 ? "" : "s"}
            </p>
            <p className="text-[10px] text-muted-foreground">Tap to view the products you saved for later</p>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </Link>
      )}

      {error && (
        <div className="glass rounded-2xl p-4 border border-red-400/20 bg-red-400/5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {showFilters && searched && results.length > 0 && (
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          availableBrands={availableBrands}
          resultCount={results.length}
          filteredCount={filteredResults.length}
        />
      )}

      {loading && (
        <div className="glass rounded-2xl p-6 md:p-8 lg:p-16 text-center">
          <Loader2 className="h-12 w-12 text-accent mx-auto mb-4 animate-spin" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Searching...</h3>
          <p className="text-sm text-muted-foreground">
            Querying {selectedPlatforms.length > 0 ? selectedPlatforms.length : "all"} platform{selectedPlatforms.length !== 1 ? "s" : ""} in parallel
          </p>
        </div>
      )}

      {!loading && searched && results.length > 0 && (
        <>
          <ResultsHeader
            resultCount={filteredResults.length}
            platformCount={platformResults.length}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
          {platformErrors.length > 0 && (
            <div className="glass rounded-2xl p-3 border border-amber-400/20 bg-amber-400/5">
              <p className="text-xs font-medium text-amber-400 mb-1.5">
                {platformErrors.length} platform{platformErrors.length !== 1 ? "s" : ""} returned no results:
              </p>
              <div className="space-y-1">
                {platformErrors.map((pe) => (
                  <div key={pe.platform} className="flex items-center gap-2 text-[10px] text-amber-400/80">
                    <span className="font-medium">{pe.name}</span>
                    {pe.error && <span className="text-amber-400/50">— {pe.error}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredResults.map((product, i) => (
                <EnrichedProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredResults.map((product, i) => (
                <ListItemCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </>
      )}

      {!loading && searched && results.length > 0 && filteredResults.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No products match your filters</h3>
          <p className="text-sm text-muted-foreground mb-4">Try adjusting or clearing some filters</p>
          <button
            onClick={() => setFilters({ brands: [], priceMin: "", priceMax: "", minRating: 0 })}
            className="text-xs px-4 py-2 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <EmptyState />
      )}

      {!loading && !searched && (
        <>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-foreground">Discovery</span>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
          <TrendingSection />
          <NichesSection />
          <CategoriesSection />
          <HowItWorksSection />
        </>
      )}
    </div>
  );
}
