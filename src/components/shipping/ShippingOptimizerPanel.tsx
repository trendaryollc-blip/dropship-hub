"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Globe, Package, RotateCcw, Sparkles, AlertTriangle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import type { CarrierRateResponse, DeliveryPredictionResult, CustomsCalculationResult, AutoSelectResult, ShippingOptimization, CarrierId, CustomsItem } from "@/types/shipping";
import { COUNTRIES } from "@/lib/shipping/countries";
import { CARRIER_MAP } from "@/types/shipping";
import CarrierComparisonCard from "./CarrierComparisonCard";
import DeliveryTimeline from "./DeliveryTimeline";
import CustomsBreakdown from "./CustomsBreakdown";
import RateComparisonTable from "./RateComparisonTable";
import RateFilters from "./RateFilters";
import FeatureMatrix from "./FeatureMatrix";
import CustomsItemEditor from "./CustomsItemEditor";
import CustomsDocumentGenerator from "./CustomsDocumentGenerator";
import CustomsHistory from "./CustomsHistory";
import ScoreBreakdown from "./ScoreBreakdown";
import ConstraintBuilder from "./ConstraintBuilder";
import CarrierQuickSelect from "./CarrierQuickSelect";
import DelayWarnings from "./DelayWarnings";
import EmptyState from "./EmptyStates";
import { RateComparisonSkeleton, TimelineSkeleton, CustomsSkeleton, ScoreBreakdownSkeleton } from "./SkeletonLoaders";
import PackagePresets from "./PackagePresets";
import UnitToggle, { convertWeight, convertDimension } from "./UnitToggle";
import CurrencySelector from "./CurrencySelector";
import ShipDatePicker from "./ShipDatePicker";
import SwapButton from "./SwapButton";
import { useToast } from "./Toast";

const tabs = [
  { id: "compare" as const, label: "Compare Rates", icon: Search, shortcut: "1" },
  { id: "auto" as const, label: "Auto-Select", icon: Sparkles, shortcut: "2" },
  { id: "predict" as const, label: "Predictions", icon: Package, shortcut: "3" },
  { id: "customs" as const, label: "Customs", icon: Globe, shortcut: "4" },
];

