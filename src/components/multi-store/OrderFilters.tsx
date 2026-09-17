"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";

export interface OrderFilterState {
  search: string;
  storeId?: string;
  status?: string;
  fulfillmentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy: "date" | "amount" | "store";
  sortOrder: "asc" | "desc";
}

interface OrderFiltersProps {
  stores: Array<{ id: string; name: string }>;
  filters: OrderFilterState;
  onFiltersChange: (filters: OrderFilterState) => void;
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "refunded", label: "Refunded" },
];

const FULFILLMENT_OPTIONS = [
  { value: "unfulfilled", label: "Unfulfilled" },
  { value: "partial", label: "Partial" },
  { value: "fulfilled", label: "Fulfilled" },
];

export default function OrderFilters({ stores, filters, onFiltersChange }: OrderFiltersProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  if (debouncedSearch !== filters.search) {
    onFiltersChange({ ...filters, search: debouncedSearch });
  }

  const hasActiveFilters = filters.storeId || filters.status || filters.fulfillmentStatus || filters.dateFrom || filters.dateTo;

  const clearFilters = () => {
    setSearchInput("");
    onFiltersChange({
      search: "",
      sortBy: "date",
      sortOrder: "desc",
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search orders..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(""); onFiltersChange({ ...filters, search: "" }); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={filters.storeId || ""}
          onChange={(e) => onFiltersChange({ ...filters, storeId: e.target.value || undefined })}
          className="px-3 py-2 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50"
        >
          <option value="">All Stores</option>
          {stores.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={filters.status || ""}
          onChange={(e) => onFiltersChange({ ...filters, status: e.target.value || undefined })}
          className="px-3 py-2 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-medium border transition-all ${
            showAdvanced || hasActiveFilters
              ? "bg-accent/10 border-accent/30 text-accent"
              : "bg-surface border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          <Filter className="h-3 w-3" />
          Filters
          {hasActiveFilters && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          )}
        </button>

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-2 rounded-lg text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-surface/50 border border-border">
          <select
            value={filters.fulfillmentStatus || ""}
            onChange={(e) => onFiltersChange({ ...filters, fulfillmentStatus: e.target.value || undefined })}
            className="px-3 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50"
          >
            <option value="">All Fulfillment</option>
            {FULFILLMENT_OPTIONS.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">From:</span>
            <input
              type="date"
              value={filters.dateFrom || ""}
              onChange={(e) => onFiltersChange({ ...filters, dateFrom: e.target.value || undefined })}
              className="px-2 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50"
            />
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-muted-foreground">To:</span>
            <input
              type="date"
              value={filters.dateTo || ""}
              onChange={(e) => onFiltersChange({ ...filters, dateTo: e.target.value || undefined })}
              className="px-2 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50"
            />
          </div>

          <select
            value={`${filters.sortBy}-${filters.sortOrder}`}
            onChange={(e) => {
              const [sortBy, sortOrder] = e.target.value.split("-");
              onFiltersChange({ ...filters, sortBy: sortBy as OrderFilterState["sortBy"], sortOrder: sortOrder as OrderFilterState["sortOrder"] });
            }}
            className="px-3 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground focus:outline-none focus:border-accent/50"
          >
            <option value="date-desc">Newest First</option>
            <option value="date-asc">Oldest First</option>
            <option value="amount-desc">Highest Amount</option>
            <option value="amount-asc">Lowest Amount</option>
            <option value="store-asc">Store A-Z</option>
          </select>
        </div>
      )}
    </div>
  );
}
