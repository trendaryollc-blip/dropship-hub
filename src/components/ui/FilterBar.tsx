"use client";

import { cn } from "@/lib/utils";
import { Search, X, SlidersHorizontal } from "lucide-react";

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filters?: { key: string; label: string; options: FilterOption[]; value?: string }[];
  onFilterChange?: (key: string, value: string) => void;
  children?: React.ReactNode;
  className?: string;
}

export default function FilterBar({
  searchPlaceholder = "Search...",
  searchValue = "",
  onSearchChange,
  filters = [],
  onFilterChange,
  children,
  className,
}: FilterBarProps) {
  return (
    <div className={cn("flex flex-col sm:flex-row items-start sm:items-center gap-3", className)}>
      <div className="relative flex-1 w-full sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          className="w-full pl-10 pr-8 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30 focus:ring-1 focus:ring-accent/10 transition-all"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange?.("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {filters.map((filter) => (
        <div key={filter.key} className="relative">
          <select
            value={filter.value || ""}
            onChange={(e) => onFilterChange?.(filter.key, e.target.value)}
            aria-label={filter.label}
            className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/30 transition-all cursor-pointer"
          >
            <option value="">{filter.label}</option>
            {filter.options.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
        </div>
      ))}

      {children}
    </div>
  );
}
