"use client";

import { BarChart3, Package, LayoutGrid, List, ArrowUpDown } from "lucide-react";

export default function ResultsHeader({
  resultCount, platformCount, sortBy, setSortBy, viewMode, setViewMode,
}: {
  resultCount: number;
  platformCount: number;
  sortBy: string;
  setSortBy: (v: "relevance" | "price-asc" | "price-desc" | "rating" | "reviews") => void;
  viewMode: "grid" | "list";
  setViewMode: (v: "grid" | "list") => void;
}) {
  return (
    <div className="glass rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          {resultCount} products found
        </span>
        <span className="flex items-center gap-1.5">
          <Package className="h-3.5 w-3.5" />
          {platformCount} platforms searched
        </span>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "relevance" | "price-asc" | "price-desc" | "rating" | "reviews")}
            className="text-xs bg-surface border border-border rounded-lg px-2.5 py-2.5 text-foreground focus:outline-none focus:border-accent/50 min-h-[36px]"
          >
            <option value="relevance">Relevance</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="rating">Top Rated</option>
            <option value="reviews">Most Reviews</option>
          </select>
        </div>

        <div className="flex items-center bg-surface border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${viewMode === "grid" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center ${viewMode === "list" ? "bg-accent/10 text-accent" : "text-muted-foreground hover:text-foreground"}`}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
