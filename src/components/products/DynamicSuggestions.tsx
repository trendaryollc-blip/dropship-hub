"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, TrendingUp, Clock, Tag, Loader2 } from "lucide-react";

interface Suggestion {
  text: string;
  category: "trending" | "history" | "category";
  categoryLabel?: string;
}

interface DynamicSuggestionsProps {
  onSelect: (suggestion: string) => void;
  currentValue?: string;
  className?: string;
}

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  trending: <TrendingUp className="h-3 w-3 text-emerald-400" />,
  history: <Clock className="h-3 w-3 text-blue-400" />,
  category: <Tag className="h-3 w-3 text-violet-400" />,
};

const CATEGORY_LABELS: Record<string, string> = {
  trending: "Trending",
  history: "Recent searches",
  category: "Categories",
};

export default function DynamicSuggestions({
  onSelect,
  currentValue = "",
  className = "",
}: DynamicSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (currentValue.length >= 2) {
        fetchSuggestions(currentValue);
        setIsOpen(true);
      } else {
        setSuggestions([]);
        setIsOpen(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [currentValue, fetchSuggestions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          onSelect(suggestions[selectedIndex].text);
          setIsOpen(false);
          setSelectedIndex(-1);
        }
        break;
      case "Escape":
        setIsOpen(false);
        setSelectedIndex(-1);
        break;
    }
  };

  if (!isOpen) return null;

  const grouped = suggestions.reduce<Record<string, Suggestion[]>>((acc, s) => {
    const key = s.category;
    if (!acc[key]) acc[key] = [];
    acc[key].push(s);
    return acc;
  }, {});

  return (
    <div ref={containerRef} className={`relative ${className}`} data-testid="dynamic-suggestions">
      <div className="absolute top-full left-0 right-0 mt-1 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50 max-h-80 overflow-y-auto">
        {loading && (
          <div className="flex items-center gap-2 px-4 py-3 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Loading suggestions...
          </div>
        )}

        {!loading && suggestions.length === 0 && currentValue.length >= 2 && (
          <div className="px-4 py-3 text-xs text-muted-foreground">
            No suggestions found
          </div>
        )}

        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <div className="px-3 py-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider bg-white/5 flex items-center gap-1.5">
              {CATEGORY_ICONS[category]}
              {CATEGORY_LABELS[category] || category}
            </div>
            {items.map((suggestion) => {
              const globalIndex = suggestions.indexOf(suggestion);
              return (
                <button
                  key={suggestion.text}
                  onClick={() => {
                    onSelect(suggestion.text);
                    setIsOpen(false);
                    setSelectedIndex(-1);
                  }}
                  className={`w-full flex items-center gap-2 px-4 py-2 text-sm text-left transition-colors ${
                    globalIndex === selectedIndex
                      ? "bg-accent/10 text-accent"
                      : "text-gray-300 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <Search className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{suggestion.text}</span>
                  {suggestion.categoryLabel && (
                    <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                      {suggestion.categoryLabel}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
