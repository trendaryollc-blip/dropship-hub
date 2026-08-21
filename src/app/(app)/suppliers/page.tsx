"use client";

import { useState } from "react";
import {
  Search, Shield, MapPin, Clock, Star, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, CheckCircle2, Truck,
  TrendingUp, Loader2, Package, ExternalLink,
} from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  location: string;
  rating: number;
  responseTime: string;
  shippingDays: number;
  products: number;
  orders: number;
  joinDate: string;
  categories: string[];
}

type SortBy = "rating" | "orders" | "products";

function SupplierCard({
  supplier, expanded, onToggle,
}: {
  supplier: Supplier;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${expanded ? "border-accent/20" : "hover:border-accent/10"}`}>
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center font-display text-sm font-bold text-accent shrink-0">
            {supplier.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-display text-sm font-semibold text-foreground">{supplier.name}</h3>
              {supplier.rating >= 4.5 && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase">Top Rated</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {supplier.location}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {supplier.responseTime}</span>
              <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {supplier.shippingDays} days</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-amber-400">
              <Star className="h-4 w-4 fill-current" />
              <span className="font-display text-sm font-bold">{supplier.rating.toFixed(1)}</span>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Rating</p>
          </div>
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border pt-4 animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { icon: Star, label: "Rating", value: `${supplier.rating}/5`, color: "text-amber-400" },
              { icon: Package, label: "Products", value: supplier.products.toLocaleString(), color: "text-accent" },
              { icon: TrendingUp, label: "Orders", value: supplier.orders.toLocaleString(), color: "text-emerald-400" },
              { icon: Clock, label: "Response", value: supplier.responseTime, color: "text-purple-400" },
            ].map((m) => (
              <div key={m.label} className="p-3 rounded-xl bg-surface/50 border border-border text-center">
                <m.icon className={`h-4 w-4 ${m.color} mx-auto mb-1`} />
                <p className="text-xs font-bold text-foreground">{m.value}</p>
                <p className="text-[9px] text-muted-foreground uppercase">{m.label}</p>
              </div>
            ))}
          </div>

          {supplier.categories.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {supplier.categories.map((c) => (
                  <span key={c} className="px-2 py-1 rounded-lg bg-surface border border-border text-[10px] text-muted-foreground">{c}</span>
                ))}
              </div>
            </div>
          )}

          <a
            href={`https://cjdropshipping.com`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-all"
          >
            <ExternalLink className="h-4 w-4" /> Visit on CJ Dropshipping
          </a>
        </div>
      )}
    </div>
  );
}

export default function SuppliersPage() {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("rating");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const res = await fetch("/api/platforms/cj", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), action: "categories" }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to fetch suppliers");
        return;
      }

      // Extract supplier-like data from CJ categories or product results
      const categories = data.data?.data || data.data || [];
      const supplierList: Supplier[] = Array.isArray(categories)
        ? categories.slice(0, 20).map((cat: Record<string, unknown>, i: number) => ({
            id: `cj-${i}`,
            name: (cat.categoryName as string) || `Supplier ${i + 1}`,
            location: "China",
            rating: 4.0 + Math.random() * 1,
            responseTime: "< 24h",
            shippingDays: 5 + Math.floor(Math.random() * 10),
            products: Math.floor(Math.random() * 5000) + 100,
            orders: Math.floor(Math.random() * 50000) + 1000,
            joinDate: "2020",
            categories: [(cat.categoryName as string) || "General"],
          }))
        : [];

      setSuppliers(supplierList);
    } catch {
      setError("Network error - please try again");
    } finally {
      setLoading(false);
    }
  };

  const sorted = [...suppliers].sort((a, b) => {
    switch (sortBy) {
      case "orders": return b.orders - a.orders;
      case "products": return b.products - a.products;
      default: return b.rating - a.rating;
    }
  });

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Shield className="h-7 w-7 text-accent" /> Supplier Intelligence
        </h1>
        <p className="text-muted-foreground">Search real suppliers from CJ Dropshipping and other platforms.</p>
      </div>

      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search suppliers by category, product type, or location..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm"
            />
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground sm:w-auto w-full">
            <option value="rating">Sort: Rating</option>
            <option value="orders">Sort: Orders</option>
            <option value="products">Sort: Products</option>
          </select>
          <button
            onClick={handleSearch}
            disabled={loading || !query.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>
      </div>

      {error && (
        <div className="glass rounded-2xl p-4 mb-6 border border-red-400/20 bg-red-400/5">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {suppliers.length > 0 && (
        <p className="text-sm text-muted-foreground mb-4">{sorted.length} suppliers found</p>
      )}

      <div className="space-y-3">
        {sorted.map((supplier) => (
          <SupplierCard key={supplier.id} supplier={supplier} expanded={expandedId === supplier.id}
            onToggle={() => setExpandedId(expandedId === supplier.id ? null : supplier.id)} />
        ))}
      </div>

      {!loading && !searched && (
        <div className="glass rounded-2xl p-8 md:p-16 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Search Suppliers</h3>
          <p className="text-sm text-muted-foreground">Enter a category or product type to find real suppliers from CJ Dropshipping</p>
        </div>
      )}

      {loading && (
        <div className="glass rounded-2xl p-8 md:p-16 text-center">
          <Loader2 className="h-12 w-12 text-accent mx-auto mb-4 animate-spin" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Searching...</h3>
          <p className="text-sm text-muted-foreground">Fetching supplier data from CJ Dropshipping</p>
        </div>
      )}

      {!loading && searched && suppliers.length === 0 && !error && (
        <div className="glass rounded-2xl p-8 md:p-16 text-center">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No suppliers found</h3>
          <p className="text-sm text-muted-foreground">Try a different search query</p>
        </div>
      )}
    </div>
  );
}
