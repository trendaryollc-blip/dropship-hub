"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2 } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";

interface HSCodeLookupProps {
  onSelect: (hsCode: string, description: string) => void;
}

interface HSCodeResult {
  hsCode: string;
  description: string;
  confidence: number;
}

export default function HSCodeLookup({ onSelect }: HSCodeLookupProps) {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<HSCodeResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      if (!user) return;
      setLoading(true);
      try {
        const params = new URLSearchParams({ uid: user.uid, action: "lookup", name: query });
        const data = await safeFetch<{ results: HSCodeResult[] }>(`/api/shipping/customs?${params}`);
        if (data?.results) setResults(data.results);
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, user]);

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center gap-2 px-3 py-2 bg-surface border border-white/10 rounded-lg">
        <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search by item name..."
          className="flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {query && !loading && (
          <button onClick={() => { setQuery(""); setResults([]); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-30 mt-1 w-full glass rounded-xl border border-white/10 shadow-xl max-h-48 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => { onSelect(r.hsCode, r.description); setQuery(""); setResults([]); setOpen(false); }}
              className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-surface transition-all border-b border-white/5 last:border-0"
            >
              <div>
                <p className="text-[11px] font-medium text-foreground">{r.hsCode} — {r.description}</p>
                <p className="text-[9px] text-muted-foreground">Confidence: {Math.round(r.confidence * 100)}%</p>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-accent/10 text-accent">
                Select
              </span>
            </button>
          ))}
        </div>
      )}

      {open && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-30 mt-1 w-full glass rounded-xl border border-white/10 shadow-xl p-4 text-center">
          <p className="text-[11px] text-muted-foreground">No HS codes found for &quot;{query}&quot;</p>
          <p className="text-[9px] text-muted-foreground mt-1">Try a different search term or enter the HS code manually</p>
        </div>
      )}
    </div>
  );
}
