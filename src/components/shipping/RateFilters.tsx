"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, X, ChevronDown, CheckCircle2 } from "lucide-react";
import type { CarrierId, CarrierRateResponse } from "@/types/shipping";
import { CARRIER_CONFIGS } from "@/types/shipping";

interface RateFiltersProps {
  rates: CarrierRateResponse[];
  onFilter: (filtered: CarrierRateResponse[]) => void;
}

interface FilterState {
  carriers: CarrierId[];
  serviceLevels: string[];
  requireTracking: boolean;
  requireInsurance: boolean;
  requireGuaranteed: boolean;
  requireCustomsHandled: boolean;
  maxPrice: string;
  maxDays: string;
}

const defaultFilters: FilterState = {
  carriers: CARRIER_CONFIGS.map((c) => c.id),
  serviceLevels: ["economy", "standard", "express", "priority"],
  requireTracking: false,
  requireInsurance: false,
  requireGuaranteed: false,
  requireCustomsHandled: false,
  maxPrice: "",
  maxDays: "",
};

export default function RateFilters({ rates, onFilter }: RateFiltersProps) {
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [expanded, setExpanded] = useState(false);
  const activeCount = countActiveFilters(filters);

  const applyFilters = (newFilters: FilterState) => {
    setFilters(newFilters);
    const filtered = rates.filter((r) => {
      if (!newFilters.carriers.includes(r.carrierId)) return false;
      if (!newFilters.serviceLevels.includes(r.serviceLevel)) return false;
      if (newFilters.requireTracking && !r.trackingIncluded) return false;
      if (newFilters.requireInsurance && !r.insuranceIncluded) return false;
      if (newFilters.requireGuaranteed && !r.guaranteedDelivery) return false;
      if (newFilters.requireCustomsHandled && !r.customsHandled) return false;
      if (newFilters.maxPrice && r.cost > parseFloat(newFilters.maxPrice)) return false;
      if (newFilters.maxDays && r.estimatedDays.min > parseInt(newFilters.maxDays)) return false;
      return true;
    });
    onFilter(filtered);
  };

  const toggleCarrier = (id: CarrierId) => {
    const next = filters.carriers.includes(id)
      ? filters.carriers.filter((c) => c !== id)
      : [...filters.carriers, id];
    applyFilters({ ...filters, carriers: next });
  };

  const toggleServiceLevel = (sl: string) => {
    const next = filters.serviceLevels.includes(sl)
      ? filters.serviceLevels.filter((s) => s !== sl)
      : [...filters.serviceLevels, sl];
    applyFilters({ ...filters, serviceLevels: next });
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
    onFilter(rates);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass rounded-xl overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface/30 transition-all"
      >
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Filters</span>
          {activeCount > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-accent text-white text-[9px] font-bold"
            >
              {activeCount}
            </motion.span>
          )}
        </div>
        <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </motion.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-t border-white/5 pt-3">
              {/* Carrier Filters */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Carriers</p>
                <div className="flex flex-wrap gap-1.5">
                  {CARRIER_CONFIGS.map((carrier) => {
                    const active = filters.carriers.includes(carrier.id);
                    return (
                      <motion.button
                        key={carrier.id}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleCarrier(carrier.id)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                          active
                            ? "border-accent/30 bg-accent/10 text-accent"
                            : "border-white/5 bg-surface text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>{carrier.icon}</span>
                        {carrier.name.split(" ")[0]}
                        {active && <CheckCircle2 className="h-2.5 w-2.5" />}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Service Level Filters */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Service Level</p>
                <div className="flex flex-wrap gap-1.5">
                  {["economy", "standard", "express", "priority"].map((sl) => {
                    const active = filters.serviceLevels.includes(sl);
                    const colorMap: Record<string, string> = {
                      economy: active ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-400" : "",
                      standard: active ? "border-blue-400/30 bg-blue-400/10 text-blue-400" : "",
                      express: active ? "border-purple-400/30 bg-purple-400/10 text-purple-400" : "",
                      priority: active ? "border-amber-400/30 bg-amber-400/10 text-amber-400" : "",
                    };
                    return (
                      <motion.button
                        key={sl}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => toggleServiceLevel(sl)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                          colorMap[sl] || (active ? "border-accent/30 bg-accent/10 text-accent" : "border-white/5 bg-surface text-muted-foreground hover:text-foreground")
                        }`}
                      >
                        {sl}
                        {active && <CheckCircle2 className="h-2.5 w-2.5" />}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Feature Toggles */}
              <div>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Required Features</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: "requireTracking" as const, label: "Tracking" },
                    { key: "requireInsurance" as const, label: "Insurance" },
                    { key: "requireGuaranteed" as const, label: "Guaranteed" },
                    { key: "requireCustomsHandled" as const, label: "Customs Handled" },
                  ].map((feat) => (
                    <motion.button
                      key={feat.key}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => applyFilters({ ...filters, [feat.key]: !filters[feat.key] })}
                      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border transition-all ${
                        filters[feat.key]
                          ? "border-accent/30 bg-accent/10 text-accent"
                          : "border-white/5 bg-surface text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <motion.div
                        animate={filters[feat.key] ? { scale: [1, 1.2, 1] } : {}}
                        className={`w-3 h-3 rounded border flex items-center justify-center ${filters[feat.key] ? "bg-accent border-accent" : "border-white/20"}`}
                      >
                        {filters[feat.key] && <CheckCircle2 className="h-2 w-2 text-white" />}
                      </motion.div>
                      {feat.label}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Price & Days Limits */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block font-medium">Max Price (USD)</label>
                  <input
                    type="number"
                    min="0"
                    value={filters.maxPrice}
                    onChange={(e) => applyFilters({ ...filters, maxPrice: e.target.value })}
                    placeholder="No limit"
                    className="w-full px-3 py-1.5 bg-surface border border-white/10 rounded-lg text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block font-medium">Max Days</label>
                  <input
                    type="number"
                    min="1"
                    value={filters.maxDays}
                    onChange={(e) => applyFilters({ ...filters, maxDays: e.target.value })}
                    placeholder="No limit"
                    className="w-full px-3 py-1.5 bg-surface border border-white/10 rounded-lg text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
                  />
                </div>
              </div>

              {/* Reset */}
              {activeCount > 0 && (
                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-medium text-red-400 bg-red-400/10 border border-red-400/20 hover:bg-red-400/20 transition-all"
                >
                  <X className="h-2.5 w-2.5" /> Clear All Filters
                </motion.button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function countActiveFilters(f: FilterState): number {
  let count = 0;
  if (f.carriers.length < CARRIER_CONFIGS.length) count++;
  if (f.serviceLevels.length < 4) count++;
  if (f.requireTracking) count++;
  if (f.requireInsurance) count++;
  if (f.requireGuaranteed) count++;
  if (f.requireCustomsHandled) count++;
  if (f.maxPrice) count++;
  if (f.maxDays) count++;
  return count;
}
