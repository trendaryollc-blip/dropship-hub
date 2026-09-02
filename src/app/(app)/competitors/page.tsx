"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Globe, Loader2, Crosshair, BookmarkPlus } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { type MarketData } from "@/types/competitors";
import { useMutation } from "@/hooks/useAPI";
import MarketStatsBar from "@/components/competitors/MarketStatsBar";
import PriceDistribution from "@/components/competitors/PriceDistribution";
import PlatformBreakdown from "@/components/competitors/PlatformBreakdown";
import OpportunityFinder from "@/components/competitors/OpportunityFinder";
import PricingStrategy from "@/components/competitors/PricingStrategy";
import CompetitorProfiles from "@/components/competitors/CompetitorProfiles";
import PriceHistory from "@/components/competitors/PriceHistory";
import InsightsPanel from "@/components/competitors/InsightsPanel";
import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";

interface RawMarketData {
  platforms: { platform: string; icon: string; avgPrice: number; minPrice: number; maxPrice: number; sellerCount: number; trend: string; trendPercent: number; sparkline: number[]; listings: { id: string; title: string; price: number; source: string; seller: string; sellerRating: number; sellerProducts: number; link: string; shipping: string; condition: string; daysAgo: number }[] }[];
  avgPrice: number;
  priceRange: { min: number; max: number };
  totalListings: number;
  priceDistribution: { range: string; count: number; percent: number; isSweetSpot: boolean }[];
  priceHistory: { date: string; price: number; volume: number }[];
  topSellers: { name: string; platform: string; rating: number; totalProducts: number; price: number; threatLevel: string; isDropshipper: boolean; otherProducts: { name: string; price: number }[]; responseTime: string; returnPolicy: string }[];
  opportunities: { type: string; title: string; description: string; count: number; potentialMargin?: number; actionLabel: string }[];
  pricingOptions: { label: string; icon: string; price: number; margin: number; competition: string; recommendation: string }[];
  insights: string[];
}

function castToMarketData(raw: RawMarketData): MarketData {
  const allPrices = raw.platforms.flatMap((p) => p.listings.map((l) => l.price)).filter((p) => p > 0);
  const sortedPrices = [...allPrices].sort((a, b) => a - b);
  const median = sortedPrices.length > 0
    ? sortedPrices.length % 2 === 0
      ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
      : sortedPrices[Math.floor(sortedPrices.length / 2)]
    : (raw.priceRange.min + raw.priceRange.max) / 2;

  return {
    query: "",
    totalListings: raw.totalListings,
    avgPrice: raw.avgPrice,
    medianPrice: median,
    minPrice: raw.priceRange.min,
    maxPrice: raw.priceRange.max,
    profitZone: { min: raw.priceRange.min, max: raw.avgPrice, label: "Sweet spot" },
    priceDistribution: raw.priceDistribution.map((t) => ({ range: t.range, count: t.count, percent: t.percent, isSweetSpot: t.isSweetSpot })),
    platforms: raw.platforms.map((p) => ({
      platform: p.platform,
      icon: p.icon,
      avgPrice: p.avgPrice,
      minPrice: p.minPrice,
      maxPrice: p.maxPrice,
      sellerCount: p.sellerCount,
      trend: p.trend as "up" | "down" | "stable",
      trendPercent: p.trendPercent,
      sparkline: p.sparkline,
      listings: p.listings.map((l) => ({
        id: l.id,
        title: l.title,
        price: l.price,
        source: l.source,
        seller: l.seller,
        sellerRating: l.sellerRating,
        sellerProducts: l.sellerProducts,
        link: l.link,
        shipping: l.shipping,
        condition: l.condition as "New" | "Used" | "Refurbished",
        daysAgo: l.daysAgo,
      })),
    })),
    topSellers: raw.topSellers.map((s) => ({
      name: s.name,
      platform: s.platform,
      rating: s.rating,
      totalProducts: s.totalProducts,
      price: s.price,
      threatLevel: s.threatLevel as "low" | "medium" | "high",
      isDropshipper: s.isDropshipper,
      otherProducts: s.otherProducts,
      responseTime: s.responseTime,
      returnPolicy: s.returnPolicy,
    })),
    opportunities: raw.opportunities.map((o) => ({
      type: o.type as "opportunity" | "gap" | "avoid",
      title: o.title,
      description: o.description,
      count: o.count,
      potentialMargin: o.potentialMargin,
      actionLabel: o.actionLabel,
    })),
    pricingOptions: raw.pricingOptions.map((o, i) => ({
      label: o.label,
      icon: o.icon,
      price: o.price,
      margin: o.margin,
      description: "",
      tradeoff: o.competition,
      isRecommended: false,
      color: (["blue", "emerald", "purple"] as const)[i % 3],
      competition: o.competition,
      recommendation: o.recommendation,
    })),
    priceHistory: raw.priceHistory.map((h) => ({ date: h.date, avg: h.price, min: h.price * 0.9, max: h.price * 1.1 })),
    insights: raw.insights,
  };
}

