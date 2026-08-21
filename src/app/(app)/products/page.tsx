"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, X, Globe, Loader2, Package, BarChart3 } from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  price: number | null;
  image: string | null;
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

const platformIcons: Record<string, string> = {
  amazon: "📦",
  ebay: "🏷️",
  aliexpress: "🇨🇳",
  cj: "🚚",
  google_shopping: "🔍",
  keepa: "📊",
  walmart: "🏪",
  temu: "🔥",
  shein: "👗",
  etsy: "🎨",
  alibaba: "🏭",
  banggood: "⚡",
  dhgate: "🔗",
};

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

    results.push({
      id: `${platform}-${i}`,
      title: String(product.title || product.productName || product.name || "Product"),
      price,
      image: String(product.image || product.thumbnail || product.imageUrl || product.productImage || ""),
      link: String(product.link || product.itemWebUrl || product.url || product.product_link || "#"),
      source: platform,
      rating: typeof product.rating === "number" ? product.rating : undefined,
      reviews: typeof product.reviews === "number" ? product.reviews : typeof product.total_ratings === "number" ? product.total_ratings : undefined,
    });
  });

  return results;
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
  const [results, setResults] = useState<SearchResult[]>([]);
  const [platformResults, setPlatformResults] = useState<PlatformResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);

  const allPlatforms = ["amazon", "ebay", "aliexpress", "cj", "google_shopping"];

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResults([]);
    setPlatformResults([]);
    setSearched(true);

    try {
      const res = await fetch("/api/platforms/search-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: query.trim(),
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

      platforms.forEach((p) => {
        const normalized = normalizeResults(p.platform, p.data);
        allResults.push(...normalized);
      });

      setPlatformResults(platforms);
      setResults(allResults);
    } catch {
      setError("Network error - please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
          Product Search
        </h1>
        <p className="text-muted-foreground">
          Search real products across {allPlatforms.length}+ platforms
        </p>
      </div>

      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-muted-foreground mr-2">Platforms:</span>
          {allPlatforms.map((p) => (
            <button
              key={p}
              onClick={() => togglePlatform(p)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedPlatforms.includes(p) || selectedPlatforms.length === 0
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "bg-surface border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{platformIcons[p]}</span>
              {p === "google_shopping" ? "Google Shopping" : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search for products across all platforms..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm"
            />
            {query && (
              <button onClick={() => { setQuery(""); setResults([]); setSearched(false); setPlatformResults([]); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            Search All
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 mb-6 border border-red-400/20 bg-red-400/5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {platformResults.length > 0 && (
        <div className="glass rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Results by Platform</h3>
          <div className="flex flex-wrap gap-2">
            {platformResults.map((p) => (
              <span key={p.platform} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs">
                <span>{platformIcons[p.platform] || "🔗"}</span>
                <span className="text-foreground font-medium">{p.name}</span>
                <span className="text-muted-foreground">({p.resultCount})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="flex items-center gap-6 mb-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            {results.length} products found
          </span>
          <span className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5" />
            {platformResults.length} platforms searched
          </span>
        </div>
      )}

      {results.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {results.map((product) => (
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
                <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-medium backdrop-blur-sm flex items-center gap-1">
                  {platformIcons[product.source] || "🔗"} {product.source}
                </span>
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
                    <span className="text-xs text-muted-foreground">
                      ★ {product.rating.toFixed(1)} {product.reviews != null ? `(${product.reviews})` : ""}
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      ) : !loading && !error && searched ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No products found</h3>
          <p className="text-sm text-muted-foreground">Try a different search query or enable more platforms</p>
        </div>
      ) : !loading && !searched ? (
        <div className="glass rounded-2xl p-16 text-center">
          <Globe className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Search Real Products</h3>
          <p className="text-sm text-muted-foreground">Enter a search query to find products across Amazon, eBay, AliExpress, and more</p>
        </div>
      ) : null}

      {loading && (
        <div className="glass rounded-2xl p-16 text-center">
          <Loader2 className="h-12 w-12 text-accent mx-auto mb-4 animate-spin" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Searching...</h3>
          <p className="text-sm text-muted-foreground">Fetching products from multiple platforms</p>
        </div>
      )}
    </div>
  );
}
