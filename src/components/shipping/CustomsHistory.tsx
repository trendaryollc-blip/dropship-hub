"use client";

import { useState, useEffect } from "react";
import { History, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";

interface CustomsHistoryProps {
  onSelect?: (estimate: CustomsEstimateRecord) => void;
}

interface CustomsEstimateRecord {
  id: string;
  originCountry: string;
  destinationCountry: string;
  totalDeclaredValue: number;
  totalTaxes: number;
  currency: string;
  itemCount: number;
  calculatedAt: string;
}

export default function CustomsHistory({ onSelect }: CustomsHistoryProps) {
  const { user } = useAuth();
  const [history, setHistory] = useState<CustomsEstimateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!expanded || !user) return;
    setLoading(true);
    const params = new URLSearchParams({ uid: user.uid, action: "history" });
    safeFetch<{ history: CustomsEstimateRecord[] }>(`/api/shipping/customs?${params}`)
      .then((data) => { if (data?.history) setHistory(data.history); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [expanded, user]);

  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface/30 transition-all"
      >
        <div className="flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-foreground">Customs History</span>
          {history.length > 0 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">{history.length}</span>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground">{expanded ? "Hide" : "Show"}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-white/5 pt-3">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-4">No customs calculations yet</p>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onSelect?.(item)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-surface/30 hover:bg-surface/50 border border-white/5 transition-all text-left"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-medium text-foreground">{item.originCountry}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                      <span className="text-[10px] font-medium text-foreground">{item.destinationCountry}</span>
                    </div>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                      {item.itemCount} items · ${item.totalDeclaredValue.toFixed(2)} · ${item.totalTaxes.toFixed(2)} tax
                    </p>
                  </div>
                  <span className="text-[9px] text-muted-foreground">
                    {new Date(item.calculatedAt).toLocaleDateString()}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
