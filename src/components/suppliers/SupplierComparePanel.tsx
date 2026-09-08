"use client";

import { useState } from "react";
import { X, GitCompare, Loader2, Sparkles, ChevronDown } from "lucide-react";
import type { SupplierProfile } from "@/types/supplier";
import { badgeConfig, ScoreRing } from "./supplier-shared";

interface SupplierComparePanelProps {
  selectedSuppliers: SupplierProfile[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onAICompare?: (suppliers: SupplierProfile[]) => void;
}

export default function SupplierComparePanel({
  selectedSuppliers,
  onRemove,
  onClearAll,
  onAICompare,
}: SupplierComparePanelProps) {
  const [expanded, setExpanded] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  if (selectedSuppliers.length === 0) return null;

  const handleAICompare = async () => {
    if (!onAICompare) return;
    setAiLoading(true);
    onAICompare(selectedSuppliers);
    setAiLoading(false);
  };

  return (
    <div className="glass rounded-2xl border border-accent/20 bg-accent/5 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-accent/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15">
            <GitCompare className="h-4.5 w-4.5 text-accent" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">
              Compare Suppliers ({selectedSuppliers.length}/4)
            </p>
            <p className="text-[10px] text-muted-foreground">
              {selectedSuppliers.length < 2 ? "Select at least 2 to compare" : "Ready to compare"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onClearAll(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); onClearAll(); } }}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 cursor-pointer"
          >
            Clear all
          </span>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {selectedSuppliers.map((supplier) => (
              <div
                key={supplier.id}
                className="relative flex-shrink-0 w-36 glass rounded-xl p-3 group"
              >
                <button
                  onClick={() => onRemove(supplier.id)}
                  className="absolute top-1 right-1 z-10 p-1 rounded-full bg-black/60 text-white hover:bg-red-500/80 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-purple-400/20 border border-border flex items-center justify-center font-display text-[10px] font-bold text-foreground shrink-0">
                    {supplier.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-medium text-foreground truncate">{supplier.name}</p>
                    <span className={`text-[8px] px-1 py-0.5 rounded-full border font-bold uppercase ${badgeConfig[supplier.trustBadge].color} ${badgeConfig[supplier.trustBadge].border}`}>
                      {badgeConfig[supplier.trustBadge].label}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <ScoreRing score={supplier.stats.reliabilityScore} size={28} />
                  <div className="text-right">
                    <p className="text-[9px] text-muted-foreground">{supplier.stats.shippingDays}d ship</p>
                    <p className="text-[9px] text-muted-foreground">{supplier.stats.responseTimeHours}h resp</p>
                  </div>
                </div>
              </div>
            ))}

            {selectedSuppliers.length < 4 && (
              <div className="flex-shrink-0 w-36 border-2 border-dashed border-border rounded-xl flex items-center justify-center h-[80px]">
                <div className="text-center">
                  <GitCompare className="h-5 w-5 text-muted-foreground/30 mx-auto mb-1" />
                  <p className="text-[9px] text-muted-foreground/50">Add supplier</p>
                </div>
              </div>
            )}
          </div>

          {selectedSuppliers.length >= 2 && onAICompare && (
            <button
              onClick={handleAICompare}
              disabled={aiLoading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-medium hover:opacity-90 transition-all disabled:opacity-50"
            >
              {aiLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {aiLoading ? "AI is analyzing..." : "AI Deep Compare"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
