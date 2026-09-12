"use client";

import "./dashboard-styles.css";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  DollarSign, ShoppingCart, Package, TrendingUp, TrendingDown,
  Search, Zap, Activity, Store, Truck,
  Bell, ChevronRight, Sparkles, Target, Shield,
  Clock, CheckCircle2, Star, BookmarkPlus, BookmarkCheck, AlertTriangle,
  Plus, RefreshCw, ArrowUpRight, Flame, Minus,
  BarChart3, Globe, Users, RotateCcw, Mic,
  FileText, Calculator, Headphones, Map, Layers, Brain,
  Crosshair, GitBranch, Award, Eye, TrendingUp as TrendingUpIcon,
  ChevronLeft, ExternalLink, Info, HeartPulse,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/components/auth/AuthProvider";
import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";
import { useSavedProducts } from "@/components/saved/SavedProductsProvider";
import { setContextualActions } from "@/hooks/useContextualActions";
import { useAPI } from "@/hooks/useAPI";
import type {
  AIDailyPick, SmartAlert, SupplierStatus, TrendingProduct,
  HeatmapCategory, FulfillmentPipelineData, ContextualAction,
  TickerItem,
} from "@/types/dashboard";

/* ═══════════════════════════════════════════════
   SECTION DIVIDER
   ═══════════════════════════════════════════════ */
function SectionDivider({ label, icon: Icon }: { label: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
        <Icon className="h-3.5 w-3.5 text-cyan-400" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      <div className="flex-1 h-px bg-gradient-to-r from-white/[0.08] to-transparent" />
    </div>
  );
}

/* ═══════════════════════════════════════════════
   HERO SKELETON LOADING
   ═══════════════════════════════════════════════ */
