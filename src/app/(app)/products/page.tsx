"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search, Globe, Loader2, Compass, Zap, ArrowRight,
  Flame, TrendingUp, Sparkles, ShoppingCart,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import {
  trendingSearchProducts, productCategories, nicheQuickCards,
} from "@/lib/mock-products";
import SearchHeader from "@/components/products/SearchHeader";
import TrendingProductCard from "@/components/products/TrendingProductCard";
import CategoryCard from "@/components/products/CategoryCard";
import NicheQuickCard from "@/components/products/NicheQuickCard";
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
      ? rawImages.map(String).filter((u) => u && u !== "null" && u !== "")
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
  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent-warm" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Trending Right Now</h3>
            <p className="text-[10px] text-muted-foreground">AI-ranked products with highest profit potential</p>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent-warm/10 text-accent-warm font-medium animate-pulse-badge">
            {trendingSearchProducts.length} hot
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {trendingSearchProducts.map((product, i) => (
          <TrendingProductCard key={product.id} product={product} index={i} rank={i + 1} />
        ))}
      </div>
    </div>
  );
}

function NichesSection({ viewMode }: { viewMode: "grid" | "list" }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-400" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Popular Niches</h3>
            <p className="text-[10px] text-muted-foreground">Click a niche to search across all platforms</p>
          </div>
        </div>
        <Link href="/products/niches" className="text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1">
          View all <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {nicheQuickCards.map((niche, i) => (
            <NicheQuickCard key={niche.name} niche={niche} index={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {nicheQuickCards.map((niche, i) => (
            <a key={niche.name} href={`/products?q=${encodeURIComponent(niche.query)}`} className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all group">
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0">
                <img src={niche.image} alt={niche.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors truncate">{niche.name}</h4>
                <span className="text-[10px] text-muted-foreground">{niche.productCount} products</span>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">{niche.avgPrice}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent shrink-0" />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoriesSection({ viewMode }: { viewMode: "grid" | "list" }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-cyan-400" />
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground">Browse by Category</h3>
            <p className="text-[10px] text-muted-foreground">Explore products across popular categories</p>
          </div>
        </div>
      </div>
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {productCategories.map((category, i) => (
            <CategoryCard key={category.id} category={category} index={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {productCategories.map((category, i) => (
            <a key={category.id} href={`/products?q=${encodeURIComponent(category.name)}`} className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all group">
              <div className="w-12 h-12 rounded-lg overflow-hidden border border-border shrink-0">
                <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{category.name}</h4>
                <span className="text-[10px] text-muted-foreground">{category.productCount.toLocaleString()} products</span>
              </div>
              <span className="text-[10px] text-muted-foreground shrink-0">~{category.avgMargin}% margin</span>
              {category.trending && (
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent-warm/10 text-accent-warm border border-accent-warm/20 shrink-0">Hot</span>
              )}
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent shrink-0" />
            </a>
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
      if (Array.isArray(stored)) setRecentSearches(stored);
    } catch {}
  }, []);

  const allPlatforms = ["amazon", "ebay", "aliexpress", "cj", "google_shopping"];

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const saveRecentSearch = (q: string) => {
    const updated = [q, ...recentSearches.filter((s) => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("recentSearches", JSON.stringify(updated));
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
          <NichesSection viewMode={viewMode} />
          <CategoriesSection viewMode={viewMode} />
          <HowItWorksSection />
        </>
      )}
    </div>
  );
}
