"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Trash2, Loader2, Clock, ArrowRight } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";

interface SearchAlert {
  id: string;
  query: string;
  platforms: string[];
  priceMin?: number;
  priceMax?: number;
  minRating?: number;
  notifyOn: "new_product" | "price_drop" | "any";
  threshold?: number;
  createdAt: number;
  lastTriggered?: number;
}

export default function SearchAlertsSidebar() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<SearchAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    try {
      const token = await user.getIdToken();
      const data = await safeFetch<{ alerts?: SearchAlert[] }>(`/api/search/alerts?uid=${user.uid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAlerts(data.alerts || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const deleteAlert = async (id: string) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      await safeFetch(`/api/search/alerts`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ uid: user.uid, alertId: id }),
      });
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch { /* ignore */ }
  };

  if (!user || alerts.length === 0) return null;

  const getNotifyLabel = (notifyOn: string) => {
    switch (notifyOn) {
      case "price_drop": return "Price drops";
      case "new_product": return "New products";
      default: return "Any match";
    }
  };

  return (
    <div className="glass rounded-2xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-surface/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Bell className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-xs font-semibold text-foreground">Active Alerts</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-medium">{alerts.length}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{expanded ? "Collapse" : "Expand"}</span>
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-1.5 max-h-60 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-center gap-2 p-2 rounded-xl bg-surface/30 hover:bg-surface/50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{alert.query}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] text-muted-foreground">{getNotifyLabel(alert.notifyOn)}</span>
                    {alert.priceMin && <span className="text-[9px] text-muted-foreground">Min ${alert.priceMin}</span>}
                    {alert.priceMax && <span className="text-[9px] text-muted-foreground">Max ${alert.priceMax}</span>}
                  </div>
                </div>
                <button
                  onClick={() => deleteAlert(alert.id)}
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-muted-foreground hover:text-red-400 transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
