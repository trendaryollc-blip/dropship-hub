"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, X, Globe, Loader2, SlidersHorizontal, Clock, ChevronDown, ChevronUp,
  Sparkles, ArrowRight, TrendingUp, Layers,
} from "lucide-react";

const platformIcons: Record<string, string> = {
  amazon: "\ud83d\udce6", ebay: "\ud83c\udff7\ufe0f", aliexpress: "\ud83c\udde8\ud83c\uddf3",
  cj: "\ud83d\ude9a", google_shopping: "\ud83d\udd0d", walmart: "\ud83c\udfea",
  etsy: "\ud83c\udfa8", temu: "\ud83d\udce8", shein: "\ud83d\udc57",
  banggood: "\ud83d\udcb0", dhgate: "\ud83d\udce2", alibaba: "\ud83c\udf10",
};

const platformLabels: Record<string, string> = {
  amazon: "Amazon",
  ebay: "Ebay",
  aliexpress: "Aliexpress",
  cj: "CJ",
  google_shopping: "Google Shopping",
  walmart: "Walmart",
  etsy: "Etsy",
  temu: "Temu",
  shein: "Shein",
  banggood: "Banggood",
  dhgate: "DHgate",
  alibaba: "Alibaba",
};

const NL_EXAMPLES = [
  { text: "cheap trending pet products under $20", icon: TrendingUp },
  { text: "high margin electronics with good reviews", icon: Sparkles },
  { text: "low competition home accessories on Amazon", icon: Globe },
  { text: "best selling phone cases with fast shipping", icon: ArrowRight },
];

interface DynamicSuggestion {
  text: string;
  category: string;
  categoryLabel?: string;
}

interface SearchHeaderProps {
  query: string;
  setQuery: (q: string) => void;
  onSearch: () => void;
  loading: boolean;
  platforms: { id: string; name: string }[];
  selectedPlatforms: string[];
  togglePlatform: (p: string) => void;
  showFilters: boolean;
  setShowFilters: (v: boolean) => void;
  recentSearches: string[];
  onRecentClick: (q: string) => void;
  onAskAI?: (query: string) => void;
}

