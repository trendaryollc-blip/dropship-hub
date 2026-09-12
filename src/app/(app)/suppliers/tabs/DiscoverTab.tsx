"use client";

import { useState, useMemo, Suspense, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search, Shield, MapPin, Clock, Star, Filter, Truck,
  Package, ArrowRight, RefreshCw, CheckSquare, Square, X,
  Sparkles, TrendingUp, BarChart3, MessageSquare, FileText,
  Loader2, Target,
} from "lucide-react";
import VoiceInput from "@/components/ai/VoiceInput";
import { useInView } from "@/hooks/useInView";
import type { SupplierProfile } from "@/types/supplier";
import { badgeConfig, ScoreRing, dataSourceConfig } from "@/components/suppliers/supplier-shared";
import SupplierFilterPanel, { type SupplierFilters } from "@/components/suppliers/SupplierFilterPanel";
import SupplierComparePanel from "@/components/suppliers/SupplierComparePanel";
import SupplierCollections from "@/components/suppliers/SupplierCollections";
import SupplierAISuggestions from "@/components/suppliers/SupplierAISuggestions";
import SupplierQuickActions from "@/components/suppliers/SupplierQuickActions";
import QuickActionResult from "@/components/suppliers/QuickActionResult";
import { useAPI } from "@/hooks/useAPI";

type SortBy = "rating" | "reliability" | "response" | "orders" | "price";

