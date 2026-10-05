"use client";

import { Check, Package, Truck, Store } from "lucide-react";

interface SourcingStepsProps {
  hasProduct: boolean;
  hasSupplier: boolean;
  hasListed: boolean;
}

const STEPS = [
  { key: "product", label: "Choose product", icon: Package },
  { key: "supplier", label: "Choose supplier", icon: Truck },
  { key: "list", label: "List on store", icon: Store },
] as const;

/**
 * Visual guide for the product → supplier → store workflow. Purely
 * presentational; each step's completion is decided by the parent from real
 * state (product loaded, supplier assignment saved, listing pushed).
 */
export default function SourcingSteps({ hasProduct, hasSupplier, hasListed }: SourcingStepsProps) {
  const done: Record<string, boolean> = {
    product: hasProduct,
    supplier: hasSupplier,
    list: hasListed,
  };

  return (
    <ol className="mb-3 flex items-center gap-1 text-[10px]">
      {STEPS.map((step, i) => {
        const complete = done[step.key];
        const active = !complete && (i === 0 || done[STEPS[i - 1].key]);
        return (
          <li key={step.key} className="flex items-center gap-1">
            <span
              className={`flex items-center gap-1.5 rounded-full border px-2 py-1 font-medium ${
                complete
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : active
                    ? "border-accent/40 bg-accent/10 text-accent"
                    : "border-white/10 text-muted-foreground"
              }`}
            >
              {complete ? <Check className="h-3 w-3" /> : <step.icon className="h-3 w-3" />}
              {step.label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px w-3 bg-white/15" />}
          </li>
        );
      })}
    </ol>
  );
}
