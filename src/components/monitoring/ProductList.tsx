"use client";

import { useState, useMemo } from "react";
import { Activity } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
import FilterBar from "@/components/ui/FilterBar";
import ProductCard from "./ProductCard";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { MonitoredProduct } from "@/lib/monitoring/types";

interface ProductListProps {
  products: MonitoredProduct[];
  loading: boolean;
  onRemove: (id: string) => void;
  onCheck: (id: string) => void;
  onUpdate: () => void;
  removingId: string | null;
  visibleCount: number;
  onLoadMore: () => void;
}

type SortOption = "lastChecked" | "priceChange" | "priceLow" | "priceHigh" | "name";

export default function ProductList({
  products,
  loading,
  onRemove,
  onCheck,
  onUpdate,
  removingId,
  visibleCount,
  onLoadMore,
}: ProductListProps) {
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [alertFilter, setAlertFilter] = useState("");
  const [autoDelistFilter, setAutoDelistFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("lastChecked");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  const filtered = useMemo(() => {
    let result = [...products];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) => p.productTitle.toLowerCase().includes(q));
    }

    if (stockFilter) {
      result = result.filter((p) => p.stockStatus === stockFilter);
    }

    if (alertFilter === "hasAlerts") {
      result = result.filter((p) => p.alerts.some((a) => !a.read));
    } else if (alertFilter === "noAlerts") {
      result = result.filter((p) => !p.alerts.some((a) => !a.read));
    }

    if (autoDelistFilter === "enabled") {
      result = result.filter((p) => p.autoDelist);
    } else if (autoDelistFilter === "disabled") {
      result = result.filter((p) => !p.autoDelist);
    }

    result.sort((a, b) => {
      switch (sortBy) {
        case "lastChecked":
          return new Date(b.lastChecked).getTime() - new Date(a.lastChecked).getTime();
        case "priceChange": {
          const aChange = a.priceHistory.length > 1 ? ((a.priceHistory[a.priceHistory.length - 1].price - a.priceHistory[0].price) / a.priceHistory[0].price) * 100 : 0;
          const bChange = b.priceHistory.length > 1 ? ((b.priceHistory[b.priceHistory.length - 1].price - b.priceHistory[0].price) / b.priceHistory[0].price) * 100 : 0;
          return bChange - aChange;
        }
        case "priceLow":
          return a.currentPrice - b.currentPrice;
        case "priceHigh":
          return b.currentPrice - a.currentPrice;
        case "name":
          return a.productTitle.localeCompare(b.productTitle);
        default:
          return 0;
      }
    });

    return result;
  }, [products, search, stockFilter, alertFilter, autoDelistFilter, sortBy]);

  const visibleProducts = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === visibleProducts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visibleProducts.map((p) => p.id)));
    }
  };

  const handleBulkDelete = () => {
    selectedIds.forEach((id) => onRemove(id));
    setSelectedIds(new Set());
    setShowBulkDeleteConfirm(false);
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-xs text-muted-foreground mt-2">Loading monitored products...</p>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No products being monitored"
        description="Visit a product page and click 'Monitor Price' to start tracking."
        action={{ label: "Browse Products", href: "/products" }}
      />
    );
  }

  return (
    <div className="space-y-3">
      <FilterBar
        searchPlaceholder="Search products..."
        searchValue={search}
        onSearchChange={setSearch}
        filters={[
          {
            key: "stock",
            label: "Stock Status",
            options: [
              { label: "In Stock", value: "in_stock" },
              { label: "Out of Stock", value: "out_of_stock" },
              { label: "Unknown", value: "unknown" },
            ],
            value: stockFilter,
          },
          {
            key: "alerts",
            label: "Alerts",
            options: [
              { label: "Has Alerts", value: "hasAlerts" },
              { label: "No Alerts", value: "noAlerts" },
            ],
            value: alertFilter,
          },
          {
            key: "autoDelist",
            label: "Auto-Delist",
            options: [
              { label: "Enabled", value: "enabled" },
              { label: "Disabled", value: "disabled" },
            ],
            value: autoDelistFilter,
          },
        ]}
        onFilterChange={(key, value) => {
          if (key === "stock") setStockFilter(value);
          else if (key === "alerts") setAlertFilter(value);
          else if (key === "autoDelist") setAutoDelistFilter(value);
        }}
      >
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="appearance-none pl-3 pr-8 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:border-accent/30 transition-all cursor-pointer"
        >
          <option value="lastChecked">Last Checked</option>
          <option value="priceChange">Price Change %</option>
          <option value="priceLow">Price: Low to High</option>
          <option value="priceHigh">Price: High to Low</option>
          <option value="name">Name (A-Z)</option>
        </select>
      </FilterBar>

      {filtered.length > 0 && (
        <div className="flex items-center gap-3 px-1">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={selectedIds.size === visibleProducts.length && visibleProducts.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-border"
            />
            <span className="text-[10px] text-muted-foreground">
              {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Select all (${filtered.length})`}
            </span>
          </label>
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="text-[10px] text-red-400 hover:text-red-300 font-medium"
            >
              Remove selected
            </button>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl py-12 text-center">
          <p className="text-sm text-muted-foreground">No products match your filters</p>
        </div>
      ) : (
        <>
          {visibleProducts.map((product) => (
            <div key={product.id} className="relative">
              <div className="absolute left-0 top-4 z-10">
                <input
                  type="checkbox"
                  checked={selectedIds.has(product.id)}
                  onChange={() => toggleSelect(product.id)}
                  className="rounded border-border"
                />
              </div>
              <div className="pl-6">
                <ProductCard
                  product={product}
                  onRemove={onRemove}
                  onCheck={onCheck}
                  onUpdate={onUpdate}
                  removingId={removingId}
                />
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={onLoadMore}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
              >
                Load More ({filtered.length - visibleCount} remaining)
              </button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={showBulkDeleteConfirm}
        title="Remove Selected Products"
        description={`Stop monitoring ${selectedIds.size} product${selectedIds.size > 1 ? "s" : ""}? You will no longer receive alerts for these products.`}
        confirmLabel="Remove All"
        danger
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
      />
    </div>
  );
}
