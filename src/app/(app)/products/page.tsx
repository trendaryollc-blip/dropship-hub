"use client";

import { useState, useMemo, useEffect, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, Compass, Zap, ArrowRight,
  Flame, TrendingUp, Sparkles, ShoppingCart, Package,
  ChevronUp, AlertTriangle,
} from "lucide-react";
import Image from "next/image";
import { useInView } from "@/hooks/useInView";
import SearchHeader from "@/components/products/SearchHeader";
import FilterPanel, { Filters } from "@/components/products/FilterPanel";
import EnrichedProductCard, { type EnrichedProduct } from "@/components/products/EnrichedProductCard";
import ListItemCard from "@/components/products/ListItemCard";
import ResultsHeader from "@/components/products/ResultsHeader";
import ComparePanel from "@/components/products/ComparePanel";
import PlatformProgress from "@/components/products/PlatformProgress";
import QuickActionChips from "@/components/products/QuickActionChips";
import AICollections from "@/components/products/AICollections";
import PersonalizedRecommendations from "@/components/products/PersonalizedRecommendations";
import SearchAlertModal, { type SearchAlertData } from "@/components/products/SearchAlertModal";

import { useAuth } from "@/components/auth/AuthProvider";
import { useSearchTracking } from "@/contexts/SearchTrackingContext";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";
import { matchProductByName } from "@/lib/search/match-product";
import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";
import { ProductCardSkeleton } from "@/components/ui/Skeleton";
import { useSearchHistory } from "@/hooks/useSearchHistory";
import DataSourceBadge from "@/components/ui/DataSourceBadge";
import DataUnavailable from "@/components/ui/DataUnavailable";
import ComingSoon from "@/components/ui/ComingSoon";

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
  // Enrichment fields
  estimatedMargin?: number;
  goldenScore?: number;
  goldenRank?: "S" | "A" | "B" | "C" | "D";
  trendPhase?: "emerging" | "growth" | "mature" | "declining";
  saturationLevel?: "unsaturated" | "low" | "moderate" | "saturated" | "hyper-saturated";
  competitionScore?: number;
  reviewVelocity?: number;
  priceStability?: number;
  supplyChainScore?: number;
  // Dedup fields
  platformCount?: number;
  platforms?: Array<{ platform: string; price: number | null; link: string; originalTitle: string; rating?: number; reviews?: number }>;
  bestPrice?: number | null;
  worstPrice?: number | null;
  priceSpread?: number;
  avgPrice?: number | null;
  bestPlatform?: string;
  // Rank fields
  relevanceScore?: number;
  rankReason?: string;
  [key: string]: unknown;
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
  sellPrice: number | null;
  profit: number | null;
  margin: number | null;
  platform: string;
  platformId: string;
  link: string;
  trend: number | null;
  sparkline: number[] | null;
  confidence: number | null;
  demandLevel: "low" | "medium" | "high" | null;
  competitionLevel: "low" | "medium" | "high" | null;
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
  avgMargin: number | null;
  growth: number | null;
  trend: "up" | "down" | "stable" | null;
  avgSellingPrice: number | null;
}

interface CategoryData {
  id: string;
  name: string;
  icon: string;
  image: string;
  productCount: number;
  avgMargin: number | null;
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

function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  if (!show) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-6 right-6 z-50 p-3 rounded-full bg-accent/90 text-white shadow-lg shadow-accent/20 hover:bg-accent hover:scale-110 transition-all duration-200"
      aria-label="Back to top"
    >
      <ChevronUp className="h-5 w-5" />
    </button>
  );
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

