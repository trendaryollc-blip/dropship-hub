"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Search, Shield, MapPin, Clock, Star, Filter, Truck,
  TrendingUp, Package, ArrowRight, X,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { allSuppliers, type ExtendedSupplier } from "@/lib/mock-suppliers";
import ViewToggle from "@/components/ui/ViewToggle";
import SupplierListItem from "@/components/suppliers/SupplierListItem";

const badgeConfig: Record<string, { label: string; color: string; border: string }> = {
  gold: { label: "Gold", color: "text-amber-400 bg-amber-400/10", border: "border-amber-400/20" },
  silver: { label: "Silver", color: "text-slate-300 bg-slate-300/10", border: "border-slate-300/20" },
  bronze: { label: "Bronze", color: "text-orange-400 bg-orange-400/10", border: "border-orange-400/20" },
};

const locationFlags: Record<string, string> = {
  "China": "\ud83c\udde8\ud83c\uddf3", "US": "\ud83c\uddfa\ud83c\uddf8", "Germany": "\ud83c\udde9\ud83c\uddea",
  "Sweden": "\ud83c\uddf8\ud83c\uddea", "Canada": "\ud83c\udde8\ud83c\udde6", "Vietnam": "\ud83c\uddfb\ud83c\uddf3",
  "India": "\ud83c\uddee\ud83c\uddf3", "Japan": "\ud83c\uddef\ud83c\uddf5", "Brazil": "\ud83c\udde7\ud83c\uddf7",
};

type FilterState = { badges: string[]; locations: string[]; minRating: number; shippingSpeed: string; search: string };
type SortBy = "rating" | "reliability" | "response" | "orders";

