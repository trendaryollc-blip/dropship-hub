"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Search,
  Tag,
  Globe,
  FileText,
  Image,
  Loader2,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import type { ComplianceCheckInput, ComplianceCheckType } from "@/types/compliance";

const CHECK_TYPES: { id: ComplianceCheckType; label: string; icon: typeof Tag; description: string }[] = [
  { id: "trademark", label: "Trademark", icon: Tag, description: "Check for registered brand names" },
  { id: "dmca", label: "DMCA Risk", icon: FileText, description: "Detect DMCA takedown risk" },
  { id: "restricted_item", label: "Restricted Items", icon: ShieldCheck, description: "Platform category restrictions" },
  { id: "ad_policy", label: "Ad Policy", icon: Zap, description: "Ad platform compliance" },
  { id: "image_originality", label: "Image Check", icon: Image, description: "Stock photo & watermark detection" },
  { id: "brand_registry", label: "Brand Registry", icon: Globe, description: "Marketplace brand enrollment" },
  { id: "patent", label: "Patent Check", icon: FileText, description: "Design & utility patent risk" },
  { id: "export_control", label: "Export Control", icon: Globe, description: "Sanctions & dual-use compliance" },
];

const COMMON_CATEGORIES = [
  "Fashion", "Beauty", "Electronics", "Home", "Toys", "Pet Products",
  "Health", "Sports", "Automotive", "Jewelry", "Baby", "Food",
];

const MARKET_PRESETS = ["US", "EU", "UK", "AU", "CA", "JP"];

interface Props {
  onSubmit: (input: ComplianceCheckInput) => Promise<void>;
  onBatchSubmit?: (products: ComplianceCheckInput[]) => Promise<void>;
  loading: boolean;
}

