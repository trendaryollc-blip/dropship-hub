"use client";

import { RefreshCw, BarChart3, Upload, FileText, Sparkles } from "lucide-react";

interface StoreAIBarProps {
  onAction: (action: string) => void;
  loading: string | null;
  storeCount: number;
}

export default function StoreAIBar({ onAction, loading, storeCount }: StoreAIBarProps) {
  if (storeCount === 0) return null;

  const actions = [
    {
      id: "sync-inventory",
      label: "Sync Inventory",
      description: "Sync stock levels across stores",
      icon: RefreshCw,
      gradient: "from-blue-500/20 to-blue-600/10",
      border: "border-blue-400/20 hover:border-blue-400/40",
      text: "text-blue-400",
      iconBg: "bg-blue-400/10",
    },
    {
      id: "store-performance",
      label: "Store Performance",
      description: "Get metrics for all stores",
      icon: BarChart3,
      gradient: "from-emerald-500/20 to-emerald-600/10",
      border: "border-emerald-400/20 hover:border-emerald-400/40",
      text: "text-emerald-400",
      iconBg: "bg-emerald-400/10",
    },
    {
      id: "bulk-push",
      label: "Bulk Push",
      description: "Push saved products to stores",
      icon: Upload,
      gradient: "from-purple-500/20 to-purple-600/10",
      border: "border-purple-400/20 hover:border-purple-400/40",
      text: "text-purple-400",
      iconBg: "bg-purple-400/10",
    },
    {
      id: "optimize-listings",
      label: "Optimize Listings",
      description: "AI-improve product listings",
      icon: FileText,
      gradient: "from-amber-500/20 to-amber-600/10",
      border: "border-amber-400/20 hover:border-amber-400/40",
      text: "text-amber-400",
      iconBg: "bg-amber-400/10",
    },
  ];

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-accent" />
        <h3 className="text-xs font-semibold text-foreground">AI-Powered Actions</h3>
        <span className="text-[10px] text-muted-foreground">• {storeCount} store{storeCount !== 1 ? "s" : ""} connected</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {actions.map((action) => (
          <button
            key={action.id}
            onClick={() => onAction(action.id)}
            disabled={!!loading}
            className={`relative overflow-hidden flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-br ${action.gradient} ${action.border} transition-all disabled:opacity-50 group`}
          >
            <div className={`shrink-0 p-2 rounded-lg ${action.iconBg}`}>
              {loading === action.id ? (
                <div className={`h-4 w-4 border-2 ${action.text} border-current/30 border-t-current rounded-full animate-spin`} />
              ) : (
                <action.icon className={`h-4 w-4 ${action.text}`} />
              )}
            </div>
            <div className="text-left min-w-0">
              <p className={`text-xs font-semibold ${action.text}`}>{action.label}</p>
              <p className="text-[10px] text-muted-foreground truncate">{action.description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
