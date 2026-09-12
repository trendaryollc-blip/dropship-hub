"use client";

import { useMemo } from "react";
import { Search, X, SlidersHorizontal, CheckSquare, Square } from "lucide-react";
import VoiceInput from "@/components/ai/VoiceInput";
import ViewToggle from "@/components/ui/ViewToggle";
import { useSavedProducts } from "./SavedProductsProvider";

export type SortOption = "savedAt-desc" | "savedAt-asc" | "price-desc" | "price-asc" | "rating-desc" | "rating-asc" | "platform";

interface SavedToolbarProps {
  search: string;
  setSearch: (v: string) => void;
  sort: SortOption;
  setSort: (v: SortOption) => void;
  platformFilter: string[];
  setPlatformFilter: (v: string[]) => void;
  viewMode: "grid" | "list";
  setViewMode: (v: "grid" | "list") => void;
}

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "savedAt-desc", label: "Newest first" },
  { value: "savedAt-asc", label: "Oldest first" },
  { value: "price-desc", label: "Price: High → Low" },
  { value: "price-asc", label: "Price: Low → High" },
  { value: "rating-desc", label: "Rating: High → Low" },
  { value: "rating-asc", label: "Rating: Low → High" },
  { value: "platform", label: "Platform" },
];

const platformIcons: Record<string, string> = {
  amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
  cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", keepa: "\ud83d\udcca",
  walmart: "\ud83c\udfea", temu: "\ud83d\udd25", shein: "\ud83d\udc57",
  etsy: "\ud83c\udfa8", alibaba: "\ud83c\udfed", banggood: "\u26a1", dhgate: "\ud83d\udd17",
};

export default function SavedToolbar({
  search, setSearch, sort, setSort,
  platformFilter, setPlatformFilter,
  viewMode, setViewMode,
}: SavedToolbarProps) {
  const { savedProducts, isSelectMode, setSelectMode, selectAll, clearSelection, selectedIds } = useSavedProducts();

  const availablePlatforms = useMemo(() => {
    const set = new Set(savedProducts.map((p) => p.source));
    return Array.from(set).sort();
  }, [savedProducts]);

  const togglePlatform = (platform: string) => {
    setPlatformFilter(
      platformFilter.includes(platform)
        ? platformFilter.filter((p) => p !== platform)
        : [...platformFilter, platform]
    );
  };

  const allSelected = savedProducts.length > 0 && selectedIds.size === savedProducts.length;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search saved products..."
            className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <VoiceInput onTranscript={(text) => setSearch(text)} />

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
          className="px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/50 transition-all cursor-pointer appearance-none pr-8"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")", backgroundPosition: "right 0.5rem center", backgroundRepeat: "no-repeat", backgroundSize: "1.5em 1.5em" }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />

        <button
          onClick={() => {
            if (isSelectMode) {
              setSelectMode(false);
              clearSelection();
            } else {
              setSelectMode(true);
            }
          }}
          className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-medium transition-all ${
            isSelectMode
              ? "bg-accent/10 border-accent/30 text-accent"
              : "bg-surface border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {isSelectMode ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
          {isSelectMode ? `${selectedIds.size} selected` : "Select"}
        </button>

        {isSelectMode && (
          <button
            onClick={allSelected ? clearSelection : selectAll}
            className="px-3 py-2.5 rounded-xl bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all"
          >
            {allSelected ? "Deselect All" : "Select All"}
          </button>
        )}
      </div>

      {availablePlatforms.length > 1 && (
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          {availablePlatforms.map((platform) => (
            <button
              key={platform}
              onClick={() => togglePlatform(platform)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-all ${
                platformFilter.includes(platform)
                  ? "bg-accent/10 border-accent/30 text-accent"
                  : "bg-surface border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{platformIcons[platform] || "\ud83d\udd17"}</span>
              {platform}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