function HeroSkeleton() {
  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8">
      <div className="hero-skeleton border-y md:border border-white/[0.06] p-6 md:p-8 lg:p-10">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-white/[0.05] animate-pulse" />
            <div className="space-y-2">
              <div className="h-8 w-72 bg-white/[0.05] rounded-lg animate-pulse" />
              <div className="h-4 w-48 bg-white/[0.03] rounded animate-pulse" />
            </div>
          </div>
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/[0.04] animate-pulse" />
        </div>
        <div className="h-14 w-full max-w-3xl mx-auto bg-white/[0.04] rounded-2xl animate-pulse mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 bg-white/[0.04] rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MINI SPARKLINE (reusable)
   ═══════════════════════════════════════════════ */
function MiniSparkline({ data, color = "#22d3ee", width = 80, height = 24 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const pathD = data.map((p, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return `${i === 0 ? "M" : "L"} ${x} ${y}`;
  }).join(" ");
  const areaPath = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="shrink-0">
      <defs>
        <linearGradient id={`spark-${color.replace("#", "")}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-${color.replace("#", "")})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════
   SCORE RING (reusable)
   ═══════════════════════════════════════════════ */
function ScoreRing({ score, size = 48, strokeWidth = 4 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - ((score ?? 0) / 100) * circ;
  const getColor = (v: number) => v >= 80 ? "#22c55e" : v >= 60 ? "#3b82f6" : v >= 40 ? "#f59e0b" : "#ef4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={getColor(score ?? 0)} strokeWidth={strokeWidth} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset} className="transition-all duration-1000" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-sm font-bold text-white">{score ?? 0}</span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SMART SEARCH BAR
   ═══════════════════════════════════════════════ */
function SmartSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [showAllChips, setShowAllChips] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
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
              {recentSearches.map((entry, i) => (
                <button
                  key={i}
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
            {visibleChips.map((cmd, i) => (
              <button
                key={i}
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

/* ═══════════════════════════════════════════════
   SECTION 1: HERO COMMAND CENTER
   ═══════════════════════════════════════════════ */
function HeroCommandCenter({
  username, healthScore, trendingCount, suppliersCount, savedCount,
}: {
  username: string; healthScore: number | null;
  trendingCount?: number; suppliersCount?: number; savedCount?: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [time, setTime] = useState(new Date());
  const [showHealthTip, setShowHealthTip] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const hour = time.getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";

  const healthColor = (healthScore ?? 0) >= 80 ? "#22c55e" : (healthScore ?? 0) >= 60 ? "#f59e0b" : "#ef4444";
  const healthLabel = (healthScore ?? 0) >= 80 ? "Running strong" : (healthScore ?? 0) >= 60 ? "Needs attention" : "Critical";
  const healthTip = (healthScore ?? 0) >= 80
    ? "Your store is performing well. Keep it up!"
    : (healthScore ?? 0) >= 60
      ? "Connect more suppliers or products to improve your score."
      : "Connect your store and add products to boost your score.";
  const healthCta = (healthScore ?? 0) < 80 ? "Connect Store" : null;

  const quickActions = [
    { icon: Zap, label: "Find Products", href: "/products", color: "cyan", badge: trendingCount },
    { icon: Truck, label: "Suppliers", href: "/suppliers", color: "blue", badge: suppliersCount },
    { icon: Calculator, label: "Calculator", href: "/calculator", color: "purple", badge: null },
    { icon: Brain, label: "AI Tools", href: "/ai", color: "pink", badge: null },
  ];

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} -mx-4 md:-mx-6 lg:-mx-8`}>
      <div className="relative overflow-hidden rounded-none md:rounded-3xl border-y md:border border-white/[0.08] hero-card">
        {/* Animated background layers */}
        <div className="absolute inset-0 hero-gradient" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-[var(--accent)]/[0.07] rounded-full blur-[120px] float-orb" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-[var(--accent-warm)]/[0.06] rounded-full blur-[100px] float-orb-delayed" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[var(--accent)]/[0.03] rounded-full blur-[80px]" />
        <div className="absolute inset-0 backdrop-blur-2xl" />

        <div className="relative z-10 p-6 md:p-8 lg:p-10">
          {/* Top row: Greeting + Health Score */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-8">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4 mb-3">
                {/* Animated Rocket Icon */}
                <div className="relative rocket-bounce">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-warm)] flex items-center justify-center shadow-lg shadow-[var(--accent)]/20">
                    <span className="text-2xl md:text-3xl">&#x1F680;</span>
                  </div>
                  <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-warm)] opacity-20 blur-md" />
                </div>
                <div>
                  <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white leading-tight">
                    Welcome to <span className="bg-gradient-to-r from-[var(--accent)] via-[var(--gradient-mid)] to-[var(--accent-warm)] bg-clip-text text-transparent glow-text-accent">Dropship Hub</span>
                  </h1>
                  <p className="text-gray-500 text-xs md:text-sm mt-0.5">{greet},</p>
                  <p className="text-gray-400 text-sm md:text-base mt-0.5">
                    Hey <span className="text-white font-medium">{username}</span> &mdash; what&apos;s the move today?
                  </p>
                </div>
              </div>
            </div>

            {/* Health Score with Tooltip */}
            {healthScore != null && (
              <div className="flex items-center gap-4 shrink-0">
                <div
                  className="relative group cursor-pointer"
                  onMouseEnter={() => setShowHealthTip(true)}
                  onMouseLeave={() => setShowHealthTip(false)}
                >
                  <svg viewBox="0 0 100 100" className="w-20 h-20 md:w-24 md:h-24 drop-shadow-lg transition-transform duration-300 group-hover:scale-105">
                    <defs>
                      <linearGradient id="healthGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={healthColor} stopOpacity="0.2" />
                        <stop offset="100%" stopColor={healthColor} stopOpacity="0.05" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="42" fill="url(#healthGrad)" stroke="rgba(255,255,255,0.04)" strokeWidth="6" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke={healthColor} strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - (healthScore ?? 0) / 100)}
                      className="transition-all duration-1500 ease-out -rotate-90" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-display text-xl md:text-2xl font-bold text-white">{healthScore}</span>
                    <span className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: healthColor }}>{healthLabel}</span>
                  </div>

                  {/* Tooltip */}
                  {showHealthTip && (
                    <div className="absolute right-0 top-full mt-3 w-64 p-3 rounded-xl bg-gray-900/95 border border-white/[0.1] shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
                      <p className="text-xs text-gray-300 leading-relaxed">{healthTip}</p>
                      {healthCta && (
                        <Link href="/settings" className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
                          {healthCta} <ArrowUpRight className="h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Smart Search Bar */}
          <SmartSearchBar />

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-8">
            {quickActions.map((a) => {
              const cMap: Record<string, string> = {
                cyan: "bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/20 hover:border-[var(--accent)]/40 hover:shadow-[var(--accent)]/10",
                blue: "bg-[var(--accent-warm)]/10 border-[var(--accent-warm)]/20 text-[var(--accent-warm)] hover:bg-[var(--accent-warm)]/20 hover:border-[var(--accent-warm)]/40 hover:shadow-[var(--accent-warm)]/10",
                purple: "bg-[var(--gradient-mid)]/10 border-[var(--gradient-mid)]/20 text-[var(--gradient-mid)] hover:bg-[var(--gradient-mid)]/20 hover:border-[var(--gradient-mid)]/40 hover:shadow-[var(--gradient-mid)]/10",
                pink: "bg-[var(--accent)]/10 border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/20 hover:border-[var(--accent)]/40 hover:shadow-[var(--accent)]/10",
              };
              return (
                <Link key={a.href} href={a.href} className={`relative flex items-center justify-center gap-2 px-4 py-3 rounded-xl border ${cMap[a.color]} transition-all duration-300 hover:scale-[1.02] hover:shadow-lg group`}>
                  <a.icon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold">{a.label}</span>
                  {a.badge != null && a.badge > 0 && (
                    <span className={`absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold px-1 bg-[var(--accent)] text-white`}>
                      {a.badge > 99 ? "99+" : a.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION 2: REVENUE & PROFIT HUB
   ═══════════════════════════════════════════════ */
function RevenueProfitHub({ stats, chartData, storesConnected, suppliersActive, pendingOrders }: {
  stats: { revenue: number; growth: number; orders: number; avgOrder: number };
  chartData: { date: string; value: number }[];
  storesConnected: number;
  suppliersActive: number;
  pendingOrders: number;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const revenue = stats.revenue ?? 0;
  const orders = stats.orders ?? 0;
  const avgOrder = stats.avgOrder ?? 0;
  const growth = stats.growth ?? 0;
  const avgOrderValue = orders > 0 ? revenue / orders : 0;
  const marginPct = avgOrderValue > 0 ? Math.round((avgOrder / avgOrderValue) * 100) : 0;

  const chartMax = chartData.length > 0 ? Math.max(...chartData.map(d => d.value), 1) : 1;

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Revenue & Profit" icon={DollarSign} />

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2 mt-4 mb-3">
        {storesConnected > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <Store className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">{storesConnected} store{storesConnected !== 1 ? "s" : ""}</span>
          </div>
        )}
        {suppliersActive > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
            <Truck className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-400">{suppliersActive} supplier{suppliersActive !== 1 ? "s" : ""}</span>
          </div>
        )}
        {pendingOrders > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Package className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-xs font-medium text-amber-400">{pendingOrders} pending</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-medium text-gray-400">Live</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        {[
          { icon: DollarSign, label: "Revenue", value: revenue, prefix: "$", change: growth, color: "emerald" },
          { icon: ShoppingCart, label: "Orders", value: orders, color: "blue" },
          { icon: TrendingUp, label: "Avg Profit", value: avgOrder, prefix: "$", color: "purple" },
        ].map((kpi) => {
          const cMap: Record<string, string> = { emerald: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", blue: "text-blue-400 bg-blue-400/10 border-blue-400/20", purple: "text-purple-400 bg-purple-400/10 border-purple-400/20" };
          const bgMap: Record<string, string> = { emerald: "from-emerald-500/[0.06] to-emerald-600/[0.02] border-emerald-500/15", blue: "from-blue-500/[0.06] to-blue-600/[0.02] border-blue-500/15", purple: "from-purple-500/[0.06] to-purple-600/[0.02] border-purple-500/15" };
          const kpiValue = kpi.value ?? 0;
          return (
            <div key={kpi.label} className={`p-4 rounded-2xl bg-gradient-to-br ${bgMap[kpi.color]} border hover:brightness-110 transition-all duration-300`}>
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-xl border ${cMap[kpi.color]}`}>
                  <kpi.icon className="h-4 w-4" />
                </div>
                {kpi.change !== undefined && kpi.change !== 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${kpi.change >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                    {kpi.change >= 0 ? "+" : ""}{kpi.change}%
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">{kpi.label}</p>
              <p className="font-display text-xl font-bold text-white">{kpi.prefix}{kpiValue.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Revenue Chart Card */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Revenue Overview</span>
              {growth !== 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${growth >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}`}>
                  {growth >= 0 ? "+" : ""}{growth}%
                </span>
              )}
            </div>
            <Link href="/revenue" className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              Full Report <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {chartData.length > 0 ? (
            <>
              <div className="flex items-end gap-1 h-32">
                {chartData.map((d, i) => (
                  <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-cyan-500/40 to-cyan-400/20 transition-all duration-500 hover:from-cyan-500/60 hover:to-cyan-400/40 relative group/bar"
                    style={{ height: `${(d.value / chartMax) * 100}%`, opacity: isInView ? 1 : 0, transitionDelay: `${i * 30}ms` }}>
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover/bar:block px-2 py-1 rounded bg-black/80 text-[9px] text-white whitespace-nowrap">
                      ${d.value.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-2 text-[9px] text-gray-600">
                <span>{chartData[0]?.date}</span>
                <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>
                <span>{chartData[chartData.length - 1]?.date}</span>
              </div>
            </>
          ) : (
            <div className="h-32 flex items-center justify-center text-[11px] text-gray-600">No revenue data yet</div>
          )}
        </div>

        {/* Profit Card */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/[0.08] to-emerald-600/[0.03] border border-emerald-500/20 hover:border-emerald-500/30 transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-white">Profit Tracker</span>
          </div>
          <div className="text-center mb-4">
            <p className="font-display text-3xl font-bold text-emerald-400">${avgOrder.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            <p className="text-[10px] text-emerald-400/70 mt-1">Avg. Profit per Order</p>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Margin</span>
              <span className="font-semibold text-white">{marginPct}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
                style={{ width: `${Math.min(100, marginPct)}%` }} />
            </div>
            <div className="h-px bg-emerald-500/10" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Total Revenue</span>
              <span className="font-semibold text-white">${revenue.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Total Orders</span>
              <span className="font-semibold text-white">{orders.toLocaleString()}</span>
            </div>
          </div>
          <Link href="/profit-tracker" className="mt-4 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 transition-all">
            View Tracker <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION 3: AI INTELLIGENCE HUB
   ═══════════════════════════════════════════════ */
function AIIntelligenceHub({
  dailyPick, briefing, alerts, onAlertRead,
}: {
  dailyPick: AIDailyPick | null; briefing: any; alerts: SmartAlert[]; onAlertRead: (id: string) => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="AI Intelligence" icon={Brain} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">

        {/* ═══ AI Daily Pick — Full Detail Card ═══ */}
        {dailyPick && (
          <div className="lg:col-span-2 rounded-2xl bg-gradient-to-br from-purple-500/[0.06] to-pink-500/[0.03] border border-purple-500/15 hover:border-purple-500/25 transition-all duration-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/10 rounded-full blur-[60px]" />
            <div className="relative z-10 p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30 animate-pulse">
                    <Sparkles className="h-4.5 w-4.5 text-purple-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">AI Pick of the Day</span>
                      <ScoreRing score={dailyPick.overallScore ?? 0} size={32} strokeWidth={3} />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      {dailyPick.category} &middot; {dailyPick.platform} &middot; Expires {new Date(dailyPick.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {dailyPick.yesterdayPick && (
                    <span className={`text-[9px] px-2 py-1 rounded-full font-medium ${dailyPick.yesterdayPick.up ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                      Yesterday: {dailyPick.yesterdayPick.result}
                    </span>
                  )}
                  <span className={`text-[9px] px-2 py-1 rounded-full font-medium border ${
                    dailyPick.risk === "low" ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                    dailyPick.risk === "medium" ? "text-amber-400 bg-amber-500/10 border-amber-500/20" :
                    "text-red-400 bg-red-500/10 border-red-500/20"
                  }`}>
                    {dailyPick.risk === "low" ? "Low Risk" : dailyPick.risk === "medium" ? "Med Risk" : "High Risk"}
                  </span>
                </div>
              </div>

              {/* Image + Details Row */}
              <div className="flex gap-5 mb-5">
                {/* Product Image */}
                <div className="w-40 h-40 rounded-xl overflow-hidden bg-gradient-to-br from-purple-500/15 to-pink-500/10 border border-purple-500/15 shrink-0 relative">
                  {dailyPick.image ? (
                    <Image src={dailyPick.image} alt={dailyPick.title} fill className="object-cover" sizes="160px" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Package className="h-12 w-12 text-purple-400/30" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-purple-500 text-white text-[8px] font-bold uppercase shadow-lg">AI Pick</div>
                  <div className="absolute bottom-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded bg-black/50 backdrop-blur-sm">
                    <Star className="h-2.5 w-2.5 text-amber-400 fill-amber-400" />
                    <span className="text-[9px] font-semibold text-white">{dailyPick.overallScore}/100</span>
                  </div>
                </div>

                {/* Product Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 font-bold uppercase">{dailyPick.category}</span>
                    <span className="text-[9px] px-2 py-0.5 rounded bg-white/[0.06] text-gray-400 font-medium">{dailyPick.platform}</span>
                  </div>
                  <h3 className="text-base font-bold text-white mb-1.5 leading-snug">{dailyPick.title}</h3>
                  <p className="text-[11px] text-gray-400 leading-relaxed mb-3">{dailyPick.description}</p>

                  {/* Key Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <p className="text-[8px] text-gray-500 uppercase mb-0.5">Source Price</p>
                      <p className="text-xs font-bold text-white">${(dailyPick.sourcePrice ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                      <p className="text-[8px] text-emerald-400/70 uppercase mb-0.5">Sell Price</p>
                      <p className="text-xs font-bold text-emerald-400">${(dailyPick.sellPrice ?? 0).toFixed(2)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <p className="text-[8px] text-gray-500 uppercase mb-0.5">Margin</p>
                      <p className="text-xs font-bold text-white">{dailyPick.margin ?? 0}%</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.04] border border-white/[0.06]">
                      <p className="text-[8px] text-gray-500 uppercase mb-0.5">Orders/mo</p>
                      <p className="text-xs font-bold text-white">{((dailyPick.ordersPerMonth ?? 0) / 1000).toFixed(1)}K</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Why AI Picked This + Earnings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                {/* Why AI Picked This */}
                <div className="p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-4 w-4 text-purple-400" />
                    <span className="text-xs font-bold text-white">Why AI Picked This</span>
                  </div>
                  <div className="space-y-2">
                    {(dailyPick.reasonPoints ?? []).map((point, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-gray-400 leading-relaxed">{point}</span>
                      </div>
                    ))}
                    {(!dailyPick.reasonPoints || dailyPick.reasonPoints.length === 0) && dailyPick.reason && (
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 mt-0.5 shrink-0" />
                        <span className="text-[11px] text-gray-400 leading-relaxed">{dailyPick.reason}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Earnings Preview */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/[0.06] to-emerald-600/[0.03] border border-emerald-500/15">
                  <div className="flex items-center gap-2 mb-3">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Earnings Preview</span>
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">Profit per Order</span>
                      <span className="text-xs font-bold text-emerald-400">${(dailyPick.earningsPreview?.profitPerOrder ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-gray-400">Orders per Month</span>
                      <span className="text-xs font-bold text-white">{dailyPick.earningsPreview?.ordersPerMonth ?? 0}</span>
                    </div>
                    <div className="h-px bg-emerald-500/10" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-400/80 font-medium">Monthly Revenue Est.</span>
                      <span className="text-sm font-bold text-emerald-400">${(dailyPick.earningsPreview?.monthlyRevenue ?? 0).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Saturation + Action Buttons */}
              <div className="flex items-center gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500">Market Saturation</span>
                    <span className="text-[10px] font-semibold text-white">{dailyPick.saturation ?? 0}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-1000"
                      style={{ width: `${dailyPick.saturation ?? 0}%` }} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link href="/products" className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-purple-500 text-white text-xs font-semibold hover:bg-purple-600 transition-all active:scale-[0.97]">
                  Start Selling <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>
                <Link href={`/calculator?source=${dailyPick.sourcePrice}&sell=${dailyPick.sellPrice}`} className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.1] text-gray-300 text-xs font-medium hover:bg-white/[0.05] transition-all">
                  <Calculator className="h-3.5 w-3.5" /> Compare
                </Link>
                <a href={dailyPick.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/[0.1] text-gray-300 text-xs font-medium hover:bg-white/[0.05] transition-all">
                  <ExternalLink className="h-3.5 w-3.5" /> Source
                </a>
              </div>
            </div>
          </div>
        )}

        {/* AI Briefing + Alerts */}
        <div className="space-y-3">
          {/* Briefing Card */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-semibold text-white">AI Briefing</span>
              <span className="ml-auto text-[9px] text-gray-600">{briefing.lastScan ? new Date(briefing.lastScan).toLocaleDateString() : "N/A"}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
                <p className="font-display text-lg font-bold text-emerald-400">{briefing.opportunities ?? 0}</p>
                <p className="text-[8px] text-emerald-400/70 uppercase">Opps</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-500/10 border border-red-500/15">
                <p className="font-display text-lg font-bold text-red-400">{briefing.risks ?? 0}</p>
                <p className="text-[8px] text-red-400/70 uppercase">Risks</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-blue-500/10 border border-blue-500/15">
                <p className="font-display text-lg font-bold text-blue-400">{briefing.trends ?? 0}</p>
                <p className="text-[8px] text-blue-400/70 uppercase">Trends</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] text-gray-500">Sentiment:</span>
              <span className={`text-[10px] font-semibold ${(briefing.sentiment ?? 0) >= 60 ? "text-emerald-400" : (briefing.sentiment ?? 0) >= 40 ? "text-amber-400" : "text-red-400"}`}>
                {briefing.sentimentLabel ?? "N/A"}
              </span>
              <span className="text-[10px] text-gray-600">({briefing.sentiment ?? 0}%)</span>
            </div>
            {(briefing.insights ?? []).length > 0 && (
              <div className="space-y-1.5">
                {(briefing.insights ?? []).slice(0, 2).map((insight: string, i: number) => (
                  <div key={i} className="flex items-start gap-2 text-[10px] text-gray-400">
                    <ChevronRight className="h-3 w-3 text-cyan-400 mt-0.5 shrink-0" />
                    <span className="leading-relaxed">{insight}</span>
                  </div>
                ))}
              </div>
            )}
            <Link href="/ai" className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-semibold hover:bg-cyan-500/20 transition-all">
              Full AI Tools <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Smart Alerts */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-amber-400" />
                <span className="text-xs font-semibold text-white">Smart Alerts</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-medium">{alerts.filter(a => !a.read).length} new</span>
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto">
              {alerts.length === 0 && (
                <p className="text-[10px] text-gray-600 text-center py-3">No alerts right now</p>
              )}
              {alerts.slice(0, 4).map((alert) => {
                const typeIcon: Record<string, typeof Zap> = { opportunity: Zap, risk: AlertTriangle, info: Info, warning: Shield };
                const typeColor: Record<string, string> = { opportunity: "text-emerald-400", risk: "text-red-400", info: "text-blue-400", warning: "text-amber-400" };
                const Icon = typeIcon[alert.type] || Info;
                return (
                  <Link key={alert.id} href={alert.actionHref || "/monitoring"}
                    onClick={() => onAlertRead(alert.id)}
                    className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all ${alert.read ? "bg-white/[0.02] border-white/[0.04] opacity-60" : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.06]"}`}>
                    <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${typeColor[alert.type] || "text-gray-400"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-white truncate">{alert.title}</p>
                      <p className="text-[9px] text-gray-500 mt-0.5">{alert.timestamp}</p>
                    </div>
                    <ArrowUpRight className="h-3 w-3 text-gray-600 shrink-0 mt-0.5" />
                  </Link>
                );
              })}
            </div>
            {alerts.length > 0 && (
              <Link href="/monitoring" className="mt-3 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-semibold hover:bg-amber-500/20 transition-all">
                View All Alerts <ArrowUpRight className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION 4: PRODUCT DISCOVERY
   ═══════════════════════════════════════════════ */
function ProductDiscovery({ trending, onAddCompare, onSaveProduct, isProductSaved, onViewProduct }: { trending: TrendingProduct[]; onAddCompare: (item: any) => void; onSaveProduct: (product: TrendingProduct) => void; isProductSaved: (name: string) => boolean; onViewProduct: (product: TrendingProduct) => void }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => { el.removeEventListener("scroll", checkScroll); window.removeEventListener("resize", checkScroll); };
  }, [trending.length]);

  const scroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 320;
    el.scrollBy({ left: dir === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  };

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Product Discovery" icon={Search} />
      <div className="mt-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-white">Trending Products</span>
            {trending.length > 0 && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 font-medium animate-pulse">{trending.length} hot</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {trending.length > 3 && (
              <div className="flex items-center gap-1">
                <button onClick={() => scroll("left")} disabled={!canScrollLeft} aria-label="Scroll left"
                  className={`p-1.5 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${canScrollLeft ? "bg-white/[0.06] border-white/[0.1] text-white hover:bg-white/[0.1]" : "bg-white/[0.02] border-white/[0.04] text-gray-600 cursor-not-allowed"}`}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => scroll("right")} disabled={!canScrollRight} aria-label="Scroll right"
                  className={`p-1.5 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${canScrollRight ? "bg-white/[0.06] border-white/[0.1] text-white hover:bg-white/[0.1]" : "bg-white/[0.02] border-white/[0.04] text-gray-600 cursor-not-allowed"}`}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <Link href="/products" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              View All <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {trending.length === 0 ? (
          <div className="text-center py-12 text-[11px] text-gray-600">No trending products right now</div>
        ) : (
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 scroll-smooth snap-x snap-mandatory">
            {trending.map((product, i) => (
              <div key={i}
                className="group flex-none w-[280px] sm:w-[300px] lg:w-[320px] snap-start rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-500 hover:shadow-[0_8px_40px_-12px_rgba(0,200,255,0.12)] overflow-hidden">
                {/* Image */}
                <div className="relative h-40 bg-gradient-to-br from-purple-500/15 to-blue-500/10 overflow-hidden">
                  {product.image ? (
                    <Image src={product.image} alt={product.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" sizes="320px" />
                  ) : (
                    <div className="flex items-center justify-center h-full"><Package className="h-12 w-12 text-purple-400/30" /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute top-2.5 left-2.5 px-2 py-1 rounded-lg bg-black/50 backdrop-blur-sm text-[9px] font-bold text-white uppercase">{product.platform}</div>
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 backdrop-blur-sm">
                    <TrendingUp className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400">+{product.trend}%</span>
                  </div>
                  <div className="absolute bottom-2.5 left-2.5 right-2.5">
                    <MiniSparkline data={product.sparkline} color="#22c55e" width={140} height={20} />
                  </div>
                  <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAddCompare({ name: product.name, price: product.price, margin: product.margin, image: product.image }); }}
                    aria-label={`Add ${product.name} to compare`}
                    className="absolute bottom-2.5 right-2.5 p-1.5 rounded-lg bg-black/40 text-white/70 hover:text-white hover:bg-black/60 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                {/* Info */}
                <div className="p-4">
                  <h4 className="text-xs font-semibold text-white line-clamp-2 mb-2 min-h-[2.5rem]">{product.name}</h4>
                  {product.whyTrending && (
                    <p className="text-[10px] text-gray-500 line-clamp-1 mb-3 flex items-center gap-1">
                      <Info className="h-3 w-3 shrink-0 text-cyan-400" />
                      {product.whyTrending}
                    </p>
                  )}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-[8px] text-gray-500 uppercase">Price</p>
                      <p className="text-sm font-bold text-white">${product.price.toFixed(2)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/15">
                      <p className="text-[8px] text-emerald-400/70 uppercase">Margin</p>
                      <p className="text-sm font-bold text-emerald-400">{product.margin}%</p>
                    </div>
                    <div className="p-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <p className="text-[8px] text-gray-500 uppercase">Score</p>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
                        <span className="text-sm font-bold text-white">{product.confidence}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${product.demandLevel === "high" ? "bg-emerald-500/15 text-emerald-400" : product.demandLevel === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-gray-500/15 text-gray-400"}`}>
                      {product.demandLevel} demand
                    </span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${product.competitionLevel === "low" ? "bg-emerald-500/15 text-emerald-400" : product.competitionLevel === "medium" ? "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>
                      {product.competitionLevel} competition
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.06] text-gray-400">{product.shippingDays} days</span>
                  </div>
                  {product.competitors && product.competitors.length > 0 && (
                    <div className="text-[9px] text-gray-600 mb-3">
                      Competitors: {product.competitors.slice(0, 2).map(c => `${c.name} $${c.price.toFixed(2)}`).join(", ")}
                    </div>
                  )}
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onViewProduct(product); }}
                      aria-label={`View details for ${product.name}`}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-semibold hover:bg-cyan-500/20 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
                      <ExternalLink className="h-3 w-3" />
                      View Product
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onSaveProduct(product); }}
                      aria-label={isProductSaved(product.name) ? `Unsave ${product.name}` : `Save ${product.name}`}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 ${
                        isProductSaved(product.name)
                          ? "bg-emerald-500/15 border-emerald-500/25 text-emerald-400"
                          : "bg-white/[0.04] border-white/[0.08] text-gray-400 hover:bg-white/[0.08] hover:text-white"
                      }`}>
                      {isProductSaved(product.name) ? (
                        <><BookmarkCheck className="h-3 w-3" /> Saved</>
                      ) : (
                        <><BookmarkPlus className="h-3 w-3" /> Save</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Feature Cards Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          {[
            { icon: BookmarkPlus, label: "Saved Products", href: "/saved", color: "blue", stat: "View" },
            { icon: CheckCircle2, label: "Validation", href: "/product-validation", color: "emerald", stat: "Test" },
            { icon: FileText, label: "Listings", href: "/product-listings", color: "purple", stat: "Optimize" },
            { icon: GitBranch, label: "Lifecycle", href: "/product-lifecycle", color: "amber", stat: "Track" },
          ].map((f) => {
            const cMap: Record<string, string> = { blue: "bg-blue-500/10 border-blue-500/20 text-blue-400", emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400", purple: "bg-purple-500/10 border-purple-500/20 text-purple-400", amber: "bg-amber-500/10 border-amber-500/20 text-amber-400" };
            return (
              <Link key={f.href} href={f.href} className={`flex items-center gap-3 p-3 rounded-xl border ${cMap[f.color]} hover:bg-white/[0.04] transition-all duration-300 group`}>
                <f.icon className="h-5 w-5 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-white truncate">{f.label}</p>
                  <p className="text-[9px] text-gray-500">{f.stat}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION 5: SUPPLIER NETWORK
   ═══════════════════════════════════════════════ */
function SupplierNetwork({ suppliers }: { suppliers: SupplierStatus[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const online = suppliers.filter(s => s.status === "online").length;
  const busy = suppliers.filter(s => s.status === "busy").length;
  const offline = suppliers.filter(s => s.status === "offline").length;
  const badgeColors: Record<string, { bg: string; text: string }> = {
    gold: { bg: "bg-amber-400/10", text: "text-amber-400" },
    silver: { bg: "bg-gray-300/10", text: "text-gray-300" },
    bronze: { bg: "bg-orange-400/10", text: "text-orange-400" },
  };
  const statusColors: Record<string, string> = { online: "bg-emerald-400", busy: "bg-amber-400", offline: "bg-gray-500" };
  const responseColors: Record<string, string> = { fast: "text-emerald-400", moderate: "text-amber-400", slow: "text-red-400" };

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Supplier Network" icon={Truck} />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
        {/* Supplier Stats */}
        <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
          <div className="flex items-center gap-2 mb-4">
            <Users className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-semibold text-white">Network Status</span>
          </div>
          <div className="text-center mb-4">
            <p className="font-display text-3xl font-bold text-white">{suppliers.length}</p>
            <p className="text-[10px] text-gray-500 uppercase">Total Suppliers</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
              <p className="font-display text-lg font-bold text-emerald-400">{online}</p>
              <p className="text-[8px] text-emerald-400/70 uppercase">Online</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/15">
              <p className="font-display text-lg font-bold text-amber-400">{busy}</p>
              <p className="text-[8px] text-amber-400/70 uppercase">Busy</p>
            </div>
            <div className="text-center p-2 rounded-lg bg-gray-500/10 border border-gray-500/15">
              <p className="font-display text-lg font-bold text-gray-400">{offline}</p>
              <p className="text-[8px] text-gray-400/70 uppercase">Offline</p>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Link href="/suppliers" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-semibold hover:bg-blue-500/20 transition-all">
              All Suppliers
            </Link>
            <Link href="/srm" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-semibold hover:bg-purple-500/20 transition-all">
              SRM
            </Link>
          </div>
        </div>

        {/* Supplier Cards */}
        <div className="md:col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-semibold text-white">Top Suppliers</span>
            <Link href="/supplier-performance" className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              Performance <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2">
            {suppliers.length === 0 && (
              <p className="text-[11px] text-gray-600 text-center py-4">No suppliers connected</p>
            )}
            {suppliers.slice(0, 4).map((s, i) => {
              const badge = badgeColors[s.trustBadge] || badgeColors.bronze;
              return (
                <Link key={i} href="/suppliers" className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] hover:bg-white/[0.05] transition-all group">
                  <div className={`p-2 rounded-lg ${badge.bg}`}>
                    <Star className={`h-4 w-4 ${badge.text} fill-current`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-white truncate group-hover:text-cyan-400 transition-colors">{s.name}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusColors[s.status]} ${s.status === "online" ? "animate-pulse" : ""}`} />
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] text-gray-500">{s.location}</span>
                      <span className="text-[9px] text-gray-600">&middot;</span>
                      <span className={`text-[9px] ${responseColors[s.responseLevel] || "text-gray-500"}`}>{s.responseTime}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-[10px] text-amber-400">
                      <Star className="h-2.5 w-2.5 fill-current" />{s.rating}
                    </div>
                    <span className="text-[9px] text-gray-600">{s.completionRate}% complete</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION 6: ORDER OPERATIONS
   ═══════════════════════════════════════════════ */
function OrderOperations({ pipeline }: { pipeline: FulfillmentPipelineData }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const pending = pipeline.pending ?? 0;
  const processing = pipeline.processing ?? 0;
  const shipped = pipeline.shipped ?? 0;
  const delivered = pipeline.delivered ?? 0;
  const total = pending + processing + shipped + delivered;
  const totalRevenue = pipeline.totalRevenue ?? 0;
  const totalProfit = pipeline.totalProfit ?? 0;
  const marginPct = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

  const stages = [
    { label: "Pending", count: pending, color: "#f59e0b", icon: Clock },
    { label: "Processing", count: processing, color: "#3b82f6", icon: RefreshCw },
    { label: "Shipped", count: shipped, color: "#a855f7", icon: Truck },
    { label: "Delivered", count: delivered, color: "#22c55e", icon: CheckCircle2 },
  ];
  const maxCount = Math.max(...stages.map(s => s.count), 1);

  const statusCfg: Record<string, { color: string; label: string }> = {
    pending: { color: "text-amber-400", label: "Pending" },
    in_progress: { color: "text-blue-400", label: "Processing" },
    shipped: { color: "text-purple-400", label: "Shipped" },
    delivered: { color: "text-emerald-400", label: "Delivered" },
  };

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Order Operations" icon={Package} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
        {/* Pipeline Visual */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.1] transition-all duration-300">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-semibold text-white">Fulfillment Pipeline</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 font-medium">{total} orders</span>
            </div>
            <Link href="/fulfillment" className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              View Pipeline <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Pipeline Bars */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {stages.map((stage) => (
              <div key={stage.label} className="text-center">
                <div className="relative h-2 rounded-full bg-white/[0.06] overflow-hidden mb-2">
                  <div className="absolute inset-y-0 left-0 rounded-full transition-all duration-1000"
                    style={{ width: isInView ? `${(stage.count / maxCount) * 100}%` : "0%", backgroundColor: stage.color }} />
                </div>
                <p className="font-display text-lg font-bold text-white">{stage.count}</p>
                <p className="text-[9px] text-gray-500">{stage.label}</p>
              </div>
            ))}
          </div>

          {/* Recent Orders */}
          <div>
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Recent Orders</p>
            {(pipeline.recentOrders ?? []).length === 0 ? (
              <p className="text-[10px] text-gray-600 text-center py-4">No recent orders</p>
            ) : (
              <div className="space-y-1.5">
                {(pipeline.recentOrders ?? []).slice(0, 4).map((order) => {
                  const cfg = statusCfg[order.status] || statusCfg.pending;
                  return (
                    <div key={order.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-white/[0.03] transition-all">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center shrink-0">
                        <ShoppingCart className="h-3.5 w-3.5 text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-white truncate">{order.customer}</p>
                        <p className="text-[9px] text-gray-500 truncate">{order.product}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold text-white">${order.amount.toFixed(2)}</p>
                        <p className={`text-[9px] font-medium ${cfg.color}`}>{cfg.label}</p>
                      </div>
                      <span className="text-[9px] text-gray-600 shrink-0 w-12 text-right">{order.time}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Side Panel */}
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/[0.06] to-emerald-600/[0.03] border border-emerald-500/15">
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">Pipeline Revenue</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Total Revenue</span>
                <span className="text-sm font-bold text-white">${totalRevenue.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Total Profit</span>
                <span className="text-sm font-bold text-emerald-400">${totalProfit.toLocaleString()}</span>
              </div>
              <div className="h-px bg-emerald-500/10" />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-400">Margin</span>
                <span className="text-sm font-bold text-emerald-400">{marginPct}%</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</p>
            <div className="space-y-1.5">
              {[
                { icon: Package, label: "Bulk Orders", href: "/bulk-orders", color: "text-blue-400" },
                { icon: RotateCcw, label: "Returns", href: "/returns", color: "text-amber-400" },
                { icon: Map, label: "Order Router", href: "/order-router", color: "text-purple-400" },
                { icon: Globe, label: "Shipping Optimizer", href: "/shipping-optimizer", color: "text-cyan-400" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-all group">
                  <l.icon className={`h-4 w-4 ${l.color}`} />
                  <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">{l.label}</span>
                  <ChevronRight className="h-3 w-3 text-gray-600 ml-auto group-hover:text-gray-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION 7: MARKET INTELLIGENCE
   ═══════════════════════════════════════════════ */
function MarketIntelligence({ heatmap, ticker }: { heatmap: HeatmapCategory[]; ticker: TickerItem[] }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const overheating = heatmap.filter(c => c.heat >= 80).length;
  const trendingUp = heatmap.filter(c => c.trend === "up").length;
  const cooling = heatmap.filter(c => c.trend === "down").length;

  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Market Intelligence" icon={Eye} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-4">
        {/* Heatmap */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-gradient-to-br from-orange-500/[0.06] to-red-500/[0.03] border border-orange-500/15 hover:border-orange-500/25 transition-all duration-300">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-orange-400" />
              <span className="text-sm font-semibold text-white">Market Heatmap</span>
              <span className="flex items-center gap-1 text-[9px] text-emerald-400"><Activity className="h-2.5 w-2.5" />Live</span>
            </div>
            <Link href="/products" className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors">
              Full Map <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/15">
              <Flame className="h-3 w-3 text-red-400" />
              <span className="text-[10px] font-bold text-red-400">{overheating}</span>
              <span className="text-[9px] text-red-400/70">overheating</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/15">
              <TrendingUp className="h-3 w-3 text-emerald-400" />
              <span className="text-[10px] font-bold text-emerald-400">{trendingUp}</span>
              <span className="text-[9px] text-emerald-400/70">trending up</span>
            </div>
            {cooling > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/15">
                <TrendingDown className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] font-bold text-blue-400">{cooling}</span>
                <span className="text-[9px] text-blue-400/70">cooling</span>
              </div>
            )}
          </div>

          {heatmap.length === 0 ? (
            <div className="text-center py-8 text-[11px] text-gray-600">No heatmap data available</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {heatmap.slice(0, 8).map((cat, i) => {
                const getColor = (h: number) => h >= 80 ? "from-red-500/20 to-red-500/5 border-red-500/20" : h >= 60 ? "from-orange-500/15 to-orange-500/5 border-orange-500/15" : h >= 40 ? "from-amber-500/10 to-amber-500/5 border-amber-500/15" : "from-blue-500/10 to-blue-500/5 border-blue-500/15";
                const getTxt = (h: number) => h >= 80 ? "text-red-400" : h >= 60 ? "text-orange-400" : h >= 40 ? "text-amber-400" : "text-blue-400";
                return (
                  <div key={i} className={`p-3 rounded-xl bg-gradient-to-br ${getColor(cat.heat)} border transition-all duration-300 hover:scale-[1.03] cursor-pointer`}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-semibold text-white truncate">{cat.category}</span>
                      <span className={`text-[10px] font-bold ${getTxt(cat.heat)}`}>{cat.heat}</span>
                    </div>
                    <p className="text-[8px] text-gray-500 truncate mb-1">{cat.topProduct}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[8px] text-emerald-400/70">{cat.avgMargin}% margin</span>
                      <span className={`text-[8px] ${cat.trend === "up" ? "text-emerald-400" : cat.trend === "down" ? "text-red-400" : "text-gray-500"}`}>
                        {cat.trend === "up" ? "↑" : cat.trend === "down" ? "↓" : "→"}
                      </span>
                    </div>
                    {cat.velocity !== 0 && (
                      <span className={`text-[8px] font-semibold ${cat.velocity > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {cat.velocity > 0 ? "+" : ""}{cat.velocity}%/wk
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Market Pulse + Tools */}
        <div className="space-y-3">
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-green-400" />
              <span className="text-xs font-semibold text-white">Market Pulse</span>
              <span className="ml-auto flex items-center gap-1 text-[9px] text-green-400"><span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Live</span>
            </div>
            {ticker.length === 0 ? (
              <p className="text-[10px] text-gray-600 text-center py-3">No ticker data</p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {ticker.slice(0, 6).map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{t.name}</span>
                      <span className="text-[9px] text-gray-600">{t.platform}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">${t.price?.toFixed(2)}</span>
                      <span className={`font-semibold ${t.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {t.change >= 0 ? "+" : ""}{t.change}%
                      </span>
                      <MiniSparkline data={t.sparkline} color={t.change >= 0 ? "#22c55e" : "#ef4444"} width={40} height={16} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
            <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-3">Competitive Tools</p>
            <div className="space-y-1.5">
              {[
                { icon: Crosshair, label: "Competitor Analysis", href: "/competitors", color: "text-red-400" },
                { icon: Shield, label: "Price War Tracker", href: "/price-war", color: "text-amber-400" },
                { icon: BarChart3, label: "Reports", href: "/reports", color: "text-blue-400" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.04] transition-all group">
                  <l.icon className={`h-4 w-4 ${l.color}`} />
                  <span className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">{l.label}</span>
                  <ChevronRight className="h-3 w-3 text-gray-600 ml-auto group-hover:text-gray-400 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION 8: STORE OPERATIONS
   ═══════════════════════════════════════════════ */
function StoreOperations({ storesConnected }: { storesConnected: number }) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const ops = [
    { icon: Store, label: "My Stores", desc: `${storesConnected} connected. Sync inventory, push products.`, href: "/store", color: "from-blue-500/10 to-blue-600/5 border-blue-500/15", iconColor: "text-blue-400" },
    { icon: Layers, label: "Multi-Store", desc: "Manage multiple stores, cross-sync, bulk ops.", href: "/multi-store", color: "from-purple-500/10 to-purple-600/5 border-purple-500/15", iconColor: "text-purple-400" },
    { icon: Activity, label: "Monitoring", desc: "Real-time uptime, performance tracking.", href: "/monitoring", color: "from-emerald-500/10 to-emerald-600/5 border-emerald-500/15", iconColor: "text-emerald-400" },
    { icon: HeartPulse, label: "Store Health", desc: "Health scores, alerts, recommendations.", href: "/health", color: "from-rose-500/10 to-rose-600/5 border-rose-500/15", iconColor: "text-rose-400" },
  ];
  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Store Operations" icon={Store} />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        {ops.map((op, i) => (
          <Link key={op.href} href={op.href}
            className={`group p-5 rounded-2xl bg-gradient-to-br ${op.color} border hover:scale-[1.02] transition-all duration-500 hover:shadow-lg`}>
            <div className={`p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] inline-flex mb-3 ${op.iconColor} group-hover:scale-110 transition-transform`}>
              <op.icon className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-white mb-1">{op.label}</h3>
            <p className="text-[10px] text-gray-400 leading-relaxed">{op.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION 9: GROWTH & TOOLS
   ═══════════════════════════════════════════════ */
function GrowthTools() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const tools = [
    { icon: Award, label: "Daily Missions", desc: "Challenges, XP, badges", href: "/missions", color: "from-amber-500/10 to-amber-600/5 border-amber-500/15", iconColor: "text-amber-400" },
    { icon: Calculator, label: "Calculator", desc: "Margins, pricing strategies", href: "/calculator", color: "from-green-500/10 to-green-600/5 border-green-500/15", iconColor: "text-green-400" },
    { icon: TrendingUpIcon, label: "Trend Predictor", desc: "AI trend analysis", href: "/trends", color: "from-cyan-500/10 to-cyan-600/5 border-cyan-500/15", iconColor: "text-cyan-400" },
    { icon: Headphones, label: "Customer Service", desc: "Support tickets, automation", href: "/customer-service", color: "from-violet-500/10 to-violet-600/5 border-violet-500/15", iconColor: "text-violet-400" },
    { icon: BarChart3, label: "Ad ROI", desc: "Ad performance, spend", href: "/ad-roi", color: "from-pink-500/10 to-pink-600/5 border-pink-500/15", iconColor: "text-pink-400" },
    { icon: FileText, label: "Daily Digest", desc: "Business summary", href: "/digest", color: "from-teal-500/10 to-teal-600/5 border-teal-500/15", iconColor: "text-teal-400" },
  ];
  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <SectionDivider label="Growth & Tools" icon={Zap} />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}
            className={`group p-4 rounded-2xl bg-gradient-to-br ${tool.color} border hover:scale-[1.03] transition-all duration-500 text-center`}>
            <div className={`p-2.5 rounded-xl bg-white/[0.06] border border-white/[0.08] inline-flex mb-2 ${tool.iconColor} group-hover:scale-110 transition-transform`}>
              <tool.icon className="h-5 w-5" />
            </div>
            <h3 className="text-[11px] font-semibold text-white mb-0.5">{tool.label}</h3>
            <p className="text-[9px] text-gray-500 leading-relaxed">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   SECTION 10: MARKET TICKER FOOTER
   ═══════════════════════════════════════════════ */
function MarketTickerFooter({ ticker }: { ticker: TickerItem[] }) {
  if (ticker.length === 0) return null;
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Market Ticker</span>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
        {ticker.map((t, i) => (
          <div key={i} className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-semibold text-white">{t.name}</span>
            <span className="text-[10px] text-gray-500">{t.platform}</span>
            <span className="text-[10px] text-gray-500">${t.price?.toFixed(2)}</span>
            <span className={`text-[10px] font-bold ${t.change >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {t.change >= 0 ? "+" : ""}{t.change}%
            </span>
            <MiniSparkline data={t.sparkline} color={t.change >= 0 ? "#22c55e" : "#ef4444"} width={40} height={14} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   MAIN DASHBOARD PAGE
   ═══════════════════════════════════════════════ */
export default function DashboardHome() {
  const { data, markAlertRead, addToCompare, loading } = useDashboardData();
  const { user } = useAuth();
  const { toggleSave, isSaved } = useSavedProducts();
  const router = useRouter();

  useEffect(() => {
    if (data.contextualActions?.length) {
      setContextualActions(data.contextualActions);
    }
    return () => setContextualActions([]);
  }, [data.contextualActions]);

  const stats = {
    revenue: data.revenueStats?.revenue ?? 0,
    growth: data.revenueStats?.growth ?? 0,
    orders: data.revenueStats?.orders ?? 0,
    avgOrder: data.revenueStats?.avgOrder ?? 0,
  };
  const onlineSuppliers = data.suppliers.filter(s => s.status === "online").length;

  const handleSaveTrending = useCallback((product: TrendingProduct) => {
    toggleSave({
      id: product.name,
      title: product.name,
      price: product.price,
      image: product.image || null,
      link: product.sourceUrl || "",
      source: product.platform,
      savedAt: Date.now(),
    });
  }, [toggleSave]);

  const isTrendingSaved = useCallback((name: string) => {
    return isSaved(name);
  }, [isSaved]);

  const handleViewTrending = useCallback((product: TrendingProduct) => {
    const productId = product.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
    sessionStorage.setItem("selectedProduct", JSON.stringify({
      id: productId,
      title: product.name,
      price: product.price,
      image: product.image || null,
      images: product.image ? [product.image] : [],
      link: product.sourceUrl || "#",
      source: "cj",
      category: "",
      tags: [],
      rating: product.confidence,
      reviews: undefined,
    }));
    const params = new URLSearchParams({
      t: product.name,
      p: String(product.price),
      src: "cj",
    });
    if (product.image) params.set("img", product.image);
    if (product.sourceUrl) params.set("link", product.sourceUrl);
    if (product.confidence != null) params.set("r", String(product.confidence));
    router.push(`/products/${productId}?${params.toString()}`);
  }, [router]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6" aria-busy="true" aria-label="Loading dashboard">
        <HeroSkeleton />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="lg:col-span-2 h-64 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          <div className="h-64 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="h-40 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          <div className="md:col-span-2 h-40 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-36 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-4 md:p-6">
      <HeroCommandCenter
        username={user?.displayName || user?.email?.split("@")[0] || "there"}
        healthScore={data.healthScore}
        trendingCount={data.trending?.length}
        suppliersCount={onlineSuppliers}
        savedCount={undefined}
      />

      <RevenueProfitHub stats={stats} chartData={data.revenueChart ?? []} storesConnected={data.storesCount} suppliersActive={onlineSuppliers} pendingOrders={data.fulfillmentPipeline.pending ?? 0} />

      <AIIntelligenceHub
        dailyPick={data.dailyPick}
        briefing={data.briefing}
        alerts={data.alerts}
        onAlertRead={markAlertRead}
      />

      <ProductDiscovery trending={data.trending} onAddCompare={addToCompare} onSaveProduct={handleSaveTrending} isProductSaved={isTrendingSaved} onViewProduct={handleViewTrending} />

      <SupplierNetwork suppliers={data.suppliers} />

      <OrderOperations pipeline={data.fulfillmentPipeline} />

      <MarketIntelligence heatmap={data.heatmap} ticker={data.ticker} />

      <StoreOperations storesConnected={data.storesCount} />

      <GrowthTools />

      <MarketTickerFooter ticker={data.ticker} />
    </div>
  );
}