function ScoreRing({ score, size = 36 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 90 ? "#22c55e" : score >= 75 ? "#3b82f6" : "#f59e0b";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}

function SupplierCard({ supplier, index }: { supplier: ExtendedSupplier; index: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const country = supplier.location.split(", ").pop() || "China";
  const flag = locationFlags[country] || "\ud83c\uddf3";
  const badge = badgeConfig[supplier.trustBadge] || badgeConfig.bronze;

  return (
    <Link href={`/suppliers/${supplier.id}`}>
      <div ref={ref} className={`glass rounded-2xl border border-border p-5 hover:border-accent/20 transition-all duration-500 cursor-pointer ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`} style={{ transitionDelay: `${index * 60}ms` }}>
        <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-purple-400/20 border border-border flex items-center justify-center font-display text-sm font-bold text-foreground shrink-0">
              {supplier.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-display text-sm font-semibold text-foreground">{supplier.name}</h3>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${badge.color} ${badge.border}`}>{badge.label}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {flag} {supplier.location}</span>
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {supplier.responseTime}</span>
                <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {supplier.shippingDays}d shipping</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 sm:shrink-0">
            <div className="flex flex-col items-center gap-1.5">
              <ScoreRing score={supplier.reliabilityScore} size={36} />
              <span className="text-[8px] text-muted-foreground">Reliability</span>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-display text-sm font-bold">{supplier.rating.toFixed(1)}</span>
              </div>
              <p className="text-[9px] text-muted-foreground mt-0.5">{supplier.reviews.toLocaleString()} reviews</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
          </div>
        </div>
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
            <span><Package className="h-3 w-3 inline mr-1" />{supplier.categories.slice(0, 2).join(", ")}</span>
            <span>{supplier.monthlyOrders.toLocaleString()} orders/mo</span>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    </Link>
  );
}

function SuppliersContent() {
  const searchParams = useSearchParams();
  const initialProduct = searchParams.get("product") || "";
  const initialCategory = searchParams.get("category") || "";

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

  const filtered = useMemo(() => {
    let result = [...allSuppliers];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q) || s.categories.some((c) => c.toLowerCase().includes(q)) || s.location.toLowerCase().includes(q));
    }
    if (filters.badges.length > 0) result = result.filter((s) => filters.badges.includes(s.trustBadge));
    if (filters.locations.length > 0) result = result.filter((s) => filters.locations.some((l) => s.location.includes(l)));
    if (filters.minRating > 0) result = result.filter((s) => s.rating >= filters.minRating);
    if (filters.shippingSpeed) {
      const maxDays = filters.shippingSpeed === "express" ? 4 : filters.shippingSpeed === "standard" ? 10 : 99;
      result = result.filter((s) => s.shippingDays <= maxDays);
    }
    result.sort((a, b) => {
      switch (sortBy) {
        case "reliability": return b.reliabilityScore - a.reliabilityScore;
        case "response": return a.responseTime.localeCompare(b.responseTime);
        case "orders": return b.monthlyOrders - a.monthlyOrders;
        default: return b.rating - a.rating;
      }
    });
    return result;
  }, [filters, sortBy]);

  const toggleBadge = (b: string) => setFilters((f) => ({ ...f, badges: f.badges.includes(b) ? f.badges.filter((x) => x !== b) : [...f.badges, b] }));
  const toggleLocation = (l: string) => setFilters((f) => ({ ...f, locations: f.locations.includes(l) ? f.locations.filter((x) => x !== l) : [...f.locations, l] }));
  const clearFilters = () => setFilters({ search: "", badges: [], locations: [], minRating: 0, shippingSpeed: "" });
  const hasFilters = filters.badges.length > 0 || filters.locations.length > 0 || filters.minRating > 0 || filters.shippingSpeed !== "";

  const uniqueLocations = [...new Set(allSuppliers.map((s) => s.location.split(", ").pop() || "China"))];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="mb-2">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Shield className="h-7 w-7 text-accent" /> Supplier Intelligence
        </h1>
        <p className="text-muted-foreground text-sm">{allSuppliers.length} verified suppliers across {uniqueLocations.length} countries</p>
      </div>

      {/* Search + Sort */}
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

      {/* Mobile Filter Panel */}
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
              {uniqueLocations.map((l) => (
                <button key={l} onClick={() => toggleLocation(l)} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${filters.locations.includes(l) ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{locationFlags[l] || "\ud83c\uddf3"} {l}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Min Rating</p>
            <div className="flex gap-2">
              {[0, 3, 3.5, 4, 4.5].map((r) => (
                <button key={r} onClick={() => setFilters((f) => ({ ...f, minRating: r }))} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${filters.minRating === r ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{r === 0 ? "Any" : `${r}+`}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Shipping Speed</p>
            <div className="flex flex-wrap gap-1.5">
              {(["", "3", "5", "7"] as const).map((s) => (
                <button key={s} onClick={() => setFilters((f) => ({ ...f, shippingSpeed: s }))} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${filters.shippingSpeed === s || (!filters.shippingSpeed && !s) ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{s ? `≤${s}d` : "Any"}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-6">
        {/* Filter Sidebar */}
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
                  {uniqueLocations.map((l) => (
                    <button key={l} onClick={() => toggleLocation(l)} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${filters.locations.includes(l) ? "bg-accent/10 border-accent/20 text-accent" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{locationFlags[l] || "\ud83c\uddf3"} {l}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Min Rating</p>
                <div className="flex gap-1.5">
                  {[4.0, 4.5, 4.7].map((r) => (
                    <button key={r} onClick={() => setFilters((f) => ({ ...f, minRating: f.minRating === r ? 0 : r }))} className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all ${filters.minRating === r ? "bg-amber-400/10 border-amber-400/20 text-amber-400" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{r}+</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Shipping Speed</p>
                <div className="flex flex-wrap gap-1.5">
                  {(["express", "standard", "economy"] as const).map((s) => (
                    <button key={s} onClick={() => setFilters((f) => ({ ...f, shippingSpeed: f.shippingSpeed === s ? "" : s }))} className={`text-[10px] px-2.5 py-1 rounded-lg border capitalize transition-all ${filters.shippingSpeed === s ? "bg-blue-400/10 border-blue-400/20 text-blue-400" : "bg-surface border-border text-muted-foreground hover:text-foreground"}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
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
              {filtered.map((s, i) => <SupplierCard key={s.id} supplier={s} index={i} />)}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((s, i) => <SupplierListItem key={s.id} supplier={s} index={i} />)}
            </div>
          )}
        </div>
      </div>
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
