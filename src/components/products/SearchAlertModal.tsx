"use client";

import { useState } from "react";
import { Bell, X, Loader2, Check } from "lucide-react";

interface SearchAlertModalProps {
  query: string;
  isOpen: boolean;
  onClose: () => void;
  onCreateAlert: (alert: SearchAlertData) => Promise<void>;
}

export interface SearchAlertData {
  query: string;
  platforms: string[];
  priceMin?: number;
  priceMax?: number;
  minRating?: number;
  notifyOn: "new_product" | "price_drop" | "any";
  threshold?: number;
}

const AVAILABLE_PLATFORMS = [
  { id: "amazon", name: "Amazon" },
  { id: "ebay", name: "eBay" },
  { id: "aliexpress", name: "AliExpress" },
  { id: "cj", name: "CJ Dropshipping" },
  { id: "walmart", name: "Walmart" },
  { id: "google_shopping", name: "Google Shopping" },
  { id: "etsy", name: "Etsy" },
  { id: "temu", name: "Temu" },
];

export default function SearchAlertModal({
  query,
  isOpen,
  onClose,
  onCreateAlert,
}: SearchAlertModalProps) {
  const [platforms, setPlatforms] = useState<string[]>(["amazon", "ebay", "aliexpress"]);
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [minRating, setMinRating] = useState("");
  const [notifyOn, setNotifyOn] = useState<"new_product" | "price_drop" | "any">("any");
  const [threshold, setThreshold] = useState("10");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const togglePlatform = (id: string) => {
    setPlatforms((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onCreateAlert({
        query,
        platforms,
        priceMin: priceMin ? Number(priceMin) : undefined,
        priceMax: priceMax ? Number(priceMax) : undefined,
        minRating: minRating ? Number(minRating) : undefined,
        notifyOn,
        threshold: notifyOn === "price_drop" ? Number(threshold) : undefined,
      });
      setSuccess(true);
      setTimeout(() => { setSuccess(false); onClose(); }, 1500);
    } catch {
      // error handled by parent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose} role="dialog" aria-modal="true" aria-label="Create Search Alert">
      <div className="bg-gray-900 border border-white/10 rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-accent" />
            <h3 className="text-white font-bold">Create Search Alert</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">Query</label>
            <div className="px-3 py-2 bg-white/5 rounded-lg text-sm text-white">{query}</div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Platforms</label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlatform(p.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    platforms.includes(p.id)
                      ? "bg-accent text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Min Price ($)</label>
              <input
                type="number"
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                placeholder="0"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Max Price ($)</label>
              <input
                type="number"
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                placeholder="100"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Min Rating</label>
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-accent"
            >
              <option value="">Any rating</option>
              <option value="3">3+ stars</option>
              <option value="3.5">3.5+ stars</option>
              <option value="4">4+ stars</option>
              <option value="4.5">4.5+ stars</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Notify me when</label>
            <div className="flex gap-2">
              {[
                { value: "any" as const, label: "Any match" },
                { value: "new_product" as const, label: "New product" },
                { value: "price_drop" as const, label: "Price drop" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setNotifyOn(opt.value)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    notifyOn === opt.value
                      ? "bg-accent text-white"
                      : "bg-white/5 text-gray-400 hover:bg-white/10"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {notifyOn === "price_drop" && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Min price drop (%)</label>
              <input
                type="number"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                min="1"
                max="90"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-accent"
              />
            </div>
          )}
        </div>

        <div className="p-5 border-t border-white/10">
          <button
            onClick={handleSubmit}
            disabled={loading || platforms.length === 0 || success}
            className="w-full py-2.5 bg-accent hover:bg-accent/90 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : success ? (
              <>
                <Check className="h-4 w-4" />
                Alert Created!
              </>
            ) : (
              <>
                <Bell className="h-4 w-4" />
                Create Alert
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
