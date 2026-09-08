"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { Clock, Search, Loader2 } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";

interface SearchEntry {
  id: string;
  query: string;
  platformsFound: number;
  totalListings: number;
  avgPrice: number;
  createdAt: { seconds: number; nanoseconds: number } | string;
}

interface CompetitorSearchHistoryProps {
  onSelect: (query: string) => void;
}

function timeAgo(date: { seconds: number; nanoseconds: number } | string): string {
  const d = typeof date === "string" ? new Date(date) : new Date(date.seconds * 1000);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function CompetitorSearchHistory({ onSelect }: CompetitorSearchHistoryProps) {
  const { user } = useAuth();
  const [history, setHistory] = useState<SearchEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!user?.uid) { setLoading(false); return; }
    try {
      const data = await safeFetch<{ searches: SearchEntry[] }>(
        `/api/search-history?type=competitor&uid=${user.uid}&limit=8`
      );
      setHistory(data.searches || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-3 text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span className="text-xs">Loading history...</span>
      </div>
    );
  }

  if (history.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Clock className="h-3 w-3" /> Recent:
      </span>
      {history.map((entry) => (
        <button
          key={entry.id}
          onClick={() => onSelect(entry.query)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface border border-border text-[11px] text-muted-foreground hover:text-accent hover:border-accent/30 transition-all group"
        >
          <Search className="h-2.5 w-2.5 opacity-50" />
          <span className="truncate max-w-[120px]">{entry.query}</span>
          <span className="text-muted-foreground/50 text-[9px]">{timeAgo(entry.createdAt)}</span>
        </button>
      ))}
    </div>
  );
}