export default function SearchHeader({
  query, setQuery, onSearch, loading, platforms, selectedPlatforms,
  togglePlatform, showFilters, setShowFilters, recentSearches, onRecentClick,
  onAskAI,
}: SearchHeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [showNlExamples, setShowNlExamples] = useState(false);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<DynamicSuggestion[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const aiInputRef = useRef<HTMLInputElement>(null);

  // Fetch dynamic suggestions from API (Feature 9)
  useEffect(() => {
    if (!query || query.length < 2) {
      setDynamicSuggestions([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.suggestions) setDynamicSuggestions(data.suggestions);
      } catch { /* ignore */ }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  // Use only dynamic suggestions from API
  const filteredSuggestions = dynamicSuggestions.map((s) => s.text).slice(0, 5);

  const showSuggestions = showDropdown && query.length > 0 && filteredSuggestions.length > 0;
  const showRecent = showDropdown && query.length === 0 && recentSearches.length > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (showAIInput && aiInputRef.current) {
      aiInputRef.current.focus();
    }
  }, [showAIInput]);

  const handleAISearch = useCallback(async () => {
    if (!aiQuery.trim() || !onAskAI) return;
    setAiLoading(true);
    setShowAIInput(false);
    onAskAI(aiQuery.trim());
    setAiQuery("");
    setAiLoading(false);
  }, [aiQuery, onAskAI]);

  const handleSearchAll = () => {
    setShowDropdown(false);
    onSearch();
  };

  return (
    <div className="space-y-5">
      {/* Hero Title */}
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          Product Search
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Search real products across{" "}
          <span className="text-accent font-medium">
            {selectedPlatforms.length > 0 ? selectedPlatforms.length : platforms.length}
          </span>{" "}
          platform{selectedPlatforms.length !== 1 ? "s" : ""} simultaneously
        </p>
      </div>

      {/* Large Hero Search Bar */}
      <div className="relative group" ref={dropdownRef}>
        {/* Glow effect behind search bar */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500" />

        <div className="relative glass rounded-2xl p-2 border border-border/50 group-focus-within:border-accent/30 transition-all duration-300">
          <div className="flex items-center gap-2">
            {/* Search icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 shrink-0">
              <Search className="h-5 w-5 text-accent" />
            </div>

            {/* Search input */}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { setShowDropdown(false); onSearch(); }
                if (e.key === "Escape") setShowDropdown(false);
              }}
              placeholder="Search for products across all platforms..."
              className="flex-1 h-12 px-2 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-base font-medium"
            />

            {/* Clear button */}
            {query && (
              <button
                onClick={() => { setQuery(""); setShowDropdown(true); inputRef.current?.focus(); }}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface/80 transition-all shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            {/* Search button */}
            <button
              onClick={handleSearchAll}
              disabled={loading || !query.trim()}
              className="flex items-center gap-2 h-12 px-6 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Search</span>
            </button>
          </div>
        </div>

        {/* Dropdown */}
        {(showSuggestions || showRecent) && (
          <div className="absolute top-full left-0 right-0 mt-2 z-50 glass rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/20">
            {showRecent && (
              <div className="p-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground/50 font-medium">Recent Searches</span>
                </div>
                {recentSearches.slice(0, 4).map((s) => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); setShowDropdown(false); onRecentClick(s); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-surface/60 transition-all text-left"
                  >
                    <Clock className="h-3.5 w-3.5 text-muted-foreground/30" />
                    {s}
                  </button>
                ))}
              </div>
            )}
            {showSuggestions && (
              <div className={`p-2 ${showRecent ? "border-t border-border/50" : ""}`}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-[11px] text-muted-foreground/50 font-medium">Suggestions</span>
                </div>
                {filteredSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => { setQuery(s); setShowDropdown(false); onSearch(); }}
                    className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-surface/60 transition-all text-left"
                  >
                    <Search className="h-3.5 w-3.5 text-muted-foreground/30" />
                    <span
                      dangerouslySetInnerHTML={{
                        __html: s.replace(
                          new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"),
                          '<span class="text-accent font-medium">$1</span>'
                        ),
                      }}
                    />
                  </button>
                ))}
              </div>
            )}
            {showRecent && (
              <div className="px-2 pb-2">
                <button
                  onClick={() => { localStorage.removeItem("recentSearches"); setShowDropdown(false); }}
                  className="w-full text-center text-[11px] text-muted-foreground/40 hover:text-muted-foreground py-1.5 transition-colors"
                >
                  Clear history
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Row: Search All Platforms + Filters + Ask AI */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search All Platforms - prominent CTA */}
        <button
          onClick={handleSearchAll}
          disabled={loading || !query.trim()}
          className="flex items-center justify-center gap-2.5 h-12 px-6 rounded-xl bg-gradient-to-r from-accent via-accent to-accent/80 text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-accent/20"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Layers className="h-4 w-4" />
          )}
          Search All Platforms
        </button>

        {/* Filters */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center justify-center gap-2 h-12 px-5 rounded-xl glass border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {showFilters ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>

        {/* Ask AI */}
        {onAskAI && (
          <button
            onClick={() => setShowAIInput(!showAIInput)}
            className={`flex items-center justify-center gap-2 h-12 px-5 rounded-xl text-sm font-medium transition-all ${
              showAIInput
                ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20"
                : "glass border border-violet-500/20 text-violet-400 hover:border-violet-500/40 hover:bg-violet-500/5"
            }`}
          >
            <Sparkles className="h-4 w-4" />
            Ask AI
          </button>
        )}

        {/* Spacer + platform count badge */}
        <div className="hidden sm:flex items-center gap-2 ml-auto">
          {selectedPlatforms.length > 0 && (
            <button
              onClick={() => selectedPlatforms.forEach((p) => togglePlatform(p))}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
            >
              <span className="px-2 py-1 rounded-lg bg-accent/10 font-medium">{selectedPlatforms.length} selected</span>
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* AI Search Panel */}
      {showAIInput && onAskAI && (
        <div className="glass rounded-2xl p-5 border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-violet-400">AI-Powered Search</span>
              <p className="text-[10px] text-muted-foreground">Describe what you need in natural language</p>
            </div>
            <button
              onClick={() => setShowNlExamples(!showNlExamples)}
              className="text-[10px] text-muted-foreground hover:text-foreground transition-colors ml-auto px-2 py-1 rounded-lg hover:bg-surface/50"
            >
              {showNlExamples ? "Hide examples" : "Show examples"}
            </button>
          </div>

          {showNlExamples && (
            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {NL_EXAMPLES.map((ex) => (
                <button
                  key={ex.text}
                  onClick={() => setAiQuery(ex.text)}
                  className="flex items-center gap-2.5 w-full px-3.5 py-2.5 rounded-xl bg-surface/40 border border-border/50 text-xs text-muted-foreground hover:text-foreground hover:border-violet-500/30 hover:bg-violet-500/5 transition-all text-left"
                >
                  <ex.icon className="h-3.5 w-3.5 text-violet-400 shrink-0" />
                  {ex.text}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400/60" />
              <input
                ref={aiInputRef}
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAISearch()}
                placeholder="Describe what you're looking for..."
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all text-sm"
              />
            </div>
            <button
              onClick={handleAISearch}
              disabled={aiLoading || !aiQuery.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Ask
            </button>
          </div>
        </div>
      )}

      {/* Platform Toggle Grid */}
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-muted-foreground font-medium">Platforms</span>
          {selectedPlatforms.length > 0 && (
            <button
              onClick={() => selectedPlatforms.forEach((p) => togglePlatform(p))}
              className="text-[10px] text-accent hover:text-accent-hover transition-colors font-medium"
            >
              Clear all ({selectedPlatforms.length})
            </button>
          )}
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {platforms.map((p) => {
            const isSelected = selectedPlatforms.includes(p.id);
            return (
              <button
                key={p.id}
                onClick={() => togglePlatform(p.id)}
                aria-pressed={isSelected}
                className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 h-11 ${
                  isSelected
                    ? "bg-accent/15 text-accent border border-accent/25 shadow-sm shadow-accent/10"
                    : "bg-surface/50 border border-border/50 text-muted-foreground hover:text-foreground hover:bg-surface hover:border-border"
                }`}
              >
                <span className="text-sm">{platformIcons[p.id]}</span>
                <span className="truncate">{platformLabels[p.id] || p.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Searches (when not in dropdown) */}
      {recentSearches.length > 0 && !query && !showDropdown && (
        <div className="flex items-center gap-2 flex-wrap">
          <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
          {recentSearches.map((s) => (
            <button
              key={s}
              onClick={() => onRecentClick(s)}
              className="text-xs px-3 py-2 rounded-xl bg-surface/40 border border-border/40 text-muted-foreground hover:text-foreground hover:border-accent/20 hover:bg-accent/5 transition-all"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
