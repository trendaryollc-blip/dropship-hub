"use client";

import { useState } from "react";
import { Store, CheckCircle, AlertTriangle, XCircle, ShoppingBag, ChevronDown, ChevronUp } from "lucide-react";

interface StorePerformance {
  id: string;
  platform: string;
  name: string;
  status: string;
  productsLive: number;
  productsError: number;
  totalPushed: number;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  healthScore: number;
  healthLabel: string;
  issues: string[];
}

interface MultiStoreResult {
  stores: StorePerformance[];
  comparison: { bestStore: string; worstStore: string; avgRevenue: number; avgOrders: number; revenueDifference: number };
  insights: string[];
}

export default function StoreComparator({ uid }: { uid: string }) {
  const [data, setData] = useState<MultiStoreResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const analyze = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      setData(await res.json());
    } catch {}
    setLoading(false);
  };

  const statusIcon = (status: string) => {
    if (status === "connected") return <CheckCircle className="w-3 h-3 text-emerald-400" />;
    if (status === "error") return <XCircle className="w-3 h-3 text-red-400" />;
    return <AlertTriangle className="w-3 h-3 text-yellow-400" />;
  };

  const healthColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Store className="w-4 h-4 text-blue-400" />
          <span className="text-sm font-medium text-[#e0e0e0]">Store Comparator</span>
        </div>
        <button
          onClick={analyze}
          disabled={loading}
          className="text-xs px-3 py-1 rounded-lg bg-[#1a1a2e] text-[#a0a0b0] hover:text-[#e0e0e0] hover:bg-[#25253a] transition-all disabled:opacity-50"
        >
          {loading ? "Checking..." : "Compare"}
        </button>
      </div>

      {!data && !loading && (
        <p className="text-xs text-[#606070]">Compare performance across all your connected stores.</p>
      )}

      {loading && (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-14 bg-[#1a1a2e] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-3">
          {data.stores.length === 0 ? (
            <p className="text-xs text-[#606070] text-center py-3">No stores connected yet.</p>
          ) : (
            <div className="space-y-1.5">
              {data.stores.map((store) => (
                <div key={store.id} className="bg-[#1a1a2e] rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpanded(expanded === store.id ? null : store.id)}
                    className="w-full flex items-center justify-between p-2.5 text-left hover:bg-[#25253a] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {statusIcon(store.status)}
                      <span className="text-xs text-[#e0e0e0]">{store.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium ${healthColor(store.healthScore)}`}>
                        {store.healthScore}
                      </span>
                      {expanded === store.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                  </button>
                  {expanded === store.id && (
                    <div className="px-2.5 pb-2.5 border-t border-[#25253a]">
                      <div className="grid grid-cols-2 gap-1.5 mt-2">
                        <div className="text-center min-w-0">
                          <p className="text-xs text-[#e0e0e0] truncate">${store.revenue.toFixed(0)}</p>
                          <p className="text-[9px] text-[#606070]">Revenue</p>
                        </div>
                        <div className="text-center min-w-0">
                          <p className="text-xs text-[#e0e0e0] truncate">{store.productsLive}/{store.totalPushed}</p>
                          <p className="text-[9px] text-[#606070]">Live Products</p>
                        </div>
                      </div>
                      {store.issues.length > 0 && (
                        <div className="mt-2 space-y-0.5">
                          {store.issues.map((issue, i) => (
                            <p key={i} className="text-[10px] text-yellow-400">• {issue}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {data.insights.length > 0 && (
            <div className="space-y-1">
              {data.insights.map((insight, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-[#9090a0] bg-[#1a1a2e] rounded-lg p-2">
                  <ShoppingBag className="w-3 h-3 mt-0.5 shrink-0 text-blue-400" />
                  <span>{insight}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
