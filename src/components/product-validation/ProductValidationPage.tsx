"use client";

import { useState } from "react";
import { Loader2, Sparkles, ChevronDown, ChevronUp, RotateCcw, Clock } from "lucide-react";
import TrendVelocityCard from "./TrendVelocityCard";
import SaturationGauge from "./SaturationGauge";
import ProfitPotentialPanel from "./ProfitPotentialPanel";
import SeasonalDemandChart from "./SeasonalDemandChart";
import GoldenScoreBoard from "./GoldenScoreBoard";
import { useAPI } from "@/hooks/useAPI";
import type { ProductValidationResult } from "@/types/product-validation";

interface ValidationDoc {
  id: string;
  productTitle: string;
  goldenScore: number;
  goldenRank: string;
  createdAt: { toDate: () => Date };
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
};

function parseList(s: string): number[] {
  return s.split(",").map((v) => parseFloat(v.trim())).filter((n) => !isNaN(n));
}

function Section({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-border overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 bg-surface/30 hover:bg-surface/50 transition-colors">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-[10px] text-muted-foreground mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all"
      />
    </div>
  );
}

export default function ProductValidationPage() {
  const [form, setForm] = useState<FormData>(defaultForm);
  const [result, setResult] = useState<ProductValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: historyData } = useAPI<{ validations?: ValidationDoc[] }>("/api/product-validation");
  const history = historyData?.validations || [];

  const update = (key: keyof FormData, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleValidate = async () => {
    if (!form.productTitle.trim()) {
      setError("Product title is required");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

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
    }
  };

  const handleReset = () => {
    setForm(defaultForm);
    setResult(null);
    setError(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-8 pb-16 md:pb-24">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Product Validation Engine</h1>
        <p className="text-sm text-muted-foreground">Score products on 10+ criteria and find your next winner</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Section title="Basic Info" defaultOpen={true}>
            <Input label="Product Title" value={form.productTitle} onChange={(v) => update("productTitle", v)} placeholder="e.g. Wireless Bluetooth Earbuds" />
            <Input label="Product Image URL" value={form.productImage} onChange={(v) => update("productImage", v)} placeholder="https://..." />
            <Input label="Product URL" value={form.productUrl} onChange={(v) => update("productUrl", v)} placeholder="https://..." />
          </Section>

          <Section title="Trend Velocity">
            <Input label="Current Search Volume" value={form.searchVolume} onChange={(v) => update("searchVolume", v)} type="number" />
            <Input label="Historical Volumes (comma-sep)" value={form.historicalVolumes} onChange={(v) => update("historicalVolumes", v)} placeholder="10000,15000,22000..." />
            <Input label="Current Seller Count" value={form.sellerCount} onChange={(v) => update("sellerCount", v)} type="number" />
            <Input label="Historical Sellers (comma-sep)" value={form.historicalSellers} onChange={(v) => update("historicalSellers", v)} placeholder="10,15,20..." />
            <Input label="Current Price" value={form.currentPrice} onChange={(v) => update("currentPrice", v)} type="number" />
            <Input label="Historical Prices (comma-sep)" value={form.historicalPrices} onChange={(v) => update("historicalPrices", v)} placeholder="34.99,32.99..." />
          </Section>

          <Section title="Saturation Index">
            <Input label="Top Seller Market Share %" value={form.topSellerShare} onChange={(v) => update("topSellerShare", v)} type="number" />
            <Input label="Avg Seller Rating" value={form.avgRating} onChange={(v) => update("avgRating", v)} type="number" />
            <Input label="Avg Seller Reviews" value={form.avgReviews} onChange={(v) => update("avgReviews", v)} type="number" />
            <div className="grid grid-cols-2 gap-2">
              <Input label="Price Min" value={form.priceMin} onChange={(v) => update("priceMin", v)} type="number" />
              <Input label="Price Max" value={form.priceMax} onChange={(v) => update("priceMax", v)} type="number" />
            </div>
            <Input label="Unique Variants" value={form.uniqueVariants} onChange={(v) => update("uniqueVariants", v)} type="number" />
            <Input label="Platform Count" value={form.platformCount} onChange={(v) => update("platformCount", v)} type="number" />
          </Section>

          <Section title="Profit Potential">
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
          </Section>

          <Section title="Seasonal Demand">
            <Input label="Category" value={form.category} onChange={(v) => update("category", v)} placeholder="Electronics, Fashion..." />
            <Input label="Monthly Search Volumes (12, comma-sep)" value={form.monthlySearchVolumes} onChange={(v) => update("monthlySearchVolumes", v)} />
            <Input label="Monthly Sales Data (12, comma-sep)" value={form.monthlySalesData} onChange={(v) => update("monthlySalesData", v)} />
            <Input label="Monthly Revenue (12, comma-sep)" value={form.monthlyRevenue} onChange={(v) => update("monthlyRevenue", v)} />
          </Section>

          <Section title="Additional Criteria">
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
          </Section>

          <div className="flex gap-2">
            <button
              onClick={handleValidate}
              disabled={loading || !form.productTitle.trim()}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Analyzing..." : "Run Validation"}
            </button>
            <button onClick={handleReset} className="px-4 py-3 rounded-xl bg-surface border border-border text-muted-foreground hover:text-foreground transition-colors" title="Reset">
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>

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
              <p className="text-sm text-muted-foreground">Analyzing 10+ criteria across 5 engines</p>
            </div>
          )}

          {!loading && !result && (
            <div className="glass rounded-2xl p-12 text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">Ready to Validate</h3>
              <p className="text-sm text-muted-foreground mb-4">Enter your product details on the left and click &quot;Run Validation&quot; to get a comprehensive analysis</p>
              <div className="flex flex-wrap justify-center gap-2">
                {["Trend Velocity", "Saturation Index", "Profit Potential", "Seasonal Demand", "Golden Score"].map((e) => (
                  <span key={e} className="text-[10px] px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20">{e}</span>
                ))}
              </div>
            </div>
          )}

          {result && (
            <>
              <GoldenScoreBoard data={result.goldenProduct} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TrendVelocityCard data={result.trendVelocity} />
                <SaturationGauge data={result.saturation} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ProfitPotentialPanel data={result.profitPotential} />
                <SeasonalDemandChart data={result.seasonalDemand} />
              </div>
            </>
          )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-display text-sm font-semibold text-foreground">Recent Validations</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {history.slice(0, 6).map((v) => (
              <div key={v.id} className="glass rounded-xl p-3 hover:border-accent/20 transition-colors cursor-pointer" onClick={() => {
                update("productTitle", v.productTitle);
              }}>
                <p className="text-sm font-medium text-foreground truncate mb-1">{v.productTitle}</p>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold ${
                    v.goldenRank === "S" ? "text-yellow-400" : v.goldenRank === "A" ? "text-emerald-400" :
                    v.goldenRank === "B" ? "text-blue-400" : v.goldenRank === "C" ? "text-amber-400" : "text-red-400"
                  }`}>{v.goldenRank}-Tier</span>
                  <span className="text-[10px] text-muted-foreground">{v.goldenScore}/100</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