function EmptyState({ onAskAI }: { onAskAI?: (q: string) => void }) {
  const suggestions = ["wireless earbuds", "phone accessories", "pet supplies", "kitchen gadgets", "led strip lights"];
  return (
    <div className="glass rounded-2xl p-4 sm:p-8 md:p-16 text-center">
      <Compass className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground/30 mx-auto mb-4" />
      <h3 className="font-display text-lg font-semibold text-foreground mb-2">No products found</h3>
      <p className="text-sm text-muted-foreground mb-4">Try a different search query or enable more platforms</p>
      {onAskAI && (
        <button
          onClick={() => onAskAI("Help me find winning products for my store")}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500/15 to-purple-500/15 text-violet-400 border border-violet-500/20 text-sm font-medium hover:border-violet-500/40 transition-all mb-4"
        >
          <Sparkles className="h-4 w-4" />
          Smart search (filter parser)
        </button>
      )}
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
    if (product.category) params.set("cat", product.category);
    if (product.tags?.length) params.set("tags", product.tags.join(","));
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
            <h3 className="font-display text-sm font-semibold text-foreground">Fresh from live search</h3>
            <p className="text-[10px] text-muted-foreground">Latest live search results (price ascending)</p>
          </div>
          {products.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-warm/10 text-accent-warm font-medium animate-pulse-badge">
              {products.length} live
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
          <p className="text-xs text-muted-foreground">No live search results available right now</p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">Try searching for products above</p>
        </div>
      )}

      {!loading && products.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((product, i) => {
            const demand = product.demandLevel ? demandConfig[product.demandLevel] : undefined;
            const comp = product.competitionLevel ? compConfig[product.competitionLevel] : undefined;
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
                        {product.trend != null && (
                          <span className="text-[10px] font-bold text-white bg-black/60 backdrop-blur-sm px-2 py-1 rounded-full flex items-center gap-1">
                            <TrendingUp className="h-2.5 w-2.5 text-emerald-400" />
                            +{product.trend}%
                          </span>
                        )}
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
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between">
                        <div>
                          <p className="text-sm font-bold text-emerald-400">
                            ${(product.price ?? 0).toFixed(2)}
                            {product.profit != null && (
                              <span title="Estimated from sell price − source price when available" className="text-[10px] font-normal text-muted-foreground"> <span className="line-through">${(product.sellPrice ?? 0).toFixed(2)}</span> ~${product.profit.toFixed(2)} profit est.</span>
                            )}
                          </p>
                        </div>
                        {product.margin != null && (
                          <span title="Estimated margin — enter real COGS in the calculator for accuracy" className="text-[10px] text-muted-foreground bg-surface/80 px-1.5 py-0.5 rounded-full">{product.margin}% est.</span>
                        )}
                      </div>

                      <div className="h-px bg-border/50" />

                      {product.confidence != null && (
                        <div title="Estimated score from live search signals — not an AI market prediction" className="flex items-center gap-1.5">
                          <Flame className="h-3 w-3 text-accent-warm shrink-0" />
                          <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400" style={{ width: `${product.confidence}%` }} />
                          </div>
                          <span className="text-[9px] text-muted-foreground shrink-0">{product.confidence} est.</span>
                        </div>
                      )}

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
  const { data, isLoading: loading } = useAPI<{
    niches?: NicheData[];
    isFallback?: boolean;
    reason?: string;
    setup?: { what?: string; whereToGet?: string; whereToSet?: string };
  }>("/api/niches");
  const niches = (data?.niches || []).slice(0, 8);
  const isFallback = Boolean(data?.isFallback);

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Popular Niches</h3>
            <p className="text-[10px] text-muted-foreground">Live CJ categories with real product counts and prices</p>
          </div>
          {!loading && !isFallback && niches.length > 0 && (
            <DataSourceBadge source="live" className="ml-1" />
          )}
        </div>
        {!isFallback && (
          <Link href="/products/niches" className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
            View all <ArrowRight className="h-3 w-3" />
          </Link>
        )}
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

      {!loading && isFallback && (
        <DataUnavailable
          title="Niches require CJ API"
          reason={data?.reason || "Live niche data is unavailable until CJ Dropshipping is configured."}
          setup={{
            what: data?.setup?.what || "CJ Dropshipping API key",
            whereToGet: data?.setup?.whereToGet || "https://developers.cjdropshipping.com/",
            whereToSet: data?.setup?.whereToSet || "CJ_API_KEY",
          }}
        />
      )}

      {!loading && !isFallback && niches.length === 0 && (
        <div className="glass rounded-2xl p-6 text-center">
          <Sparkles className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No niche data available</p>
        </div>
      )}

      {!loading && !isFallback && niches.length > 0 && (
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
                    {niche.growth != null && (
                      <div className={`absolute top-2 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md backdrop-blur-sm ${trendBg}`}>
                        <span className={`text-[9px] font-bold ${trendColor}`}>{niche.growth > 0 ? "+" : ""}{niche.growth}%</span>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <h4 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors mb-1 line-clamp-1">{niche.name}</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">{niche.productCount} products</span>
                      <span className="text-[10px] text-muted-foreground">
                        {niche.avgSellingPrice != null ? `$${niche.avgSellingPrice.toFixed(0)} avg` : "price n/a"}
                      </span>
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
            <p className="text-[10px] text-muted-foreground">Live CJ product counts per category</p>
          </div>
          {!loading && categories.length > 0 && (
            <DataSourceBadge source="live" className="ml-1" />
          )}
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
        <>
        <ComingSoon
          title="Category margins"
          whatNeeded="Average margin by category needs supplier cost data per product — not available from CJ category search alone."
          howToGet="Connect cost APIs or enter COGS in the calculator to estimate margins."
          className="mb-3"
        />
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
                    <span className="text-[10px] text-muted-foreground">margin n/a</span>
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
        </>
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

// Display names for platform ids that may not be in DEFAULT_PLATFORMS.
const PLATFORM_NAME_FALLBACK: Record<string, string> = {
  amazon: "Amazon",
  ebay: "Ebay",
  aliexpress: "Aliexpress",
  cj: "CJ",
  google_shopping: "Google Shopping",
  walmart: "Walmart",
  etsy: "Etsy",
  temu: "Temu",
  shein: "Shein",
  banggood: "Banggood",
  dhgate: "DHgate",
  alibaba: "Alibaba",
  keepa: "Keepa",
};

const PAGE_SIZE = 24;

function ProductsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlQuery = searchParams.get("q") || "";
  const cacheRef = useRef({ query: "", results: [] as SearchResult[], platformResults: [] as PlatformResult[], platformErrors: [] as PlatformError[] });
  const [query, setQuery] = useState(urlQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [platformResults, setPlatformResults] = useState<PlatformResult[]>([]);
  const [platformErrors, setPlatformErrors] = useState<PlatformError[]>([]);
  // True when at least one requested platform didn't return usable results —
  // shown as a soft warning so users know the list may be incomplete.
  const [platformTruncated, setPlatformTruncated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [availablePlatforms, setAvailablePlatforms] = useState<PlatformInfo[]>([]);
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "rating" | "reviews" | "margin" | "golden">("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>({
    brands: [], priceMin: "", priceMax: "", minRating: 0,
    minMargin: 0, competitionLevel: [], trendingDirection: [], platformFilter: [],
  });
  const { user } = useAuth();
  const { trackSearch } = useSearchTracking();
  const searchAbortRef = useRef<AbortController | null>(null);
  const imageFetchAbortRef = useRef<AbortController | null>(null);
  const { history, addSearch, markProductClicked } = useSearchHistory();

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!user) return {};
    try {
      const token = await user.getIdToken();
      return { Authorization: `Bearer ${token}` };
    } catch {
      return {};
    }
  }, [user]);

  // Compare mode
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  // Compare items handed over via URL (?compare=<name>&compare=<name>), e.g.
  // from the dashboard's QuickCompareBar. Matched once results arrive.
  const pendingCompareNames = useRef<{ names: string[]; applied: boolean }>({ names: [], applied: false });

  // Product selection for Quick AI Actions (independent per card)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Platform progress tracking
  const [platformProgress, setPlatformProgress] = useState<{
    platforms: { platform: string; name: string; status: "pending" | "loading" | "success" | "error"; resultCount?: number; error?: string }[];
  }>({ platforms: [] });

  // Search Alert modal (Feature 10)
  const [showAlertModal, setShowAlertModal] = useState(false);

  // Pagination — keep the DOM light for large result sets; users can load more
  // in batches instead of rendering hundreds of cards at once.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [results, filters, sortBy]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("recentSearches") || "[]");
      if (Array.isArray(stored)) setRecentSearches(stored);
    } catch {
      // ignore malformed local storage
    }
  }, []);

  const saveRecentSearch = useCallback((q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  }, [recentSearches]);

  const handleSearch = useCallback(async (searchQuery?: string, platformsOverride?: string[], parsedIntent?: import("@/lib/search/intent-parser").ParsedIntent) => {
    const q = (searchQuery || query).trim();
    if (!q) return;

    searchAbortRef.current?.abort();
    imageFetchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    const platforms = platformsOverride ?? selectedPlatforms;
    const platformKey = [...platforms].sort().join(",") || "all";
    // Bumped when the cached payload shape changes, so stale cache entries
    // from an older build can't be restored with missing/renamed fields.
    const cacheKey = `search_v2_${platformKey}_${q}`;

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
        setPlatformErrors([]);
        setPlatformTruncated(false);
        setSearched(true);
        setLoading(false);
        setQuery(q);
        cacheRef.current = { query: q, results: cleanResults, platformResults: cached.platformResults || [], platformErrors: [] };
        return;
      }
    } catch {
      // cache unavailable — continue with a live search
    }

    setLoading(true);
    setError(null);
    setResults([]);
    setPlatformResults([]);
    setPlatformErrors([]);
    setPlatformTruncated(false);
    setSearched(true);
    setQuery(q);
    setVisibleCount(PAGE_SIZE);
    saveRecentSearch(q);

    // Sync the active search into the URL so results are shareable and
    // survive a refresh. Preserve any existing command params (compare,
    // maxPrice, minMargin) instead of wiping them out.
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("q", q);
    router.replace(`/products?${nextParams.toString()}`);

    // Initialize platform progress — resolve display names (from the API's
    // platform list, a static fallback, or a humanized id) instead of showing
    // raw platform ids in the status bar.
    const activePlatforms = platforms.length > 0
      ? platforms.map((p) => ({
          platform: p,
          name: availablePlatforms.find((ap) => ap.id === p)?.name ||
            PLATFORM_NAME_FALLBACK[p] ||
            p.replace(/_/g, " "),
          status: "loading" as const,
        }))
      : DEFAULT_PLATFORMS.map((p) => ({ platform: p.id, name: p.name, status: "loading" as const }));
    setPlatformProgress({ platforms: activePlatforms });

    try {
      const authHeaders = await getAuthHeaders();
      const requestBody: Record<string, unknown> = {
        query: q,
        platforms: platforms.length > 0 ? platforms : undefined,
        // Full (non-streaming) response — the enrichment pipeline runs on the
        // complete merged payload, so streaming mode is intentionally off.
        stream: false,
      };
      if (parsedIntent) requestBody.intent = parsedIntent;

      // Fetch the full enriched results for the enhancement pipeline
      const data = await safeFetch<{
        platforms?: PlatformResult[];
        platformErrors?: PlatformError[];
        mergedProducts?: SearchResult[];
        intent?: Record<string, unknown>;
        filters?: Record<string, unknown>;
      }>("/api/platforms/search-all", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      // Use merged/enriched products if available (Features 1-4)
      let allResults: SearchResult[];
      if (data.mergedProducts && data.mergedProducts.length > 0) {
        allResults = data.mergedProducts;
      } else {
        // Fallback: normalize from raw platform results
        allResults = [];
        const platformData = data.platforms || [];
        platformData.forEach((p: PlatformResult) => {
          allResults.push(...normalizeResults(p.platform, p.data));
        });
      }

      const errs = data.platformErrors || [];

      // Apply intent-based filters if available (Feature 2)
      if (data.filters) {
        const f = data.filters as Record<string, unknown>;
        setFilters((prev) => ({
          ...prev,
          brands: Array.isArray(f.brands) && f.brands.length > 0 ? f.brands as string[] : prev.brands,
          priceMin: f.priceMin ? String(f.priceMin) : prev.priceMin,
          priceMax: f.priceMax ? String(f.priceMax) : prev.priceMax,
          minRating: typeof f.minRating === "number" ? f.minRating : prev.minRating,
          platformFilter: Array.isArray(f.platformFilter) && f.platformFilter.length > 0 ? f.platformFilter as string[] : prev.platformFilter,
          trendingDirection: Array.isArray(f.trendingDirection) && f.trendingDirection.length > 0 ? f.trendingDirection as ("rising" | "stable" | "declining")[] : prev.trendingDirection,
        }));
      }

      // Update platform progress — over the platforms that were actually
      // requested, so a user-selected subset isn't padded with unrelated
      // platforms shown as "success, 0 results".
      const platformData = data.platforms || [];
      const progressList = activePlatforms.map((requested) => {
        const pd = platformData.find((pr: PlatformResult) => pr.platform === requested.platform);
        const err = errs.find((e: PlatformError) => e.platform === requested.platform);
        if (err) return { ...requested, status: "error" as const, error: err.error };
        if (pd) return { ...requested, status: "success" as const, resultCount: pd.resultCount };
        // Requested but absent from the response entirely — that's an error
        // (most often an aborted/overloaded request), not a zero-result query.
        return { ...requested, status: "error" as const, error: "No response from platform" };
      });
      setPlatformProgress({ platforms: progressList });
      const truncated = progressList.some((p) => p.status === "error");
      setPlatformTruncated(truncated);

      setPlatformResults(platformData);
      setPlatformErrors(errs);
      setResults(allResults);
      addSearch(q, allResults, selectedPlatforms.length > 0 ? selectedPlatforms : availablePlatforms.map((p) => p.id));
      cacheRef.current = { query: q, results: allResults, platformResults: platformData, platformErrors: errs };
      try {
        // Cap what we persist: full result sets can blow past the ~5MB
        // sessionStorage quota, which would make the write (and the alert
        // modal that shares this storage) fail silently.
        const cachedResults = allResults.slice(0, 60);
        sessionStorage.setItem(cacheKey, JSON.stringify({
          query: q,
          results: cachedResults,
          platformResults: platformData.slice(0, 10),
        }));
      } catch {
        // sessionStorage full or unavailable — results still render in memory
      }

      // Feature 6: Save search to Firestore for personalization
      if (user) {
        try {
          const token = await user.getIdToken();
          await safeFetch("/api/search-history", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ query: q, source: "products", resultCount: allResults.length }),
          });
        } catch { /* silently ignore */ }
      }

      // Feature 6: Track search event
      trackSearch(q, allResults.length);

      // Background image fetching — the API echoes the exact urls it resolved
      // (`imgData.urls`), so images are matched by URL instead of array index.
      const missingImages = allResults.filter((r) => !r.image && r.link && r.link !== "#");
      if (missingImages.length > 0) {
        const imageController = new AbortController();
        imageFetchAbortRef.current = imageController;
        const urlsToFetch = missingImages.map((r) => r.link);
        const authHeaders2 = await getAuthHeaders();
        safeFetch<{ images?: (string | undefined)[]; urls?: string[] }>("/api/platforms/batch-images", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders2 },
          body: JSON.stringify({ urls: urlsToFetch }),
          signal: imageController.signal,
        })
          .then((imgData) => {
            if (!imgData.images) return;
            // Build a url→image map when the API echoes the request order;
            // otherwise fall back to positional alignment (legacy behavior).
            const byUrl = new Map<string, string | undefined>();
            if (imgData.urls) {
              imgData.urls.forEach((url: string, i: number) => byUrl.set(url, imgData.images?.[i]));
            }
            setResults((prev) => {
              const currentQuery = cacheRef.current.query;
              if (currentQuery !== q) return prev;
              const updated = prev.map((item) => {
                if (item.image) return item;
                const matched = byUrl.size > 0 ? byUrl.get(item.link) : imgData.images?.[missingImages.findIndex((m) => m.link === item.link)];
                if (matched) return { ...item, image: matched };
                return item;
              });
              cacheRef.current = { ...cacheRef.current, results: updated };
              try {
                sessionStorage.setItem(cacheKey, JSON.stringify({
                  query: q,
                  results: updated.slice(0, 60),
                  platformResults: platformData.slice(0, 10),
                }));
              } catch {
                // sessionStorage unavailable — in-memory results still work
              }
              return updated;
            });
          })
          .catch(() => {
          // Image enrichment is best-effort; don't retry or surface
        });
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError("Network error - please try again");
    } finally {
      setLoading(false);
    }
  }, [query, selectedPlatforms, getAuthHeaders, saveRecentSearch, trackSearch, user, router, searchParams, availablePlatforms]);

  const initialSearchDone = useRef(false);

  // Restore last search results from history on mount
  useEffect(() => {
    if (initialSearchDone.current) return;
    if (searchParams.get("q")) return; // URL query takes priority
    if (history.length === 0) return;

    const lastSearch = history[0];
    if (lastSearch && lastSearch.results.length > 0) {
      initialSearchDone.current = true;
      setQuery(lastSearch.query);
      setResults(lastSearch.results as SearchResult[]);
      setPlatformResults([]);
      setPlatformErrors([]);
      setPlatformTruncated(false);
      setSearched(true);
      if (lastSearch.platforms.length > 0) {
        setSelectedPlatforms(lastSearch.platforms);
      }
    }
  }, [history, searchParams]);

  const lastSearchParam = useRef<string | null>(null);
  useEffect(() => {
    const q = searchParams.get("q");
    if (!q) return;
    if (q === lastSearchParam.current && initialSearchDone.current) return;
    lastSearchParam.current = q;
    initialSearchDone.current = true;
    if (cacheRef.current.query === q && cacheRef.current.results.length > 0) {
      setSearched(true);
      setQuery(q);
      return;
    }
    handleSearch(q);
  }, [searchParams, handleSearch]);

  // Consume the ?compare= names from the dashboard's QuickCompareBar. The
  // products are not loaded yet, so record the request and activate compare
  // mode; the matches are applied below once results resolve.
  useEffect(() => {
    const names = searchParams.getAll("compare") || [];
    if (names.length === 0) return;
    pendingCompareNames.current = { names, applied: false };
    setCompareMode(true);
  }, [searchParams]);

  // Apply the requested compare names against the resolved result set (capped
  // at 4 like the compare bar). Retries on each results change until at least
  // one match lands, so a slow search still hands the products over.
  useEffect(() => {
    const pending = pendingCompareNames.current;
    if (pending.applied || pending.names.length === 0 || results.length === 0) return;
    const ids = pending.names
      .map((name) => matchProductByName(results, name))
      .filter((id): id is string => id !== null)
      .slice(0, 4);
    if (ids.length === 0) return;
    pending.applied = true;
    setSelectedForCompare(ids);
  }, [results]);

  // Apply URL price/margin constraints (?maxPrice=30&minMargin=60) that the
  // dashboard's smart-search chips build, so the promised filter applies.
  useEffect(() => {
    const maxPrice = searchParams.get("maxPrice");
    const minMargin = searchParams.get("minMargin");
    if (!maxPrice && !minMargin) return;
    setFilters((prev) => ({
      ...prev,
      priceMax: maxPrice ? String(maxPrice) : prev.priceMax,
      minMargin: minMargin ? Number(minMargin) : prev.minMargin,
    }));
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
        return [...sorted].sort((a, b) => {
          const pa = a.price;
          const pb = b.price;
          // Missing prices always sort last, regardless of direction
          if (pa == null && pb == null) return 0;
          if (pa == null) return 1;
          if (pb == null) return -1;
          return pa - pb;
        });
      case "price-desc":
        return [...sorted].sort((a, b) => {
          const pa = a.price;
          const pb = b.price;
          if (pa == null && pb == null) return 0;
          if (pa == null) return 1;
          if (pb == null) return -1;
          return pb - pa;
        });
      case "rating":
        return sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      case "reviews":
        return sorted.sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
      case "margin":
        return sorted.sort((a, b) => (b.estimatedMargin ?? 0) - (a.estimatedMargin ?? 0));
      case "golden": {
        const rankOrder: Record<string, number> = { S: 5, A: 4, B: 3, C: 2, D: 1 };
        return sorted.sort((a, b) => (rankOrder[b.goldenRank || "D"] ?? 0) - (rankOrder[a.goldenRank || "D"] ?? 0));
      }
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

  const availableResultPlatforms = useMemo(() => {
    const platformSet = new Set<string>();
    results.forEach((r) => platformSet.add(r.source));
    return Array.from(platformSet);
  }, [results]);

  const filteredResults = useMemo(() => {
    return sortedResults.filter((r) => {
      if (filters.brands.length > 0 && (!r.brand || !filters.brands.includes(r.brand))) return false;
      if (filters.priceMin && (r.price == null || r.price < Number(filters.priceMin))) return false;
      if (filters.priceMax && (r.price == null || r.price > Number(filters.priceMax))) return false;
      if (filters.minRating > 0 && (r.rating == null || r.rating < filters.minRating)) return false;
      if (filters.platformFilter.length > 0 && !filters.platformFilter.includes(r.source)) return false;
      // Enrichment-based filters (Feature 7)
      if (filters.minMargin > 0 && (r.estimatedMargin == null || r.estimatedMargin < filters.minMargin)) return false;
      if (filters.competitionLevel.length > 0) {
        const compScore = r.competitionScore ?? 50;
        const compLevel: "low" | "medium" | "high" = compScore < 40 ? "low" : compScore > 70 ? "high" : "medium";
        if (!filters.competitionLevel.includes(compLevel)) return false;
      }
      if (filters.trendingDirection.length > 0) {
        const phase = r.trendPhase || "growth";
        const dirMap: Record<string, string> = { emerging: "rising", growth: "rising", mature: "stable", declining: "declining" };
        const dir = dirMap[phase] || "stable";
        if (!filters.trendingDirection.includes(dir as "rising" | "stable" | "declining")) return false;
      }
      return true;
    });
  }, [sortedResults, filters]);

  const visibleResults = filteredResults.slice(0, visibleCount);
  const hasMore = filteredResults.length > visibleCount;

  // Compare mode handlers
  const toggleCompareMode = () => {
    setCompareMode(!compareMode);
    if (compareMode) setSelectedForCompare([]);
  };

  const toggleProductSelect = (id: string) => {
    setSelectedForCompare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const getSelectedProducts = () => results.filter((r) => selectedForCompare.includes(r.id));

  // Product selection for Quick AI Actions (independent toggle per card)
  const selectProduct = useCallback((id: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const getSelectedProduct = useCallback(() => {
    // Return the last selected product for Quick Actions
    if (selectedProductIds.length === 0) return null;
    return results.find((r) => r.id === selectedProductIds[selectedProductIds.length - 1]) || null;
  }, [results, selectedProductIds]);

  const handleProductClick = useCallback((product: Record<string, unknown>) => {
    markProductClicked((product.id as string) || (product.title as string));
  }, [markProductClicked]);

  // AI action handler
  const handleAIAction = useCallback((action: string, product: EnrichedProduct) => {
    if (action === "validate") {
      const params = new URLSearchParams();
      if (product.title) params.set("productTitle", product.title);
      if (product.price != null) params.set("currentPrice", String(product.price));
      if (product.image) params.set("productImage", product.image);
      if (product.link) params.set("productUrl", product.link);
      if (product.source) params.set("category", product.source);
      if (product.brand) params.set("brand", product.brand);
      if (product.rating != null) params.set("rating", String(product.rating));
      if (product.reviews != null) params.set("reviews", String(product.reviews));
      if (product.bestPrice != null) params.set("bestPrice", String(product.bestPrice));
      if (product.platforms && product.platforms.length > 0) {
        params.set("platformPrices", JSON.stringify(product.platforms.slice(0, 5)));
      }
      if (product.competitorCount != null) params.set("competitorCount", String(product.competitorCount));
      if (product.estimatedMargin != null) params.set("estimatedMargin", String(product.estimatedMargin));
      if (product.goldenScore != null) params.set("existingGoldenScore", String(product.goldenScore));
      if (product.trendPhase) params.set("trendPhase", product.trendPhase);
      if (product.saturationLevel) params.set("saturationLevel", product.saturationLevel);
      window.open(`/product-validation?${params.toString()}`, "_blank");
      return;
    }
    const prompts: Record<string, string> = {
      analyze: `Analyze this product for dropshipping viability: "${product.title}" priced at $${product.price || "unknown"} on ${product.source}. Check market demand, competition, profit potential, and give recommendations.`,
      suppliers: `Find the best suppliers for "${product.title}" - compare pricing, shipping times, and reliability across CJ Dropshipping, AliExpress, and other platforms.`,
      listing: `Generate an optimized product listing for "${product.title}" - include title, description, bullet points, and SEO tags for my dropshipping store.`,
    };
    const prompt = prompts[action] || `Analyze "${product.title}" for my dropshipping store.`;
    window.open(`/ai?q=${encodeURIComponent(prompt)}`, "_blank");
  }, []);

  // AI Ask handler (Feature 2: local rule-based intent parsing)
  const handleAskAI = useCallback(async (naturalLanguageQuery: string) => {
    try {
      // Use local intent parser for instant structured extraction
      const { parseIntentLocally, buildSearchKeywords, applyIntentToFilters } = await import("@/lib/search/intent-parser");
      const intent = parseIntentLocally(naturalLanguageQuery);
      const searchQ = buildSearchKeywords(intent).join(" ") || naturalLanguageQuery;

      // Apply parsed intent as filters
      const parsedFilters = applyIntentToFilters(intent);
      setFilters((prev) => ({
        ...prev,
        brands: parsedFilters.brands.length > 0 ? parsedFilters.brands : prev.brands,
        priceMin: parsedFilters.priceMin || prev.priceMin,
        priceMax: parsedFilters.priceMax || prev.priceMax,
        minRating: parsedFilters.minRating > 0 ? parsedFilters.minRating : prev.minRating,
        platformFilter: parsedFilters.platformFilter.length > 0 ? parsedFilters.platformFilter : prev.platformFilter,
        trendingDirection: parsedFilters.trendingDirection.length > 0 ? parsedFilters.trendingDirection : prev.trendingDirection,
      }));

      setQuery(searchQ);
      await handleSearch(searchQ, undefined, intent);
    } catch {
      // Fallback to simple regex parsing
      const parsedQuery = naturalLanguageQuery
        .replace(/under\s*\$?\d+/gi, "")
        .replace(/\d+\s*\+?\s*stars?/gi, "")
        .replace(/on\s+(amazon|ebay|aliexpress|walmart|etsy)/gi, "")
        .replace(/trending|popular|best|good|great|high|low|cheap|expensive/gi, "")
        .trim()
        .replace(/\s+/g, " ");
      const searchQ = parsedQuery.length > 3 ? parsedQuery : naturalLanguageQuery;
      setQuery(searchQ);
      await handleSearch(searchQ);
    }
  }, [handleSearch]);

  // Quick action handler
  const handleQuickAction = useCallback(async (prompt: string) => {
    window.open(`/ai?q=${encodeURIComponent(prompt)}`, "_blank");
  }, []);

  // Search Alert handler (Feature 10)
  const handleCreateAlert = useCallback(async (alertData: SearchAlertData) => {
    if (!user) throw new Error("You must be signed in to create an alert");
    const token = await user.getIdToken();
    const res = await safeFetch<{ success?: boolean; alert?: unknown; error?: string }>("/api/search/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(alertData),
    });
    if (!res.alert && res.error) throw new Error(res.error);
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 pb-16 md:pb-24">
      <SearchHeader
        query={query}
        setQuery={setQuery}
        onSearch={(platformsOverride) => handleSearch(undefined, platformsOverride)}
        loading={loading}
        platforms={availablePlatforms}
        selectedPlatforms={selectedPlatforms}
        togglePlatform={togglePlatform}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        recentSearches={recentSearches}
        onRecentClick={(q) => handleSearch(q)}
        onAskAI={handleAskAI}
      />

      {error && (
        <div className="glass rounded-2xl p-4 border border-red-400/20 bg-red-400/5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Search Alert Modal (Feature 10) */}
      {query && (
        <SearchAlertModal
          query={query}
          isOpen={showAlertModal}
          onClose={() => setShowAlertModal(false)}
          onCreateAlert={handleCreateAlert}
        />
      )}

      {showFilters && searched && results.length > 0 && (
        <FilterPanel
          filters={filters}
          setFilters={setFilters}
          availableBrands={availableBrands}
          resultCount={results.length}
          filteredCount={filteredResults.length}
          availablePlatforms={availableResultPlatforms}
        />
      )}

      {/* Compare mode counter */}
      {compareMode && selectedForCompare.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {selectedForCompare.length}/4 selected
          </span>
        </div>
      )}

      {/* Compare panel */}
      {compareMode && selectedForCompare.length > 0 && (
        <ComparePanel
          selectedProducts={getSelectedProducts()}
          onRemove={toggleProductSelect}
          onClearAll={() => setSelectedForCompare([])}
          onAICompare={(products) => {
            const prompt = `Compare these products for dropshipping: ${products.map((p) => `"${p.title}" ($${p.price || "N/A"} on ${p.source})`).join(", ")}. Which is the best to sell and why?`;
            window.open(`/ai?q=${encodeURIComponent(prompt)}`, "_blank");
          }}
        />
      )}

      {/* Platform progress */}
      {loading && platformProgress.platforms.length > 0 && (
        <PlatformProgress platforms={platformProgress.platforms} />
      )}

      {/* Incomplete results warning — some platforms didn't respond, so the
          list may be missing products; shown after loading completes. */}
      {!loading && platformTruncated && platformProgress.platforms.length > 0 && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs"
        >
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">
            Some platforms didn&apos;t respond — results may be incomplete.
          </span>
        </div>
      )}

      {!loading && searched && (
        <ResultsHeader
          resultCount={filteredResults.length}
          platformCount={platformResults.length}
          sortBy={sortBy}
          setSortBy={setSortBy}
          viewMode={viewMode}
          setViewMode={setViewMode}
        />
      )}

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

      {/* Quick action chips */}
      {!loading && searched && results.length > 0 && (
        <QuickActionChips
          query={query}
          onAction={handleQuickAction}
          hasResults={results.length > 0}
          compareMode={compareMode}
          toggleCompareMode={toggleCompareMode}
          onCreateAlert={() => setShowAlertModal(true)}
          selectedProduct={getSelectedProduct()}
        />
      )}

      {!loading && searched && results.length > 0 && (
        <>
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleResults.map((product, i) => (
                <EnrichedProductCard
                  key={`${product.id}-${i}`}
                  product={product}
                  index={i}
                  compareMode={compareMode}
                  selected={selectedForCompare.includes(product.id)}
                  onToggleSelect={toggleProductSelect}
                  onAIAction={handleAIAction}
                  onProductClick={handleProductClick}
                  selectedForActions={selectedProductIds.includes(product.id)}
                  onSelectForActions={selectProduct}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {visibleResults.map((product, i) => (
                <ListItemCard
                  key={`${product.id}-${i}`}
                  product={product}
                  index={i}
                  onProductClick={handleProductClick}
                  selectedForActions={selectedProductIds.includes(product.id)}
                  onSelectForActions={selectProduct}
                />
              ))}
            </div>
          )}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={() => setVisibleCount((c) => Math.min(filteredResults.length, c + PAGE_SIZE))}
                className="text-xs px-5 py-2.5 rounded-xl bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
              >
                Load more ({filteredResults.length - visibleCount} remaining)
              </button>
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
            onClick={() => setFilters({
              brands: [], priceMin: "", priceMax: "", minRating: 0,
              minMargin: 0, competitionLevel: [], trendingDirection: [], platformFilter: [],
            })}
            className="text-xs px-4 py-2 rounded-lg bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <EmptyState onAskAI={handleAskAI} />
      )}

      {!loading && !searched && history.length === 0 && (
        <>
          <div className="flex items-center gap-2 mb-2 pt-2">
            <div className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
            <span className="text-sm font-semibold text-foreground">Discovery</span>
          </div>
          <PersonalizedRecommendations />
          <AICollections />
          <TrendingSection />
          <NichesSection />
          <CategoriesSection />
          <HowItWorksSection />
        </>
      )}

      {/* Back to top button */}
      <BackToTop />
    </div>
  );
}
