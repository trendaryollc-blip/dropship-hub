"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Search, X, Loader2, Clock, Sparkles, TrendingUp, Globe,
  Zap, Lightbulb,
} from "lucide-react";
import VoiceInput from "@/components/ai/VoiceInput";
import VisualSearchButton from "@/components/products/VisualSearchButton";

const platformIcons: Record<string, string> = {
  amazon: "📦", ebay: "🏷️", aliexpress: "🇨🇳",
  cj: "🚚", google_shopping: "🔍", walmart: "🏪",
  etsy: "🎨", temu: "📩", shein: "👗",
  banggood: "💰", dhgate: "📡", alibaba: "🌐",
};

const platformLabels: Record<string, string> = {
  amazon: "Amazon", ebay: "Ebay", aliexpress: "Aliexpress",
  cj: "CJ Dropshipping", google_shopping: "Google", walmart: "Walmart",
  etsy: "Etsy", temu: "Temu", shein: "Shein",
  banggood: "Banggood", dhgate: "DHgate", alibaba: "Alibaba",
};

const AI_SUGGESTED = [
  { text: "Trending TikTok products", icon: TrendingUp },
  { text: "Under $10 with high margin", icon: Sparkles },
  { text: "Unsaturated in US", icon: Zap },
  { text: "Viral pet accessories", icon: Sparkles },
  { text: "Low competition beauty", icon: Sparkles },
];

interface DynamicSuggestion {
  text: string;
  category: string;
  categoryLabel?: string;
}

interface SearchHeaderProps {
  query: string;
  setQuery: (q: string) => void;
  onSearch: (platformsOverride?: string[]) => void;
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
  const [dynamicSuggestions, setDynamicSuggestions] = useState<DynamicSuggestion[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const filteredSuggestions = dynamicSuggestions.map((s) => s.text).slice(0, 5);
  const showSuggestions = showDropdown && query.length > 0 && filteredSuggestions.length > 0;
  const showRecent = showDropdown && query.length === 0 && recentSearches.length > 0;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = useCallback(() => {
    setShowDropdown(false);
    if (query.trim()) onSearch();
  }, [query, onSearch]);

  const handleAISearch = useCallback((text: string) => {
    setQuery(text);
    setShowDropdown(false);
    if (onAskAI) onAskAI(text);
  }, [setQuery, onAskAI]);

  const handleSuggestedPrompt = (text: string) => {
    setQuery(text);
    if (onAskAI) onAskAI(text);
  };

  return (
    <div className="relative">
      {/* Hero Background Glow */}
      <div className="absolute -inset-x-20 -top-20 h-[400px] pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.04] via-accent/[0.02] to-transparent blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-accent/[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 space-y-4">
        {/* Hero Card */}
        <div className="relative group">
          {/* Glow effect on focus */}
          <div className={`absolute -inset-1 rounded-3xl bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 blur-2xl transition-opacity duration-700 ${isFocused ? "opacity-100" : "opacity-0"}`} />
          
          <div className="relative glass rounded-3xl p-6 sm:p-8 border border-border/30">
            {/* Tip inside hero */}
            <div className="flex items-center justify-center gap-2 mb-4 pb-4 border-b border-border/20">
              <Lightbulb className="h-3.5 w-3.5 text-accent/40" />
              <p className="text-[11px] text-muted-foreground/50">
                Use natural language like &quot;summer outdoor gadgets under $15 with 30%+ margin&quot; for best results
              </p>
            </div>

            {/* Smart Search Input */}
            <div className="relative" ref={dropdownRef}>
              <div className={`flex items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 rounded-2xl transition-all duration-300 ${
                isFocused 
                  ? "bg-surface/80 border border-accent/20 shadow-lg shadow-accent/5" 
                  : "bg-surface/40 border border-border/30 hover:border-border/50"
              }`}>
                {/* Search icon */}
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-accent/10 shrink-0">
                  <Search className="h-5 w-5 text-accent" />
                </div>

                {/* Input */}
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); }}
                  onFocus={() => { setShowDropdown(true); setIsFocused(true); }}
                  onBlur={() => setIsFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                    if (e.key === "Escape") setShowDropdown(false);
                  }}
                  placeholder="What are you looking for? Try natural language..."
                  className="flex-1 h-12 bg-transparent text-foreground placeholder:text-muted-foreground/40 focus:outline-none text-base sm:text-lg font-medium"
                />

                {/* Clear button */}
                {query && (
                  <button
                    onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                    className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface/60 transition-all shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                {/* Voice input */}
                <VoiceInput onTranscript={(text) => { setQuery(text); setShowDropdown(true); }} />

                {/* Visual/Image search */}
                <VisualSearchButton onSearch={handleAISearch} className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface/40 hover:bg-surface/60 text-muted-foreground hover:text-foreground" />

                {/* Divider */}
                <div className="w-px h-6 bg-border/30 shrink-0" />

                {/* Search button */}
                <button
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  className="btn-hero-cta flex items-center gap-2 h-12 px-6 shrink-0"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Search</span>
                </button>
              </div>

              {/* Search All Platforms button */}
              <div className="flex items-center justify-between mt-3 px-1">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground/50">Search across all platforms</span>
                </div>
                <button
                  onClick={() => { setShowDropdown(false); onSearch(platforms.map(p => p.id)); }}
                  disabled={loading || !query.trim()}
                  className="text-xs text-accent hover:text-accent/80 font-medium transition-colors disabled:opacity-40"
                >
                  Search All Platforms
                </button>
              </div>

              {/* Dropdown */}
              {(showSuggestions || showRecent) && (
                <div className="absolute left-0 right-0 mt-2 glass rounded-2xl border border-border overflow-hidden shadow-2xl shadow-black/20 z-50">
                  {showRecent && (
                    <div className="p-2">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 mb-1">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <span className="text-[11px] text-muted-foreground/40 font-medium">Recent</span>
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
                        <Sparkles className="h-3.5 w-3.5 text-accent/60" />
                        <span className="text-[11px] text-muted-foreground/40 font-medium">Suggestions</span>
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

            {/* Platform chips */}
            <div className="mt-5">
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
                {platforms.map((p) => {
                  const isSelected = selectedPlatforms.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => togglePlatform(p.id)}
                      className={`platform-chip-hover flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap shrink-0 border ${
                        isSelected
                          ? "bg-accent/15 text-accent border-accent/25 shadow-sm shadow-accent/10"
                          : "bg-surface/30 border-border/30 text-muted-foreground hover:text-foreground hover:bg-surface/50 hover:border-border/50"
                      }`}
                    >
                      <span className="text-sm">{platformIcons[p.id]}</span>
                      <span>{platformLabels[p.id] || p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* AI Suggested Prompts */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <div className="flex items-center gap-1.5 shrink-0 mr-1">
            <Sparkles className="h-3.5 w-3.5 text-accent/60" />
            <span className="text-xs text-muted-foreground/50 font-medium">Try:</span>
          </div>
          {AI_SUGGESTED.map((prompt) => (
            <button
              key={prompt.text}
              onClick={() => handleSuggestedPrompt(prompt.text)}
              className="search-pill shrink-0"
            >
              {prompt.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
