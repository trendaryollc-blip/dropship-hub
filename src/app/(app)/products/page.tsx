"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { mockProducts } from "@/lib/mock-data";
import ProductCard from "@/components/dashboard/ProductCard";
import { Search, SlidersHorizontal, X, TrendingUp, DollarSign, Shield, BarChart3, Globe, Loader2, Package, Store, ShoppingCart } from "lucide-react";

const categories = ["All", "Electronics", "Home & Kitchen", "Health & Wellness", "Kitchen", "Automotive", "Pet Supplies", "Fashion", "Sports & Outdoors"];
const sortOptions = ["Recommended", "Price: Low to High", "Price: High to Low", "Rating", "Reviews", "Risk: Low to High"];
const profitFilters = ["All", "High Profit", "Medium Profit", "Low Profit"];
const trendFilters = ["All", "Rising", "Stable", "Declining"];

interface LiveProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  link: string;
  source: string;
  rating?: number;
  reviews?: number;
}

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto p-8 text-center text-muted-foreground">Loading...</div>}>
      <ProductsContent />
    </Suspense>
  );
}

function ProductsContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("Recommended");
  const [profitFilter, setProfitFilter] = useState("All");
  const [trendFilter, setTrendFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<"local" | "live">("local");
  const [livePlatform, setLivePlatform] = useState<"aliexpress" | "cj" | "rainforest">("aliexpress");
  const [liveResults, setLiveResults] = useState<LiveProduct[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let results = [...mockProducts];

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.tags.some((t) => t.includes(q))
      );
    }

    if (category !== "All") {
      results = results.filter((p) => p.category === category);
    }

    if (profitFilter !== "All") {
      const pf = profitFilter === "High Profit" ? "high" : profitFilter === "Medium Profit" ? "medium" : "low";
      results = results.filter((p) => p.profitPotential === pf);
    }

    if (trendFilter !== "All") {
      results = results.filter((p) => p.marketTrend === trendFilter.toLowerCase());
    }

    switch (sortBy) {
      case "Price: Low to High":
        results.sort((a, b) => Math.min(...a.platformPrices.map((p) => p.price)) - Math.min(...b.platformPrices.map((p) => p.price)));
        break;
      case "Price: High to Low":
        results.sort((a, b) => Math.min(...b.platformPrices.map((p) => p.price)) - Math.min(...a.platformPrices.map((p) => p.price)));
        break;
      case "Rating":
        results.sort((a, b) => b.averageRating - a.averageRating);
        break;
      case "Reviews":
        results.sort((a, b) => b.totalReviews - a.totalReviews);
        break;
      case "Risk: Low to High":
        results.sort((a, b) => a.riskScore - b.riskScore);
        break;
      default:
        results.sort((a, b) => (b.trending ? 1 : 0) - (a.trending ? 1 : 0));
    }

    return results;
  }, [query, category, sortBy, profitFilter, trendFilter]);

  const searchLive = async () => {
    if (!query.trim()) return;
    setLiveLoading(true);
    setLiveError(null);
    setLiveResults([]);

    try {
      const res = await fetch(`/api/platforms/${livePlatform}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setLiveError(data.error || "Search failed");
        return;
      }

      // Normalize results from different sources
      let products: LiveProduct[] = [];

      if (livePlatform === "rainforest" && data.data?.search_results) {
        products = data.data.search_results.map((item: Record<string, unknown>, i: number) => ({
          id: `rf-${i}`,
          title: (item.title as string) || "Untitled",
          price: (item.price as number) || 0,
          image: (item.image as string) || "",
          link: (item.link as string) || "#",
          source: "Amazon",
          rating: item.rating as number | undefined,
          reviews: item.total_ratings as number | undefined,
        }));
      } else if (livePlatform === "cj" && data.data?.data) {
        products = data.data.data.map((item: Record<string, unknown>, i: number) => ({
          id: `cj-${i}`,
          title: (item.productNameEn as string) || "Untitled",
          price: (item.sellPrice as number) || 0,
          image: (item.productImage as string) || "",
          link: `https://cjdropshipping.com/product-detail/${item.pid}`,
          source: "CJ Dropshipping",
          rating: item.productRating as number | undefined,
          reviews: item.totalOrders as number | undefined,
        }));
      } else if (livePlatform === "aliexpress") {
        if (data.data?.search_results) {
          products = data.data.search_results.map((item: Record<string, unknown>, i: number) => ({
            id: `ae-${i}`,
            title: (item.title as string) || "Untitled",
            price: (item.price as number) || 0,
            image: (item.image as string) || "",
            link: (item.link as string) || "#",
            source: "AliExpress",
            rating: item.rating as number | undefined,
            reviews: item.total_ratings as number | undefined,
          }));
        } else if (data.data?.html) {
          setLiveError("Got raw HTML - scraper result needs parsing. Try Amazon or CJ instead.");
          return;
        }
      }

      setLiveResults(products);
    } catch {
      setLiveError("Network error - please try again");
    } finally {
      setLiveLoading(false);
    }
  };

  const activeFilters = [category !== "All" ? category : null, profitFilter !== "All" ? profitFilter : null, trendFilter !== "All" ? trendFilter : null].filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
          Product Search
        </h1>
        <p className="text-muted-foreground">
          Discover winning products across platforms with real-time pricing data.
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 border-b border-border pb-2 mb-6">
        <button
          onClick={() => setActiveTab("local")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "local"
              ? "bg-accent text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Local Catalog
        </button>
        <button
          onClick={() => setActiveTab("live")}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            activeTab === "live"
              ? "bg-accent text-accent"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Live Search
        </button>
      </div>

      {activeTab === "local" && (
        <>
          {/* Search + Filter bar */}
          <div className="glass rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search products, categories, or tags..."
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                  showFilters ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground hover:bg-surface-hover"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilters.length > 0 && (
                  <span className="ml-1 h-5 w-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">
                    {activeFilters.length}
                  </span>
                )}
              </button>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/50 appearance-none cursor-pointer"
              >
                {sortOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            {/* Expanded filters */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-border grid grid-cols-1 sm:grid-cols-3 gap-4 animate-slide-up">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Category</label>
                  <div className="flex flex-wrap gap-1.5">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategory(cat)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          category === cat ? "bg-accent text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Profit Potential</label>
                  <div className="flex flex-wrap gap-1.5">
                    {profitFilters.map((pf) => (
                      <button
                        key={pf}
                        onClick={() => setProfitFilter(pf)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          profitFilter === pf ? "bg-accent text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {pf}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">Market Trend</label>
                  <div className="flex flex-wrap gap-1.5">
                    {trendFilters.map((tf) => (
                      <button
                        key={tf}
                        onClick={() => setTrendFilter(tf)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          trendFilter === tf ? "bg-accent text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Active filter pills */}
            {activeFilters.length > 0 && (
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="text-xs text-muted-foreground">Active:</span>
                {activeFilters.map((f) => (
                  <span key={f} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-medium">
                    {f}
                    <button onClick={() => {
                      if (categories.includes(f!)) setCategory("All");
                      if (profitFilters.includes(f!)) setProfitFilter("All");
                      if (trendFilters.includes(f!)) setTrendFilter("All");
                    }}>
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                <button
                  onClick={() => { setCategory("All"); setProfitFilter("All"); setTrendFilter("All"); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              {filtered.length} products found
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />
              {filtered.filter((p) => p.trending).length} trending
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              {filtered.filter((p) => p.profitPotential === "high").length} high profit
            </span>
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5" />
              {filtered.filter((p) => p.riskScore < 30).length} low risk
            </span>
          </div>

          {/* Product grid */}
          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filtered.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="glass rounded-2xl p-16 text-center">
              <Search className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">No products found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
            </div>
          )}
        </>
      )}

      {activeTab === "live" && (
        <>
          {/* Platform selector + search */}
          <div className="glass rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <button
                onClick={() => setLivePlatform("aliexpress")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  livePlatform === "aliexpress"
                    ? "bg-accent text-accent"
                    : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Store className="h-4 w-4" />
                AliExpress
              </button>
              <button
                onClick={() => setLivePlatform("cj")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  livePlatform === "cj"
                    ? "bg-accent text-accent"
                    : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Package className="h-4 w-4" />
                CJ Dropshipping
              </button>
              <button
                onClick={() => setLivePlatform("rainforest")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  livePlatform === "rainforest"
                    ? "bg-accent text-accent"
                    : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                Amazon
              </button>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchLive()}
                  placeholder={`Search ${livePlatform === "aliexpress" ? "AliExpress" : livePlatform === "cj" ? "CJ Dropshipping" : "Amazon"} products...`}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <button
                onClick={searchLive}
                disabled={liveLoading || !query.trim()}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {liveLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="h-4 w-4" />
                )}
                Search
              </button>
            </div>
          </div>

          {/* Error */}
          {liveError && (
            <div className="glass rounded-2xl p-4 mb-6 border border-red-400/20 bg-red-400/5">
              <p className="text-sm text-red-400">{liveError}</p>
            </div>
          )}

          {/* Results count */}
          {liveResults.length > 0 && (
            <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              {liveResults.length} live products found
            </div>
          )}

          {/* Live product grid */}
          {liveResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {liveResults.map((product) => (
                <a
                  key={product.id}
                  href={product.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="glass rounded-2xl border border-border overflow-hidden hover:border-accent/30 transition-all group"
                >
                  <div className="aspect-square bg-surface relative overflow-hidden">
                    {product.image ? (
                      <img src={product.image} alt={product.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                        <Package className="h-12 w-12" />
                      </div>
                    )}
                    <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm">
                      {product.source}
                    </span>
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                      {product.title}
                    </h3>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-bold text-accent">${product.price.toFixed(2)}</span>
                      {product.rating && (
                        <span className="text-xs text-muted-foreground">
                          ★ {product.rating.toFixed(1)} ({product.reviews || 0})
                        </span>
                      )}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : !liveLoading && !liveError && (
            <div className="glass rounded-2xl p-16 text-center">
              <Globe className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">Search Live Products</h3>
              <p className="text-sm text-muted-foreground">Select a platform and enter a search query to find real products</p>
            </div>
          )}

          {liveLoading && (
            <div className="glass rounded-2xl p-16 text-center">
              <Loader2 className="h-12 w-12 text-accent mx-auto mb-4 animate-spin" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">Searching...</h3>
              <p className="text-sm text-muted-foreground">Fetching products from {livePlatform === "aliexpress" ? "AliExpress" : livePlatform === "cj" ? "CJ Dropshipping" : "Amazon"}</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