export default function ComplianceCheckForm({ onSubmit, onBatchSubmit, loading }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [mode, setMode] = useState<"single" | "batch">("single");
  const [form, setForm] = useState<ComplianceCheckInput>({
    productTitle: "",
    productDescription: "",
    brand: "",
    category: "",
    materials: [],
    targetMarkets: ["US"],
    sellingPrice: 0,
    productImages: [],
    supplierUrl: "",
    productUrl: "",
    productImage: "",
    checkTypes: ["trademark", "dmca", "restricted_item", "ad_policy", "image_originality", "brand_registry", "patent", "export_control"],
    beforeAfterClaims: "",
    healthClaims: [],
  });

  const [materialInput, setMaterialInput] = useState("");
  const [imageInput, setImageInput] = useState("");
  const [marketInput, setMarketInput] = useState("");
  const [batchText, setBatchText] = useState("");

  const updateField = <K extends keyof ComplianceCheckInput>(key: K, value: ComplianceCheckInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCheckType = (type: ComplianceCheckType) => {
    setForm((prev) => ({
      ...prev,
      checkTypes: prev.checkTypes.includes(type)
        ? prev.checkTypes.filter((t) => t !== type)
        : [...prev.checkTypes, type],
    }));
  };

  const selectAllCheckTypes = () => {
    updateField("checkTypes", CHECK_TYPES.map((t) => t.id));
  };

  const deselectAllCheckTypes = () => {
    updateField("checkTypes", []);
  };

  const toggleMarketPreset = (market: string) => {
    setForm((prev) => ({
      ...prev,
      targetMarkets: prev.targetMarkets.includes(market)
        ? prev.targetMarkets.filter((m) => m !== market)
        : [...prev.targetMarkets, market],
    }));
  };

  const addMaterial = () => {
    if (materialInput.trim() && !form.materials.includes(materialInput.trim())) {
      updateField("materials", [...form.materials, materialInput.trim()]);
      setMaterialInput("");
    }
  };

  const addImage = () => {
    if (imageInput.trim() && !form.productImages.includes(imageInput.trim())) {
      updateField("productImages", [...form.productImages, imageInput.trim()]);
      setImageInput("");
    }
  };

  const addMarket = () => {
    if (marketInput.trim() && !form.targetMarkets.includes(marketInput.trim())) {
      updateField("targetMarkets", [...form.targetMarkets, marketInput.trim()]);
      setMarketInput("");
    }
  };

  const parseBatchProducts = (): ComplianceCheckInput[] => {
    return batchText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split("|").map((p) => p.trim());
        return {
          productTitle: parts[0] || "",
          category: parts[1] || "",
          sellingPrice: parseFloat(parts[2]) || 0,
          productDescription: parts[3] || "",
          brand: "",
          materials: [],
          targetMarkets: form.targetMarkets,
          productImages: [],
          supplierUrl: "",
          productUrl: "",
          productImage: "",
          checkTypes: form.checkTypes,
          beforeAfterClaims: "",
          healthClaims: [],
        };
      });
  };

  const handleBatchSubmit = async () => {
    const products = parseBatchProducts();
    if (products.length === 0 || !onBatchSubmit) return;
    await onBatchSubmit(products);
  };

  const handleSubmit = async () => {
    if (!form.productTitle.trim()) return;
    if (form.checkTypes.length === 0) return;
    await onSubmit(form);
  };

  const canSubmit = form.productTitle.trim() && form.checkTypes.length > 0 && !loading;
  const canBatchSubmit = batchText.trim().length > 0 && form.checkTypes.length > 0 && !loading && !!onBatchSubmit;

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-surface/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent/10">
            <Search className="h-5 w-5 text-accent" />
          </div>
          <div className="text-left">
            <h3 className="font-display text-base font-semibold text-foreground">Product Compliance Check</h3>
            <p className="text-xs text-muted-foreground">Enter product details to run compliance analysis</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-white/[0.04]">
          {/* Mode Toggle */}
          <div className="pt-4 flex gap-2">
            <button
              onClick={() => setMode("single")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === "single"
                  ? "bg-accent/10 border border-accent/20 text-accent"
                  : "bg-surface border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Single Product
            </button>
            <button
              onClick={() => setMode("batch")}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                mode === "batch"
                  ? "bg-accent/10 border border-accent/20 text-accent"
                  : "bg-surface border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Batch Upload
            </button>
          </div>

          {/* Single Product Mode */}
          {mode === "single" && (
            <>
              {/* Product Title */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product Title *</label>
                <input
                  type="text"
                  value={form.productTitle}
                  onChange={(e) => updateField("productTitle", e.target.value)}
                  placeholder="e.g. Wireless Bluetooth Earbuds with Noise Cancelling"
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product Description</label>
                <textarea
                  value={form.productDescription || ""}
                  onChange={(e) => updateField("productDescription", e.target.value)}
                  placeholder="Paste product description here..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all resize-none"
                />
              </div>

              {/* Brand + Category + Price row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Brand (if any)</label>
                  <input
                    type="text"
                    value={form.brand || ""}
                    onChange={(e) => updateField("brand", e.target.value)}
                    placeholder="e.g. Sony, Nike"
                    className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category *</label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => updateField("category", e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all appearance-none"
                    >
                      <option value="">Select category</option>
                      {COMMON_CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1.5">Selling Price ($)</label>
                  <input
                    type="number"
                    value={form.sellingPrice || ""}
                    onChange={(e) => updateField("sellingPrice", Number(e.target.value))}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all"
                  />
                </div>
              </div>

              {/* Materials */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Materials</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={materialInput}
                    onChange={(e) => setMaterialInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMaterial())}
                    placeholder="e.g. plastic, cotton, metal"
                    className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all"
                  />
                  <button onClick={addMaterial} className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Add</button>
                </div>
                {form.materials.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.materials.map((m) => (
                      <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-xs">
                        {m}
                        <button onClick={() => updateField("materials", form.materials.filter((x) => x !== m))} className="hover:text-accent/70">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Images */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Product Image URLs</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={imageInput}
                    onChange={(e) => setImageInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addImage())}
                    placeholder="https://example.com/image.jpg"
                    className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all"
                  />
                  <button onClick={addImage} className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Add</button>
                </div>
                {form.productImages.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.productImages.map((img, i) => (
                      <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-xs max-w-[200px] truncate">
                        {img}
                        <button onClick={() => updateField("productImages", form.productImages.filter((_, idx) => idx !== i))} className="hover:text-accent/70 shrink-0">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Supplier URL */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Supplier URL</label>
                <input
                  type="url"
                  value={form.supplierUrl || ""}
                  onChange={(e) => updateField("supplierUrl", e.target.value)}
                  placeholder="https://cjdropshipping.com/product/..."
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all"
                />
              </div>

              {/* Single Product Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShieldCheck className="h-4 w-4" />
                )}
                {loading ? "Checking..." : "Run Compliance Check"}
              </button>
            </>
          )}

          {/* Batch Mode */}
          {mode === "batch" && (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                  Products (one per line, format: <span className="text-accent">title | category | price | description (optional)</span>)
                </label>
                <textarea
                  value={batchText}
                  onChange={(e) => setBatchText(e.target.value)}
                  placeholder={"Wireless Earbuds | Electronics | 29.99\nOrganic Face Cream | Beauty | 15.50\nStainless Steel Water Bottle | Sports | 12.00 | BPA-free 750ml bottle"}
                  rows={10}
                  className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground font-mono placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all resize-none"
                />
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {batchText.split("\n").filter((l) => l.trim().length > 0).length} product(s) detected
                </p>
              </div>

              {/* Batch Submit */}
              <button
                onClick={handleBatchSubmit}
                disabled={!canBatchSubmit}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4" />
                )}
                {loading ? "Checking..." : "Run Batch"}
              </button>
            </>
          )}

          {/* Target Markets */}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">Target Markets</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {MARKET_PRESETS.map((market) => {
                const active = form.targetMarkets.includes(market);
                return (
                  <button
                    key={market}
                    onClick={() => toggleMarketPreset(market)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      active
                        ? "bg-accent/10 border-accent/20 text-accent"
                        : "bg-surface border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                    }`}
                  >
                    {market}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={marketInput}
                onChange={(e) => setMarketInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMarket())}
                placeholder="Custom market (e.g. BR, IN)"
                className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 focus:border-accent/30 transition-all"
              />
              <button onClick={addMarket} className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-colors">Add</button>
            </div>
            {form.targetMarkets.filter((m) => !MARKET_PRESETS.includes(m)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {form.targetMarkets.filter((m) => !MARKET_PRESETS.includes(m)).map((m) => (
                  <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-xs">
                    {m}
                    <button onClick={() => updateField("targetMarkets", form.targetMarkets.filter((x) => x !== m))} className="hover:text-accent/70">×</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Check Types */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-muted-foreground">Checks to Run *</label>
              <div className="flex gap-2">
                <button
                  onClick={selectAllCheckTypes}
                  className="text-xs text-accent hover:text-accent/80 transition-colors"
                >
                  Select All
                </button>
                <span className="text-muted-foreground/30">|</span>
                <button
                  onClick={deselectAllCheckTypes}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Deselect All
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CHECK_TYPES.map(({ id, label, icon: Icon, description }) => {
                const active = form.checkTypes.includes(id);
                return (
                  <button
                    key={id}
                    onClick={() => toggleCheckType(id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all text-sm ${
                      active
                        ? "bg-accent/10 border-accent/20 text-accent"
                        : "bg-surface border-border text-muted-foreground hover:text-foreground hover:border-border/80"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-[10px] opacity-70">{description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
