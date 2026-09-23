"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Sparkles, RotateCcw, Clock, ShieldCheck, Truck, AlertOctagon, Globe, ShoppingCart, BarChart3, Zap, TrendingUp, DollarSign, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import TrendVelocityCard from "./TrendVelocityCard";
import SaturationGauge from "./SaturationGauge";
import ProfitPotentialPanel from "./ProfitPotentialPanel";
import SeasonalDemandChart from "./SeasonalDemandChart";
import GoldenScoreBoard from "./GoldenScoreBoard";
import ProductAuthenticityCard from "./ProductAuthenticityCard";
import SupplierValidationCard from "./SupplierValidationCard";
import CompetitionAnalysisCard from "./CompetitionAnalysisCard";
import RiskAssessmentCard from "./RiskAssessmentCard";
import MarketIntelligenceCard from "./MarketIntelligenceCard";
import BundleOpportunityCard from "./BundleOpportunityCard";
import ValidationHeader from "./ValidationHeader";
import ValidationExportButton from "./ValidationExportButton";
import RiskSummaryBar from "./RiskSummaryBar";
import { useAPI } from "@/hooks/useAPI";
import type { ProductValidationResult } from "@/types/product-validation";

interface ValidationDoc {
  id: string;
  productTitle: string;
  goldenScore: number;
  goldenRank: string;
  createdAt: { toDate: () => Date };
}

interface SupplierMatch {
  id: string;
  name: string;
  trustBadge: string;
  location: string;
  flag: string;
  relevanceScore: number;
  stats: { reliabilityScore: number; rating: number; shippingDays: number; responseTime: string; refundRate: number };
  yearsInBusiness?: number;
  certifications?: string[];
  catalog?: { categories: string[]; priceRange: { min: number; max: number } };
}

interface EnrichmentData {
  platforms: { platform: string; price: number; rating: number; reviews: number; url: string; brand?: string }[];
  cheapest: { platform: string; price: number } | null;
  mostExpensive: { platform: string; price: number } | null;
  priceSpread: number;
  supplierMatches: { id: string; name: string; trustBadge: string; reliabilityScore: number; shippingToUS: string }[];
}

interface MarketIntelData {
  searchVolume: number;
  trendDirection: string;
  competitionLevel: string;
  estimatedSellers: number;
  avgSellerRating: number;
  priceWarRisk: string;
  riskScore: number;
  riskFactors: { label: string; level: string }[];
  seasonality: string;
}

interface AutoFetchStatus {
  suppliers: "idle" | "loading" | "done" | "error";
  enrichment: "idle" | "loading" | "done" | "error";
  marketIntel: "idle" | "loading" | "done" | "error";
}

interface FormData {
  productTitle: string;
  productImage: string;
  productUrl: string;
  searchVolume: string;
  historicalVolumes: string;
  sellerCount: string;
  historicalSellers: string;
  currentPrice: string;
  historicalPrices: string;
  topSellerShare: string;
  avgRating: string;
  avgReviews: string;
  priceMin: string;
  priceMax: string;
  uniqueVariants: string;
  platformCount: string;
  productCost: string;
  sellingPrice: string;
  shippingCost: string;
  platformFee: string;
  adCostPerClick: string;
  conversionRate: string;
  returnRate: string;
  monthlyBudget: string;
  monthlySales: string;
  monthlySearchVolumes: string;
  monthlySalesData: string;
  monthlyRevenue: string;
  category: string;
  reviewScore: string;
  reviewCount: string;
  supplierReliability: string;
  shippingSpeed: string;
  competitionLevel: "low" | "medium" | "high" | "very-high";
  brand: string;
  materials: string;
  certifications: string;
  supplierName: string;
  supplierUrl: string;
  yearsInBusiness: string;
  fulfillmentRate: string;
  communicationScore: string;
  moq: string;
  sampleAvailable: boolean;
  avgMarketPrice: string;
  comp1Name: string;
  comp1Price: string;
  comp1Rating: string;
  comp1Reviews: string;
  comp1Platform: string;
  comp2Name: string;
  comp2Price: string;
  comp2Rating: string;
  comp2Reviews: string;
  comp2Platform: string;
  targetMarkets: string;
  shippingMethods: string;
  weight: string;
  dimLength: string;
  dimWidth: string;
  dimHeight: string;
  isBranded: boolean;
  hasVariants: boolean;
  targetAudience: string;
  monthlySalesEstimate: string;
  avgOrderValue: string;
  customerSegment: string;
}

const defaultForm: FormData = {
  productTitle: "", productImage: "", productUrl: "",
  searchVolume: "50000", historicalVolumes: "10000,15000,22000,30000,40000,50000",
  sellerCount: "50", historicalSellers: "10,15,20,30,40,50",
  currentPrice: "29.99", historicalPrices: "34.99,32.99,31.99,30.99,30.49,29.99",
  topSellerShare: "20", avgRating: "4.3", avgReviews: "3000",
  priceMin: "15", priceMax: "45", uniqueVariants: "20", platformCount: "4",
  productCost: "8", sellingPrice: "29.99", shippingCost: "4.5",
  platformFee: "13", adCostPerClick: "0.8", conversionRate: "3",
  returnRate: "5", monthlyBudget: "500", monthlySales: "100",
  monthlySearchVolumes: "30000,32000,35000,38000,40000,42000,45000,48000,50000,52000,54000,55000",
  monthlySalesData: "200,210,220,240,250,260,280,300,320,330,340,350",
  monthlyRevenue: "2000,2100,2200,2400,2500,2600,2800,3000,3200,3300,3400,3500",
  category: "Electronics",
  reviewScore: "4.3", reviewCount: "2500", supplierReliability: "88",
  shippingSpeed: "7", competitionLevel: "medium",
  brand: "", materials: "", certifications: "",
  supplierName: "", supplierUrl: "", yearsInBusiness: "3",
  fulfillmentRate: "95", communicationScore: "80", moq: "50", sampleAvailable: true,
  avgMarketPrice: "32.99",
  comp1Name: "", comp1Price: "", comp1Rating: "", comp1Reviews: "", comp1Platform: "Amazon",
  comp2Name: "", comp2Price: "", comp2Rating: "", comp2Reviews: "", comp2Platform: "eBay",
  targetMarkets: "US,UK,CA", shippingMethods: "standard", weight: "2",
  dimLength: "10", dimWidth: "8", dimHeight: "4", isBranded: false, hasVariants: true,
  targetAudience: "25-44", monthlySalesEstimate: "100", avgOrderValue: "35", customerSegment: "general",
};

