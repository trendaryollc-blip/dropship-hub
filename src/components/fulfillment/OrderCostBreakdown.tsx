"use client";

import { DollarSign } from "lucide-react";
import type { FulfillmentOrder } from "@/types/fulfillment";

export default function OrderCostBreakdown({ order }: { order: FulfillmentOrder }) {
  const totalItemCost = order.items.reduce((sum, item) => sum + item.unitCost * item.quantity, 0);
  const totalItemRevenue = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const estimatedFees = totalItemRevenue * 0.15; // ~15% platform fee estimate
  const actualProfit = order.profit;
  const margin = totalItemRevenue > 0 ? ((actualProfit / totalItemRevenue) * 100).toFixed(1) : "0.0";

  return (
    <div className="glass rounded-xl p-5">
      <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-accent" /> Cost Breakdown
      </h3>

      <div className="space-y-3">
        {/* Revenue */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Revenue</span>
          <span className="text-sm font-semibold text-foreground">${totalItemRevenue.toFixed(2)}</span>
        </div>

        {/* Product Cost */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Product Cost</span>
          <span className="text-sm text-foreground">-${totalItemCost.toFixed(2)}</span>
        </div>

        {/* Platform Fees */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Est. Platform Fees (~15%)</span>
          <span className="text-sm text-foreground">-${estimatedFees.toFixed(2)}</span>
        </div>

        {/* Divider */}
        <div className="border-t border-white/10" />

        {/* Profit */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Profit</span>
          <span className={`text-lg font-bold ${actualProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ${actualProfit.toFixed(2)}
          </span>
        </div>

        {/* Margin */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Margin</span>
          <span className={`text-xs font-semibold ${parseFloat(margin) >= 15 ? "text-emerald-400" : parseFloat(margin) >= 0 ? "text-amber-400" : "text-red-400"}`}>
            {margin}%
          </span>
        </div>

        {/* Per Item Summary */}
        <div className="mt-4 pt-3 border-t border-white/5">
          <p className="text-[10px] text-muted-foreground uppercase mb-2">Per Item</p>
          <div className="space-y-1.5">
            {order.items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground truncate max-w-[60%]">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-foreground">${item.price.toFixed(2)}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-muted-foreground">${item.unitCost.toFixed(2)}</span>
                  <span className="text-emerald-400 font-medium">
                    +${(item.price - item.unitCost).toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
