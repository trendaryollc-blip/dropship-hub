"use client";

import { Truck } from "lucide-react";
import ShippingOptimizerPanel from "@/components/shipping/ShippingOptimizerPanel";

export default function ShippingOptimizerPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-bold text-foreground flex items-center gap-3">
          <Truck className="h-6 w-6 text-accent" />
          Shipping Optimization Engine
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Compare carriers, predict delivery times, auto-select the best shipping method, and calculate customs duties.
        </p>
      </div>
      <ShippingOptimizerPanel />
    </div>
  );
}
