"use client";

import { useState } from "react";
import { Truck, Calculator, Loader2, Clock, DollarSign, Globe, ChevronRight } from "lucide-react";
import type { FulfillmentOrderItem } from "@/types/fulfillment";

interface ShippingEstimatorProps {
  items: FulfillmentOrderItem[];
  destination: { country: string; state?: string; zipCode?: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  authFetch: any;
}

interface ShippingBreakdown {
  baseRate: number;
  methodMultiplier: number;
  internationalSurcharge: number;
  total: number;
}

interface ShippingEstimate {
  estimatedCost: number;
  estimatedDays: { min: number; max: number };
  carrier: string;
  method: string;
  breakdown: ShippingBreakdown;
}

type ShippingMethod = "economy" | "standard" | "express";

const METHOD_CONFIG: Record<ShippingMethod, { label: string; color: string }> = {
  economy: { label: "Economy", color: "text-emerald-400" },
  standard: { label: "Standard", color: "text-blue-400" },
  express: { label: "Express", color: "text-purple-400" },
};

export default function ShippingEstimator({ items, destination, authFetch }: ShippingEstimatorProps) {
  const [method, setMethod] = useState<ShippingMethod>("standard");
  const [estimate, setEstimate] = useState<ShippingEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasItems = items && items.length > 0;
  const hasDestination = destination && destination.country;

  const fetchEstimate = async () => {
    if (!hasItems || !hasDestination) return;

    setLoading(true);
    setError(null);
    try {
      const res = await authFetch("/api/fulfillment/shipping-estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            supplierId: item.supplierId,
          })),
          destination,
          shippingMethod: method,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to estimate shipping");
      }

      const data = await res.json();
      setEstimate(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to estimate shipping");
    } finally {
      setLoading(false);
    }
  };

  if (!hasItems || !hasDestination) {
    return (
      <div className="glass rounded-xl p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Truck className="h-4 w-4 text-accent" /> Shipping Estimate
        </h3>
        <div className="text-center py-6">
          <Truck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">N/A — add items and destination to estimate</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <Truck className="h-4 w-4 text-accent" /> Shipping Estimate
      </h3>

      {/* Method selector */}
      <div className="flex gap-2 mb-4">
        {(Object.keys(METHOD_CONFIG) as ShippingMethod[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMethod(m); setEstimate(null); }}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
              method === m
                ? "border-accent/30 bg-accent/10 text-accent"
                : "border-white/10 bg-surface/50 text-muted-foreground hover:border-white/20"
            }`}
          >
            {METHOD_CONFIG[m].label}
          </button>
        ))}
      </div>

      {/* Estimate button */}
      {!estimate && (
        <button
          onClick={fetchEstimate}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent/20 text-accent rounded-lg text-sm font-medium hover:bg-accent/30 transition-all disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Calculator className="h-4 w-4" />
          )}
          {loading ? "Estimating..." : "Estimate Shipping Cost"}
        </button>
      )}

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* Results */}
      {estimate && (
        <div className="space-y-4 mt-2">
          {/* Main cost */}
          <div className="text-center p-4 rounded-lg bg-surface/50 border border-white/5">
            <p className="text-3xl font-bold text-accent">${estimate.estimatedCost.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground mt-1">Estimated shipping cost</p>
          </div>

          {/* Delivery info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-surface/50 border border-white/5">
              <Clock className="h-4 w-4 text-blue-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">
                  {estimate.estimatedDays.min}–{estimate.estimatedDays.max} days
                </p>
                <p className="text-[10px] text-muted-foreground">Delivery estimate</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-lg bg-surface/50 border border-white/5">
              <Globe className="h-4 w-4 text-purple-400 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-foreground">{estimate.carrier}</p>
                <p className="text-[10px] text-muted-foreground">Carrier</p>
              </div>
            </div>
          </div>

          {/* Breakdown */}
          <div className="p-3 rounded-lg bg-surface/50 border border-white/5">
            <div className="flex items-center gap-1.5 mb-2">
              <DollarSign className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Cost Breakdown</span>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Base rate</span>
                <span className="text-foreground">${estimate.breakdown.baseRate.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Method multiplier</span>
                <span className={METHOD_CONFIG[estimate.method as ShippingMethod]?.color || "text-foreground"}>
                  ×{estimate.breakdown.methodMultiplier}
                </span>
              </div>
              {estimate.breakdown.internationalSurcharge > 0 && (
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">International surcharge</span>
                  <span className="text-amber-400">+${estimate.breakdown.internationalSurcharge.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-white/5 pt-1.5 flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-accent">${estimate.breakdown.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Recalculate */}
          <button
            onClick={fetchEstimate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
          >
            <ChevronRight className="h-3 w-3" />
            Recalculate
          </button>
        </div>
      )}
    </div>
  );
}
