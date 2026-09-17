"use client";

import { useState, useRef, useEffect } from "react";
import { Search, X, Package } from "lucide-react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { PushedProduct } from "@/components/stores/PushedProductsList";

interface ProductPickerProps {
  products: PushedProduct[];
  selected: PushedProduct[];
  onToggle: (product: PushedProduct) => void;
  onClear: () => void;
}

export default function ProductPicker({ products, selected, onToggle, onClear }: ProductPickerProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 200);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = products.filter((p) => {
    if (!debouncedSearch) return true;
    const q = debouncedSearch.toLowerCase();
    return p.productTitle.toLowerCase().includes(q) || p.storeName.toLowerCase().includes(q);
  });

  const selectedIds = new Set(selected.map((p) => p.id));

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 flex-wrap min-h-[38px] px-3 py-1.5 rounded-lg bg-surface border border-border">
        {selected.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap flex-1">
            {selected.map((p) => (
              <span
                key={p.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-[10px] font-medium text-accent"
              >
                {p.productTitle.length > 20 ? p.productTitle.slice(0, 20) + "..." : p.productTitle}
                <button onClick={() => onToggle(p)} className="hover:text-accent-hover">
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            ))}
            <button
              onClick={onClear}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
        )}
        <div className="flex items-center gap-1.5 flex-1 min-w-[120px]">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            placeholder={selected.length > 0 ? "Add more..." : "Search products..."}
            className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 max-h-60 overflow-y-auto rounded-xl bg-surface border border-border shadow-xl">
          {filtered.length === 0 ? (
            <div className="p-4 text-center">
              <Package className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-[10px] text-muted-foreground">No products found</p>
            </div>
          ) : (
            filtered.map((product) => {
              const isSelected = selectedIds.has(product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => onToggle(product)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-accent/5 transition-colors ${
                    isSelected ? "bg-accent/10" : ""
                  }`}
                >
                  <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-accent border-accent" : "border-border"
                  }`}>
                    {isSelected && <span className="text-white text-[8px]">✓</span>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-medium text-foreground truncate">{product.productTitle}</p>
                    <p className="text-[9px] text-muted-foreground">
                      {product.storeName} · ${product.productPrice.toFixed(2)}
                    </p>
                  </div>
                  <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${
                    product.status === "live" ? "bg-emerald-400/10 text-emerald-400" : "bg-red-400/10 text-red-400"
                  }`}>
                    {product.status}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
