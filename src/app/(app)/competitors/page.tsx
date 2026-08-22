"use client";

import { useState, useCallback } from "react";
import { Search, Globe, Loader2, Crosshair, BookmarkPlus, RotateCcw } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { generateMarketData, type MarketData } from "@/lib/mock-competitors";
import MarketStatsBar from "@/components/competitors/MarketStatsBar";
import PriceDistribution from "@/components/competitors/PriceDistribution";
import PlatformBreakdown from "@/components/competitors/PlatformBreakdown";
import OpportunityFinder from "@/components/competitors/OpportunityFinder";
import PricingStrategy from "@/components/competitors/PricingStrategy";
import CompetitorProfiles from "@/components/competitors/CompetitorProfiles";
import PriceHistory from "@/components/competitors/PriceHistory";
import InsightsPanel from "@/components/competitors/InsightsPanel";

const savedSearches = [
  { query: "wireless earbuds", date: "2 hours ago", results: 47 },
  { query: "phone case iphone 15", date: "Yesterday", results: 83 },
  { query: "usb c hub adapter", date: "3 days ago", results: 31 },
];

export default function CompetitorsPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.1 });

  const handleSearch = useCallback(async (q?: string) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setLoading(true);
    setMarketData(null);
    await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
    const data = generateMarketData(searchQuery.trim());
    setMarketData(data);
    setSearchHistory((prev) => [searchQuery.trim(), ...prev.filter((h) => h !== searchQuery.trim()).slice(0, 9)]);
    setLoading(false);
  }, [query]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Hero */}
      <div ref={heroRef} className={`mb-8 transition-all duration-700 ${heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
            <Crosshair className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Competitor Intelligence</h1>
            <p className="text-sm text-muted-foreground">Real-time market analysis across 50+ platforms</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className={`glass rounded-2xl p-5 mb-6 border border-border transition-all duration-700 delay-100 ${heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search any product to analyze the competitive landscape..."
              className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm"
            />
          </div>
          <button
            onClick={() => handleSearch()}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-white text-sm font-semibold hover:from-accent/90 hover:to-accent/70 transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            Analyze Market
          </button>
        </div>

        {/* Quick Access */}
        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><BookmarkPlus className="h-3 w-3" /> Saved:</span>
          {savedSearches.map((s) => (
            <button key={s.query} onClick={() => { setQuery(s.query); handleSearch(s.query); }} className="hover:text-accent transition-colors truncate max-w-[140px]">{s.query}</button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass rounded-2xl p-6 sm:p-12 text-center border border-border">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <Loader2 className="h-16 w-16 text-accent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Crosshair className="h-6 w-6 text-accent" />
            </div>
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Scanning 50+ Platforms...</h3>
          <p className="text-sm text-muted-foreground">Analyzing competitor prices, sellers, and market trends</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["Google Shopping", "Amazon", "eBay", "Walmart"].map((p, i) => (
              <span key={p} className="text-[10px] text-accent/70 bg-accent/5 px-2 py-1 rounded-full border border-accent/10" style={{ animationDelay: `${i * 200}ms` }}>{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {marketData && !loading && (
        <div className="space-y-6">
          <MarketStatsBar data={marketData} />
          <PriceDistribution tiers={marketData.priceDistribution} avgPrice={marketData.avgPrice} />
          <PriceHistory data={marketData.priceHistory} />
          <PlatformBreakdown platforms={marketData.platforms} />
          <OpportunityFinder opportunities={marketData.opportunities} />
          <PricingStrategy options={marketData.pricingOptions} />
          <CompetitorProfiles sellers={marketData.topSellers} />
          <InsightsPanel insights={marketData.insights} />
        </div>
      )}

      {/* Empty State */}
      {!marketData && !loading && (
        <div className="glass rounded-2xl p-6 sm:p-12 text-center border border-border">
          <div className="w-20 h-20 rounded-2xl bg-accent/5 flex items-center justify-center mx-auto mb-5 border border-accent/10">
            <Crosshair className="h-10 w-10 text-accent/40" />
          </div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-foreground mb-2">Ready to Spy on Competitors</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Enter any product to get a complete competitive analysis: pricing intelligence, platform breakdown, opportunity finder, and AI-powered pricing strategy.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {["wireless earbuds", "phone case", "usb hub", "laptop stand", "ring light"].map((s) => (
              <button key={s} onClick={() => { setQuery(s); handleSearch(s); }} className="text-xs text-muted-foreground bg-surface hover:bg-surface/80 hover:text-accent px-3 py-1.5 rounded-full border border-border hover:border-accent/20 transition-all">
                {s}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