export default function ShippingOptimizerPanel() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"compare" | "predict" | "customs" | "auto">("compare");

  // Form state
  const [originCountry, setOriginCountry] = useState("CN");
  const [destinationCountry, setDestinationCountry] = useState("US");
  const [weightKg, setWeightKg] = useState("0.5");
  const [lengthCm, setLengthCm] = useState("15");
  const [widthCm, setWidthCm] = useState("10");
  const [heightCm, setHeightCm] = useState("5");
  const [declaredValue, setDeclaredValue] = useState("25");
  const [currency, setCurrency] = useState("USD");
  const [shipDate, setShipDate] = useState(new Date().toISOString().split("T")[0]);

  // Unit state
  const [weightUnit, setWeightUnit] = useState<"kg" | "lbs">("kg");
  const [dimensionUnit, setDimensionUnit] = useState<"cm" | "in">("cm");
  const [activePreset, setActivePreset] = useState<string | undefined>();

  // Auto-select state
  const [optimization, setOptimization] = useState<ShippingOptimization>("balanced");
  const [maxBudget, setMaxBudget] = useState("");
  const [maxDeliveryDays, setMaxDeliveryDays] = useState("");
  const [requiredTracking, setRequiredTracking] = useState(false);
  const [requiredInsurance, setRequiredInsurance] = useState(false);
  const [excludeCarriers, setExcludeCarriers] = useState<CarrierId[]>([]);

  // Customs state
  const [customsItems, setCustomsItems] = useState<CustomsItem[]>([
    { name: "Wireless Earbuds", hsCode: "8518", quantity: 1, unitValue: 25, weightKg: 0.2, originCountry: "CN" },
  ]);

  // Results state
  const [rates, setRates] = useState<CarrierRateResponse[]>([]);
  const [filteredRates, setFilteredRates] = useState<CarrierRateResponse[]>([]);
  const [autoResult, setAutoResult] = useState<AutoSelectResult | null>(null);
  const [prediction, setPrediction] = useState<DeliveryPredictionResult | null>(null);
  const [customsResult, setCustomsResult] = useState<CustomsCalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCarrierId, setSelectedCarrierId] = useState<CarrierId | undefined>();
  const [selectedServiceLevel, setSelectedServiceLevel] = useState<string | undefined>();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Convert display values to API values (always send in kg/cm)
  const apiWeight = convertWeight(parseFloat(weightKg) || 0, weightUnit);
  const apiLength = convertDimension(parseFloat(lengthCm) || 0, dimensionUnit);
  const apiWidth = convertDimension(parseFloat(widthCm) || 0, dimensionUnit);
  const apiHeight = convertDimension(parseFloat(heightCm) || 0, dimensionUnit);

  // Validate form
  const isFormValid = apiWeight > 0 && apiLength > 0 && apiWidth > 0 && apiHeight > 0 && parseFloat(declaredValue) >= 0;

  // Package preset handler
  const handlePresetSelect = (preset: { name: string; weightKg: number; lengthCm: number; widthCm: number; heightCm: number }) => {
    setActivePreset(preset.name);
    setWeightUnit("kg");
    setDimensionUnit("cm");
    setWeightKg(String(preset.weightKg));
    setLengthCm(String(preset.lengthCm));
    setWidthCm(String(preset.widthCm));
    setHeightCm(String(preset.heightCm));
    toast(`Applied ${preset.name} preset`, "success");
  };

  // Swap origin/destination
  const handleSwap = () => {
    setOriginCountry(destinationCountry);
    setDestinationCountry(originCountry);
    toast("Swapped origin and destination", "info");
  };

  // Auto-refresh rates after 5 minutes
  useEffect(() => {
    if (!lastUpdated || rates.length === 0) return;
    const timer = setTimeout(() => setLastUpdated(null), 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [lastUpdated, rates.length]);

  // API calls
  const fetchRates = async () => {
    if (!user || !isFormValid) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        uid: user.uid,
        originCountry,
        destinationCountry,
        weightKg: String(apiWeight),
        lengthCm: String(apiLength),
        widthCm: String(apiWidth),
        heightCm: String(apiHeight),
        declaredValue,
        currency,
      });
      const data = await safeFetch<{ result: { rates: CarrierRateResponse[] } }>(`/api/shipping/rate-compare?${params}`);
      if (data?.result?.rates) {
        setRates(data.result.rates);
        setFilteredRates(data.result.rates);
        setLastUpdated(new Date());
        toast(`Found ${data.result.rates.length} shipping options`, "success");
      }
    } catch {
      setError("Failed to fetch rates");
      toast("Failed to fetch shipping rates", "error");
    }
    setLoading(false);
  };

  const fetchAutoSelect = async () => {
    if (!user || !isFormValid) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        uid: user.uid,
        originCountry,
        destinationCountry,
        weightKg: String(apiWeight),
        lengthCm: String(apiLength),
        widthCm: String(apiWidth),
        heightCm: String(apiHeight),
        declaredValue,
        optimization,
        currency,
      });
      if (maxBudget) params.set("maxBudget", maxBudget);
      if (maxDeliveryDays) params.set("maxDeliveryDays", maxDeliveryDays);
      if (requiredTracking) params.set("requiredTracking", "true");
      if (requiredInsurance) params.set("requiredInsurance", "true");
      if (excludeCarriers.length > 0) params.set("excludeCarriers", JSON.stringify(excludeCarriers));
      const data = await safeFetch<{ result: AutoSelectResult }>(`/api/shipping/auto-select?${params}`);
      if (data?.result) {
        setAutoResult(data.result);
        toast(`Recommended: ${data.result.selected?.carrierName || "N/A"}`, "success");
      }
    } catch {
      setError("Failed to auto-select carrier");
      toast("Failed to auto-select carrier", "error");
    }
    setLoading(false);
  };

  const fetchPrediction = async (carrierId: string, serviceLevel: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setSelectedCarrierId(carrierId as CarrierId);
    setSelectedServiceLevel(serviceLevel);
    try {
      const params = new URLSearchParams({
        uid: user.uid,
        carrierId,
        originCountry,
        destinationCountry,
        weightKg: String(apiWeight),
        serviceLevel,
        shipDate,
      });
      const data = await safeFetch<{ prediction: DeliveryPredictionResult }>(`/api/shipping/predict?${params}`);
      if (data?.prediction) {
        setPrediction(data.prediction);
        toast("Delivery prediction loaded", "success");
      }
    } catch {
      setError("Failed to predict delivery");
      toast("Failed to predict delivery", "error");
    }
    setLoading(false);
  };

  const fetchCustoms = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        uid: user.uid,
        originCountry,
        destinationCountry,
        items: JSON.stringify(customsItems),
        currency,
      });
      const data = await safeFetch<CustomsCalculationResult>(`/api/shipping/customs?${params}`);
      if (data) {
        setCustomsResult(data);
        toast("Customs calculation complete", "success");
      }
    } catch {
      setError("Failed to calculate customs");
      toast("Failed to calculate customs", "error");
    }
    setLoading(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.ctrlKey && e.key === "Enter") {
        e.preventDefault();
        if (activeTab === "compare") fetchRates();
        else if (activeTab === "auto") fetchAutoSelect();
        else if (activeTab === "customs") fetchCustoms();
      }
      if (e.key === "1") setActiveTab("compare");
      if (e.key === "2") setActiveTab("auto");
      if (e.key === "3") setActiveTab("predict");
      if (e.key === "4") setActiveTab("customs");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  const cheapest = rates.length > 0 ? rates.reduce((min, r) => r.cost < min.cost ? r : min, rates[0]) : null;
  const fastest = rates.length > 0 ? rates.reduce((min, r) => r.estimatedDays.min < min.estimatedDays.min ? r : min, rates[0]) : null;

  const weightLabel = weightUnit === "kg" ? "kg" : "lbs";
  const dimLabel = dimensionUnit === "cm" ? "cm" : "in";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
      tabIndex={0}
    >
      {/* Input Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="glass rounded-2xl p-4 sm:p-5 shadow-xl shadow-black/10"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
            <Package className="h-4 w-4 text-accent" /> Shipment Details
          </h3>
          <div className="flex items-center gap-3">
            <UnitToggle
              weightUnit={weightUnit}
              onWeightUnitChange={setWeightUnit}
              dimensionUnit={dimensionUnit}
              onDimensionUnitChange={setDimensionUnit}
            />
            <CurrencySelector value={currency} onChange={setCurrency} />
          </div>
        </div>

        {/* Package Presets */}
        <PackagePresets onSelect={handlePresetSelect} activePreset={activePreset} />

        {/* Origin / Destination + Swap */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-end mb-3">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block font-medium">Origin</label>
            <select value={originCountry} onChange={(e) => setOriginCountry(e.target.value)} className="w-full px-3 py-2 bg-surface border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all">
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <SwapButton onSwap={handleSwap} />
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block font-medium">Destination</label>
            <select value={destinationCountry} onChange={(e) => setDestinationCountry(e.target.value)} className="w-full px-3 py-2 bg-surface border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all">
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Weight, Value, Dimensions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          {[
            { label: `Weight (${weightLabel})`, value: weightKg, onChange: setWeightKg, step: "0.1", min: "0.01" },
            { label: `Value (${currency})`, value: declaredValue, onChange: setDeclaredValue, step: "0.01", min: "0" },
            { label: `Length (${dimLabel})`, value: lengthCm, onChange: setLengthCm, step: "1", min: "1" },
            { label: `Width (${dimLabel})`, value: widthCm, onChange: setWidthCm, step: "1", min: "1" },
          ].map((field) => (
            <div key={field.label}>
              <label className="text-[10px] text-muted-foreground mb-1 block font-medium">{field.label}</label>
              <input
                type="number"
                step={field.step}
                min={field.min}
                value={field.value}
                onChange={(e) => { field.onChange(e.target.value); setActivePreset(undefined); }}
                className="w-full px-3 py-2 bg-surface border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block font-medium">Height ({dimLabel})</label>
            <input
              type="number"
              min="1"
              value={heightCm}
              onChange={(e) => { setHeightCm(e.target.value); setActivePreset(undefined); }}
              className="w-full px-3 py-2 bg-surface border border-white/10 rounded-xl text-xs text-foreground focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="text-[10px] text-muted-foreground mb-1 block font-medium">Ship Date</label>
            <ShipDatePicker value={shipDate} onChange={setShipDate} />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface/50 rounded-xl p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <motion.button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all flex-1 justify-center ${
                  activeTab === tab.id
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                }`}
                aria-label={`${tab.label} (Press ${tab.shortcut})`}
              >
                <Icon className="h-3 w-3" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
                <kbd className="hidden lg:inline-flex items-center px-1 py-0.5 rounded text-[8px] bg-white/10 text-white/60 ml-1">{tab.shortcut}</kbd>
              </motion.button>
            );
          })}
        </div>
      </motion.div>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-red-400 text-sm flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stale Rate Warning */}
      <AnimatePresence>
        {rates.length > 0 && !lastUpdated && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-amber-400 text-xs flex items-center justify-between"
          >
            <span>Rates may be stale. Click refresh to get updated rates.</span>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={fetchRates}
              className="text-amber-400 underline text-[10px] font-medium"
            >
              Refresh
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {/* Compare Rates Tab */}
        {activeTab === "compare" && (
          <motion.div
            key="compare"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <motion.button
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={fetchRates}
              disabled={loading || !isFormValid}
              className="w-full py-3.5 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/30"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {loading ? "Comparing..." : "Compare All Carriers"}
            </motion.button>

            {loading && <RateComparisonSkeleton />}

            {!loading && rates.length === 0 && (
              <EmptyState type="compare" onAction={fetchRates} />
            )}

            {!loading && rates.length > 0 && (
              <>
                {/* Last Updated + Stats */}
                {lastUpdated && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground">
                        Last updated: {lastUpdated.toLocaleTimeString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {filteredRates.length} of {rates.length} rates shown
                      </span>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={fetchRates}
                      className="text-[10px] text-accent hover:text-accent/80 flex items-center gap-1 font-medium"
                    >
                      <RotateCcw className="h-3 w-3" /> Refresh
                    </motion.button>
                  </motion.div>
                )}

                {/* Filters */}
                <RateFilters rates={rates} onFilter={setFilteredRates} />

                {/* Quick Stats */}
                {cheapest && fastest && (
                  <div className="grid grid-cols-3 gap-2">
                    <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-3 text-center">
                      <p className="text-[9px] text-muted-foreground mb-0.5">Cheapest</p>
                      <p className="text-sm font-bold text-emerald-400">${cheapest.cost.toFixed(2)}</p>
                      <p className="text-[9px] text-muted-foreground">{cheapest.carrierName}</p>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-3 text-center">
                      <p className="text-[9px] text-muted-foreground mb-0.5">Fastest</p>
                      <p className="text-sm font-bold text-blue-400">{fastest.estimatedDays.min}-{fastest.estimatedDays.max}d</p>
                      <p className="text-[9px] text-muted-foreground">{fastest.carrierName}</p>
                    </motion.div>
                    <motion.div whileHover={{ scale: 1.02 }} className="glass rounded-xl p-3 text-center">
                      <p className="text-[9px] text-muted-foreground mb-0.5">Best Value</p>
                      <p className="text-sm font-bold text-accent">
                        ${((cheapest.cost + fastest.cost) / 2).toFixed(2)}
                      </p>
                      <p className="text-[9px] text-muted-foreground">avg price</p>
                    </motion.div>
                  </div>
                )}

                {/* Card View */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {filteredRates.map((rate, i) => (
                    <CarrierComparisonCard
                      key={`${rate.carrierId}-${rate.serviceLevel}`}
                      rate={rate}
                      isCheapest={cheapest?.carrierId === rate.carrierId && cheapest?.serviceLevel === rate.serviceLevel}
                      isFastest={fastest?.carrierId === rate.carrierId && fastest?.serviceLevel === rate.serviceLevel}
                      delay={i * 50}
                    />
                  ))}
                </div>

                {/* Table View */}
                {filteredRates.length > 0 && (
                  <RateComparisonTable
                    rates={filteredRates}
                    cheapest={cheapest}
                    fastest={fastest}
                  />
                )}

                {/* Feature Matrix */}
                <FeatureMatrix rates={filteredRates} />
              </>
            )}
          </motion.div>
        )}

        {/* Auto-Select Tab */}
        {activeTab === "auto" && (
          <motion.div
            key="auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <ConstraintBuilder
              optimization={optimization}
              onOptimizationChange={setOptimization}
              maxBudget={maxBudget}
              onMaxBudgetChange={setMaxBudget}
              maxDeliveryDays={maxDeliveryDays}
              onMaxDeliveryDaysChange={setMaxDeliveryDays}
              requiredTracking={requiredTracking}
              onRequiredTrackingChange={setRequiredTracking}
              requiredInsurance={requiredInsurance}
              onRequiredInsuranceChange={setRequiredInsurance}
              excludeCarriers={excludeCarriers}
              onExcludeCarriersChange={setExcludeCarriers}
            />

            <motion.button
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={fetchAutoSelect}
              disabled={loading || !isFormValid}
              className="w-full py-3.5 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/30"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Finding best carrier..." : "Auto-Select Best Carrier"}
            </motion.button>

            {loading && <ScoreBreakdownSkeleton />}

            {!loading && autoResult && (
              <div className="space-y-3">
                {autoResult.selected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="glass rounded-xl p-4 border border-accent/30 bg-accent/5 shadow-lg shadow-accent/5"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <motion.span
                        className="text-2xl"
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 0.5, delay: 0.3 }}
                      >
                        {CARRIER_MAP[autoResult.selected.carrierId]?.icon || "📦"}
                      </motion.span>
                      <div>
                        <h4 className="text-sm font-semibold text-accent">Recommended: {autoResult.selected.carrierName}</h4>
                        <p className="text-[10px] text-muted-foreground">{autoResult.selected.serviceLevel} · ${autoResult.selected.cost.toFixed(2)} · {autoResult.selected.estimatedDays.min}-{autoResult.selected.estimatedDays.max} days</p>
                      </div>
                    </div>
                    <CarrierComparisonCard rate={autoResult.selected} isSelected isBestValue />
                  </motion.div>
                )}

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="glass rounded-xl p-4"
                >
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Why This Carrier?</p>
                  <p className="text-xs text-foreground leading-relaxed">{autoResult.reasoning}</p>
                </motion.div>

                <ScoreBreakdown result={autoResult} />

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
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="glass rounded-xl p-4"
                  >
                    <p className="text-[10px] text-muted-foreground mb-2">Applied Constraints:</p>
                    <div className="flex flex-wrap gap-1">
                      {autoResult.appliedConstraints.map((c, i) => (
                        <motion.span
                          key={i}
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.05 }}
                          className="text-[9px] px-2 py-0.5 rounded-full bg-surface text-muted-foreground border border-white/5"
                        >
                          {c}
                        </motion.span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>
            )}

            {!loading && !autoResult && (
              <EmptyState type="auto" onAction={fetchAutoSelect} />
            )}
          </motion.div>
        )}

        {/* Predictions Tab */}
        {activeTab === "predict" && (
          <motion.div
            key="predict"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <CarrierQuickSelect
              onSelect={fetchPrediction}
              selectedCarrierId={selectedCarrierId}
              selectedServiceLevel={selectedServiceLevel}
              loading={loading}
            />

            {loading && <TimelineSkeleton />}

            {!loading && prediction && (
              <>
                <DeliveryTimeline prediction={prediction} />
                <DelayWarnings
                  weatherDelayRisk={prediction.weatherDelayRisk}
                  customsDelayRisk={prediction.customsDelayRisk}
                  holidayDelayRisk={prediction.holidayDelayRisk}
                  riskFactors={prediction.riskFactors}
                />
              </>
            )}

            {!loading && !prediction && (
              <EmptyState type="predict" />
            )}
          </motion.div>
        )}

        {/* Customs Tab */}
        {activeTab === "customs" && (
          <motion.div
            key="customs"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <div className="glass rounded-2xl p-4 shadow-xl shadow-black/10">
              <h4 className="text-xs font-semibold text-foreground mb-3">Shipment Items</h4>
              <CustomsItemEditor items={customsItems} onChange={setCustomsItems} />
            </div>

            <motion.button
              whileHover={{ scale: 1.01, y: -1 }}
              whileTap={{ scale: 0.99 }}
              onClick={fetchCustoms}
              disabled={loading || customsItems.length === 0}
              className="w-full py-3.5 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/20 hover:shadow-accent/30"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              {loading ? "Calculating..." : "Calculate Customs & Duties"}
            </motion.button>

            {loading && <CustomsSkeleton />}

            {!loading && customsResult && (
              <>
                <CustomsBreakdown result={customsResult} />
                <CustomsDocumentGenerator
                  result={customsResult}
                  originCountry={originCountry}
                  destinationCountry={destinationCountry}
                />
              </>
            )}

            {!loading && !customsResult && customsItems.length === 0 && (
              <EmptyState type="customs" />
            )}

            <CustomsHistory />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Keyboard shortcut hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-center py-2"
      >
        <p className="text-[9px] text-muted-foreground/50">
          Press <kbd className="px-1 py-0.5 rounded bg-surface text-muted-foreground/70 text-[8px]">Ctrl+Enter</kbd> to search · <kbd className="px-1 py-0.5 rounded bg-surface text-muted-foreground/70 text-[8px]">1-4</kbd> to switch tabs
        </p>
      </motion.div>
    </motion.div>
  );
}
