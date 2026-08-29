"use client";

import { useState, useMemo } from "react";
import { X, Tag, DollarSign, Star, Search } from "lucide-react";

export interface Filters {
  brands: string[];
  priceMin: string;
  priceMax: string;
  minRating: number;
}

interface FilterPanelProps {
  filters: Filters;
  setFilters: (f: Filters) => void;
  availableBrands: string[];
  resultCount: number;
  filteredCount: number;
}

export default function FilterPanel({
  filters,
  setFilters,
  availableBrands,
  resultCount,
  filteredCount,
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

  const clearAll = () => {
    setFilters({ brands: [], priceMin: "", priceMax: "", minRating: 0 });
  };

  const hasActiveFilters =
    filters.brands.length > 0 ||
    filters.priceMin !== "" ||
    filters.priceMax !== "" ||
    filters.minRating > 0;

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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
      </div>

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
        </div>
      )}
    </div>
  );
}
