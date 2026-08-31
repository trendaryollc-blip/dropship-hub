"use client";

import { useState, useMemo } from "react";
import { Target, Search, Flame, BarChart3, TrendingUp, RefreshCw } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { NicheData } from "@/lib/mock-niches";
import { useAPI } from "@/hooks/useAPI";
import NicheHeatmapCard from "@/components/niches/NicheHeatmapCard";
import NicheListItem from "@/components/niches/NicheListItem";
import NicheDetail from "@/components/niches/NicheDetail";
import ViewToggle from "@/components/ui/ViewToggle";

const sortOptions = [
  { value: "heat", label: "Hottest", icon: Flame },
  { value: "score", label: "Top Score", icon: Target },
  { value: "growth", label: "Fastest Growing", icon: TrendingUp },
  { value: "margin", label: "Highest Margin", icon: BarChart3 },
] as const;

type SortKey = typeof sortOptions[number]["value"];

export default function NichesPage() {
  const { ref: heroRef, isInView: heroVisible } = useInView({ threshold: 0.1 });
  const { data: nicheData, error: nicheError, isLoading, mutate: refetchNiches } = useAPI<{ niches?: NicheData[]; error?: string }>("/api/niches");
  const niches = nicheData?.niches || [];
  const error = nicheError?.message || nicheData?.error || null;
  const loading = isLoading;
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("heat");
  const [selectedNicheId, setSelectedNicheId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredNiches = useMemo(() => {
    const list = query
      ? niches.filter((n) => n.name.toLowerCase().includes(query.toLowerCase()) || n.keywords.some((k) => k.toLowerCase().includes(query.toLowerCase())))
      : [...niches];
    switch (sortBy) {
      case "score": list.sort((a, b) => b.overallScore - a.overallScore); break;
      case "growth": list.sort((a, b) => b.growth - a.growth); break;
      case "margin": list.sort((a, b) => b.avgMargin - a.avgMargin); break;
      default: list.sort((a, b) => b.heat - a.heat);
    }
    return list;
  }, [sortBy, query, niches]);

  const selectedNiche = selectedNicheId ? niches.find((n) => n.id === selectedNicheId) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 pb-16 md:pb-24">
      <div ref={heroRef} className={`transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Target className="h-7 w-7 text-accent" /> Niche Explorer
        </h1>
        <p className="text-muted-foreground text-sm">Discover trending niches from real CJ Dropshipping data, analyze competition, and find winning products.</p>
      </div>

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
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortKey)} className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground min-h-[44px]">
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
            <button onClick={() => refetchNiches()} disabled={loading} className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-all min-h-[44px] flex items-center gap-2">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Analyzing CJ Dropshipping categories...</p>
        </div>
      )}

      {error && !loading && (
        <div className="glass rounded-2xl p-8 text-center">
          <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Failed to load niches</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button onClick={() => refetchNiches()} className="text-sm text-accent hover:text-accent/80">Retry</button>
        </div>
      )}

      {!loading && !error && (
        <>
          {selectedNiche && (
            <NicheDetail niche={selectedNiche} />
          )}

          <p className="text-sm text-muted-foreground">{filteredNiches.length} niches found</p>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredNiches.map((niche, i) => (
                <NicheHeatmapCard key={niche.id} niche={niche} index={i} onSelect={(id) => setSelectedNicheId(id)} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNiches.map((niche, i) => (
                <NicheListItem key={niche.id} niche={niche} index={i} onSelect={(id) => setSelectedNicheId(id)} />
              ))}
            </div>
          )}

          {filteredNiches.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center">
              <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">No niches found</h3>
              <p className="text-sm text-muted-foreground">Try a different search term</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
