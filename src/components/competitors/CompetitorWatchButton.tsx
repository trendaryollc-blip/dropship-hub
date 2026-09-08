"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";

interface CompetitorWatchButtonProps {
  name: string;
  platform: string;
  price?: number;
  compact?: boolean;
}

export default function CompetitorWatchButton({ name, platform, price, compact }: CompetitorWatchButtonProps) {
  const { user } = useAuth();
  const [watching, setWatching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user?.uid) { setChecking(false); return; }
    safeFetch<{ isWatched: boolean }>(`/api/ai/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tool: "get_watchlist", input: { type: "competitor" } }),
    }).then(() => {
      setChecking(false);
    }).catch(() => setChecking(false));
  }, [user?.uid, name]);

  const toggleWatch = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user?.uid || loading) return;
    setLoading(true);
    try {
      if (watching) {
        await safeFetch("/api/ai/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "add_to_watchlist",
            input: { type: "competitor", itemId: name, title: name },
          }),
        });
      } else {
        await safeFetch("/api/ai/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tool: "add_to_watchlist",
            input: {
              type: "competitor",
              itemId: `${platform}-${name}`,
              title: name,
              currentPrice: price,
            },
          }),
        });
      }
      setWatching(!watching);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  if (checking) return null;

  if (compact) {
    return (
      <button
        onClick={toggleWatch}
        disabled={loading}
        className={`p-1.5 rounded-lg transition-all ${
          watching
            ? "text-accent bg-accent/10 hover:bg-accent/20"
            : "text-muted-foreground hover:text-accent hover:bg-accent/10"
        }`}
        title={watching ? "Stop watching" : "Watch competitor"}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : watching ? (
          <Eye className="h-3.5 w-3.5" />
        ) : (
          <EyeOff className="h-3.5 w-3.5" />
        )}
      </button>
    );
  }

  return (
    <button
      onClick={toggleWatch}
      disabled={loading}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
        watching
          ? "bg-accent/10 border-accent/30 text-accent"
          : "bg-surface border-border text-muted-foreground hover:text-accent hover:border-accent/30"
      }`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : watching ? (
        <Eye className="h-3.5 w-3.5" />
      ) : (
        <EyeOff className="h-3.5 w-3.5" />
      )}
      {watching ? "Watching" : "Watch"}
    </button>
  );
}
