"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search, Shield, MapPin, Clock, Star, Filter, Truck,
  Package, ArrowRight, RefreshCw, CheckSquare, Square, X,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { SupplierProfile } from "@/types/supplier";
import ViewToggle from "@/components/ui/ViewToggle";
import SupplierListItem from "@/components/suppliers/SupplierListItem";
import { badgeConfig, ScoreRing, dataSourceConfig } from "@/components/suppliers/supplier-shared";
import { useAPI } from "@/hooks/useAPI";

type FilterState = { badges: string[]; locations: string[]; minRating: number; shippingSpeed: string; search: string };
type SortBy = "rating" | "reliability" | "response" | "orders";

function ComparisonModal({ suppliers, onClose }: { suppliers: SupplierProfile[]; onClose: () => void }) {
  if (suppliers.length === 0) return null;

  const metrics = [
    { label: "Rating", key: "rating", format: (v: number) => v.toFixed(1), best: "max" as const },
    { label: "Reliability Score", key: "reliabilityScore", format: (v: number) => `${v}%`, best: "max" as const },
    { label: "Response Time", key: "responseTimeHours", format: (v: number) => `${v}h`, best: "min" as const },
    { label: "Shipping Days (US)", key: "shippingDays", format: (v: number) => `${v} days`, best: "min" as const },
    { label: "Order Completion", key: "orderCompletionRate", format: (v: number) => `${v}%`, best: "max" as const },
    { label: "Dispute Rate", key: "disputeRate", format: (v: number) => `${v}%`, best: "min" as const },
    { label: "Monthly Orders", key: "monthlyOrders", format: (v: number) => v.toLocaleString(), best: "max" as const },
    { label: "Quality Score", key: "qualityScore", format: (v: number) => `${v}/100`, best: "max" as const },
    { label: "Communication Score", key: "communicationScore", format: (v: number) => `${v}/100`, best: "max" as const },
  ];

  const getBestValue = (key: string, best: "max" | "min") => {
    const values = suppliers.map((s) => {
      const stats = s.stats as unknown as Record<string, number>;
      return stats[key];
    });
    return best === "max" ? Math.max(...values) : Math.min(...values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Compare Suppliers ({suppliers.length})
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="overflow-auto max-h-[calc(90vh-80px)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-xs text-muted-foreground font-medium w-40">Metric</th>
                {suppliers.map((s) => (
                  <th key={s.id} className="text-center p-4 min-w-[150px]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-purple-400/20 border border-border flex items-center justify-center font-display text-xs font-bold text-foreground">
                        {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-xs font-semibold text-foreground">{s.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${badgeConfig[s.trustBadge].color} ${badgeConfig[s.trustBadge].border}`}>{badgeConfig[s.trustBadge].label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const bestValue = getBestValue(metric.key, metric.best);
                return (
                  <tr key={metric.key} className="border-b border-border/50 hover:bg-surface/30">
                    <td className="p-4 text-xs text-muted-foreground">{metric.label}</td>
                    {suppliers.map((s) => {
                      const stats = s.stats as unknown as Record<string, number>;
                      const value = stats[metric.key];
                      const isBest = value === bestValue;
                      return (
                        <td key={s.id} className="text-center p-4">
                          <span className={`text-sm font-medium ${isBest ? "text-emerald-400" : "text-foreground"}`}>
                            {metric.format(value)}
                          </span>
                          {isBest && suppliers.length > 1 && (
                            <span className="block text-[9px] text-emerald-400 mt-0.5">Best</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr className="border-b border-border/50">
                <td className="p-4 text-xs text-muted-foreground">Data Source</td>
                {suppliers.map((s) => (
                  <td key={s.id} className="text-center p-4">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${dataSourceConfig[s.dataSource].color}`}>
                      {dataSourceConfig[s.dataSource].label}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-xs text-muted-foreground">Actions</td>
                {suppliers.map((s) => (
                  <td key={s.id} className="text-center p-4">
                    <Link href={`/suppliers/${s.id}`} className="text-xs text-accent hover:text-accent/80">
                      View Details
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SupplierCard({ supplier, index, isSelected, onToggleSelect }: { supplier: SupplierProfile; index: number; isSelected: boolean; onToggleSelect: (id: string) => void }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.preventDefault(); onToggleSelect(supplier.id); }}
        className={`absolute top-3 right-3 z-10 p-1.5 rounded-lg transition-all ${isSelected ? "bg-accent/20 text-accent" : "bg-surface/80 text-muted-foreground hover:text-foreground"}`}
      >
        {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
      </button>
      <Link href={`/suppliers/${supplier.id}`}>
        <div ref={ref} className={`glass rounded-2xl border border-border p-5 hover:border-accent/20 transition-all duration-500 cursor-pointer ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${isSelected ? "border-accent/40 bg-accent/5" : ""}`} style={{ transitionDelay: `${index * 60}ms` }}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-purple-400/20 border border-border flex items-center justify-center font-display text-sm font-bold text-foreground shrink-0">
              {supplier.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-display text-sm font-semibold text-foreground">{supplier.name}</h3>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${badgeConfig[supplier.trustBadge].color} ${badgeConfig[supplier.trustBadge].border}`}>{badgeConfig[supplier.trustBadge].label}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${dataSourceConfig[supplier.dataSource].color}`}>{dataSourceConfig[supplier.dataSource].label}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {supplier.flag} {supplier.location}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {supplier.stats.responseTimeHours > 0 ? supplier.stats.responseTime : "—"}</span>
                <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {supplier.stats.shippingDays > 0 ? `${supplier.stats.shippingDays}d shipping` : "—"}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 sm:shrink-0">
            <div className="flex flex-col items-center gap-1.5">
              <ScoreRing score={supplier.stats.reliabilityScore} size={36} />
              <span className="text-[8px] text-muted-foreground">Reliability</span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-display text-sm font-bold">{supplier.stats.rating > 0 ? supplier.stats.rating.toFixed(1) : "—"}</span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">{supplier.stats.reviews > 0 ? `${supplier.stats.reviews.toLocaleString()} reviews` : "No data"}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
            <span><Package className="h-3 w-3 inline mr-1" />{supplier.specializations.slice(0, 2).join(", ")}</span>
            <span>{supplier.stats.monthlyOrders > 0 ? `${supplier.stats.monthlyOrders.toLocaleString()} orders/mo` : "Orders not tracked"}</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
      </Link>
    </div>
  );
}

function SuppliersContent() {
  const searchParams = useSearchParams();
  const initialProduct = searchParams.get("product") || "";
  const initialCategory = searchParams.get("category") || "";

  const { data: suppliersData, error: apiError, isLoading: loading, mutate } = useAPI<{ suppliers?: SupplierProfile[]; error?: string }>("/api/suppliers");
  const suppliers = suppliersData?.suppliers ?? [];
  const error = apiError ? "Failed to load suppliers" : suppliersData?.error ?? null;

  const [filters, setFilters] = useState<FilterState>({
    search: initialProduct || initialCategory,
    badges: [],
    locations: [],
    minRating: 0,
    shippingSpeed: "",
  });
  const [sortBy, setSortBy] = useState<SortBy>("rating");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);

  const toggleSelectForCompare = (id: string) => {
    setSelectedForCompare((prev) => 
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selectedSuppliers = suppliers.filter((s) => selectedForCompare.includes(s.id));

  const filtered = useMemo(() => {
    let result = [...suppliers];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q) || s.specializations.some((c) => c.toLowerCase().includes(q)) || s.location.toLowerCase().includes(q));
    }
    if (filters.badges.length > 0) result = result.filter((s) => filters.badges.includes(s.trustBadge));
    if (filters.locations.length > 0) result = result.filter((s) => filters.locations.includes(s.country));
    if (filters.minRating > 0) result = result.filter((s) => s.stats.rating >= filters.minRating);
    if (filters.shippingSpeed) {
      const maxDays = filters.shippingSpeed === "express" ? 4 : filters.shippingSpeed === "standard" ? 10 : 99;
      result = result.filter((s) => s.stats.shippingDays <= maxDays);
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "reliability": return b.stats.reliabilityScore - a.stats.reliabilityScore;
        case "response": return a.stats.responseTimeHours - b.stats.responseTimeHours;
        case "orders": return b.stats.monthlyOrders - a.stats.monthlyOrders;
        default: return b.stats.rating - a.stats.rating;
      }
    });
    return result;
  }, [filters, sortBy, suppliers]);

  const toggleBadge = (b: string) => setFilters((f) => ({ ...f, badges: f.badges.includes(b) ? f.badges.filter((x) => x !== b) : [...f.badges, b] }));
  const toggleLocation = (l: string) => setFilters((f) => ({ ...f, locations: f.locations.includes(l) ? f.locations.filter((x) => x !== l) : [...f.locations, l] }));
  const clearFilters = () => setFilters({ search: "", badges: [], locations: [], minRating: 0, shippingSpeed: "" });
  const hasFilters = filters.badges.length > 0 || filters.locations.length > 0 || filters.minRating > 0 || filters.shippingSpeed !== "";

  const uniqueLocations = [...new Set(suppliers.map((s) => s.country))];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Shield className="h-7 w-7 text-accent" /> Supplier Intelligence
        </h1>
        <p className="text-muted-foreground text-sm">{suppliers.length} verified suppliers across {uniqueLocations.length} countries</p>
      </div>

      {loading ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading real supplier data...</p>
        </div>
      ) : error ? (
        <div className="glass rounded-2xl p-8 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Failed to load suppliers</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button onClick={() => mutate()} className="text-sm text-accent hover:text-accent/80 flex items-center gap-2 mx-auto">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      ) : (
        <>
          <div className="glass rounded-2xl p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} placeholder="Search by name, category, or location..." className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 text-sm" />
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground min-h-[44px]">
                  <option value="rating">Top Rated</option>
                  <option value="reliability">Most Reliable</option>
                  <option value="response">Fastest Response</option>
                  <option value="orders">Most Orders</option>
                </select>
                <ViewToggle viewMode={viewMode} setViewMode={setViewMode} />
                <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-3 rounded-xl border text-sm font-medium flex items-center gap-2 transition-all min-h-[44px] ${showFilters || hasFilters ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>
                  <Filter className="h-4 w-4" /> Filters {hasFilters && <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] flex items-center justify-center">{filters.badges.length + filters.locations.length + (filters.minRating > 0 ? 1 : 0) + (filters.shippingSpeed ? 1 : 0)}</span>}
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div className="lg:hidden glass rounded-2xl border border-border p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-semibold text-foreground">Filters</h3>
                {hasFilters && <button onClick={clearFilters} className="text-[10px] text-accent hover:text-accent/80">Clear all</button>}
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Trust Badge</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["gold", "silver", "bronze"] as const).map((b) => (
                    <button key={b} onClick={() => toggleBadge(b)} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${filters.badges.includes(b) ? `${badgeConfig[b].color} ${badgeConfig[b].border}` : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{badgeConfig[b].label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Location</p>
                <div className="flex flex-wrap gap-1.5">
                  {uniqueLocations.map((l) => {
                    const s = suppliers.find((su) => su.country === l);
                    return <button key={l} onClick={() => toggleLocation(l)} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${filters.locations.includes(l) ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{s?.flag || "\ud83c\uddf3"} {l}</button>;
                  })}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Min Rating</p>
                <div className="flex gap-2">
                  {[0, 4.0, 4.5, 4.7].map((r) => (
                    <button key={r} onClick={() => setFilters((f) => ({ ...f, minRating: r }))} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${filters.minRating === r ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{r === 0 ? "Any" : `${r}+`}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Shipping Speed</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["", "express", "standard", "economy"] as const).map((s) => (
                    <button key={s} onClick={() => setFilters((f) => ({ ...f, shippingSpeed: s }))} className={`text-[10px] px-2.5 py-1 rounded-lg border capitalize transition-all ${filters.shippingSpeed === s || (!filters.shippingSpeed && !s) ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{s || "Any"}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-6">
            {showFilters && (
              <div className="w-64 shrink-0 hidden lg:block">
                <div className="glass rounded-2xl border border-border p-5 space-y-5 sticky top-24">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-sm font-semibold text-foreground">Filters</h3>
                    {hasFilters && <button onClick={clearFilters} className="text-[10px] text-accent hover:text-accent/80">Clear all</button>}
                  </div>

                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Trust Badge</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(["gold", "silver", "bronze"] as const).map((b) => (
                        <button key={b} onClick={() => toggleBadge(b)} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${filters.badges.includes(b) ? `${badgeConfig[b].color} ${badgeConfig[b].border}` : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{badgeConfig[b].label}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Location</p>
                    <div className="flex flex-wrap gap-1.5">
                      {uniqueLocations.map((l) => {
                        const s = suppliers.find((su) => su.country === l);
                        return <button key={l} onClick={() => toggleLocation(l)} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${filters.locations.includes(l) ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{s?.flag || "\ud83c\uddf3"} {l}</button>;
                      })}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Min Rating</p>
                    <div className="flex gap-1.5">
                      {[0, 4.0, 4.5, 4.7].map((r) => (
                        <button key={r} onClick={() => setFilters((f) => ({ ...f, minRating: f.minRating === r ? 0 : r }))} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${filters.minRating === r ? "bg-amber-400/10 border-amber-400/20 text-amber-400" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{r === 0 ? "Any" : `${r}+`}</button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Shipping Speed</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(["", "express", "standard", "economy"] as const).map((s) => (
                        <button key={s} onClick={() => setFilters((f) => ({ ...f, shippingSpeed: f.shippingSpeed === s ? "" : s }))} className={`text-[10px] px-2.5 py-1 rounded-lg border capitalize transition-all ${filters.shippingSpeed === s ? "bg-blue-400/10 border-blue-400/20 text-blue-400" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{s || "Any"}</button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex-1 space-y-3">
              <p className="text-sm text-muted-foreground">{filtered.length} suppliers found</p>
              {filtered.length === 0 ? (
                <div className="glass rounded-2xl p-8 md:p-16 text-center">
                  <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="font-display text-lg font-semibold text-foreground mb-2">No suppliers match your filters</h3>
                  <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters</p>
                  <button onClick={clearFilters} className="text-sm text-accent hover:text-accent/80">Clear all filters</button>
                </div>
              ) : viewMode === "grid" ? (
                <div className="space-y-3">
                  {filtered.map((s, i) => (
                    <SupplierCard 
                      key={s.id} 
                      supplier={s} 
                      index={i} 
                      isSelected={selectedForCompare.includes(s.id)}
                      onToggleSelect={toggleSelectForCompare}
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((s, i) => <SupplierListItem key={s.id} supplier={s} index={i} />)}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Comparison Button */}
      {selectedForCompare.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-semibold shadow-lg hover:bg-accent-hover transition-all"
          >
            <CheckSquare className="h-4 w-4" /> Compare {selectedForCompare.length} Suppliers
          </button>
        </div>
      )}

      {/* Comparison Modal */}
      {showComparison && (
        <ComparisonModal 
          suppliers={selectedSuppliers} 
          onClose={() => setShowComparison(false)} 
        />
      )}
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto flex items-center justify-center py-20"><div className="text-center"><div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" /><p className="text-sm text-muted-foreground">Loading suppliers...</p></div></div>}>
      <SuppliersContent />
    </Suspense>
  );
}
