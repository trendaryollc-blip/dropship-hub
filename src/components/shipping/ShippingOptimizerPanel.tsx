"use client";

import { useState } from "react";
import { DollarSign, Clock, Shield, Zap, Search, Loader2, Globe, Package, Settings } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import type { CarrierRateResponse, DeliveryPredictionResult, CustomsCalculationResult, AutoSelectResult, ShippingOptimization } from "@/types/shipping";
import { CARRIER_CONFIGS } from "@/types/shipping";
import CarrierComparisonCard from "./CarrierComparisonCard";
import DeliveryTimeline from "./DeliveryTimeline";
import CustomsBreakdown from "./CustomsBreakdown";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
  { code: "IN", name: "India" },
  { code: "AE", name: "UAE" },
  { code: "SG", name: "Singapore" },
  { code: "KR", name: "South Korea" },
  { code: "NL", name: "Netherlands" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "ZA", name: "South Africa" },
  { code: "MX", name: "Mexico" },
  { code: "PL", name: "Poland" },
  { code: "CN", name: "China" },
];

const optimizationOptions: { id: ShippingOptimization; label: string; icon: typeof DollarSign; color: string }[] = [
  { id: "cost", label: "Cheapest", icon: DollarSign, color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  { id: "speed", label: "Fastest", icon: Clock, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  { id: "balanced", label: "Balanced", icon: Shield, color: "text-purple-400 bg-purple-400/10 border-purple-400/20" },
  { id: "reliability", label: "Reliable", icon: Zap, color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
];

export default function ShippingOptimizerPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"compare" | "predict" | "customs" | "auto">("compare");

  // Form state
  const [originCountry, setOriginCountry] = useState("CN");
  const [destinationCountry, setDestinationCountry] = useState("US");
  const [weightKg, setWeightKg] = useState("0.5");
  const [lengthCm, setLengthCm] = useState("15");
  const [widthCm, setWidthCm] = useState("10");
  const [heightCm, setHeightCm] = useState("5");
  const [declaredValue, setDeclaredValue] = useState("25");
  const [optimization, setOptimization] = useState<ShippingOptimization>("balanced");
  const [maxBudget, setMaxBudget] = useState("");
  const [maxDeliveryDays, setMaxDeliveryDays] = useState("");
  const [customsItems, setCustomsItems] = useState('[{"name":"Wireless Earbuds","hsCode":"8518","quantity":1,"unitValue":25,"weightKg":0.2,"originCountry":"CN"}]');

  // Results state
  const [rates, setRates] = useState<CarrierRateResponse[]>([]);
  const [autoResult, setAutoResult] = useState<AutoSelectResult | null>(null);
  const [prediction, setPrediction] = useState<DeliveryPredictionResult | null>(null);
  const [customsResult, setCustomsResult] = useState<CustomsCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        uid: user.uid,
        originCountry,
        destinationCountry,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        declaredValue,
      });
      const data = await safeFetch<{ result: { rates: CarrierRateResponse[] } }>(`/api/shipping/rate-compare?${params}`);
      if (data?.result?.rates) setRates(data.result.rates);
    } catch {
      setError("Failed to fetch rates");
    }
    setLoading(false);
  };

  const fetchAutoSelect = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        uid: user.uid,
        originCountry,
        destinationCountry,
        weightKg,
        lengthCm,
        widthCm,
        heightCm,
        declaredValue,
        optimization,
      });
      if (maxBudget) params.set("maxBudget", maxBudget);
      if (maxDeliveryDays) params.set("maxDeliveryDays", maxDeliveryDays);
      const data = await safeFetch<{ result: AutoSelectResult }>(`/api/shipping/auto-select?${params}`);
      if (data?.result) setAutoResult(data.result);
    } catch {
      setError("Failed to auto-select carrier");
    }
    setLoading(false);
  };

  const fetchPrediction = async (carrierId: string, serviceLevel: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        uid: user.uid,
        carrierId,
        originCountry,
        destinationCountry,
        weightKg,
        serviceLevel,
      });
      const data = await safeFetch<{ prediction: DeliveryPredictionResult }>(`/api/shipping/predict?${params}`);
      if (data?.prediction) setPrediction(data.prediction);
    } catch {
      setError("Failed to predict delivery");
    }
    setLoading(false);
  };

  const fetchCustoms = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      let items;
      try {
        items = JSON.parse(customsItems);
      } catch {
        setError("Invalid customs items JSON");
        setLoading(false);
        return;
      }
      const params = new URLSearchParams({
        uid: user.uid,
        originCountry,
        destinationCountry,
        items: JSON.stringify(items),
      });
      const data = await safeFetch<CustomsCalculationResult>(`/api/shipping/customs?${params}`);
      if (data) setCustomsResult(data);
    } catch {
      setError("Failed to calculate customs");
    }
    setLoading(false);
  };

  const cheapest = rates.length > 0 ? rates.reduce((min, r) => r.cost < min.cost ? r : min, rates[0]) : null;
  const fastest = rates.length > 0 ? rates.reduce((min, r) => r.estimatedDays.min < min.estimatedDays.min ? r : min, rates[0]) : null;

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="glass rounded-xl p-4 sm:p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Package className="h-4 w-4 text-accent" /> Shipment Details
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Origin</label>
            <select value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent">
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Destination</label>
            <select value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent">
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Weight (kg)</label>
            <input type="number" step="0.1" min="0.01" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Value (USD)</label>
            <input type="number" step="0.01" min="0" value={declaredValue} onChange={(e) => setDeclaredValue(e.target.value)} className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Length (cm)</label>
            <input type="number" min="1" value={lengthCm} onChange={(e) => setLengthCm(e.target.value)} className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Width (cm)</label>
            <input type="number" min="1" value={widthCm} onChange={(e) => setWidthCm(e.target.value)} className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Height (cm)</label>
            <input type="number" min="1" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground focus:outline-none focus:border-accent" />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface/50 rounded-xl p-1">
          {[
            { id: "compare" as const, label: "Compare Rates", icon: <Search className="h-3 w-3" /> },
            { id: "auto" as const, label: "Auto-Select", icon: <Zap className="h-3 w-3" /> },
            { id: "predict" as const, label: "Predictions", icon: <Clock className="h-3 w-3" /> },
            { id: "customs" as const, label: "Customs", icon: <Globe className="h-3 w-3" /> },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-1 justify-center ${activeTab === tab.id ? "bg-accent text-white shadow-lg" : "text-muted-foreground hover:text-foreground hover:bg-surface"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm">{error}</div>
      )}

      {/* Compare Rates Tab */}
      {activeTab === "compare" && (
        <div className="space-y-4">
          <button onClick={fetchRates} disabled={loading} className="w-full py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Compare All Carriers
          </button>
          {rates.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {rates.map((rate, i) => (
                <CarrierComparisonCard
                  key={`${rate.carrierId}-${rate.serviceLevel}`}
                  rate={rate}
                  isCheapest={cheapest?.carrierId === rate.carrierId && cheapest?.serviceLevel === rate.serviceLevel}
                  isFastest={fastest?.carrierId === rate.carrierId && fastest?.serviceLevel === rate.serviceLevel}
                  delay={i * 50}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Auto-Select Tab */}
      {activeTab === "auto" && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
              <Settings className="h-3 w-3 text-accent" /> Optimization Mode
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
              {optimizationOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button key={opt.id} onClick={() => setOptimization(opt.id)} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${optimization === opt.id ? opt.color : "border-white/5 text-muted-foreground hover:text-foreground hover:bg-surface"}`}>
                    <Icon className="h-3 w-3" /> {opt.label}
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Max Budget (USD, optional)</label>
                <input type="number" min="0" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} placeholder="No limit" className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent" />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Max Delivery Days (optional)</label>
                <input type="number" min="1" value={maxDeliveryDays} onChange={(e) => setMaxDeliveryDays(e.target.value)} placeholder="No limit" className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent" />
              </div>
            </div>
          </div>
          <button onClick={fetchAutoSelect} disabled={loading} className="w-full py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Auto-Select Best Carrier
          </button>
          {autoResult && (
            <div className="space-y-3">
              {autoResult.selected && (
                <div className="glass rounded-xl p-4 border border-accent/30 bg-accent/5">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-accent" />
                    <h4 className="text-sm font-semibold text-accent">Recommended</h4>
                  </div>
                  <CarrierComparisonCard rate={autoResult.selected} isSelected isBestValue />
                </div>
              )}
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-2">Reasoning:</p>
                <p className="text-xs text-foreground">{autoResult.reasoning}</p>
              </div>
              {autoResult.alternatives.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Alternatives:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {autoResult.alternatives.map((alt, i) => (
                      <CarrierComparisonCard key={`${alt.carrierId}-${alt.serviceLevel}`} rate={alt} delay={i * 50} />
                    ))}
                  </div>
                </div>
              )}
              {autoResult.appliedConstraints.length > 0 && (
                <div className="glass rounded-xl p-4">
                  <p className="text-[10px] text-muted-foreground mb-2">Applied Constraints:</p>
                  <div className="flex flex-wrap gap-1">
                    {autoResult.appliedConstraints.map((c, i) => (
                      <span key={i} className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Predictions Tab */}
      {activeTab === "predict" && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h4 className="text-xs font-semibold text-foreground mb-3">Select Carrier & Service</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CARRIER_CONFIGS.map((carrier) => (
                <div key={carrier.id} className="space-y-1">
                  <p className="text-[10px] text-muted-foreground">{carrier.icon} {carrier.name}</p>
                  {["economy", "standard", "express", "priority"].map((sl) => (
                    <button
                      key={`${carrier.id}-${sl}`}
                      onClick={() => fetchPrediction(carrier.id, sl)}
                      disabled={loading}
                      className="w-full px-2 py-1.5 text-[10px] rounded-lg bg-surface hover:bg-accent/20 hover:text-accent transition-all text-left text-muted-foreground disabled:opacity-50"
                    >
                      {sl}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
          {prediction && <DeliveryTimeline prediction={prediction} />}
        </div>
      )}

      {/* Customs Tab */}
      {activeTab === "customs" && (
        <div className="space-y-4">
          <div className="glass rounded-xl p-4">
            <h4 className="text-xs font-semibold text-foreground mb-3">Items (JSON Array)</h4>
            <textarea
              value={customsItems}
              onChange={(e) => setCustomsItems(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-surface border border-white/10 rounded-lg text-xs text-foreground font-mono focus:outline-none focus:border-accent"
            />
            <p className="text-[9px] text-muted-foreground mt-1">
              Format: [{"{"}name, hsCode, quantity, unitValue, weightKg, originCountry{"}"}]
            </p>
          </div>
          <button onClick={fetchCustoms} disabled={loading} className="w-full py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
            Calculate Customs & Duties
          </button>
          {customsResult && <CustomsBreakdown result={customsResult} />}
        </div>
      )}
    </div>
  );
}
