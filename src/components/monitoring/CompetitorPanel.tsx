"use client";

import { useState } from "react";
import { Plus, X, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";

interface CompetitorSnapshot {
  url: string;
  price: number | null;
  inStock: boolean;
  scrapedAt: string;
}

interface CompetitorPanelProps {
  monitoredId: string;
  competitorUrls: string[];
  competitorSnapshots?: CompetitorSnapshot[];
  ourPrice: number;
  onUpdate: () => void;
}

export default function CompetitorPanel({
  monitoredId,
  competitorUrls,
  competitorSnapshots = [],
  ourPrice,
  onUpdate,
}: CompetitorPanelProps) {
  const { error: toastError } = useToast();
  const [newUrl, setNewUrl] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!newUrl.trim()) return;
    try {
      setSaving(true);
      const url = newUrl.trim();
      new URL(url);
      const updated = [...competitorUrls, url];
      await safeFetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateThreshold", monitoredId, competitorUrls: updated }),
      });
      setNewUrl("");
      onUpdate();
    } catch {
      toastError("Invalid URL");
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (url: string) => {
    try {
      const updated = competitorUrls.filter((u) => u !== url);
      await safeFetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateThreshold", monitoredId, competitorUrls: updated }),
      });
      onUpdate();
    } catch {
      toastError("Failed to remove competitor URL");
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Competitor Tracking</h4>

      <div className="flex items-center gap-2">
        <input
          type="url"
          value={newUrl}
          onChange={(e) => setNewUrl(e.target.value)}
          placeholder="https://competitor.com/product-page"
          className="flex-1 px-3 py-1.5 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/30"
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
        />
        <button
          onClick={handleAdd}
          disabled={saving || !newUrl.trim()}
          className="px-2 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/90 transition-all disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {competitorUrls.length === 0 && competitorSnapshots.length === 0 && (
        <p className="text-[11px] text-muted-foreground/60">No competitor URLs added yet.</p>
      )}

      {competitorUrls.map((url) => {
        const snapshot = competitorSnapshots.find((s) => s.url === url);
        const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();
        const isUndercut = snapshot?.price !== null && snapshot?.price !== undefined && snapshot.price < ourPrice && snapshot.inStock;

        return (
          <div key={url} className="flex items-start gap-2 p-2 rounded-lg bg-surface/50 border border-border/50">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                {isUndercut ? (
                  <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                ) : (
                  <CheckCircle className="h-3 w-3 text-emerald-400 shrink-0" />
                )}
                <span className="text-[11px] font-medium text-foreground truncate">{hostname}</span>
              </div>
              {snapshot && (
                <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                  <span>{snapshot.price !== null ? `$${snapshot.price.toFixed(2)}` : "N/A"}</span>
                  <span>{snapshot.inStock ? "In Stock" : "Out of Stock"}</span>
                  {isUndercut && (
                    <span className="text-amber-400 font-medium">
                      Undercuts by ${(ourPrice - (snapshot.price || 0)).toFixed(2)}
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
              <button
                onClick={() => handleRemove(url)}
                className="p-1 rounded-md text-muted-foreground hover:text-red-400 transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