function ComparisonModal({ suppliers, onClose }: { suppliers: SupplierProfile[]; onClose: () => void }) {
  if (suppliers.length === 0) return null;

  const metrics = [
    { label: "Rating", key: "rating", format: (v: number) => v > 0 ? v.toFixed(1) : "\u2014", best: "max" as const },
    { label: "Reliability Score", key: "reliabilityScore", format: (v: number) => v > 0 ? `${v}%` : "\u2014", best: "max" as const },
    { label: "Response Time", key: "responseTimeHours", format: (v: number) => v > 0 ? `${v}h` : "\u2014", best: "min" as const },
    { label: "Shipping Days (US)", key: "shippingDays", format: (v: number) => v > 0 ? `${v} days` : "\u2014", best: "min" as const },
    { label: "Order Completion", key: "orderCompletionRate", format: (v: number) => v > 0 ? `${v}%` : "\u2014", best: "max" as const },
    { label: "Dispute Rate", key: "disputeRate", format: (v: number) => v > 0 ? `${v}%` : "\u2014", best: "min" as const },
    { label: "Monthly Orders", key: "monthlyOrders", format: (v: number) => v > 0 ? v.toLocaleString() : "\u2014", best: "max" as const },
    { label: "Quality Score", key: "qualityScore", format: (v: number) => v > 0 ? `${v}/100` : "\u2014", best: "max" as const },
    { label: "Communication Score", key: "communicationScore", format: (v: number) => v > 0 ? `${v}/100` : "\u2014", best: "max" as const },
    { label: "Price Competitiveness", key: "priceCompetitiveness", format: (v: number) => v > 0 ? `${v}/100` : "\u2014", best: "max" as const },
  ];

  const getBestValue = (key: string, best: "max" | "min") => {
    const values = suppliers.map((s) => {
      const stats = s.stats as unknown as Record<string, number>;
      return stats[key];
    }).filter((v) => v > 0);
    if (values.length === 0) return 0;
    return best === "max" ? Math.max(...values) : Math.min(...values);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="glass rounded-2xl border border-border w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h3 className="font-display text-lg font-semibold text-foreground">
            Compare Suppliers ({suppliers.length})
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
        <div className="overflow-auto max-h-[calc(90vh-80px)]">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-4 text-xs text-muted-foreground font-medium w-40">Metric</th>
                {suppliers.map((s) => (
                  <th key={s.id} className="text-center p-4 min-w-[150px]">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-purple-400/20 border border-border flex items-center justify-center font-display text-xs font-bold text-foreground">
                        {s.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-xs font-semibold text-foreground">{s.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${badgeConfig[s.trustBadge].color} ${badgeConfig[s.trustBadge].border}`}>{badgeConfig[s.trustBadge].label}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {metrics.map((metric) => {
                const bestValue = getBestValue(metric.key, metric.best);
                return (
                  <tr key={metric.key} className="border-b border-border/50 hover:bg-surface/30">
                    <td className="p-4 text-xs text-muted-foreground">{metric.label}</td>
                    {suppliers.map((s) => {
                      const stats = s.stats as unknown as Record<string, number>;
                      const value = stats[metric.key];
                      const isBest = value > 0 && value === bestValue && suppliers.length > 1;
                      return (
                        <td key={s.id} className="text-center p-4">
                          <span className={`text-sm font-medium ${isBest ? "text-emerald-400" : value > 0 ? "text-foreground" : "text-muted-foreground/50"}`}>
                            {metric.format(value)}
                          </span>
                          {isBest && (
                            <span className="block text-[9px] text-emerald-400 mt-0.5">Best</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              <tr className="border-b border-border/50">
                <td className="p-4 text-xs text-muted-foreground">Data Source</td>
                {suppliers.map((s) => (
                  <td key={s.id} className="text-center p-4">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${dataSourceConfig[s.dataSource]?.color || ""}`}>
                      {dataSourceConfig[s.dataSource]?.label || s.dataSource}
                    </span>
                  </td>
                ))}
              </tr>
              <tr>
                <td className="p-4 text-xs text-muted-foreground">Actions</td>
                {suppliers.map((s) => (
                  <td key={s.id} className="text-center p-4">
                    <Link href={`/suppliers/${s.id}`} className="text-xs text-accent hover:text-accent/80">
                      View Details
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SupplierCard({
  supplier,
  index,
  isSelected,
  isFocused,
  onToggleSelect,
  onFocus,
  onAIAction,
}: {
  supplier: SupplierProfile;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  onToggleSelect: (id: string) => void;
  onFocus: (id: string) => void;
  onAIAction?: (action: string, supplier: SupplierProfile) => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const [showAIActions, setShowAIActions] = useState(false);
  const aiActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (aiActionsRef.current && !aiActionsRef.current.contains(e.target as Node)) {
        setShowAIActions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasStats = supplier.stats.rating > 0 || supplier.stats.reliabilityScore > 0;

  return (
    <div className="relative">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <button
          onClick={(e) => { e.preventDefault(); onFocus(supplier.id); }}
          className={`p-1.5 rounded-lg transition-all ${isFocused ? "bg-accent text-white" : "bg-surface/80 text-muted-foreground hover:text-accent hover:bg-accent/10"}`}
          title={isFocused ? "Unfocus supplier" : "Focus on this supplier"}
        >
          <Target className={`h-4 w-4 ${isFocused ? "fill-current" : ""}`} />
        </button>
        <button
          onClick={(e) => { e.preventDefault(); onToggleSelect(supplier.id); }}
          className={`p-1.5 rounded-lg transition-all ${isSelected ? "bg-accent/20 text-accent" : "bg-surface/80 text-muted-foreground hover:text-foreground"}`}
        >
          {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
        </button>
      </div>
      <Link href={`/suppliers/${supplier.id}`}>
        <div
          ref={ref}
          className={`glass rounded-2xl border border-border p-5 hover:border-accent/20 transition-all duration-500 cursor-pointer ${
            isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
          } ${isFocused ? "border-accent bg-accent/10 shadow-[0_0_20px_rgba(var(--glow-color),0.15)]" : isSelected ? "border-accent/40 bg-accent/5" : ""}`}
          style={{ transitionDelay: `${index * 60}ms` }}
        >
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/20 to-purple-400/20 border border-border flex items-center justify-center font-display text-sm font-bold text-foreground shrink-0">
                {supplier.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-display text-sm font-semibold text-foreground">{supplier.name}</h3>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${badgeConfig[supplier.trustBadge].color} ${badgeConfig[supplier.trustBadge].border}`}>{badgeConfig[supplier.trustBadge].label}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${dataSourceConfig[supplier.dataSource]?.color || ""}`}>{dataSourceConfig[supplier.dataSource]?.label || supplier.dataSource}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {supplier.flag} {supplier.location}</span>
                  {supplier.stats.responseTimeHours > 0 && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {supplier.stats.responseTime}</span>
                  )}
                  {supplier.stats.shippingDays > 0 && (
                    <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {supplier.stats.shippingDays}d shipping</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {supplier.specializations.slice(0, 3).map((spec) => (
                    <span key={spec} className="text-[9px] px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20 font-medium">
                      {spec}
                    </span>
                  ))}
                  {supplier.specializations.length > 3 && (
                    <span className="text-[9px] text-muted-foreground">+{supplier.specializations.length - 3}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 sm:shrink-0">
              {hasStats && (
                <div className="flex flex-col items-center gap-1.5">
                  <ScoreRing score={supplier.stats.reliabilityScore} size={36} />
                  <span className="text-[8px] text-muted-foreground">Reliability</span>
                </div>
              )}
              <div className="text-right">
                <div className="flex items-center gap-1 text-amber-400">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-display text-sm font-bold">{supplier.stats.rating > 0 ? supplier.stats.rating.toFixed(1) : "\u2014"}</span>
                </div>
                <p className="text-[9px] text-muted-foreground mt-0.5">{supplier.stats.reviews > 0 ? `${supplier.stats.reviews.toLocaleString()} reviews` : "New supplier"}</p>
                {supplier.stats.priceCompetitiveness > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <div className="w-12 h-1 rounded-full bg-surface overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-400"
                        style={{ width: `${supplier.stats.priceCompetitiveness}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-muted-foreground">{supplier.stats.priceCompetitiveness}%</span>
                  </div>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground hidden sm:block" />
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground flex-wrap">
              <span><Package className="h-3 w-3 inline mr-1" />{supplier.specializations.slice(0, 2).join(", ")}</span>
              {supplier.stats.monthlyOrders > 0 && (
                <span>{supplier.stats.monthlyOrders.toLocaleString()} orders/mo</span>
              )}
              {supplier.shipping.freeShippingThreshold && (
                <span className="text-emerald-400">Free ship ${supplier.shipping.freeShippingThreshold}+</span>
              )}
              {supplier.stats.totalProducts > 0 && (
                <span>{supplier.stats.totalProducts.toLocaleString()} products</span>
              )}
            </div>
            {onAIAction && (
              <div className="relative" ref={aiActionsRef}>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAIActions(!showAIActions); }}
                  className="p-1.5 rounded-lg bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors"
                  title="AI Actions"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                </button>
                {showAIActions && (
                  <div className="absolute bottom-full right-0 mb-1 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    <div className="p-1">
                      {[
                        { id: "analyze", label: "Analyze Supplier", icon: BarChart3, color: "text-blue-400" },
                        { id: "find-products", label: "Find Their Products", icon: Package, color: "text-emerald-400" },
                        { id: "negotiate", label: "Start Negotiation", icon: MessageSquare, color: "text-violet-400" },
                        { id: "check-performance", label: "Check Performance", icon: TrendingUp, color: "text-amber-400" },
                        { id: "request-sample", label: "Request Sample", icon: FileText, color: "text-cyan-400" },
                      ].map((action) => (
                        <button
                          key={action.id}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAIActions(false); onAIAction(action.id, supplier); }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors text-left"
                        >
                          <action.icon className={`h-3.5 w-3.5 ${action.color}`} />
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>
    </div>
  );
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialProduct = searchParams.get("product") || "";
  const initialCategory = searchParams.get("category") || "";
  const initialSource = searchParams.get("source") || "";
  const initialPrice = searchParams.get("price") ? parseFloat(searchParams.get("price")!) : 0;
  const hasProductContext = !!initialProduct;

  const findUrl = hasProductContext
    ? `/api/suppliers/find?product=${encodeURIComponent(initialProduct)}&category=${encodeURIComponent(initialCategory)}&source=${encodeURIComponent(initialSource)}&price=${initialPrice || ""}`
    : null;
  const listUrl = !hasProductContext ? "/api/suppliers" : null;

  const { data: findData, isLoading: findLoading } = useAPI<{ suppliers?: (SupplierProfile & { relevanceScore?: number })[]; error?: string }>(findUrl);
  const { data: listData, error: apiError, isLoading: listLoading, mutate } = useAPI<{ suppliers?: SupplierProfile[]; error?: string }>(listUrl);

  const suppliers = useMemo(() => (hasProductContext ? findData?.suppliers : listData?.suppliers) ?? [], [hasProductContext, findData, listData]);
  const loading = hasProductContext ? findLoading : listLoading;
  const error = apiError ? "Failed to load suppliers" : (findData?.error || listData?.error) ?? null;

  const [filters, setFilters] = useState<SupplierFilters>({
    search: initialProduct || initialCategory,
    badges: [],
    locations: [],
    minRating: 0,
    shippingSpeed: "",
    specializations: [],
    minPriceCompetitiveness: 0,
    certifications: [],
  });
  const [sortBy, setSortBy] = useState<SortBy>("rating");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [focusedSupplierId, setFocusedSupplierId] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);
  const [showAIInput, setShowAIInput] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const aiInputRef = useRef<HTMLInputElement>(null);
  const [activeQuickAction, setActiveQuickAction] = useState<{ id: string; label: string; prompt: string } | null>(null);

  useEffect(() => {
    if (showAIInput && aiInputRef.current) {
      aiInputRef.current.focus();
    }
  }, [showAIInput]);

  const toggleSelectForCompare = (id: string) => {
    setSelectedForCompare((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const toggleFocusSupplier = (id: string) => {
    setFocusedSupplierId((prev) => (prev === id ? null : id));
  };

  const focusedSupplier = focusedSupplierId ? suppliers.find((s) => s.id === focusedSupplierId) || null : null;

  const selectedSuppliers = suppliers.filter((s) => selectedForCompare.includes(s.id));

  const allSpecializations = useMemo(() => {
    const specSet = new Set<string>();
    suppliers.forEach((s) => s.specializations.forEach((sp) => specSet.add(sp)));
    return Array.from(specSet).sort();
  }, [suppliers]);

  const allCertifications = useMemo(() => {
    const certSet = new Set<string>();
    suppliers.forEach((s) => s.quality.certifications.forEach((c) => certSet.add(c)));
    return Array.from(certSet).sort();
  }, [suppliers]);

  const uniqueLocations = useMemo(() => {
    const seen = new Set<string>();
    return suppliers
      .filter((s) => {
        if (seen.has(s.country)) return false;
        seen.add(s.country);
        return true;
      })
      .map((s) => ({ country: s.country, flag: s.flag }));
  }, [suppliers]);

  const filtered = useMemo(() => {
    let result = [...suppliers];
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q) || s.specializations.some((c) => c.toLowerCase().includes(q)) || s.location.toLowerCase().includes(q));
    }
    if (filters.badges.length > 0) result = result.filter((s) => filters.badges.includes(s.trustBadge));
    if (filters.locations.length > 0) result = result.filter((s) => filters.locations.includes(s.country));
    if (filters.minRating > 0) result = result.filter((s) => s.stats.rating >= filters.minRating);
    if (filters.shippingSpeed) {
      const maxDays = filters.shippingSpeed === "express" ? 4 : filters.shippingSpeed === "standard" ? 10 : 99;
      result = result.filter((s) => s.stats.shippingDays <= maxDays);
    }
    if (filters.specializations.length > 0) {
      result = result.filter((s) => filters.specializations.some((f) => s.specializations.includes(f)));
    }
    if (filters.minPriceCompetitiveness > 0) {
      result = result.filter((s) => s.stats.priceCompetitiveness >= filters.minPriceCompetitiveness);
    }
    if (filters.certifications.length > 0) {
      result = result.filter((s) => filters.certifications.some((c) => s.quality.certifications.includes(c)));
    }
    if (hasProductContext && sortBy === "rating" && suppliers.length > 0 && "relevanceScore" in suppliers[0]) {
      result.sort((a, b) => ((b as SupplierProfile & { relevanceScore: number }).relevanceScore || 0) - ((a as SupplierProfile & { relevanceScore: number }).relevanceScore || 0));
    } else {
      result.sort((a, b) => {
        switch (sortBy) {
          case "reliability": return b.stats.reliabilityScore - a.stats.reliabilityScore;
          case "response": return a.stats.responseTimeHours - b.stats.responseTimeHours;
          case "orders": return b.stats.monthlyOrders - a.stats.monthlyOrders;
          case "price": return b.stats.priceCompetitiveness - a.stats.priceCompetitiveness;
          default: return b.stats.rating - a.stats.rating;
        }
      });
    }
    return result;
  }, [filters, sortBy, suppliers, hasProductContext]);

  const hasFilters = filters.badges.length > 0 || filters.locations.length > 0 || filters.minRating > 0 ||
    filters.shippingSpeed !== "" || filters.specializations.length > 0 ||
    filters.minPriceCompetitiveness > 0 || filters.certifications.length > 0;

  const handleAIAction = useCallback((action: string, supplier: SupplierProfile) => {
    const prompts: Record<string, string> = {
      analyze: `Analyze this supplier in detail: ${supplier.name} - check reliability, pricing, shipping, quality, and give me a recommendation on whether to use them for my dropshipping store.`,
      "find-products": `Find the best products from ${supplier.name} supplier - what are their top-selling items, trending products, and best opportunities for my store?`,
      negotiate: `Help me draft a negotiation message to ${supplier.name} - I want to discuss bulk pricing, MOQ flexibility, and exclusive deal terms.`,
      "check-performance": `Run a deep performance check on ${supplier.name} - analyze their reliability trends, refund rates, shipping consistency, and alert me to any concerns.`,
      "request-sample": `Help me draft a sample request to ${supplier.name} - I want to test product quality before committing to bulk orders.`,
    };
    const prompt = prompts[action] || `Tell me about supplier ${supplier.name}`;
    window.open(`/ai?q=${encodeURIComponent(prompt)}`, "_blank");
  }, []);

  const handleAskAI = useCallback(async (naturalLanguageQuery: string) => {
    const parsedQuery = naturalLanguageQuery
      .replace(/reliable|fast|cheap|good|best|top/gi, "")
      .trim()
      .replace(/\s+/g, " ");
    const searchQ = parsedQuery.length > 3 ? parsedQuery : naturalLanguageQuery;
    setFilters((f) => ({ ...f, search: searchQ }));
    window.open(`/ai?q=${encodeURIComponent(naturalLanguageQuery)}`, "_blank");
  }, []);

  const handleQuickAction = useCallback((actionId: string, label: string, prompt: string) => {
    setActiveQuickAction({ id: actionId, label, prompt });
  }, []);

  return (
    <div className="space-y-5 md:space-y-6">
      {hasProductContext && (
        <div className="glass rounded-2xl border border-accent/20 bg-accent/5 p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 shrink-0">
            <Package className="h-5 w-5 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">Finding suppliers for</p>
            <p className="text-sm font-semibold text-foreground truncate">{initialProduct}</p>
            <div className="flex items-center gap-3 mt-0.5">
              {initialCategory && <span className="text-[10px] text-accent">{initialCategory}</span>}
              {initialSource && <span className="text-[10px] text-muted-foreground">from {initialSource}</span>}
              {initialPrice > 0 && <span className="text-[10px] text-emerald-400">${initialPrice.toFixed(2)}</span>}
            </div>
          </div>
          <button
            onClick={() => { router.push("/suppliers"); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Clear context
          </button>
        </div>
      )}

      <div className="relative group">
        <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-accent/20 via-accent/10 to-accent/20 blur-xl opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-500" />
        <div className="relative glass rounded-2xl p-2 border border-border/50 group-focus-within:border-accent/30 transition-all duration-300">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent/10 shrink-0">
              <Search className="h-5 w-5 text-accent" />
            </div>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); }}
              placeholder="Search suppliers by name, category, or location..."
              className="flex-1 h-12 px-2 bg-transparent text-foreground placeholder:text-muted-foreground/50 focus:outline-none text-base font-medium"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((f) => ({ ...f, search: "" }))}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface/80 transition-all shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <VoiceInput onTranscript={(text) => setFilters((f) => ({ ...f, search: text }))} />
            <button
              onClick={() => { if (filters.search.trim()) { setFilters((f) => ({ ...f, search: f.search })); } }}
              className="flex items-center justify-center w-12 h-12 rounded-xl bg-accent text-white hover:bg-accent-hover active:scale-[0.97] transition-all shrink-0"
              aria-label="Search suppliers"
            >
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <button
          onClick={() => setShowAIInput(!showAIInput)}
          className={`flex items-center justify-center gap-2.5 h-12 px-6 rounded-xl text-sm font-semibold transition-all ${
            showAIInput
              ? "bg-violet-500 text-white shadow-lg shadow-violet-500/20"
              : "glass border border-violet-500/20 text-violet-400 hover:border-violet-500/40 hover:bg-violet-500/5"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          Ask AI
        </button>

        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center justify-center gap-2 h-12 px-5 rounded-xl glass border border-border text-sm font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all ${
            hasFilters ? "border-accent/30 text-accent" : ""
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasFilters && (
            <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] flex items-center justify-center">
              {filters.badges.length + filters.locations.length + (filters.minRating > 0 ? 1 : 0) + (filters.shippingSpeed ? 1 : 0) + filters.specializations.length + (filters.minPriceCompetitiveness > 0 ? 1 : 0) + filters.certifications.length}
            </span>
          )}
        </button>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="h-12 px-4 rounded-xl glass border border-border text-sm text-foreground bg-transparent"
        >
          <option value="rating">Top Rated</option>
          <option value="reliability">Most Reliable</option>
          <option value="response">Fastest Response</option>
          <option value="orders">Most Orders</option>
          <option value="price">Best Price</option>
        </select>

        <div className="hidden sm:flex items-center gap-2 ml-auto">
          {selectedForCompare.length > 0 && (
            <button
              onClick={() => setSelectedForCompare([])}
              className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover transition-colors"
            >
              <span className="px-2 py-1 rounded-lg bg-accent/10 font-medium">{selectedForCompare.length} selected</span>
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {showAIInput && (
        <div className="glass rounded-2xl p-5 border border-violet-500/20 bg-gradient-to-br from-violet-500/5 via-transparent to-purple-500/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-500/10">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <span className="text-sm font-semibold text-violet-400">AI-Powered Supplier Search</span>
              <p className="text-[10px] text-muted-foreground">Describe what you need in natural language</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-violet-400/60" />
              <input
                ref={aiInputRef}
                type="text"
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && aiQuery.trim()) { handleAskAI(aiQuery); setAiQuery(""); } }}
                placeholder="Describe what supplier you need... (e.g., reliable electronics supplier in China with fast shipping)"
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all text-sm"
              />
            </div>
            <VoiceInput onTranscript={(text) => setAiQuery(text)} />
            <button
              onClick={() => { if (aiQuery.trim()) { handleAskAI(aiQuery); setAiQuery(""); } }}
              disabled={!aiQuery.trim()}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Sparkles className="h-4 w-4" />
              Ask
            </button>
          </div>
        </div>
      )}

      <SupplierComparePanel
        selectedSuppliers={selectedSuppliers}
        onRemove={toggleSelectForCompare}
        onClearAll={() => setSelectedForCompare([])}
        onAICompare={(suppliers) => {
          const prompt = `Compare these suppliers in depth: ${suppliers.map((s) => `${s.name} (${s.trustBadge} badge, ${s.stats.reliabilityScore}% reliability, ${s.stats.rating} rating)`).join(", ")}. Which should I use for my dropshipping store and why?`;
          window.open(`/ai?q=${encodeURIComponent(prompt)}`, "_blank");
        }}
      />

      {loading && (
        <div className="glass rounded-2xl p-12 text-center">
          <Loader2 className="h-10 w-10 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading supplier data...</p>
        </div>
      )}

      {!loading && error && (
        <div className="glass rounded-2xl p-8 text-center">
          <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Failed to load suppliers</h3>
          <p className="text-sm text-muted-foreground mb-4">{error}</p>
          <button onClick={() => mutate()} className="text-sm text-accent hover:text-accent/80 flex items-center gap-2 mx-auto">
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="flex gap-6">
          {showFilters && (
            <div className="w-64 shrink-0 hidden lg:block">
              <SupplierFilterPanel
                filters={filters}
                setFilters={setFilters}
                uniqueLocations={uniqueLocations}
                allSpecializations={allSpecializations}
                allCertifications={allCertifications}
                resultCount={suppliers.length}
                filteredCount={filtered.length}
              />
            </div>
          )}

          <div className="flex-1 space-y-4">
            <SupplierQuickActions
              query={filters.search}
              supplierCount={filtered.length}
              suppliers={filtered}
              onAction={handleQuickAction}
              activeActionId={activeQuickAction?.id}
            />

            {activeQuickAction && (
              <QuickActionResult
                actionId={activeQuickAction.id}
                actionLabel={activeQuickAction.label}
                prompt={activeQuickAction.prompt}
                onClose={() => setActiveQuickAction(null)}
              />
            )}

            <p className="text-sm text-muted-foreground">{filtered.length} supplier{filtered.length !== 1 ? "s" : ""} found</p>

            {focusedSupplier && (
              <div className="glass rounded-2xl border border-accent/30 bg-accent/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-accent fill-current" />
                    <span className="text-xs font-semibold text-accent">Focused Supplier</span>
                  </div>
                  <button onClick={() => setFocusedSupplierId(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent/20 to-purple-400/20 border border-border flex items-center justify-center font-display text-lg font-bold text-foreground shrink-0">
                    {focusedSupplier.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-base font-bold text-foreground">{focusedSupplier.name}</h3>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-bold uppercase ${badgeConfig[focusedSupplier.trustBadge].color} ${badgeConfig[focusedSupplier.trustBadge].border}`}>{badgeConfig[focusedSupplier.trustBadge].label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {focusedSupplier.flag} {focusedSupplier.location}</span>
                      {focusedSupplier.stats.responseTimeHours > 0 && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {focusedSupplier.stats.responseTime}</span>}
                      {focusedSupplier.stats.shippingDays > 0 && <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {focusedSupplier.stats.shippingDays}d shipping</span>}
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <ScoreRing score={focusedSupplier.stats.reliabilityScore} size={24} />
                        <span className="text-[10px] text-muted-foreground">Reliability</span>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        <span className="text-xs font-bold">{focusedSupplier.stats.rating > 0 ? focusedSupplier.stats.rating.toFixed(1) : "\u2014"}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{focusedSupplier.stats.totalProducts.toLocaleString()} products</span>
                      <span className="text-[10px] text-muted-foreground">MOQ: {focusedSupplier.catalog.moq}</span>
                    </div>
                  </div>
                  <Link href={`/suppliers/${focusedSupplier.id}`} className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent-hover transition-all">
                    View Full Profile <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="glass rounded-2xl p-8 md:p-16 text-center">
                <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-display text-lg font-semibold text-foreground mb-2">No suppliers match your filters</h3>
                <p className="text-sm text-muted-foreground mb-4">Try adjusting your search or filters</p>
                <button
                  onClick={() => setFilters({
                    search: "", badges: [], locations: [], minRating: 0, shippingSpeed: "",
                    specializations: [], minPriceCompetitiveness: 0, certifications: [],
                  })}
                  className="text-sm text-accent hover:text-accent/80"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filtered.map((s, i) => (
                  <SupplierCard
                    key={s.id}
                    supplier={s}
                    index={i}
                    isSelected={selectedForCompare.includes(s.id)}
                    isFocused={focusedSupplierId === s.id}
                    onToggleSelect={toggleSelectForCompare}
                    onFocus={toggleFocusSupplier}
                    onAIAction={handleAIAction}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !error && suppliers.length === 0 && (
        <>
          <SupplierAISuggestions />
          <SupplierCollections />
        </>
      )}

      {selectedForCompare.length >= 2 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <button
            onClick={() => setShowComparison(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white text-sm font-semibold shadow-lg hover:bg-accent-hover transition-all"
          >
            <CheckSquare className="h-4 w-4" /> Compare {selectedForCompare.length} Suppliers
          </button>
        </div>
      )}

      {showComparison && (
        <ComparisonModal
          suppliers={selectedSuppliers}
          onClose={() => setShowComparison(false)}
        />
      )}
    </div>
  );
}

export default function DiscoverTab() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading suppliers...</p>
        </div>
      </div>
    }>
      <DiscoverContent />
    </Suspense>
  );
}
