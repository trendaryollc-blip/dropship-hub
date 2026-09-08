"use client";

import { useState, useMemo } from "react";
import { X, Shield, MapPin, Star, Truck, Tag, DollarSign, Search, Package, Award } from "lucide-react";
import { badgeConfig } from "./supplier-shared";

export interface SupplierFilters {
  badges: string[];
  locations: string[];
  minRating: number;
  shippingSpeed: string;
  specializations: string[];
  minPriceCompetitiveness: number;
  certifications: string[];
  search: string;
}

interface SupplierFilterPanelProps {
  filters: SupplierFilters;
  setFilters: (f: SupplierFilters) => void;
  uniqueLocations: { country: string; flag: string }[];
  allSpecializations: string[];
  allCertifications: string[];
  resultCount: number;
  filteredCount: number;
}

export default function SupplierFilterPanel({
  filters,
  setFilters,
  uniqueLocations,
  allSpecializations,
  allCertifications,
  resultCount,
  filteredCount,
}: SupplierFilterPanelProps) {
  const [specSearch, setSpecSearch] = useState("");

  const filteredSpecs = useMemo(() => {
    if (!specSearch) return allSpecializations.slice(0, 12);
    return allSpecializations.filter((s) =>
      s.toLowerCase().includes(specSearch.toLowerCase())
    ).slice(0, 12);
  }, [allSpecializations, specSearch]);

  const toggleBadge = (b: string) => {
    setFilters({
      ...filters,
      badges: filters.badges.includes(b)
        ? filters.badges.filter((x) => x !== b)
        : [...filters.badges, b],
    });
  };

  const toggleLocation = (l: string) => {
    setFilters({
      ...filters,
      locations: filters.locations.includes(l)
        ? filters.locations.filter((x) => x !== l)
        : [...filters.locations, l],
    });
  };

  const toggleSpecialization = (s: string) => {
    setFilters({
      ...filters,
      specializations: filters.specializations.includes(s)
        ? filters.specializations.filter((x) => x !== s)
        : [...filters.specializations, s],
    });
  };

  const toggleCertification = (c: string) => {
    setFilters({
      ...filters,
      certifications: filters.certifications.includes(c)
        ? filters.certifications.filter((x) => x !== c)
        : [...filters.certifications, c],
    });
  };

  const clearAll = () => {
    setFilters({
      badges: [], locations: [], minRating: 0, shippingSpeed: "",
      specializations: [], minPriceCompetitiveness: 0, certifications: [], search: "",
    });
  };

  const hasActiveFilters =
    filters.badges.length > 0 ||
    filters.locations.length > 0 ||
    filters.minRating > 0 ||
    filters.shippingSpeed !== "" ||
    filters.specializations.length > 0 ||
    filters.minPriceCompetitiveness > 0 ||
    filters.certifications.length > 0;

  const hiddenCount = resultCount - filteredCount;

  return (
    <div className="glass rounded-2xl border border-border p-5 space-y-5 sticky top-24">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-display text-sm font-semibold text-foreground">Filters</h3>
          {hasActiveFilters && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent font-medium">
              {hiddenCount} hidden
            </span>
          )}
        </div>
        {hasActiveFilters && (
          <button onClick={clearAll} className="text-[10px] text-accent hover:text-accent/80">
            Clear all
          </button>
        )}
      </div>

      {/* Trust Badge */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Shield className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Trust Badge</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["gold", "silver", "bronze"] as const).map((b) => (
            <button
              key={b}
              onClick={() => toggleBadge(b)}
              className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all font-medium ${
                filters.badges.includes(b)
                  ? `${badgeConfig[b].color} ${badgeConfig[b].border}`
                  : "bg-surface border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {badgeConfig[b].label}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Location</span>
          {filters.locations.length > 0 && (
            <span className="text-[10px] text-accent">({filters.locations.length})</span>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {uniqueLocations.map((l) => (
            <button
              key={l.country}
              onClick={() => toggleLocation(l.country)}
              className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all ${
                filters.locations.includes(l.country)
                  ? "bg-accent/10 border-accent/20 text-accent"
                  : "bg-surface border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {l.flag} {l.country}
            </button>
          ))}
        </div>
      </div>

      {/* Min Rating */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Star className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Min Rating</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 4.0, 4.5, 4.7].map((r) => (
            <button
              key={r}
              onClick={() => setFilters({ ...filters, minRating: filters.minRating === r ? 0 : r })}
              className={`flex-1 text-[10px] px-2 py-1.5 rounded-lg border transition-all ${
                filters.minRating === r
                  ? "bg-amber-400/10 border-amber-400/20 text-amber-400"
                  : "bg-surface border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === 0 ? "Any" : `${r}+`}
            </button>
          ))}
        </div>
      </div>

      {/* Shipping Speed */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Truck className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Shipping Speed</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: "", label: "Any" },
            { value: "express", label: "Express (4d)" },
            { value: "standard", label: "Standard (10d)" },
            { value: "economy", label: "Economy" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFilters({ ...filters, shippingSpeed: filters.shippingSpeed === opt.value ? "" : opt.value })}
              className={`text-[10px] px-2.5 py-1.5 rounded-lg border transition-all ${
                filters.shippingSpeed === opt.value
                  ? "bg-blue-400/10 border-blue-400/20 text-blue-400"
                  : "bg-surface border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Specialization */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <Tag className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Specialization</span>
          {filters.specializations.length > 0 && (
            <span className="text-[10px] text-accent">({filters.specializations.length})</span>
          )}
        </div>
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
          <input
            type="text"
            value={specSearch}
            onChange={(e) => setSpecSearch(e.target.value)}
            placeholder="Search specializations..."
            className="w-full pl-7 pr-3 py-1.5 rounded-lg bg-surface border border-border text-[10px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
          {filteredSpecs.map((s) => (
            <button
              key={s}
              onClick={() => toggleSpecialization(s)}
              className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
                filters.specializations.includes(s)
                  ? "bg-violet-400/10 border-violet-400/20 text-violet-400"
                  : "bg-surface border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Price Competitiveness */}
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Price Competitiveness</span>
          {filters.minPriceCompetitiveness > 0 && (
            <span className="text-[10px] text-accent">{filters.minPriceCompetitiveness}%+</span>
          )}
        </div>
        <div className="flex gap-1.5">
          {[0, 50, 70, 90].map((p) => (
            <button
              key={p}
              onClick={() => setFilters({ ...filters, minPriceCompetitiveness: filters.minPriceCompetitiveness === p ? 0 : p })}
              className={`flex-1 text-[10px] px-1.5 py-1.5 rounded-lg border transition-all ${
                filters.minPriceCompetitiveness === p
                  ? "bg-emerald-400/10 border-emerald-400/20 text-emerald-400"
                  : "bg-surface border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === 0 ? "Any" : `${p}%+`}
            </button>
          ))}
        </div>
      </div>

      {/* Certifications */}
      {allCertifications.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <Award className="h-3 w-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Certifications</span>
            {filters.certifications.length > 0 && (
              <span className="text-[10px] text-accent">({filters.certifications.length})</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {allCertifications.slice(0, 8).map((c) => (
              <button
                key={c}
                onClick={() => toggleCertification(c)}
                className={`text-[10px] px-2 py-1 rounded-lg border transition-all ${
                  filters.certifications.includes(c)
                    ? "bg-cyan-400/10 border-cyan-400/20 text-cyan-400"
                    : "bg-surface border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {hasActiveFilters && (
        <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">Active:</span>
          {filters.badges.map((b) => (
            <button
              key={b}
              onClick={() => toggleBadge(b)}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {badgeConfig[b]?.label || b}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
          {filters.locations.map((l) => (
            <button
              key={l}
              onClick={() => toggleLocation(l)}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {l}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
          {filters.specializations.map((s) => (
            <button
              key={s}
              onClick={() => toggleSpecialization(s)}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {s}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
          {filters.certifications.map((c) => (
            <button
              key={c}
              onClick={() => toggleCertification(c)}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {c}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
          {filters.minRating > 0 && (
            <button
              onClick={() => setFilters({ ...filters, minRating: 0 })}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {filters.minRating}+ stars
              <X className="h-2.5 w-2.5" />
            </button>
          )}
          {filters.shippingSpeed && (
            <button
              onClick={() => setFilters({ ...filters, shippingSpeed: "" })}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {filters.shippingSpeed}
              <X className="h-2.5 w-2.5" />
            </button>
          )}
          {filters.minPriceCompetitiveness > 0 && (
            <button
              onClick={() => setFilters({ ...filters, minPriceCompetitiveness: 0 })}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors"
            >
              {filters.minPriceCompetitiveness}%+ price
              <X className="h-2.5 w-2.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
