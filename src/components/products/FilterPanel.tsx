"use client";

import { useState, useMemo } from "react";
import { X, Tag, DollarSign, Star, Search, TrendingUp, BarChart3, Zap, Store } from "lucide-react";

export interface Filters {
  brands: string[];
  priceMin: string;
  priceMax: string;
  minRating: number;
  minMargin: number;
  competitionLevel: ("low" | "medium" | "high")[];
  trendingDirection: ("rising" | "stable" | "declining")[];
  platformFilter: string[];
}

interface FilterPanelProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
  availableBrands: string[];
  resultCount: number;
  filteredCount: number;
  availablePlatforms?: string[];
}

export default function FilterPanel({
  filters,
  setFilters,
  availableBrands,
  resultCount,
  filteredCount,
  availablePlatforms = [],
}: FilterPanelProps) {
  const [brandSearch, setBrandSearch] = useState("");

  const sortedBrands = useMemo(() => {
    const filtered = availableBrands.filter((b) =>
      b.toLowerCase().includes(brandSearch.toLowerCase())
    );
    return filtered.sort((a, b) => a.localeCompare(b));
  }, [availableBrands, brandSearch]);

  const toggleBrand = (brand: string) => {
    setFilters({
      ...filters,
      brands: filters.brands.includes(brand)
        ? filters.brands.filter((b) => b !== brand)
        : [...filters.brands, brand],
    });
  };

  const toggleCompetition = (level: "low" | "medium" | "high") => {
    setFilters({
      ...filters,
      competitionLevel: filters.competitionLevel.includes(level)
        ? filters.competitionLevel.filter((l) => l !== level)
        : [...filters.competitionLevel, level],
    });
  };

  const toggleTrending = (dir: "rising" | "stable" | "declining") => {
    setFilters({
      ...filters,
      trendingDirection: filters.trendingDirection.includes(dir)
        ? filters.trendingDirection.filter((d) => d !== dir)
        : [...filters.trendingDirection, dir],
    });
  };

  const togglePlatformFilter = (p: string) => {
    setFilters({
      ...filters,
      platformFilter: filters.platformFilter.includes(p)
        ? filters.platformFilter.filter((x) => x !== p)
        : [...filters.platformFilter, p],
    });
  };

  const clearAll = () => {
    setFilters({
      brands: [], priceMin: "", priceMax: "", minRating: 0,
      minMargin: 0, competitionLevel: [], trendingDirection: [], platformFilter: [],
    });
  };

  const hasActiveFilters =
    filters.brands.length > 0 ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
    filters.minRating > 0 ||
    filters.minMargin > 0 ||
    filters.competitionLevel.length > 0 ||
    filters.trendingDirection.length > 0 ||
    filters.platformFilter.length > 0;

  const competitionOptions: { value: "low" | "medium" | "high"; label: string; color: string; bg: string }[] = [
    { value: "low", label: "Low", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
    { value: "medium", label: "Medium", color: "text-amber-400", bg: "bg-amber-400/10 border-amber-400/20" },
    { value: "high", label: "High", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  ];

  const trendingOptions: { value: "rising" | "stable" | "declining"; label: string; color: string; bg: string }[] = [
    { value: "rising", label: "Rising", color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20" },
    { value: "stable", label: "Stable", color: "text-blue-400", bg: "bg-blue-400/10 border-blue-400/20" },
    { value: "declining", label: "Declining", color: "text-red-400", bg: "bg-red-400/10 border-red-400/20" },
  ];

  const platformIcons: Record<string, string> = {
    amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
    cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", walmart: "\ud83c\udfea",
    etsy: "\ud83c\udfa8", temu: "\ud83d\udce8", shein: "\ud83d\udc57",
    banggood: "\ud83d\udcb0", dhgate: "\ud83d\udce2", alibaba: "\ud83c\udf10",
  };

  return (
    <div className="glass rounded-2xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-semibold text-foreground">Filters</h3>
          {hasActiveFilters && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
              {resultCount - filteredCount} hidden
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Brand Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Tag className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Brand</span>
            {filters.brands.length > 0 && (
              <span className="text-[10px] text-accent">({filters.brands.length})</span>
            )}
          </div>

          {availableBrands.length > 0 ? (
            <>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <input
                  type="text"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="Search brands..."
                  className="w-full pl-8 pr-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
                />
                {brandSearch && (
                  <button
                    onClick={() => setBrandSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {sortedBrands.map((brand) => (
                  <button
                    key={brand}
                    onClick={() => toggleBrand(brand)}
                    className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-xs transition-all ${
                      filters.brands.includes(brand)
                        ? "bg-accent/10 text-accent border border-accent/20"
                        : "bg-surface/50 text-muted-foreground hover:text-foreground hover:bg-surface border border-transparent"
                    }`}
                  >
                    <div
                      className={`w-3 h-3 rounded border flex items-center justify-center shrink-0 ${
                        filters.brands.includes(brand)
                          ? "bg-accent border-accent"
                          : "border-border"
                      }`}
                    >
                      {filters.brands.includes(brand) && (
                        <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="truncate">{brand}</span>
                  </button>
                ))}
                {sortedBrands.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-2">No brands match &quot;{brandSearch}&quot;</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground py-2">No brand data available for these results</p>
          )}
        </div>

        {/* Price Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Price Range</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={filters.priceMin}
                onChange={(e) => setFilters({ ...filters, priceMin: e.target.value })}
                placeholder="Min"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
              />
            </div>
            <span className="text-muted-foreground text-xs">-</span>
            <div className="relative flex-1">
              <input
                type="number"
                value={filters.priceMax}
                onChange={(e) => setFilters({ ...filters, priceMax: e.target.value })}
                placeholder="Max"
                min="0"
                step="0.01"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>
        </div>

        {/* Rating Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Star className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Minimum Rating</span>
          </div>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => setFilters({ ...filters, minRating: r })}
                className={`flex items-center gap-0.5 px-2.5 py-2 rounded-lg text-xs transition-all ${
                  filters.minRating === r
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {r === 0 ? (
                  "Any"
                ) : (
                  <>
                    <Star className="h-3 w-3 fill-current" />
                    {r}+
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Profit Margin Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <BarChart3 className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Min Profit Margin</span>
            {filters.minMargin > 0 && (
              <span className="text-[10px] text-accent">{filters.minMargin}%</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {[0, 10, 20, 30, 40, 50].map((m) => (
              <button
                key={m}
                onClick={() => setFilters({ ...filters, minMargin: m })}
                className={`flex-1 px-1.5 py-2 rounded-lg text-xs transition-all ${
                  filters.minMargin === m
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "bg-surface border border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === 0 ? "Any" : `${m}%+`}
              </button>
            ))}
          </div>
        </div>

        {/* Competition Level Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Zap className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Competition</span>
            {filters.competitionLevel.length > 0 && (
              <span className="text-[10px] text-accent">({filters.competitionLevel.length})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {competitionOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleCompetition(opt.value)}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all border ${
                  filters.competitionLevel.includes(opt.value)
                    ? `${opt.bg} ${opt.color}`
                    : "bg-surface border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Trending Direction Filter */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Trend</span>
            {filters.trendingDirection.length > 0 && (
              <span className="text-[10px] text-accent">({filters.trendingDirection.length})</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {trendingOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => toggleTrending(opt.value)}
                className={`flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all border ${
                  filters.trendingDirection.includes(opt.value)
                    ? `${opt.bg} ${opt.color}`
                    : "bg-surface border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Platform Source Filter */}
      {availablePlatforms.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-1.5">
            <Store className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs font-medium text-foreground">Show results from</span>
            {filters.platformFilter.length > 0 && (
              <span className="text-[10px] text-accent">({filters.platformFilter.length} selected)</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availablePlatforms.map((p) => (
              <button
                key={p}
                onClick={() => togglePlatformFilter(p)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border ${
                  filters.platformFilter.length === 0 || filters.platformFilter.includes(p)
                    ? "bg-accent/10 text-accent border-accent/20"
                    : "bg-surface/50 text-muted-foreground/50 border-transparent"
                }`}
              >
                <span>{platformIcons[p] || "\ud83d\udd17"}</span>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasActiveFilters && (
        <div className="flex items-center gap-2 flex-wrap pt-1 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">Active:</span>
          {filters.brands.map((b) => (
            <button
              key={b}
              onClick={() => toggleBrand(b)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {b}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
          {filters.priceMin && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
              Min ${filters.priceMin}
            </span>
          )}
          {filters.priceMax && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
              Max ${filters.priceMax}
            </span>
          )}
          {filters.minRating > 0 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20">
              {filters.minRating}+ stars
            </span>
          )}
          {filters.minMargin > 0 && (
            <button
              onClick={() => setFilters({ ...filters, minMargin: 0 })}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {filters.minMargin}%+ margin
              <X className="h-2.5 w-2.5" />
            </button>
          )}
          {filters.competitionLevel.map((l) => (
            <button
              key={l}
              onClick={() => toggleCompetition(l)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {l} competition
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
          {filters.trendingDirection.map((d) => (
            <button
              key={d}
              onClick={() => toggleTrending(d)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {d}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
          {filters.platformFilter.map((p) => (
            <button
              key={p}
              onClick={() => togglePlatformFilter(p)}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {platformIcons[p] || ""} {p}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
