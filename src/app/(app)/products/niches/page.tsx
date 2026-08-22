"use client";

import { useState, useMemo } from "react";
import { Target, Search, Flame, BarChart3, TrendingUp, ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { allNiches, searchNiches, type NicheData } from "@/lib/mock-niches";
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
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("heat");
  const [selectedNicheId, setSelectedNicheId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const filteredNiches = useMemo(() => {
    let list = searchQuery ? searchNiches(searchQuery) : [...allNiches];
    switch (sortBy) {
      case "score": list.sort((a, b) => b.overallScore - a.overallScore); break;
      case "growth": list.sort((a, b) => b.growth - a.growth); break;
      case "margin": list.sort((a, b) => b.avgMargin - a.avgMargin); break;
      default: list.sort((a, b) => b.heat - a.heat);
    }
    return list;
  }, [sortBy, searchQuery]);

  const selectedNiche = selectedNicheId ? allNiches.find((n) => n.id === selectedNicheId) : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Hero */}
      <div ref={heroRef} className={`transition-all duration-700 ${heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Target className="h-7 w-7 text-accent" /> Niche Explorer
        </h1>
        <p className="text-muted-foreground text-sm">Discover trending niches, analyze competition, and find winning products.</p>
      </div>

      {/* Search + Sort */}
      <div className="glass rounded-2xl p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSearchQuery(e.target.value); }}
              onKeyDown={(e) => { if (e.key === "Enter") setSearchQuery(query); }}
              placeholder="Search niches by name, category, or keyword..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 text-sm"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto items-center" style={{ scrollbarWidth: "none" }}>
            {sortOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium whitespace-nowrap transition-all ${sortBy === opt.value ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}
              >
                <opt.icon className="h-3.5 w-3.5" /> {opt.label}
              </button>
            ))}
            <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Niches", value: allNiches.length, color: "text-accent" },
          { label: "Hot Niches (80+)", value: allNiches.filter((n) => n.heat >= 80).length, color: "text-red-400" },
          { label: "Avg Margin", value: `${Math.round(allNiches.reduce((a, n) => a + n.avgMargin, 0) / allNiches.length)}%`, color: "text-emerald-400" },
          { label: "Rising Trends", value: allNiches.filter((n) => n.trend === "up").length, color: "text-blue-400" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-xl p-4 border border-border text-center">
            <p className={`font-display text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-6">
        {/* Niche Grid or Detail */}
        <div className="flex-1">
          {selectedNiche ? (
            <div>
              <button onClick={() => setSelectedNicheId(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
                <ArrowRight className="h-4 w-4 rotate-180" /> Back to All Niches
              </button>
              <NicheDetail niche={selectedNiche} />
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Flame className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{filteredNiches.length} niches found</p>
              </div>
              {filteredNiches.length === 0 ? (
                <div className="glass rounded-2xl p-8 md:p-16 text-center">
                  <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">No niches match your search</h3>
                  <p className="text-sm text-muted-foreground">Try a different keyword or clear your search</p>
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredNiches.map((niche, i) => (
                    <NicheHeatmapCard key={niche.id} niche={niche} index={i} onSelect={setSelectedNicheId} />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredNiches.map((niche, i) => (
                    <NicheListItem key={niche.id} niche={niche} index={i} onSelect={setSelectedNicheId} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
