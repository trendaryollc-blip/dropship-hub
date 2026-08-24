"use client";

import { Search, X, Globe, Loader2, SlidersHorizontal, Clock, ChevronDown, ChevronUp } from "lucide-react";

const platformIcons: Record<string, string> = {
  amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
  cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", walmart: "\ud83c\udfea",
  etsy: "\ud83c\udfa8", temu: "\ud83d\udce8", shein: "\ud83d\udc57",
  banggood: "\ud83d\udcb0", dhgate: "\ud83d\udce2", alibaba: "\ud83c\udf10",
};

const platformLabels: Record<string, string> = {
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
};

export default function SearchHeader({
  query, setQuery, onSearch, loading, allPlatforms, selectedPlatforms,
  togglePlatform, showFilters, setShowFilters, recentSearches, onRecentClick,
}: {
  query: string;
  setQuery: (q: string) => void;
  onSearch: () => void;
  loading: boolean;
  allPlatforms: string[];
  selectedPlatforms: string[];
  togglePlatform: (p: string) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  recentSearches: string[];
  onRecentClick: (q: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2">
          Product Search
        </h1>
        <p className="text-muted-foreground">
          Search real products across {allPlatforms.length}+ platforms
        </p>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="mb-4">
          <span className="text-xs text-muted-foreground mb-2 block">Platforms:</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {allPlatforms.map((p) => (
              <button
                key={p}
                onClick={() => togglePlatform(p)}
                className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all h-11 ${
                  selectedPlatforms.includes(p) || selectedPlatforms.length === 0
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{platformIcons[p]}</span>
                {platformLabels[p] || p}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSearch()}
              placeholder="Search for products across all platforms..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm"
            />
            {query && (
              <button
                onClick={() => { setQuery(""); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          <button
            onClick={onSearch}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            Search All
          </button>
        </div>

        {recentSearches.length > 0 && !query && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <Clock className="h-3 w-3 text-muted-foreground/50" />
            {recentSearches.map((s) => (
              <button
                key={s}
                onClick={() => onRecentClick(s)}
                className="text-[11px] px-2.5 py-2 rounded-lg bg-surface/50 border border-border/50 text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all min-h-[36px]"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
