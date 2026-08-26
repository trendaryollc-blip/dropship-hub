"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search, Loader2, Compass, Zap, ArrowRight,
  Flame, TrendingUp, Sparkles, ShoppingCart, Package,
} from "lucide-react";
import Image from "next/image";
import { useInView } from "@/hooks/useInView";
import SearchHeader from "@/components/products/SearchHeader";
import ViewToggle from "@/components/ui/ViewToggle";
import EnrichedProductCard from "@/components/products/EnrichedProductCard";
import ListItemCard from "@/components/products/ListItemCard";
import ResultsHeader from "@/components/products/ResultsHeader";

interface SearchResult {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
  images?: string[];
  link: string;
  source: string;
  rating?: number;
  reviews?: number;
}

interface PlatformResult {
  platform: string;
  name: string;
  resultCount: number;
  data: unknown;
}

interface TrendingProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  sellPrice: number;
  profit: number;
  margin: number;
  platform: string;
  trend: number;
  sparkline: number[];
  confidence: number;
  demandLevel: "low" | "medium" | "high";
  competitionLevel: "low" | "medium" | "high";
  image: string;
  tags: string[];
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
    const product = item as Record<string, unknown>;
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

    results.push({
      id: `${platform}-${i}`,
      title: String(product.title || product.productName || product.name || "Product"),
      price,
      image: String(product.image || product.thumbnail || product.imageUrl || product.productImage || "") || null,
      images: imagesArray && imagesArray.length > 0 ? imagesArray : undefined,
      link: String(product.link || product.itemWebUrl || product.url || product.product_link || "#"),
      source: platform,
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
  const [products, setProducts] = useState<TrendingProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products/trending")
      .then((r) => r.json())
      .then((data) => { if (data.products) setProducts(data.products); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const demandConfig: Record<string, { label: string; cls: string }> = {
    low: { label: "Low demand", cls: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
    medium: { label: "Med demand", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
    high: { label: "High demand", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  };
  const compConfig: Record<string, { label: string; cls: string }> = {
    low: { label: "Low comp", cls: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
    medium: { label: "Med comp", cls: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
    high: { label: "High comp", cls: "text-red-400 bg-red-400/10 border-red-400/20" },
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
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-surface" />
                <div className="w-11 h-11 rounded-xl bg-surface" />
                <div className="flex-1 space-y-2"><div className="h-4 bg-surface rounded w-1/3" /><div className="h-3 bg-surface rounded w-1/4" /></div>
                <div className="h-6 w-16 bg-surface rounded" />
              </div>
            </div>
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
        <div className="space-y-3">
          {products.map((product, i) => {
            const demand = demandConfig[product.demandLevel];
            const comp = compConfig[product.competitionLevel];
            const rankBg = rankGradients[Math.min(i, rankGradients.length - 1)];
            return (
              <div key={product.id} className={`transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${i * 80}ms` }}>
                <Link href={`/products?q=${encodeURIComponent(product.name)}`} className="glass-card-animated rounded-2xl overflow-hidden block hover:bg-surface/30 transition-colors p-4 sm:p-5">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${rankBg} flex items-center justify-center shrink-0 shadow-lg`}>
                      <span className="text-xs font-black text-white">#{i + 1}</span>
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {product.image ? (
                        <Image src={product.image} alt={product.name} width={44} height={44} unoptimized className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5 text-accent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{product.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        <span className="text-[10px] text-muted-foreground">{product.platform}</span>
                        {demand && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${demand.cls}`}>{demand.label}</span>}
                        {comp && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium border ${comp.cls}`}>{comp.label}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-400">${product.profit.toFixed(2)}</p>
                      <p className="text-[10px] text-muted-foreground">margin {product.margin}%</p>
                    </div>
                    <div className="text-right shrink-0 hidden sm:block">
                      <span className="text-xs font-bold text-emerald-400">+{product.trend}%</span>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
                        <TrendingUp className="h-2.5 w-2.5" /> trending
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 shrink-0" />
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

function NichesSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [niches, setNiches] = useState<NicheData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/niches")
      .then((r) => r.json())
      .then((data) => { if (data.niches) setNiches(data.niches.slice(0, 8)); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
                  <div className="relative h-28 overflow-hidden bg-gradient-to-br from-surface to-muted/20 flex items-center justify-center">
                    <span className="text-4xl opacity-20 group-hover:opacity-40 transition-opacity">{niche.icon}</span>
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
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/products/categories")
      .then((r) => r.json())
      .then((data) => { if (data.categories) setCategories(data.categories); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

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
                <div className="relative h-32 overflow-hidden bg-gradient-to-br from-surface to-muted/20 flex items-center justify-center">
                  <span className="text-5xl opacity-20 group-hover:opacity-40 transition-opacity">{cat.icon}</span>
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
    <Suspense fallback={<div className="max-w-7xl mx-auto p-4 md:p-8 text-center text-muted-foreground">Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [platformResults, setPlatformResults] = useState<PlatformResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<"relevance" | "price-asc" | "price-desc" | "rating" | "reviews">("relevance");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("recentSearches") || "[]");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR-safe localStorage hydration
      if (Array.isArray(stored)) setRecentSearches(stored);
    } catch {}
  }, []);

  const saveRecentSearch = (q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (searchParams.get("q")) {
      const q = searchParams.get("q")!;
      setQuery(q);
      setLoading(true);
      setError(null);
      setResults([]);
      setPlatformResults([]);
      setSearched(true);
      saveRecentSearch(q);

      fetch("/api/platforms/search-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            setError(data.error);
            return;
          }
          const allResults: SearchResult[] = [];
          const platforms: PlatformResult[] = data.platforms || [];
          platforms.forEach((p: PlatformResult) => {
            allResults.push(...normalizeResults(p.platform, p.data));
          });
          setPlatformResults(platforms);
          setResults(allResults);
        })
        .catch(() => setError("Network error - please try again"))
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const allPlatforms = ["amazon", "ebay", "aliexpress", "cj", "google_shopping", "walmart", "etsy", "temu", "shein", "banggood", "dhgate", "alibaba"];

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSearch = async (searchQuery?: string) => {
    const q = (searchQuery || query).trim();
    if (!q) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setPlatformResults([]);
    setSearched(true);
    setQuery(q);
    saveRecentSearch(q);

    try {
      const res = await fetch("/api/platforms/search-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: q,
          platforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }
      const allResults: SearchResult[] = [];
      const platforms: PlatformResult[] = data.platforms || [];
      platforms.forEach((p: PlatformResult) => {
        allResults.push(...normalizeResults(p.platform, p.data));
      });
      setPlatformResults(platforms);
      setResults(allResults);
    } catch {
      setError("Network error - please try again");
    } finally {
      setLoading(false);
    }
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

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-16 md:pb-24">
      <SearchHeader
        query={query}
        setQuery={setQuery}
        onSearch={() => handleSearch()}
        loading={loading}
        allPlatforms={allPlatforms}
        selectedPlatforms={selectedPlatforms}
        togglePlatform={togglePlatform}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
        recentSearches={recentSearches}
        onRecentClick={(q) => handleSearch(q)}
      />

      {error && (
        <div className="glass rounded-2xl p-4 border border-red-400/20 bg-red-400/5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {loading && (
        <div className="glass rounded-2xl p-6 md:p-8 lg:p-16 text-center">
          <Loader2 className="h-12 w-12 text-accent mx-auto mb-4 animate-spin" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Searching...</h3>
          <p className="text-sm text-muted-foreground">Fetching products from multiple platforms</p>
        </div>
      )}

      {!loading && searched && results.length > 0 && (
        <>
          <ResultsHeader
            resultCount={results.length}
            platformCount={platformResults.length}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {sortedResults.map((product, i) => (
                <EnrichedProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedResults.map((product, i) => (
                <ListItemCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}
        </>
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
