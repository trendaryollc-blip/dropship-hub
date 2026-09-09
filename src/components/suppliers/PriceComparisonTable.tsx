"use client";

import { useState, useMemo } from "react";
import {
  DollarSign, Star, Shield, Crown, Package,
  Loader2, Calculator, Search,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { PriceIntelligenceProduct, SupplierOffer } from "@/types/supplier";
import { badgeConfig } from "@/components/suppliers/supplier-shared";
import { useAPI } from "@/hooks/useAPI";

function MarginBar({ margin }: { margin: number }) {
  const color = margin >= 30 ? "bg-emerald-500" : margin >= 15 ? "bg-blue-500" : margin >= 0 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${Math.min(Math.max(margin, 0), 100)}%` }} />
      </div>
      <span className={`text-[10px] font-medium ${margin >= 30 ? "text-emerald-400" : margin >= 15 ? "text-blue-400" : margin >= 0 ? "text-amber-400" : "text-red-400"}`}>
        {margin.toFixed(1)}%
      </span>
    </div>
  );
}

function OfferCard({ offer, rank, sellingPrice }: { offer: SupplierOffer; rank: number; sellingPrice: number }) {
  const badge = badgeConfig[offer.trustBadge] || badgeConfig.bronze;
  const isBest = rank === 0;
  const actualMargin = sellingPrice > 0 ? ((sellingPrice - offer.totalCostPerUnit) / sellingPrice) * 100 : offer.estimatedMargin;

  return (
    <div className={`glass rounded-xl border p-4 transition-all ${isBest ? "border-emerald-500/30 bg-emerald-500/5" : "border-border hover:border-accent/20"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {isBest && (
            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
              <Crown className="h-4 w-4 text-emerald-400" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{offer.supplierName}</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${badge.color} ${badge.border}`}>
                {badge.label}
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {isBest ? "Best Value" : `#${rank + 1} ranked`}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-display text-lg font-bold text-foreground">${offer.totalCostPerUnit.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">per unit</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-3">
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground">Unit Price</span>
          <p className="text-xs font-medium text-foreground">${offer.unitPrice.toFixed(2)}</p>
        </div>
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground">Shipping</span>
          <p className={`text-xs font-medium ${offer.shippingCost === 0 ? "text-emerald-400" : "text-foreground"}`}>
            {offer.shippingCost === 0 ? "Free" : `$${offer.shippingCost.toFixed(2)}`}
          </p>
        </div>
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground">Delivery</span>
          <p className="text-xs font-medium text-foreground">{offer.shippingDays}d</p>
        </div>
        <div className="space-y-1">
          <span className="text-[9px] text-muted-foreground">MOQ</span>
          <p className="text-xs font-medium text-foreground">{offer.moq}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="h-3 w-3 text-amber-400 fill-current" />
            <span className="text-[10px] text-foreground">{offer.reliabilityScore}%</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="h-3 w-3 text-blue-400" />
            <span className="text-[10px] text-foreground">{offer.qualityScore}/100</span>
          </div>
          {offer.sampleAvailable && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20">
              Sample ${offer.samplePrice}
            </span>
          )}
        </div>
        <MarginBar margin={actualMargin} />
      </div>
    </div>
  );
}

export default function PriceComparisonTable({ productQuery }: { productQuery?: string }) {
  const [searchInput, setSearchInput] = useState(productQuery || "");
  const [sellingPriceInput, setSellingPriceInput] = useState("");
  const [activeQuery, setActiveQuery] = useState(productQuery || "");
  const [sellingPrice, setSellingPrice] = useState(0);
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const apiUrl = activeQuery
    ? `/api/suppliers/price-intel?product=${encodeURIComponent(activeQuery)}${sellingPrice ? `&sellingPrice=${sellingPrice}` : ""}`
    : null;

  const { data, isLoading, mutate: _mutate } = useAPI<{ result?: PriceIntelligenceProduct; cached?: boolean; error?: string }>(apiUrl);
  const result = data?.result;

  const handleSearch = () => {
    const price = parseFloat(sellingPriceInput) || 0;
    setSellingPrice(price);
    setActiveQuery(searchInput);
  };

  const sortedOffers = useMemo(() => {
    if (!result) return [];
    return [...result.offers].sort((a, b) => {
      const marginA = sellingPrice > 0 ? ((sellingPrice - a.totalCostPerUnit) / sellingPrice) * 100 : a.estimatedMargin;
      const marginB = sellingPrice > 0 ? ((sellingPrice - b.totalCostPerUnit) / sellingPrice) * 100 : b.estimatedMargin;
      return marginB - marginA;
    });
  }, [result, sellingPrice]);

  return (
    <div ref={ref} className={`space-y-4 transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}>
      {/* Search Bar */}
      <div className="glass rounded-2xl border border-border p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-foreground">Price Intelligence</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Search product to compare prices across suppliers..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50"
            />
          </div>
          <div className="relative w-full sm:w-36">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="number"
              value={sellingPriceInput}
              onChange={(e) => setSellingPriceInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Selling $"
              className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!searchInput.trim()}
            className="px-6 py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-hover active:scale-[0.98] transition-all disabled:opacity-40"
          >
            Compare
          </button>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="glass rounded-2xl p-8 text-center">
          <Loader2 className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-muted-foreground">Finding best prices across suppliers...</p>
        </div>
      )}

      {/* Results */}
      {!isLoading && result && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-foreground">{result.normalizedProductName}</h3>
              <p className="text-[10px] text-muted-foreground">{result.offers.length} supplier{result.offers.length !== 1 ? "s" : ""} found</p>
            </div>
            {sellingPrice > 0 && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground">Your selling price</p>
                <p className="text-sm font-bold text-foreground">${sellingPrice.toFixed(2)}</p>
              </div>
            )}
          </div>

          {sortedOffers.map((offer, i) => (
            <OfferCard key={offer.supplierId} offer={offer} rank={i} sellingPrice={sellingPrice} />
          ))}

          {sortedOffers.length === 0 && (
            <div className="glass rounded-2xl p-8 text-center">
              <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No supplier offers found</p>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !result && (
        <div className="glass rounded-2xl p-8 text-center">
          <Calculator className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">Search for a product to compare prices</p>
          <p className="text-[10px] text-muted-foreground/60">Compare costs, shipping, and margins across multiple suppliers</p>
        </div>
      )}
    </div>
  );
}
