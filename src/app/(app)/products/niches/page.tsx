"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Target, Search, Flame, BarChart3, TrendingUp, RefreshCw,
  SlidersHorizontal, X, DollarSign, ArrowLeftRight,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { NicheData } from "@/types/niches";
import { useAPI } from "@/hooks/useAPI";
import { logger } from "@/lib/logger";
import NicheHeatmapCard from "@/components/niches/NicheHeatmapCard";
import NicheListItem from "@/components/niches/NicheListItem";
import NicheDetail from "@/components/niches/NicheDetail";
import ViewToggle from "@/components/ui/ViewToggle";

const sortOptions = [
  { value: "heat", label: "Hottest", icon: Flame },
  { value: "score", label: "Top Score", icon: Target },
  { value: "growth", label: "Fastest Growing", icon: TrendingUp },
  { value: "margin", label: "Highest Margin", icon: BarChart3 },
  { value: "revenue", label: "Highest Revenue", icon: DollarSign },
] as const;

type SortKey = typeof sortOptions[number]["value"];

const competitionLevels = ["all", "low", "medium", "high", "very-high"] as const;
const riskLevels = ["all", "low", "medium", "high"] as const;
const trendDirections = ["all", "rising", "stable", "declining"] as const;

export default function NichesPage() {
  const { ref: heroRef, isInView: heroVisible } = useInView({ threshold: 0.1 });
  const { data: nicheData, error: nicheError, isLoading, mutate: refetchNiches } = useAPI<{ niches?: NicheData[]; error?: string }>("/api/niches");
  const niches = useMemo(() => nicheData?.niches || [], [nicheData]);
  const error = nicheError?.message || nicheData?.error || null;
  const loading = isLoading;

  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("heat");
  const [selectedNicheId, setSelectedNicheId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Advanced filters
  const [minMargin, setMinMargin] = useState(0);
  const [maxMargin, setMaxMargin] = useState(100);
  const [minHeat, setMinHeat] = useState(0);
  const [competitionFilter, setCompetitionFilter] = useState<string>("all");
  const [riskFilter, setRiskFilter] = useState<string>("all");
  const [trendFilter, setTrendFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const categories = useMemo(() => {
    const cats = new Set(niches.map((n) => n.category).filter(Boolean));
    return ["all", ...Array.from(cats)];
  }, [niches]);

  const filteredNiches = useMemo(() => {
    const q = query.toLowerCase();
    const list = niches.filter((n) => {
      if (!n) return false;
      const nameMatch = (n.name || "").toLowerCase().includes(q);
      const keywordMatch = (n.keywords || []).some((k) => (k || "").toLowerCase().includes(q));
      if (q && !nameMatch && !keywordMatch) return false;
      if (n.avgMargin < minMargin || n.avgMargin > maxMargin) return false;
      if (n.heat < minHeat) return false;
      if (competitionFilter !== "all" && n.competitionLevel !== competitionFilter) return false;
      if (riskFilter !== "all" && n.riskLevel !== riskFilter) return false;
      if (trendFilter !== "all" && n.trendDirection !== trendFilter) return false;
      if (categoryFilter !== "all" && n.category !== categoryFilter) return false;
      return true;
    });

    switch (sortBy) {
      case "score": list.sort((a, b) => (b.overallScore || 0) - (a.overallScore || 0)); break;
      case "growth": list.sort((a, b) => (b.growth || 0) - (a.growth || 0)); break;
      case "margin": list.sort((a, b) => (b.avgMargin || 0) - (a.avgMargin || 0)); break;
      case "revenue": list.sort((a, b) => (b.estimatedMonthlyRevenue || 0) - (a.estimatedMonthlyRevenue || 0)); break;
      default: list.sort((a, b) => (b.heat || 0) - (a.heat || 0));
    }
    return list;
  }, [sortBy, query, niches, minMargin, maxMargin, minHeat, competitionFilter, riskFilter, trendFilter, categoryFilter]);

  const selectedNiche = selectedNicheId ? niches.find((n) => n.id === selectedNicheId) : null;

  const avgMargin = useMemo(() => {
    if (!niches.length) return 0;
    return Math.round(niches.reduce((sum, n) => sum + (n.avgMargin || 0), 0) / niches.length);
  }, [niches]);

  const totalRevenue = useMemo(() => {
    return niches.reduce((sum, n) => sum + (n.estimatedMonthlyRevenue || 0), 0);
  }, [niches]);

  const topTrending = useMemo(() => {
    if (!niches.length) return null;
    return [...niches].sort((a, b) => (b.growth || 0) - (a.growth || 0))[0];
  }, [niches]);

  const toggleCompare = useCallback((id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  }, []);

  const compareNiches = useMemo(() => {
    if (compareIds.length < 2) return [];
    return niches.filter((n) => compareIds.includes(n.id));
  }, [compareIds, niches]);

  const hasActiveFilters = minMargin > 0 || maxMargin < 100 || minHeat > 0 || competitionFilter !== "all" || riskFilter !== "all" || trendFilter !== "all" || categoryFilter !== "all";

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-16 md:pb-24">
      {/* Hero */}
      <div ref={heroRef} className={`transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Target className="h-7 w-7 text-accent" /> Niche Explorer
        </h1>
        <p className="text-muted-foreground text-sm">Discover trending niches from real CJ Dropshipping data, analyze competition, and find winning products.</p>
      </div>

      {/* Hero Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Niches", value: niches.length, icon: Target, color: "text-accent" },
          { label: "Avg Margin", value: `${avgMargin}%`, icon: TrendingUp, color: "text-emerald-400" },
          { label: "Total Revenue/mo", value: `$${totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-accent" },
          { label: "Top Trending", value: topTrending?.name || "—", icon: Flame, color: "text-amber-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-2xl p-4 border border-border">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <span className="text-[10px] text-muted-foreground">{stat.label}</span>
            </div>
            <p className="font-display text-lg font-bold text-foreground truncate">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search niches..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 text-sm"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground min-h-[44px]">
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border text-sm min-h-[44px] flex items-center gap-2 transition-all ${showFilters || hasActiveFilters ? "bg-accent/10 border-accent/30 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-accent" />}
            </button>
            {compareIds.length >= 2 && (
              <button
                onClick={() => setSelectedNicheId(null)}
                className="px-4 py-3 rounded-xl bg-accent/10 border border-accent/30 text-accent text-sm min-h-[44px] flex items-center gap-2"
              >
                <ArrowLeftRight className="h-4 w-4" /> Comparing ({compareIds.length})
              </button>
            )}
            <button onClick={() => refetchNiches()} disabled={loading} className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-all min-h-[44px] flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Advanced Filters Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-border/50 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Min Margin: {minMargin}%</label>
              <input type="range" min={0} max={100} value={minMargin} onChange={(e) => setMinMargin(Number(e.target.value))} className="w-full accent-accent" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Max Margin: {maxMargin}%</label>
              <input type="range" min={0} max={100} value={maxMargin} onChange={(e) => setMaxMargin(Number(e.target.value))} className="w-full accent-accent" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Min Heat: {minHeat}</label>
              <input type="range" min={0} max={100} value={minHeat} onChange={(e) => setMinHeat(Number(e.target.value))} className="w-full accent-accent" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Competition</label>
              <select value={competitionFilter} onChange={(e) => setCompetitionFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground">
                {competitionLevels.map((l) => <option key={l} value={l}>{l === "all" ? "All" : l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Risk Level</label>
              <select value={riskFilter} onChange={(e) => setRiskFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground">
                {riskLevels.map((l) => <option key={l} value={l}>{l === "all" ? "All" : l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Trend Direction</label>
              <select value={trendFilter} onChange={(e) => setTrendFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground">
                {trendDirections.map((l) => <option key={l} value={l}>{l === "all" ? "All" : l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Category</label>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground">
                {categories.map((c) => <option key={c} value={c}>{c === "all" ? "All Categories" : c}</option>)}
              </select>
            </div>
            {hasActiveFilters && (
              <div className="flex items-end">
                <button
                  onClick={() => { setMinMargin(0); setMaxMargin(100); setMinHeat(0); setCompetitionFilter("all"); setRiskFilter("all"); setTrendFilter("all"); setCategoryFilter("all"); }}
                  className="px-3 py-2 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-xs font-medium hover:bg-red-400/20 transition-all"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Analyzing CJ Dropshipping categories...</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="glass rounded-2xl p-8 text-center">
          <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Failed to load niches</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button onClick={() => refetchNiches()} className="text-sm text-accent hover:text-accent/80">Retry</button>
        </div>
      )}

      {/* Results */}
      {!loading && !error && (
        <>
          {/* Compare Banner */}
          {compareIds.length >= 2 && (
            <div className="glass rounded-2xl border border-accent/30 p-4 animate-slide-up">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="h-4 w-4 text-accent" />
                  <span className="text-sm font-semibold text-foreground">Comparing {compareIds.length} niches</span>
                </div>
                <button onClick={() => setCompareIds([])} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {compareNiches.map((n) => (
                  <div key={n.id} className="p-3 rounded-xl bg-surface/50 border border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm">{n.icon}</span>
                      <span className="text-xs font-semibold text-foreground truncate">{n.name}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1 text-[10px]">
                      <div><span className="text-muted-foreground">Heat:</span> <span className="font-bold text-foreground">{n.heat}</span></div>
                      <div><span className="text-muted-foreground">Margin:</span> <span className="font-bold text-foreground">{n.avgMargin}%</span></div>
                      <div><span className="text-muted-foreground">Score:</span> <span className="font-bold text-foreground">{n.overallScore}</span></div>
                      <div><span className="text-muted-foreground">Growth:</span> <span className="font-bold text-foreground">+{n.growth}%</span></div>
                      <div><span className="text-muted-foreground">Revenue:</span> <span className="font-bold text-foreground">${(n.estimatedMonthlyRevenue || 0).toLocaleString()}</span></div>
                      <div><span className="text-muted-foreground">Risk:</span> <span className="font-bold text-foreground">{n.riskLevel}</span></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 rounded-xl bg-accent/5 border border-accent/10">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[10px]">
                  {[
                    { label: "Best Heat", value: compareNiches.reduce((best, n) => (n.heat || 0) > (best.heat || 0) ? n : best, compareNiches[0])?.name },
                    { label: "Best Margin", value: compareNiches.reduce((best, n) => (n.avgMargin || 0) > (best.avgMargin || 0) ? n : best, compareNiches[0])?.name },
                    { label: "Best Revenue", value: compareNiches.reduce((best, n) => (n.estimatedMonthlyRevenue || 0) > (best.estimatedMonthlyRevenue || 0) ? n : best, compareNiches[0])?.name },
                  ].map((winner) => (
                    <div key={winner.label} className="flex items-center gap-1">
                      <span className="text-muted-foreground">{winner.label}:</span>
                      <span className="font-bold text-accent">{winner.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {selectedNiche && (
            <NicheDetail
              niche={selectedNiche}
              onMission={(id) => { logger.debug("Niche action", { action: "mission", id }); }}
              onWatchlist={(id) => { logger.debug("Niche action", { action: "watchlist", id }); }}
              onListing={(id) => { logger.debug("Niche action", { action: "listing", id }); }}
            />
          )}

          <p className="text-sm text-muted-foreground">{filteredNiches.length} niches found</p>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNiches.map((niche, i) => (
                <NicheHeatmapCard
                  key={niche.id}
                  niche={niche}
                  index={i}
                  onSelect={(id) => setSelectedNicheId(id === selectedNicheId ? null : id)}
                  onCompare={toggleCompare}
                  onMission={(id) => { logger.debug("Niche action", { action: "mission", id }); }}
                  onWatchlist={(id) => { logger.debug("Niche action", { action: "watchlist", id }); }}
                  onListing={(id) => { logger.debug("Niche action", { action: "listing", id }); }}
                  compareIds={compareIds}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNiches.map((niche, i) => (
                <NicheListItem
                  key={niche.id}
                  niche={niche}
                  index={i}
                  onSelect={(id) => setSelectedNicheId(id === selectedNicheId ? null : id)}
                  onCompare={toggleCompare}
                  compareIds={compareIds}
                />
              ))}
            </div>
          )}

          {filteredNiches.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center">
              <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">No niches found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your filters or search term</p>
              {hasActiveFilters && (
                <button
                  onClick={() => { setMinMargin(0); setMaxMargin(100); setMinHeat(0); setCompetitionFilter("all"); setRiskFilter("all"); setTrendFilter("all"); setCategoryFilter("all"); setQuery(""); }}
                  className="mt-3 text-xs text-accent hover:text-accent/80"
                >
                  Reset all filters
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