function parseList(s: string): number[] {
  return s.split(",").map((v) => parseFloat(v.trim())).filter((n) => !isNaN(n));
}

function Input({ label, value, onChange, placeholder, type = "text", disabled }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; disabled?: boolean }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all disabled:opacity-50"
      />
    </div>
  );
}

type TabId = "core" | "product" | "supply" | "risk";

const TABS: { id: TabId; label: string; icon: React.ElementType; color: string }[] = [
  { id: "core", label: "Core Data", icon: BarChart3, color: "text-blue-400" },
  { id: "product", label: "Product Details", icon: ShieldCheck, color: "text-emerald-400" },
  { id: "supply", label: "Supply Chain", icon: Truck, color: "text-amber-400" },
  { id: "risk", label: "Risk & Market", icon: AlertOctagon, color: "text-red-400" },
];

export default function ProductValidationPage() {
  const searchParams = useSearchParams();

  const [form, setForm] = useState<FormData>(() => {
    const initial = { ...defaultForm };
    const get = (key: string) => searchParams.get(key);
    if (get("productTitle")) initial.productTitle = get("productTitle")!;
    if (get("currentPrice")) { initial.currentPrice = get("currentPrice")!; initial.sellingPrice = get("currentPrice")!; }
    if (get("productImage")) initial.productImage = get("productImage")!;
    if (get("productUrl")) initial.productUrl = get("productUrl")!;
    if (get("category")) initial.category = get("category")!;
    if (get("brand")) initial.brand = get("brand")!;
    if (get("rating")) { initial.avgRating = get("rating")!; initial.reviewScore = get("rating")!; }
    if (get("reviews")) { initial.avgReviews = get("reviews")!; initial.reviewCount = get("reviews")!; }
    if (get("bestPrice")) initial.priceMin = get("bestPrice")!;
    if (get("estimatedMargin")) {
      const margin = parseFloat(get("estimatedMargin")!);
      if (margin > 0 && initial.sellingPrice) {
        const sp = parseFloat(initial.sellingPrice);
        initial.productCost = String(+(sp * (1 - margin / 100)).toFixed(2));
      }
    }
    if (get("competitorCount")) initial.sellerCount = get("competitorCount")!;
    if (get("trendPhase")) {
      const phase = get("trendPhase")!;
      if (phase === "emerging" || phase === "growth") initial.competitionLevel = "low";
      else if (phase === "mature") initial.competitionLevel = "high";
      else if (phase === "declining") initial.competitionLevel = "very-high";
    }
    if (get("saturationLevel")) {
      const sat = get("saturationLevel")!;
      if (sat === "unsaturated" || sat === "low") initial.competitionLevel = "low";
      else if (sat === "moderate") initial.competitionLevel = "medium";
      else if (sat === "saturated") initial.competitionLevel = "high";
      else if (sat === "hyper-saturated") initial.competitionLevel = "very-high";
    }
    if (get("platformPrices")) {
      try {
        const platforms = JSON.parse(get("platformPrices")!);
        if (Array.isArray(platforms) && platforms.length > 0) {
          const prices = platforms.filter((p: { price?: number }) => p.price != null && p.price > 0).map((p: { price: number }) => p.price);
          if (prices.length > 0) {
            initial.priceMin = String(Math.min(...prices));
            initial.priceMax = String(Math.max(...prices));
            initial.avgMarketPrice = String(+(prices.reduce((a: number, b: number) => a + b, 0) / prices.length).toFixed(2));
            initial.platformCount = String(platforms.length);
            const ratings = platforms.filter((p: { rating?: number }) => p.rating != null && p.rating > 0).map((p: { rating: number }) => p.rating);
            if (ratings.length > 0) initial.avgRating = String(+(ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length).toFixed(1));
            const reviews = platforms.filter((p: { reviews?: number }) => p.reviews != null && p.reviews > 0).map((p: { reviews: number }) => p.reviews);
            if (reviews.length > 0) initial.avgReviews = String(Math.round(reviews.reduce((a: number, b: number) => a + b, 0) / reviews.length));
            if (platforms.length >= 2) {
              initial.comp1Name = platforms[0].platform || "";
              initial.comp1Price = String(platforms[0].price || "");
              initial.comp1Rating = String(platforms[0].rating || "");
              initial.comp1Reviews = String(platforms[0].reviews || "");
              initial.comp1Platform = platforms[0].platform || "Amazon";
            }
            if (platforms.length >= 3) {
              initial.comp2Name = platforms[1].platform || "";
              initial.comp2Price = String(platforms[1].price || "");
              initial.comp2Rating = String(platforms[1].rating || "");
              initial.comp2Reviews = String(platforms[1].reviews || "");
              initial.comp2Platform = platforms[1].platform || "eBay";
            }
          }
        }
      } catch { /* ignore parse errors */ }
    }
    return initial;
  });

  const [result, setResult] = useState<ProductValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enginesRunning, setEnginesRunning] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabId>("core");
  const [autoFetchStatus, setAutoFetchStatus] = useState<AutoFetchStatus>({ suppliers: "idle", enrichment: "idle", marketIntel: "idle" });
  const { data: historyData } = useAPI<{ validations?: ValidationDoc[] }>("/api/product-validation");
  const history = historyData?.validations || [];

  // Track which fields were auto-filled (so we never overwrite user edits)
  const autoFilledFields = useRef<Set<string>>(new Set());
  // Single ref to prevent all auto-fetches from re-running (handles StrictMode + remounts)
  const autoFetchDone = useRef(false);
  // Store initial form values captured at mount (for API calls, not affected by auto-fill)
  const initialFormRef = useRef<{ title: string; price: number; category: string; url: string; rating: number; reviews: number } | null>(null);

  const hasProductContext = searchParams.get("productTitle") || searchParams.get("currentPrice");

  const update = useCallback((key: keyof FormData, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value })), []);

  // Helper: only set a form field if it hasn't been manually edited
  const autoSet = useCallback((key: keyof FormData, value: string | boolean, setFormFn: React.Dispatch<React.SetStateAction<FormData>>) => {
    if (autoFilledFields.current.has(key)) return;
    autoFilledFields.current.add(key);
    setFormFn((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Auto-fetch: All 3 APIs in parallel (runs ONCE on mount) ────────────────
  useEffect(() => {
    if (autoFetchDone.current) return;
    if (!form.productTitle || form.productTitle.length < 3) return;
    autoFetchDone.current = true;

    // Capture initial values for API calls (these won't change as auto-fill runs)
    initialFormRef.current = {
      title: form.productTitle,
      price: parseFloat(form.currentPrice) || 0,
      category: form.category,
      url: form.productUrl,
      rating: parseFloat(form.avgRating) || 4.0,
      reviews: parseFloat(form.avgReviews) || 100,
    };

    // No AbortController cleanup — StrictMode double-mount would abort the
    // first run's fetches then the second run would skip (autoFetchDone=true),
    // leaving status stuck at "loading". Instead, the per-fetch withTimeout
    // handles hanging requests, and React silently ignores state updates
    // on unmounted components.

    const getToken = async () => {
      try {
        const { auth } = await import("@/lib/firebase");
        return await Promise.race([
          auth.currentUser?.getIdToken() ?? Promise.resolve(null),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
        ]);
      } catch {
        return null;
      }
    };

    const runAutoFetch = async () => {
      const init = initialFormRef.current!;
      const token = await getToken();

      // Helper: race a fetch against a timeout (rejects with "Timeout" error, not AbortError)
      const withTimeout = (url: string, fetchInit: RequestInit, ms: number) => {
        return Promise.race([
          fetch(url, fetchInit),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Auto-fetch timed out")), ms)),
        ]);
      };

      // ── Fetch 1: Suppliers ───────────────────────────────────────────────
      const fetchSuppliers = async () => {
        setAutoFetchStatus((s) => ({ ...s, suppliers: "loading" }));
        try {
          const params = new URLSearchParams({ product: init.title, category: init.category });
          if (init.url) params.set("source", init.url);
          if (init.price > 0) params.set("price", String(init.price));
          const res = await withTimeout(`/api/suppliers/find?${params}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          }, 15000);
          if (!res.ok) throw new Error("Failed");
          const data = await res.json();
          const suppliers: SupplierMatch[] = data.suppliers || [];
          if (suppliers.length > 0) {
            const top = suppliers[0];
            autoSet("supplierName", top.name, setForm);
            autoSet("supplierUrl", `https://${top.name.toLowerCase().replace(/\s+/g, "")}.com`, setForm);
            if (top.stats) {
              autoSet("supplierReliability", String(top.stats.reliabilityScore || 85), setForm);
              autoSet("shippingSpeed", String(top.stats.shippingDays || 7), setForm);
              autoSet("communicationScore", String(Math.min(100, Math.round((top.stats.rating || 4) * 20))), setForm);
            }
            if (top.yearsInBusiness) autoSet("yearsInBusiness", String(top.yearsInBusiness), setForm);
            if (top.certifications && top.certifications.length > 0) {
              autoSet("certifications", top.certifications.join(", "), setForm);
            }
            if (top.trustBadge === "gold") autoSet("sampleAvailable", true, setForm);
          }
          setAutoFetchStatus((s) => ({ ...s, suppliers: "done" }));
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setAutoFetchStatus((s) => ({ ...s, suppliers: "error" }));
        }
      };

      // ── Fetch 2: Enrichment (cross-platform prices) ─────────────────────
      const fetchEnrichment = async () => {
        setAutoFetchStatus((s) => ({ ...s, enrichment: "loading" }));
        try {
          const res = await withTimeout("/api/products/enrich", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({ title: init.title, source: init.category, price: init.price }),
          }, 20000);
          if (!res.ok) throw new Error("Failed");
          const data: EnrichmentData = await res.json();

          if (data.platforms && data.platforms.length > 0) {
            const prices = data.platforms.filter((p) => p.price > 0).map((p) => p.price);
            if (prices.length > 0) {
              autoSet("priceMin", String(Math.min(...prices)), setForm);
              autoSet("priceMax", String(Math.max(...prices)), setForm);
              autoSet("avgMarketPrice", String(+(prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)), setForm);
              autoSet("platformCount", String(data.platforms.length), setForm);
            }
            const ratings = data.platforms.filter((p) => p.rating > 0).map((p) => p.rating);
            if (ratings.length > 0) {
              autoSet("avgRating", String(+(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)), setForm);
              autoSet("reviewScore", String(+(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)), setForm);
            }
            const reviews = data.platforms.filter((p) => p.reviews > 0).map((p) => p.reviews);
            if (reviews.length > 0) {
              autoSet("avgReviews", String(Math.round(reviews.reduce((a, b) => a + b, 0) / reviews.length)), setForm);
              autoSet("reviewCount", String(Math.round(reviews.reduce((a, b) => a + b, 0) / reviews.length)), setForm);
            }

            // Competitors from platform data (sorted by reviews = most established)
            const sorted = [...data.platforms].sort((a, b) => b.reviews - a.reviews);
            if (sorted.length >= 1) {
              autoSet("comp1Name", sorted[0].platform, setForm);
              autoSet("comp1Price", String(sorted[0].price), setForm);
              autoSet("comp1Rating", String(sorted[0].rating), setForm);
              autoSet("comp1Reviews", String(sorted[0].reviews), setForm);
              autoSet("comp1Platform", sorted[0].platform, setForm);
            }
            if (sorted.length >= 2) {
              autoSet("comp2Name", sorted[1].platform, setForm);
              autoSet("comp2Price", String(sorted[1].price), setForm);
              autoSet("comp2Rating", String(sorted[1].rating), setForm);
              autoSet("comp2Reviews", String(sorted[1].reviews), setForm);
              autoSet("comp2Platform", sorted[1].platform, setForm);
            }
          }

          // Supplier matches from enrichment as fallback
          if (data.supplierMatches && data.supplierMatches.length > 0) {
            const top = data.supplierMatches[0];
            autoSet("supplierName", top.name, setForm);
            if (top.reliabilityScore) {
              autoSet("supplierReliability", String(top.reliabilityScore), setForm);
            }
          }

          // Product Details: extract brand from platform data
          if (data.platforms && data.platforms.length > 0) {
            const brands = data.platforms.map((p) => p.brand).filter((b): b is string => !!b && b.length > 0);
            if (brands.length > 0) {
              autoSet("brand", brands[0], setForm);
            }
          }

          // Product Details: derive materials & certifications from category
          const catLower = init.category.toLowerCase();
          const titleLower = init.title.toLowerCase();
          const isElectronics = /electron|led|light|bluetooth|wireless|charg|power|battery|cable|speaker|headphone|earb/i.test(catLower + " " + titleLower);
          const isToys = /toy|game|puzzle|doll|action/i.test(catLower + " " + titleLower);
          const isFashion = /cloth|fashion|shirt|dress|shoe|bag|jewel|watch/i.test(catLower + " " + titleLower);
          const isBeauty = /beauty|skin|hair|makeup|cream|serum/i.test(catLower + " " + titleLower);
          const isHome = /home|kitchen|furniture|decor|garden|bed|bath/i.test(catLower + " " + titleLower);

          if (isElectronics) {
            autoSet("materials", "plastic, metal, silicone", setForm);
            autoSet("certifications", "CE, FCC, UL", setForm);
          } else if (isToys) {
            autoSet("materials", "plastic, ABS", setForm);
            autoSet("certifications", "CE, ASTM, CPSIA", setForm);
          } else if (isFashion) {
            autoSet("materials", "cotton, polyester", setForm);
            autoSet("certifications", "OEKO-TEX", setForm);
          } else if (isBeauty) {
            autoSet("materials", "natural extracts", setForm);
            autoSet("certifications", "FDA, GMP", setForm);
          } else if (isHome) {
            autoSet("materials", "stainless steel, silicone", setForm);
            autoSet("certifications", "CE, FDA", setForm);
          } else {
            autoSet("materials", "plastic, metal", setForm);
            autoSet("certifications", "CE", setForm);
          }

          setAutoFetchStatus((s) => ({ ...s, enrichment: "done" }));
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setAutoFetchStatus((s) => ({ ...s, enrichment: "error" }));
        }
      };

      // ── Fetch 3: Market Intelligence ─────────────────────────────────────
      const fetchMarketIntel = async () => {
        setAutoFetchStatus((s) => ({ ...s, marketIntel: "loading" }));
        try {
          const res = await withTimeout("/api/products/market-intel", {
            method: "POST",
            headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            body: JSON.stringify({
              title: init.title,
              price: init.price,
              rating: init.rating,
              reviews: init.reviews,
            }),
          }, 20000);
          if (!res.ok) throw new Error("Failed");
          const data: MarketIntelData = await res.json();

          if (data.searchVolume) autoSet("searchVolume", String(data.searchVolume), setForm);
          if (data.estimatedSellers) autoSet("sellerCount", String(data.estimatedSellers), setForm);
          if (data.avgSellerRating) autoSet("avgRating", String(data.avgSellerRating), setForm);
          if (data.competitionLevel) {
            const levelMap: Record<string, FormData["competitionLevel"]> = {
              low: "low", medium: "medium", high: "high", "very-high": "very-high",
            };
            autoSet("competitionLevel", levelMap[data.competitionLevel] || "medium", setForm);
          }
          if (data.riskScore) {
            const margin = Math.max(5, 40 - Math.round(data.riskScore / 3));
            const sp = init.price || 29.99;
            autoSet("productCost", String(+(sp * (1 - margin / 100)).toFixed(2)), setForm);
          }
          if (data.seasonality) autoSet("targetAudience", data.seasonality, setForm);

          setAutoFetchStatus((s) => ({ ...s, marketIntel: "done" }));
        } catch (e) {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setAutoFetchStatus((s) => ({ ...s, marketIntel: "error" }));
        }
      };

      // Run all 3 in parallel
      await Promise.allSettled([fetchSuppliers(), fetchEnrichment(), fetchMarketIntel()]);
    };

    runAutoFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleValidate = async () => {
    if (!form.productTitle.trim()) {
      setError("Product title is required");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);
    setEnginesRunning(["Trend Velocity", "Saturation", "Profit", "Seasonal", "Golden Score"]);

    try {
      const token = await (await import("@/lib/firebase")).auth.currentUser?.getIdToken();
      const res = await fetch("/api/product-validation", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          productTitle: form.productTitle,
          productImage: form.productImage || undefined,
          productUrl: form.productUrl || undefined,
          trendVelocity: {
            currentSearchVolume: parseFloat(form.searchVolume) || 0,
            historicalSearchVolumes: parseList(form.historicalVolumes),
            currentSellerCount: parseFloat(form.sellerCount) || 0,
            historicalSellerCounts: parseList(form.historicalSellers),
            currentPrice: parseFloat(form.currentPrice) || 0,
            historicalPrices: parseList(form.historicalPrices),
          },
          saturation: {
            totalSellers: parseFloat(form.sellerCount) || 0,
            topSellerMarketShare: parseFloat(form.topSellerShare) || 0,
            avgSellerRating: parseFloat(form.avgRating) || 0,
            avgSellerReviews: parseFloat(form.avgReviews) || 0,
            priceRange: { min: parseFloat(form.priceMin) || 0, max: parseFloat(form.priceMax) || 0 },
            uniqueVariants: parseFloat(form.uniqueVariants) || 0,
            platformCount: parseFloat(form.platformCount) || 0,
          },
          profitPotential: {
            productCost: parseFloat(form.productCost) || 0,
            sellingPrice: parseFloat(form.sellingPrice) || 0,
            shippingCost: parseFloat(form.shippingCost) || 0,
            platformFeePercent: parseFloat(form.platformFee) || 0,
            adCostPerClick: parseFloat(form.adCostPerClick) || 0,
            conversionRate: parseFloat(form.conversionRate) || 0,
            returnRate: parseFloat(form.returnRate) || 0,
            averageOrderValue: parseFloat(form.sellingPrice) || 0,
            monthlyAdBudget: parseFloat(form.monthlyBudget) || 0,
            estimatedMonthlySales: parseFloat(form.monthlySales) || 0,
          },
          seasonalDemand: {
            monthlySearchVolumes: parseList(form.monthlySearchVolumes),
            monthlySalesData: parseList(form.monthlySalesData),
            monthlyRevenue: parseList(form.monthlyRevenue),
            category: form.category,
          },
          goldenExtras: {
            reviewScore: parseFloat(form.reviewScore) || 0,
            reviewCount: parseFloat(form.reviewCount) || 0,
            supplierReliability: parseFloat(form.supplierReliability) || 0,
            shippingSpeed: parseFloat(form.shippingSpeed) || 0,
            returnRate: parseFloat(form.returnRate) || 0,
            competitionLevel: form.competitionLevel,
          },
          productAuthenticity: form.brand || form.materials || form.certifications ? {
            productTitle: form.productTitle,
            productUrl: form.productUrl,
            productImage: form.productImage,
            brand: form.brand,
            materials: form.materials.split(",").map(s => s.trim()).filter(Boolean),
            certifications: form.certifications.split(",").map(s => s.trim()).filter(Boolean),
            pricePoint: parseFloat(form.currentPrice) || 0,
            category: form.category,
          } : undefined,
          supplierValidation: form.supplierName ? {
            supplierName: form.supplierName,
            supplierUrl: form.supplierUrl,
            reliabilityScore: parseFloat(form.supplierReliability) || 0,
            shippingSpeed: parseFloat(form.shippingSpeed) || 0,
            returnRate: parseFloat(form.returnRate) || 0,
            orderFulfillmentRate: parseFloat(form.fulfillmentRate) || 0,
            communicationScore: parseFloat(form.communicationScore) || 0,
            yearsInBusiness: parseFloat(form.yearsInBusiness) || 0,
            certifications: form.certifications.split(",").map(s => s.trim()).filter(Boolean),
            paymentMethods: ["PayPal", "Escrow"],
            minOrderQuantity: parseFloat(form.moq) || 0,
            sampleAvailable: form.sampleAvailable,
          } : undefined,
          competitionAnalysis: (form.comp1Name || form.comp2Name) ? {
            productTitle: form.productTitle,
            category: form.category,
            currentPrice: parseFloat(form.currentPrice) || 0,
            topCompetitors: [
              form.comp1Name ? {
                name: form.comp1Name,
                price: parseFloat(form.comp1Price) || 0,
                rating: parseFloat(form.comp1Rating) || 0,
                reviewCount: parseFloat(form.comp1Reviews) || 0,
                monthlySales: 0,
                platform: form.comp1Platform,
              } : null,
              form.comp2Name ? {
                name: form.comp2Name,
                price: parseFloat(form.comp2Price) || 0,
                rating: parseFloat(form.comp2Rating) || 0,
                reviewCount: parseFloat(form.comp2Reviews) || 0,
                monthlySales: 0,
                platform: form.comp2Platform,
              } : null,
            ].filter(Boolean) as { name: string; price: number; rating: number; reviewCount: number; monthlySales: number; platform: string }[],
            averageMarketPrice: parseFloat(form.avgMarketPrice) || 0,
            marketShareData: [],
          } : undefined,
          riskAssessment: {
            productTitle: form.productTitle,
            category: form.category,
            materials: form.materials.split(",").map(s => s.trim()).filter(Boolean),
            targetMarkets: form.targetMarkets.split(",").map(s => s.trim()).filter(Boolean),
            shippingMethods: form.shippingMethods.split(",").map(s => s.trim()).filter(Boolean),
            pricePoint: parseFloat(form.currentPrice) || 0,
            isBranded: form.isBranded,
            hasVariants: form.hasVariants,
            weight: parseFloat(form.weight) || 0,
            dimensions: {
              length: parseFloat(form.dimLength) || 0,
              width: parseFloat(form.dimWidth) || 0,
              height: parseFloat(form.dimHeight) || 0,
            },
          },
          marketIntelligence: {
            productTitle: form.productTitle,
            category: form.category,
            targetAudience: form.targetAudience,
            pricePoint: parseFloat(form.currentPrice) || 0,
            monthlySalesEstimate: parseFloat(form.monthlySalesEstimate) || 0,
          },
          bundleAnalysis: {
            productTitle: form.productTitle,
            category: form.category,
            pricePoint: parseFloat(form.currentPrice) || 0,
            averageOrderValue: parseFloat(form.avgOrderValue) || 0,
            customerSegment: form.customerSegment,
          },
        }),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data.result);
      }
    } catch {
      setError("Network error — please try again.");
    } finally {
      setLoading(false);
      setEnginesRunning([]);
    }
  };

  const handleReset = () => {
    setForm(defaultForm);
    setResult(null);
    setError(null);
  };

  const anyLoading = Object.values(autoFetchStatus).some((s) => s === "loading");
  const completedFetches = Object.values(autoFetchStatus).filter((s) => s === "done").length;
  const totalFetches = 3;

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16 md:pb-24">
      {/* Hero Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 mb-2">
          <Sparkles className="h-3.5 w-3.5 text-accent" />
          <span className="text-[11px] font-medium text-accent">AI-Powered Analysis</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-foreground">Product Validation Engine</h1>
        <p className="text-sm text-muted-foreground max-w-lg mx-auto">
          Score products on 10+ criteria across 11 engines. Get instant insights on trend, profit, risk, and market potential.
        </p>
      </div>

      {/* Quick Validate Bar */}
      <div className="glass rounded-2xl p-4 border border-accent/10">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="lg:col-span-2">
              <label className="text-[10px] text-muted-foreground mb-1 block">Product Title *</label>
              <input
                type="text"
                value={form.productTitle}
                onChange={(e) => update("productTitle", e.target.value)}
                placeholder="e.g. Wireless Bluetooth Earbuds"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Price</label>
              <input
                type="number"
                value={form.currentPrice}
                onChange={(e) => update("currentPrice", e.target.value)}
                placeholder="29.99"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Category</label>
              <input
                type="text"
                value={form.category}
                onChange={(e) => update("category", e.target.value)}
                placeholder="Electronics"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleValidate}
              disabled={loading || !form.productTitle.trim()}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {loading ? "Analyzing..." : "Validate"}
            </button>
            <button onClick={handleReset} className="px-3 py-2.5 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground transition-colors" title="Reset">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Context Banner */}
        {hasProductContext && (
          <div className="mt-3 flex items-center gap-3 p-2.5 rounded-xl bg-accent/5 border border-accent/10">
            {form.productImage && (
              <div className="w-10 h-10 rounded-lg overflow-hidden bg-surface shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={form.productImage} alt={form.productTitle} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Validating</p>
              <p className="text-sm font-medium text-foreground truncate">{form.productTitle || "Untitled"}</p>
            </div>
            {form.currentPrice && (
              <span className="text-sm font-bold text-accent shrink-0">${parseFloat(form.currentPrice).toFixed(2)}</span>
            )}
          </div>
        )}

        {/* Auto-Fetch Status Bar */}
        {hasProductContext && anyLoading && (
          <div className="mt-3 p-3 rounded-xl bg-surface/50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 text-accent animate-spin" />
                <span className="text-[11px] font-medium text-foreground">Auto-fetching product data...</span>
              </div>
              <span className="text-[10px] text-muted-foreground">{completedFetches}/{totalFetches}</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent/60 transition-all duration-500"
                style={{ width: `${(completedFetches / totalFetches) * 100}%` }}
              />
            </div>
            <div className="flex flex-wrap gap-3 mt-2">
              {([
                ["suppliers", "Suppliers"],
                ["enrichment", "Price Enrichment"],
                ["marketIntel", "Market Intel"],
              ] as const).map(([key, label]) => (
                <div key={key} className="flex items-center gap-1.5">
                  {autoFetchStatus[key] === "loading" && <Loader2 className="h-3 w-3 text-accent animate-spin" />}
                  {autoFetchStatus[key] === "done" && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  {autoFetchStatus[key] === "error" && <AlertCircle className="h-3 w-3 text-amber-400" />}
                  {autoFetchStatus[key] === "idle" && <div className="h-3 w-3 rounded-full border border-muted-foreground/30" />}
                  <span className={`text-[10px] ${autoFetchStatus[key] === "loading" ? "text-accent" : autoFetchStatus[key] === "done" ? "text-emerald-400" : autoFetchStatus[key] === "error" ? "text-amber-400" : "text-muted-foreground"}`}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed Auto-Fetch Summary */}
        {hasProductContext && !anyLoading && completedFetches > 0 && !result && (
          <div className="mt-3 flex items-center gap-2 p-2 rounded-xl bg-emerald-400/5 border border-emerald-400/10">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <p className="text-[11px] text-emerald-400">
              Data auto-filled from {completedFetches} source{completedFetches > 1 ? "s" : ""} — review & click Validate
            </p>
            <button
              onClick={() => {
                autoFetchDone.current = false;
                autoFilledFields.current.clear();
                setAutoFetchStatus({ suppliers: "idle", enrichment: "idle", marketIntel: "idle" });
              }}
              className="text-[10px] text-emerald-400 underline ml-auto shrink-0"
            >
              Re-fetch
            </button>
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Tabbed Form */}
        <div className="lg:col-span-1 space-y-4">
          {/* Tab Navigation */}
          <div className="flex gap-1 p-1 rounded-xl bg-surface/50 border border-border">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-[11px] font-medium transition-all ${
                    isActive
                      ? "bg-accent/10 text-accent border border-accent/20"
                      : "text-muted-foreground hover:text-foreground hover:bg-surface/50"
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 ${isActive ? tab.color : ""}`} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content */}
          <div className="glass rounded-2xl p-4 border border-border min-h-[400px]">
            {activeTab === "core" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-blue-400/10 flex items-center justify-center">
                    <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Core Metrics</h3>
                    <p className="text-[10px] text-muted-foreground">Essential data for validation</p>
                  </div>
                </div>

                <Input label="Product Image URL" value={form.productImage} onChange={(v) => update("productImage", v)} placeholder="https://..." />
                <Input label="Product URL" value={form.productUrl} onChange={(v) => update("productUrl", v)} placeholder="https://..." />

                <div className="border-t border-border pt-3">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Trend Data</p>
                  <Input label="Search Volume" value={form.searchVolume} onChange={(v) => update("searchVolume", v)} type="number" />
                  <Input label="Historical Volumes" value={form.historicalVolumes} onChange={(v) => update("historicalVolumes", v)} placeholder="10k,15k,22k..." />
                  <Input label="Seller Count" value={form.sellerCount} onChange={(v) => update("sellerCount", v)} type="number" />
                  <Input label="Historical Sellers" value={form.historicalSellers} onChange={(v) => update("historicalSellers", v)} placeholder="10,15,20..." />
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Saturation Data</p>
                  <Input label="Top Seller Market Share %" value={form.topSellerShare} onChange={(v) => update("topSellerShare", v)} type="number" />
                  <Input label="Avg Seller Rating" value={form.avgRating} onChange={(v) => update("avgRating", v)} type="number" />
                  <Input label="Avg Seller Reviews" value={form.avgReviews} onChange={(v) => update("avgReviews", v)} type="number" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Price Min" value={form.priceMin} onChange={(v) => update("priceMin", v)} type="number" />
                    <Input label="Price Max" value={form.priceMax} onChange={(v) => update("priceMax", v)} type="number" />
                  </div>
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Profit Data</p>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Product Cost" value={form.productCost} onChange={(v) => update("productCost", v)} type="number" />
                    <Input label="Selling Price" value={form.sellingPrice} onChange={(v) => update("sellingPrice", v)} type="number" />
                  </div>
                  <Input label="Shipping Cost" value={form.shippingCost} onChange={(v) => update("shippingCost", v)} type="number" />
                  <Input label="Platform Fee %" value={form.platformFee} onChange={(v) => update("platformFee", v)} type="number" />
                  <Input label="Ad Cost Per Click" value={form.adCostPerClick} onChange={(v) => update("adCostPerClick", v)} type="number" />
                  <Input label="Conversion Rate %" value={form.conversionRate} onChange={(v) => update("conversionRate", v)} type="number" />
                  <Input label="Return Rate %" value={form.returnRate} onChange={(v) => update("returnRate", v)} type="number" />
                  <Input label="Monthly Ad Budget" value={form.monthlyBudget} onChange={(v) => update("monthlyBudget", v)} type="number" />
                  <Input label="Est. Monthly Sales" value={form.monthlySales} onChange={(v) => update("monthlySales", v)} type="number" />
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Seasonal Data</p>
                  <Input label="Monthly Search Volumes (12)" value={form.monthlySearchVolumes} onChange={(v) => update("monthlySearchVolumes", v)} />
                  <Input label="Monthly Sales Data (12)" value={form.monthlySalesData} onChange={(v) => update("monthlySalesData", v)} />
                  <Input label="Monthly Revenue (12)" value={form.monthlyRevenue} onChange={(v) => update("monthlyRevenue", v)} />
                </div>

                <div className="border-t border-border pt-3">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Additional Criteria</p>
                  <Input label="Review Score (0-5)" value={form.reviewScore} onChange={(v) => update("reviewScore", v)} type="number" />
                  <Input label="Review Count" value={form.reviewCount} onChange={(v) => update("reviewCount", v)} type="number" />
                  <Input label="Supplier Reliability (0-100)" value={form.supplierReliability} onChange={(v) => update("supplierReliability", v)} type="number" />
                  <Input label="Shipping Speed (days)" value={form.shippingSpeed} onChange={(v) => update("shippingSpeed", v)} type="number" />
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Competition Level</label>
                    <select
                      value={form.competitionLevel}
                      onChange={(e) => update("competitionLevel", e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/30"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="very-high">Very High</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "product" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Product Authenticity</h3>
                    <p className="text-[10px] text-muted-foreground">Verify product legitimacy</p>
                  </div>
                </div>
                <Input label="Brand" value={form.brand} onChange={(v) => update("brand", v)} placeholder="e.g. Sony, Nike, Generic" />
                <Input label="Materials (comma-sep)" value={form.materials} onChange={(v) => update("materials", v)} placeholder="e.g. plastic, metal, silicone" />
                <Input label="Certifications (comma-sep)" value={form.certifications} onChange={(v) => update("certifications", v)} placeholder="e.g. CE, FCC, UL" />
              </div>
            )}

            {activeTab === "supply" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-amber-400/10 flex items-center justify-center">
                    <Truck className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Supplier & Competition</h3>
                    <p className="text-[10px] text-muted-foreground">Supply chain analysis</p>
                  </div>
                </div>

                <div className="border-b border-border pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Supplier Details</p>
                    {autoFetchStatus.suppliers === "loading" && <Loader2 className="h-3 w-3 text-accent animate-spin" />}
                    {autoFetchStatus.suppliers === "done" && <span className="text-[9px] text-emerald-400">Auto-filled</span>}
                  </div>
                  <Input label="Supplier Name" value={form.supplierName} onChange={(v) => update("supplierName", v)} placeholder="e.g. Alibaba Supplier" />
                  <Input label="Supplier URL" value={form.supplierUrl} onChange={(v) => update("supplierUrl", v)} placeholder="https://..." />
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Years in Business" value={form.yearsInBusiness} onChange={(v) => update("yearsInBusiness", v)} type="number" />
                    <Input label="Fulfillment %" value={form.fulfillmentRate} onChange={(v) => update("fulfillmentRate", v)} type="number" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Input label="Communication (0-100)" value={form.communicationScore} onChange={(v) => update("communicationScore", v)} type="number" />
                    <Input label="Min Order Qty" value={form.moq} onChange={(v) => update("moq", v)} type="number" />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <input type="checkbox" checked={form.sampleAvailable} onChange={(e) => update("sampleAvailable", e.target.checked)} className="rounded" />
                    <label className="text-[10px] text-muted-foreground">Sample Available</label>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Competition</p>
                    {autoFetchStatus.enrichment === "loading" && <Loader2 className="h-3 w-3 text-accent animate-spin" />}
                    {autoFetchStatus.enrichment === "done" && <span className="text-[9px] text-emerald-400">Auto-filled</span>}
                  </div>
                  <Input label="Average Market Price" value={form.avgMarketPrice} onChange={(v) => update("avgMarketPrice", v)} type="number" />

                  <div className="mt-2 p-2.5 rounded-xl bg-surface/30">
                    <p className="text-[10px] text-muted-foreground font-semibold mb-2">Competitor 1</p>
                    <Input label="Name" value={form.comp1Name} onChange={(v) => update("comp1Name", v)} placeholder="Competitor name" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input label="Price" value={form.comp1Price} onChange={(v) => update("comp1Price", v)} type="number" />
                      <Input label="Rating" value={form.comp1Rating} onChange={(v) => update("comp1Rating", v)} type="number" />
                      <Input label="Reviews" value={form.comp1Reviews} onChange={(v) => update("comp1Reviews", v)} type="number" />
                    </div>
                  </div>

                  <div className="mt-2 p-2.5 rounded-xl bg-surface/30">
                    <p className="text-[10px] text-muted-foreground font-semibold mb-2">Competitor 2</p>
                    <Input label="Name" value={form.comp2Name} onChange={(v) => update("comp2Name", v)} placeholder="Competitor name" />
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Input label="Price" value={form.comp2Price} onChange={(v) => update("comp2Price", v)} type="number" />
                      <Input label="Rating" value={form.comp2Rating} onChange={(v) => update("comp2Rating", v)} type="number" />
                      <Input label="Reviews" value={form.comp2Reviews} onChange={(v) => update("comp2Reviews", v)} type="number" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "risk" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-7 w-7 rounded-lg bg-red-400/10 flex items-center justify-center">
                    <AlertOctagon className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Risk & Market Intel</h3>
                    <p className="text-[10px] text-muted-foreground">Compliance & market data</p>
                  </div>
                </div>

                <div className="border-b border-border pb-3">
                  <p className="text-[10px] text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Shipping & Compliance</p>
                  <Input label="Target Markets (comma-sep)" value={form.targetMarkets} onChange={(v) => update("targetMarkets", v)} placeholder="US,UK,CA" />
                  <Input label="Shipping Methods (comma-sep)" value={form.shippingMethods} onChange={(v) => update("shippingMethods", v)} placeholder="standard,express" />
                  <Input label="Weight (lbs)" value={form.weight} onChange={(v) => update("weight", v)} type="number" />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input label="Length (in)" value={form.dimLength} onChange={(v) => update("dimLength", v)} type="number" />
                    <Input label="Width (in)" value={form.dimWidth} onChange={(v) => update("dimWidth", v)} type="number" />
                    <Input label="Height (in)" value={form.dimHeight} onChange={(v) => update("dimHeight", v)} type="number" />
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form.isBranded} onChange={(e) => update("isBranded", e.target.checked)} className="rounded" />
                      <label className="text-[10px] text-muted-foreground">Branded</label>
                    </div>
                    <div className="flex items-center gap-2">
                      <input type="checkbox" checked={form.hasVariants} onChange={(e) => update("hasVariants", e.target.checked)} className="rounded" />
                      <label className="text-[10px] text-muted-foreground">Has Variants</label>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Market Intelligence</p>
                    {autoFetchStatus.marketIntel === "loading" && <Loader2 className="h-3 w-3 text-accent animate-spin" />}
                    {autoFetchStatus.marketIntel === "done" && <span className="text-[9px] text-emerald-400">Auto-filled</span>}
                  </div>
                  <Input label="Target Audience" value={form.targetAudience} onChange={(v) => update("targetAudience", v)} placeholder="e.g. 25-44, fitness enthusiasts" />
                  <Input label="Monthly Sales Estimate" value={form.monthlySalesEstimate} onChange={(v) => update("monthlySalesEstimate", v)} type="number" />
                </div>

                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold mb-2 uppercase tracking-wider">Bundle & Upsell</p>
                  <Input label="Average Order Value" value={form.avgOrderValue} onChange={(v) => update("avgOrderValue", v)} type="number" />
                  <Input label="Customer Segment" value={form.customerSegment} onChange={(v) => update("customerSegment", v)} placeholder="e.g. general, premium, budget" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Results */}
        <div className="lg:col-span-2 space-y-4">
          {error && (
            <div className="glass rounded-2xl p-4 border border-red-400/20 bg-red-400/5">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {loading && (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-12 w-12 text-accent mx-auto mb-4 animate-spin" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">Running Validation...</h3>
              <p className="text-sm text-muted-foreground mb-4">Analyzing 10+ criteria across 11 engines</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["Trend", "Saturation", "Profit", "Seasonal", "Score",
                  "Auth", "Supplier", "Competition", "Risk", "Market", "Bundle"
                ].map((e) => (
                  <span key={e} className={`text-[10px] px-3 py-1.5 rounded-full border transition-all ${
                    enginesRunning.includes(e)
                      ? "bg-accent/20 text-accent border-accent/40 animate-pulse"
                      : "bg-surface/50 text-muted-foreground border-border"
                  }`}>{e}</span>
                ))}
              </div>
            </div>
          )}

          {!loading && !result && (
            <div className="glass rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-accent/40" />
              </div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">Ready to Validate</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Enter your product details and click &quot;Validate&quot; to get a comprehensive analysis across trend, profit, risk, and market dimensions.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg mx-auto">
                {[
                  { icon: TrendingUp, label: "Trend Velocity", color: "text-emerald-400" },
                  { icon: DollarSign, label: "Profit Potential", color: "text-amber-400" },
                  { icon: AlertOctagon, label: "Risk Assessment", color: "text-red-400" },
                  { icon: ShieldCheck, label: "Authenticity", color: "text-blue-400" },
                  { icon: Globe, label: "Market Intel", color: "text-cyan-400" },
                  { icon: ShoppingCart, label: "Bundle Analysis", color: "text-purple-400" },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="flex items-center gap-2 p-2.5 rounded-xl bg-surface/30 border border-border">
                      <Icon className={`h-4 w-4 ${item.color}`} />
                      <span className="text-[10px] text-muted-foreground">{item.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {result && (
            <>
              <ValidationHeader
                title={form.productTitle}
                imageUrl={form.productImage}
                price={parseFloat(form.currentPrice) || undefined}
                rank={result.goldenProduct.rank}
                overallScore={result.goldenProduct.score}
              />

              <RiskSummaryBar
                authenticityScore={result.productAuthenticity?.score ?? 0}
                supplierScore={result.supplierValidation?.score ?? 0}
                riskScore={result.riskAssessment?.score ?? 0}
                marketScore={result.marketIntelligence?.score ?? 0}
              />

              <GoldenScoreBoard data={result.goldenProduct} />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TrendVelocityCard data={result.trendVelocity} />
                <SaturationGauge data={result.saturation} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfitPotentialPanel data={result.profitPotential} />
                <SeasonalDemandChart data={result.seasonalDemand} />
              </div>

              {result.productAuthenticity && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ProductAuthenticityCard data={result.productAuthenticity} />
                  {result.supplierValidation && <SupplierValidationCard data={result.supplierValidation} />}
                </div>
              )}

              {result.competitionAnalysis && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <CompetitionAnalysisCard data={result.competitionAnalysis} />
                  {result.riskAssessment && <RiskAssessmentCard data={result.riskAssessment} />}
                </div>
              )}

              {result.marketIntelligence && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MarketIntelligenceCard data={result.marketIntelligence} />
                  {result.bundleAnalysis && <BundleOpportunityCard data={result.bundleAnalysis} />}
                </div>
              )}

              <div className="flex justify-end">
                <ValidationExportButton data={result as unknown as Record<string, unknown>} />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Validations */}
      {history.length > 0 && (
        <div className="glass rounded-2xl p-4 border border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-display text-sm font-semibold text-foreground">Recent Validations</h3>
            </div>
            <span className="text-[10px] text-muted-foreground">{history.length} total</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {history.slice(0, 6).map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-surface/50 transition-colors cursor-pointer group" onClick={() => {
                update("productTitle", v.productTitle);
              }}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  v.goldenRank === "S" ? "bg-yellow-400/10" : v.goldenRank === "A" ? "bg-emerald-400/10" :
                  v.goldenRank === "B" ? "bg-blue-400/10" : v.goldenRank === "C" ? "bg-amber-400/10" : "bg-red-400/10"
                }`}>
                  <span className={`text-xs font-bold ${
                    v.goldenRank === "S" ? "text-yellow-400" : v.goldenRank === "A" ? "text-emerald-400" :
                    v.goldenRank === "B" ? "text-blue-400" : v.goldenRank === "C" ? "text-amber-400" : "text-red-400"
                  }`}>{v.goldenRank}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">{v.productTitle}</p>
                  <p className="text-[10px] text-muted-foreground">{v.goldenScore}/100</p>
                </div>
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
