"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search, TrendingUp, Truck, Calculator, Brain, BarChart3, Clock, Mic,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";

export function SmartSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showAllChips, setShowAllChips] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const { data: historyData } = useAPI<{ entries: { id: string; query: string }[] }>(
    showSuggestions ? "/api/search-history" : null
  );
  const recentSearches = useMemo(() => {
    if (!historyData?.entries) return [];
    return historyData.entries.slice(0, 3);
  }, [historyData]);

  const suggestedCommands = [
    { icon: Search, label: "Find winning products under $30", color: "cyan", action: "/products?q=winning+products&maxPrice=30" },
    { icon: TrendingUp, label: "High margin products 60%+", color: "emerald", action: "/products?q=high+margin+products&minMargin=60" },
    { icon: Truck, label: "Find reliable suppliers", color: "blue", action: "/suppliers" },
    { icon: Calculator, label: "Calculate profit margins", color: "purple", action: "/calculator" },
    { icon: Brain, label: "AI product analysis", color: "pink", action: "/ai" },
    { icon: BarChart3, label: "Competitor price analysis", color: "amber", action: "/competitors" },
  ];

  const visibleChips = showAllChips ? suggestedCommands : suggestedCommands.slice(0, 4);

  // Ctrl+K shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setShowSuggestions(true);
      }
      if (e.key === "Escape") {
        inputRef.current?.blur();
        setShowSuggestions(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, []);

  const parseCommand = (input: string): string => {
    const q = input.toLowerCase().trim();

    // Product search with price
    const priceMatch = q.match(/(?:under|below|less than|max|under)\s*\$?\s*(\d+)/);
    const minMarginMatch = q.match(/(\d+)\s*%\s*(?:margin|profit|profit margin)/);
    const categoryMatch = q.match(/(?:find|search|show|look for)\s+(.+?)(?:\s+under|\s+below|\s+with|\s+over|\s+above|$)/);

    if (q.includes("supplier") || q.includes("suppliers")) {
      const supplierQ = q.replace(/find|search|show|look for|reliable|good|best/g, "").replace(/suppliers?/g, "").trim();
      return `/suppliers${supplierQ ? `?q=${encodeURIComponent(supplierQ)}` : ""}`;
    }

    if (q.includes("calculator") || q.includes("calculate") || q.includes("margin") || q.includes("profit calc")) {
      return "/calculator";
    }

    if (q.includes("competitor") || q.includes("competition") || q.includes("compare price")) {
      return "/competitors";
    }

    if (q.includes("ai") || q.includes("analyze") || q.includes("analysis") || q.includes("recommend")) {
      const aiQ = q.replace(/ai|analyze|analysis|recommend|help me|please/g, "").trim();
      return `/ai${aiQ ? `?q=${encodeURIComponent(aiQ)}` : ""}`;
    }

    if (q.includes("trend") || q.includes("trending") || q.includes("rising")) {
      return "/trends";
    }

    // Default: product search with extracted params
    const params = new URLSearchParams();
    const searchTerms = categoryMatch?.[1] || q.replace(/find|search|show|look for|winning|products?|items?/g, "").trim();
    if (searchTerms) params.set("q", searchTerms);
    if (priceMatch) params.set("maxPrice", priceMatch[1]);
    if (minMarginMatch) params.set("minMargin", minMarginMatch[1]);
    return `/products${params.toString() ? `?${params.toString()}` : ""}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    const route = parseCommand(query);
    router.push(route);
  };

  const handleSuggestionClick = (action: string) => {
    router.push(action);
  };

  const startVoice = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice input is not supported in this browser.");
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setQuery(transcript);
      setIsListening(false);
      setShowSuggestions(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  return (
    <div className="w-full max-w-3xl mx-auto">
      <form onSubmit={handleSubmit} className="relative group">
        {/* Glow backdrop on focus */}
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-[var(--accent)]/20 via-[var(--gradient-mid)]/20 to-[var(--accent-warm)]/20 opacity-0 group-focus-within:opacity-100 blur-xl transition-opacity duration-500 pointer-events-none" />

        <div className="relative flex items-center gap-2 p-2 rounded-2xl bg-white/[0.06] border border-white/[0.1] focus-within:border-[var(--accent)]/50 focus-within:bg-white/[0.08] transition-all duration-500 search-bar-container">
          {/* Search icon with pulse on focus */}
          <div className="pl-3 flex items-center">
            <div className="relative">
              <Search className="h-5 w-5 text-gray-500 group-focus-within:text-[var(--accent)] transition-colors duration-300" />
              <div className="absolute inset-0 bg-[var(--accent)]/20 rounded-full blur-md opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
            </div>
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setShowSuggestions(false); }}
            onFocus={() => !query && setShowSuggestions(true)}
            placeholder="Search winning products, find suppliers, calculate margins..."
            className="flex-1 bg-transparent text-sm md:text-base text-white placeholder-gray-500 outline-none py-2.5"
          />

          {/* Keyboard shortcut badge */}
          <div className="hidden md:flex items-center gap-1 mr-1 opacity-40 group-focus-within:opacity-0 transition-opacity">
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-gray-500">Ctrl</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-gray-500">K</kbd>
          </div>

          {/* Voice input button */}
          <button
            type="button"
            onClick={isListening ? stopVoice : startVoice}
            className={`p-2.5 rounded-xl transition-all duration-300 ${isListening ? "bg-red-500/20 text-red-400 animate-pulse shadow-lg shadow-red-500/20" : "text-gray-500 hover:text-white hover:bg-white/[0.08] hover:shadow-md"}`}
          >
            <Mic className="h-4 w-4" />
          </button>

          {/* Divider */}
          <div className="w-px h-6 bg-white/[0.08]" />

          {/* Submit button */}
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent)] to-[var(--accent-warm)] text-white text-sm font-semibold hover:brightness-110 transition-all duration-300 active:scale-[0.97] shadow-lg shadow-[var(--accent)]/25 hover:shadow-[var(--accent)]/40 flex items-center gap-2"
          >
            <span>Go</span>
            <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">&#x23CE;</kbd>
          </button>
        </div>
      </form>

      {/* Suggestions panel */}
      {showSuggestions && (
        <div className="mt-4 space-y-3">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="text-[10px] text-gray-600 uppercase tracking-wider font-semibold self-center mr-1">Recent</span>
              {recentSearches.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => { setQuery(entry.query); setShowSuggestions(false); router.push(`/products?q=${encodeURIComponent(entry.query)}`); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.05] text-[11px] text-gray-500 hover:bg-white/[0.07] hover:text-gray-300 hover:border-white/[0.1] transition-all duration-300"
                >
                  <Clock className="h-3 w-3" />
                  {entry.query}
                </button>
              ))}
            </div>
          )}

          {/* Suggested Commands */}
          <div className="flex flex-wrap gap-2 justify-center">
            {visibleChips.map((cmd) => (
              <button
                key={cmd.label}
                onClick={() => handleSuggestionClick(cmd.action)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs text-gray-400 hover:bg-white/[0.08] hover:text-white hover:border-white/[0.15] hover:shadow-lg transition-all duration-300 group/chip"
              >
                <cmd.icon className="h-3.5 w-3.5 group-hover/chip:scale-110 transition-transform" />
                {cmd.label}
              </button>
            ))}
            {suggestedCommands.length > 4 && (
              <button
                onClick={() => setShowAllChips(!showAllChips)}
                className="flex items-center gap-1 px-3 py-2 rounded-full text-[11px] text-gray-600 hover:text-gray-400 transition-colors"
              >
                {showAllChips ? "Show less" : `+${suggestedCommands.length - 4} more`}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
