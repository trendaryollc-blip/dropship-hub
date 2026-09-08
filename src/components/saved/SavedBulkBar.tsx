"use client";

import {
  Store, DollarSign, FileText, GitCompare, Trash2, X,
} from "lucide-react";
import { useSavedProducts } from "./SavedProductsProvider";

interface SavedBulkBarProps {
  onBulkAction: (action: string) => void;
  loading: string | null;
}

export default function SavedBulkBar({ onBulkAction, loading }: SavedBulkBarProps) {
  const { selectedIds, clearSelection, setSelectMode, removeSelected } = useSavedProducts();

  if (selectedIds.size === 0) return null;

  const actions = [
    { id: "push-to-store", label: "Push to Store", icon: Store, color: "bg-blue-500/10 text-blue-400 border-blue-400/20 hover:bg-blue-500/20" },
    { id: "calculate-margins", label: "Calculate Margins", icon: DollarSign, color: "bg-emerald-500/10 text-emerald-400 border-emerald-400/20 hover:bg-emerald-500/20" },
    { id: "generate-listings", label: "Generate Listings", icon: FileText, color: "bg-purple-500/10 text-purple-400 border-purple-400/20 hover:bg-purple-500/20" },
    { id: "compare-suppliers", label: "Compare Suppliers", icon: GitCompare, color: "bg-cyan-500/10 text-cyan-400 border-cyan-400/20 hover:bg-cyan-500/20" },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="glass rounded-2xl border border-accent/20 shadow-2xl shadow-accent/5 px-4 py-3 flex items-center gap-3">
        <div className="flex items-center gap-2 pr-3 border-r border-border">
          <span className="text-sm font-semibold text-accent">{selectedIds.size}</span>
          <span className="text-xs text-muted-foreground">selected</span>
          <button
            onClick={() => { clearSelection(); setSelectMode(false); }}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => onBulkAction(action.id)}
              disabled={!!loading}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${action.color} disabled:opacity-50`}
            >
              {loading === action.id ? (
                <div className="h-3.5 w-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
              ) : (
                <action.icon className="h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{action.label}</span>
            </button>
          ))}
        </div>

        <div className="pl-3 border-l border-border">
          <button
            onClick={() => {
              if (confirm(`Remove ${selectedIds.size} products from saved?`)) {
                removeSelected();
                setSelectMode(false);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-400/20 bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Remove</span>
          </button>
        </div>
      </div>
    </div>
  );
}