const savedSearches = [
  { query: "wireless earbuds", date: "2 hours ago", results: 47 },
  { query: "phone case iphone 15", date: "Yesterday", results: 83 },
  { query: "usb c hub adapter", date: "3 days ago", results: 31 },
];

export default function CompetitorsPage() {
  return (
    <PageErrorBoundary>
      <Suspense fallback={
        <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
          <div className="flex h-8 w-8 items-center justify-center">
            <Loader2 className="h-8 w-8 text-accent animate-spin" />
          </div>
        </div>
      }>
        <CompetitorsContent />
      </Suspense>
    </PageErrorBoundary>
  );
}

function CompetitorsContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [selectedPlatforms] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { ref: heroRef, isInView: heroInView } = useInView({ threshold: 0.1 });

  const { trigger, data: rawData, isMutating } = useMutation("/api/competitors");

  const raw = rawData as (RawMarketData & { error?: string }) | undefined;
  const marketData = raw && !raw.error ? castToMarketData(raw) : null;

  const handleSearch = async (q?: string) => {
    const searchQuery = q || query;
    if (!searchQuery.trim()) return;
    setError(null);
    try {
      const result = (await trigger({ body: { query: searchQuery.trim(), platforms: selectedPlatforms } } as never)) as (RawMarketData & { error?: string }) | undefined;
      if (result?.error) {
        setError(result.error);
      }
    } catch {
      setError("Failed to analyze market. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div ref={heroRef} className={`mb-8 transition-all duration-700 ${heroInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
            <Crosshair className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Competitor Intelligence</h1>
            <p className="text-sm text-muted-foreground">Real-time market analysis across 5+ platforms</p>
          </div>
        </div>
      </div>

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
            disabled={isMutating || !query.trim()}
            className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-accent to-accent/80 text-white text-sm font-semibold hover:from-accent/90 hover:to-accent/70 transition-all disabled:opacity-50 shadow-lg shadow-accent/20"
          >
            {isMutating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            Analyze Market
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><BookmarkPlus className="h-3 w-3" /> Quick search:</span>
          {savedSearches.map((s) => (
            <button key={s.query} onClick={() => { setQuery(s.query); handleSearch(s.query); }} className="hover:text-accent transition-colors truncate max-w-[140px]">{s.query}</button>
          ))}
        </div>
      </div>

      {isMutating && (
        <div className="glass rounded-2xl p-6 sm:p-12 text-center border border-border">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <Loader2 className="h-16 w-16 text-accent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Crosshair className="h-6 w-6 text-accent" />
            </div>
          </div>
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Scanning Platforms...</h3>
          <p className="text-sm text-muted-foreground">Searching Amazon, Google Shopping, CJ, Keepa, and AliExpress for real data</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            {["Amazon", "Google Shopping", "CJ Dropshipping", "Keepa", "AliExpress"].map((p, i) => (
              <span key={p} className="text-[10px] text-accent/70 bg-accent/5 px-2 py-1 rounded-full border border-accent/10" style={{ animationDelay: `${i * 200}ms` }}>{p}</span>
            ))}
          </div>
        </div>
      )}

      {error && !isMutating && (
        <div className="glass rounded-2xl p-6 sm:p-12 text-center border border-border">
          <Crosshair className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Analysis Failed</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button onClick={() => handleSearch()} className="text-sm text-accent hover:text-accent/80">Try again</button>
        </div>
      )}

      {marketData && !isMutating && (
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

      {!marketData && !isMutating && !error && (
        <div className="glass rounded-2xl p-6 sm:p-12 text-center border border-border">
          <div className="w-20 h-20 rounded-2xl bg-accent/5 flex items-center justify-center mx-auto mb-5 border border-accent/10">
            <Crosshair className="h-10 w-10 text-accent/40" />
          </div>
          <h3 className="font-display text-lg sm:text-xl font-bold text-foreground mb-2">Ready to Spy on Competitors</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
            Enter any product to get a complete competitive analysis: real pricing intelligence, platform breakdown, opportunity finder, and AI-powered pricing strategy.
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
