"use client";

import { useState } from "react";
import {
  Search, Globe, DollarSign, Package, Loader2, ExternalLink,
} from "lucide-react";

interface CompetitorResult {
  title: string;
  price: number | null;
  source: string;
  link: string;
}

export default function CompetitorsPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompetitorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setResults([]);

    try {
      const res = await fetch("/api/platforms/google-shopping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Search failed");
        return;
      }

      const items = data.data?.search_results || [];
      const mapped: CompetitorResult[] = items.map((item: Record<string, unknown>) => ({
        title: String(item.title || "Product"),
        price: typeof item.price === "number" ? item.price : null,
        source: String(item.source || "Unknown"),
        link: String(item.link || "#"),
      }));

      setResults(mapped);
    } catch {
      setError("Network error - please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Search className="h-7 w-7 text-accent" /> Competitor Price Research
        </h1>
        <p className="text-muted-foreground">Search Google Shopping to see what competitors are charging for products.</p>
      </div>

      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search for a product to see competitor prices..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            Research
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 mb-6 border border-red-400/20 bg-red-400/5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="flex flex-wrap items-center gap-4 md:gap-6 mb-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Package className="h-3.5 w-3.5" />
              {results.length} competitor listings found
            </span>
            <span className="flex items-center gap-1.5">
              <DollarSign className="h-3.5 w-3.5" />
              Avg: ${results.filter((r) => r.price != null).length > 0 ? (results.filter((r) => r.price != null).reduce((sum, r) => sum + (r.price || 0), 0) / results.filter((r) => r.price != null).length).toFixed(2) : "N/A"}
            </span>
          </div>

          <div className="space-y-3">
            {results.map((item, i) => (
              <a
                key={i}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="glass rounded-xl p-4 border border-border hover:border-accent/30 transition-all flex items-center gap-4 group"
              >
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-foreground line-clamp-1 group-hover:text-accent transition-colors">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Globe className="h-3 w-3" /> {item.source}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {item.price != null ? (
                    <span className="text-lg font-bold text-accent">${item.price.toFixed(2)}</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">N/A</span>
                  )}
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-accent transition-colors shrink-0" />
              </a>
            ))}
          </div>
        </>
      )}

      {loading && (
        <div className="glass rounded-2xl p-8 md:p-16 text-center">
          <Loader2 className="h-12 w-12 text-accent mx-auto mb-4 animate-spin" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Researching...</h3>
          <p className="text-sm text-muted-foreground">Fetching competitor prices from Google Shopping</p>
        </div>
      )}

      {!loading && searched && results.length === 0 && !error && (
        <div className="glass rounded-2xl p-8 md:p-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No results found</h3>
          <p className="text-sm text-muted-foreground">Try a different product search</p>
        </div>
      )}

      {!searched && !loading && (
        <div className="glass rounded-2xl p-8 md:p-16 text-center">
          <Globe className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Research Competitor Prices</h3>
          <p className="text-sm text-muted-foreground">Search Google Shopping to see real competitor pricing data</p>
        </div>
      )}
    </div>
  );
}
