"use client";

import { useState } from "react";
import Link from "next/link";
import { Target, Search, TrendingUp, Loader2, Globe, Package } from "lucide-react";

interface NicheResult {
  title: string;
  price: number | null;
  source: string;
  link: string;
}

const popularNiches = [
  { name: "Smart Home Gadgets", icon: "🏠", query: "smart home gadgets" },
  { name: "Fitness Trackers", icon: "⌚", query: "fitness tracker" },
  { name: "Pet Supplies", icon: "🐕", query: "pet supplies" },
  { name: "Kitchen Tools", icon: "🍳", query: "kitchen gadgets" },
  { name: "Phone Accessories", icon: "📱", query: "phone accessories" },
  { name: "Beauty Products", icon: "💄", query: "beauty products" },
  { name: "Car Accessories", icon: "🚗", query: "car accessories" },
  { name: "Office Supplies", icon: "💼", query: "office supplies" },
];

export default function NichesPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<NicheResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [activeNiche, setActiveNiche] = useState<string | null>(null);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setResults([]);
    setQuery(searchQuery);

    try {
      const res = await fetch("/api/platforms/search-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim(), platforms: ["amazon", "ebay", "google_shopping"] }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }

      const allResults: NicheResult[] = [];
      (data.platforms || []).forEach((p: { platform: string; data: unknown }) => {
        const sourceData = p.data as Record<string, unknown>;
        const items = (sourceData?.search_results as unknown[]) ?? (sourceData?.data as unknown[]) ?? [];
        if (Array.isArray(items)) {
          items.forEach((item, i) => {
            const product = item as Record<string, unknown>;
            allResults.push({
              title: String(product.title || "Product"),
              price: typeof product.price === "number" ? product.price : typeof product.extracted_price === "number" ? product.extracted_price : null,
              source: p.platform,
              link: String(product.link || "#"),
            });
          });
        }
      });

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
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Target className="h-7 w-7 text-accent" /> Niche Explorer
        </h1>
        <p className="text-muted-foreground">Discover trending niches and find real products to sell.</p>
      </div>

      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch(query)}
              placeholder="Search a niche or product category..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm"
            />
          </div>
          <button
            onClick={() => handleSearch(query)}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            Explore
          </button>
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-foreground mb-3">Popular Niches</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {popularNiches.map((niche) => (
            <button
              key={niche.name}
              onClick={() => { setActiveNiche(niche.name); handleSearch(niche.query); }}
              className={`p-4 rounded-xl border text-left transition-all ${
                activeNiche === niche.name
                  ? "bg-accent/10 border-accent/20"
                  : "bg-surface/50 border-border hover:border-accent/20"
              }`}
            >
              <span className="text-2xl mb-2 block">{niche.icon}</span>
              <h4 className="text-sm font-medium text-foreground">{niche.name}</h4>
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 mb-6 border border-red-400/20 bg-red-400/5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <Package className="h-3.5 w-3.5" />
            {results.length} products found in this niche
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {results.map((product, i) => (
              <a
                key={i}
                href={product.link}
                target="_blank"
                rel="noopener noreferrer"
                className="glass rounded-2xl border border-border overflow-hidden hover:border-accent/30 transition-all group"
              >
                <div className="p-4 space-y-2">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">{product.source}</span>
                  <h3 className="font-medium text-sm text-foreground line-clamp-2 group-hover:text-accent transition-colors">
                    {product.title}
                  </h3>
                  <div>
                    {product.price != null ? (
                      <span className="text-lg font-bold text-accent">${product.price.toFixed(2)}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Price N/A</span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}

      {loading && (
        <div className="glass rounded-2xl p-8 md:p-8 md:p-16 text-center">
          <Loader2 className="h-12 w-12 text-accent mx-auto mb-4 animate-spin" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Exploring Niche...</h3>
          <p className="text-sm text-muted-foreground">Fetching products from multiple platforms</p>
        </div>
      )}

      {!searched && !loading && (
        <div className="glass rounded-2xl p-8 md:p-8 md:p-16 text-center">
          <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Explore a Niche</h3>
          <p className="text-sm text-muted-foreground">Click a popular niche above or search for a product category</p>
        </div>
      )}
    </div>
  );
}
