"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { FileText, Copy, Check, Trash2, Loader2, Sparkles, Package, Link2, Search, Eye, ChevronDown, Zap } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { authJson } from "@/lib/auth-headers";
import { copyToClipboard } from "@/lib/clipboard";
import { URLImporter, CompetitorPanel, ListingPreview, MarketInsightsPanel, SmartAutofill } from "@/components/listings/intelligence";
import type { PlatformType, ListingGenerationResponse, SavedListing, ListingStats } from "@/types/product-listing";
import type { ScrapedProductData, CompetitorListing, CompetitorIntelligence } from "@/types/listing-intelligence";

const PLATFORMS: { id: PlatformType; label: string; icon: string }[] = [
  { id: "amazon", label: "Amazon", icon: "📦" },
  { id: "shopify", label: "Shopify", icon: "🛍️" },
  { id: "etsy", label: "Etsy", icon: "🎨" },
  { id: "ebay", label: "eBay", icon: "🏷️" },
  { id: "walmart", label: "Walmart", icon: "🏪" },
];

const TONES = ["professional", "casual", "luxury", "budget", "handmade"] as const;

export default function ProductListingsPage() {
  const { user } = useAuth();
  const { error: toastError, success: toastSuccess } = useToast();
  const searchParams = useSearchParams();
  const uid = user?.uid || "";

  const { data: listingsData, mutate: mutateListings, isLoading: listingsLoading, error: listingsError } = useAPI<{ listings?: SavedListing[] }>(uid ? "/api/ai/listings" : null);
  const { data: statsData } = useAPI<{ stats?: ListingStats }>(uid ? "/api/ai/listings?type=stats" : null);

  const urlTitle = searchParams.get("title") || "";
  const urlPrice = searchParams.get("price") || "";
  const urlCategory = searchParams.get("category") || "";
  const urlDescription = searchParams.get("description") || "";
  const hasProductContext = urlTitle || urlPrice;

  const [platform, setPlatform] = useState<PlatformType>(() => {
    const p = searchParams.get("platform");
    if (p && ["amazon", "shopify", "etsy", "ebay", "walmart"].includes(p)) return p as PlatformType;
    return "amazon";
  });
  const [tone, setTone] = useState<string>("professional");
  const [title, setTitle] = useState(urlTitle);
  const [description, setDescription] = useState(urlDescription);
  const [price, setPrice] = useState(urlPrice);
  const [category, setCategory] = useState(urlCategory);
  const [specKeys, setSpecKeys] = useState<string[]>([""]);
  const [specVals, setSpecVals] = useState<string[]>([""]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ListingGenerationResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "saved">("generate");
  const [activePanel, setActivePanel] = useState<"competitors" | "insights" | "preview">("competitors");
  const [showUrlImporter, setShowUrlImporter] = useState(false);
  const [scrapedImages, setScrapedImages] = useState<string[]>([]);
  const [scrapedBrand, setScrapedBrand] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [competitorIntel, setCompetitorIntel] = useState<CompetitorIntelligence | null>(null);

  const listings = listingsData?.listings || [];
  const stats = statsData?.stats || null;

  const handleUrlImport = useCallback((data: ScrapedProductData) => {
    if (data.title) setTitle(data.title);
    if (data.description) setDescription(data.description);
    if (data.price > 0) setPrice(String(data.price));
    if (data.category) setCategory(data.category);
    if (data.images.length > 0) setScrapedImages(data.images);
    if (data.brand) setScrapedBrand(data.brand);
    if (Object.keys(data.specifications).length > 0) {
      const keys = Object.keys(data.specifications);
      const vals = Object.values(data.specifications);
      setSpecKeys(keys);
      setSpecVals(vals);
    }
    setShowUrlImporter(false);
    toastSuccess("Product data imported successfully!");
  }, [toastSuccess]);

  const handleAutofill = useCallback((field: string, value: string) => {
    if (field === "title") setTitle(value);
    else if (field === "description") setDescription(value);
    else if (field === "category") setCategory(value);
    else if (field === "specification") {
      const parts = value.split(": ");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join(": ").trim();
        setSpecKeys((prev) => [...prev, key]);
        setSpecVals((prev) => [...prev, val]);
      }
    }
  }, []);

  const handleSelectCompetitor = useCallback((listing: CompetitorListing) => {
    if (listing.title) setTitle(listing.title);
    if (listing.price > 0) setPrice(String(listing.price));
    if (listing.keywords.length > 0) {
      const newKeys = [...specKeys.filter((k) => k)];
      const newVals = [...specVals.filter((v) => v)];
      listing.keywords.slice(0, 3).forEach((kw) => {
        if (!newKeys.some((k) => k.toLowerCase() === `keyword ${newKeys.length + 1}`)) {
          newKeys.push(`Keyword ${newKeys.length + 1}`);
          newVals.push(kw);
        }
      });
      setSpecKeys(newKeys.length > 0 ? newKeys : [""]);
      setSpecVals(newVals.length > 0 ? newVals : [""]);
    }
    toastSuccess("Competitor data applied!");
  }, [specKeys, specVals, toastSuccess]);

  const isPriceValid = (() => {
    const parsed = parseFloat(String(price));
    return String(price).trim() !== "" && Number.isFinite(parsed) && parsed >= 0;
  })();

  const handleGenerate = async () => {
    const parsedPrice = parseFloat(String(price));
    if (!title.trim() || !description.trim() || !isPriceValid || !category.trim()) return;
    setGenerating(true);
    try {
      const specs: Record<string, string> = {};
      specKeys.forEach((k, i) => {
        if (k.trim() && specVals[i]?.trim()) specs[k.trim()] = specVals[i].trim();
      });

      const data = await authJson<ListingGenerationResponse>("/api/ai/listings/generate", {
        product: {
          title: title.trim(),
          description: description.trim(),
          price: parsedPrice,
          category: category.trim(),
          images: scrapedImages,
          specifications: specs,
          brand: scrapedBrand,
        },
        platform,
        tone,
      });
      if (data.listing) {
        setResult(data);
        setActivePanel("preview");
        toastSuccess("Listing generated successfully!");
      } else {
        toastError("Generation returned no listing — try again");
      }
    } catch (e) {
      console.error("[ProductListings] Generation failed:", e instanceof Error ? e.message : e);
      toastError(e instanceof Error ? e.message : "Failed to generate listing");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    copyToClipboard(text).then((ok) => {
      if (ok) {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      } else {
        toastError("Failed to copy to clipboard");
      }
    });
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    if (!id) return;
    try {
      await authJson(`/api/ai/listings?id=${encodeURIComponent(id)}`, undefined, "DELETE");
      toastSuccess("Listing deleted");
      mutateListings();
    } catch (e) {
      console.error("[ProductListings] Delete failed:", e instanceof Error ? e.message : e);
      toastError(e instanceof Error ? e.message : "Failed to delete listing");
    }
  };

  const addSpec = () => { setSpecKeys([...specKeys, ""]); setSpecVals([...specVals, ""]); };
  const removeSpec = (i: number) => { setSpecKeys(specKeys.filter((_, idx) => idx !== i)); setSpecVals(specVals.filter((_, idx) => idx !== i)); };

  const isFormValid = Boolean(title.trim() && description.trim() && isPriceValid && category.trim());

  return (
    <div className="max-w-7xl mx-auto space-y-4 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">AI Listing Generator</h1>
            <span className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-[10px] font-bold flex items-center gap-1">
              <Zap className="h-3 w-3" /> 20X
            </span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">Generate platform-optimized listings with competitor intelligence, market insights, and live preview.</p>
        </div>

        {hasProductContext && (
          <div className="glass rounded-xl p-3 border border-accent/10 bg-accent/5 flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
              <Package className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-muted-foreground">Generating listing for</p>
              <p className="text-xs font-semibold text-foreground truncate max-w-[200px]">{title || "Untitled"}</p>
            </div>
          </div>
        )}

        <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
          {(["generate", "saved"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all ${activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - Input Form */}
          <div className="lg:col-span-5 space-y-4">
            {/* URL Import Toggle */}
            <button
              onClick={() => setShowUrlImporter(!showUrlImporter)}
              className="w-full glass rounded-xl px-4 py-2.5 flex items-center justify-between hover:border-accent/20 transition-all"
            >
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-accent" />
                <span className="text-xs font-medium text-foreground">Import from URL</span>
              </div>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showUrlImporter ? "rotate-180" : ""}`} />
            </button>

            {showUrlImporter && (
              <URLImporter onImport={handleUrlImport} />
            )}

            {/* Main Form */}
            <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-accent" />
                <h3 className="font-display text-sm font-semibold text-foreground">Product Details</h3>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Platform</label>
                <div className="flex flex-wrap gap-1.5">
                  {PLATFORMS.map((p) => (
                    <button key={p.id} onClick={() => setPlatform(p.id)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${platform === p.id ? "bg-accent text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                      {p.icon} {p.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Tone</label>
                <div className="flex flex-wrap gap-1.5">
                  {TONES.map((t) => (
                    <button key={t} onClick={() => setTone(t)} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold capitalize transition-all ${tone === t ? "bg-accent text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Product Title</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Wireless Bluetooth Earbuds" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
                {title.length > 0 && (
                  <p className={`text-[9px] mt-1 ${title.length > 200 ? "text-red-400" : "text-muted-foreground"}`}>
                    {title.length}/200 characters
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product description..." rows={3} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40 resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Price ($)</label>
                  <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="29.99" type="number" step="0.01" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Category</label>
                  <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Electronics" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-muted-foreground">Specifications</label>
                  <button onClick={addSpec} className="text-[10px] text-accent hover:text-accent/80">+ Add</button>
                </div>
                {specKeys.map((k, i) => (
                  <div key={i} className="flex gap-2 mb-1.5">
                    <input value={k} onChange={(e) => { const n = [...specKeys]; n[i] = e.target.value; setSpecKeys(n); }} placeholder="Key" className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface border border-border text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
                    <input value={specVals[i] || ""} onChange={(e) => { const n = [...specVals]; n[i] = e.target.value; setSpecVals(n); }} placeholder="Value" className="flex-1 px-2.5 py-1.5 rounded-lg bg-surface border border-border text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
                    {specKeys.length > 1 && <button onClick={() => removeSpec(i)} className="text-red-400 text-[10px] px-1">x</button>}
                  </div>
                ))}
              </div>

              <button onClick={handleGenerate} disabled={generating || !isFormValid} className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {generating ? "Generating Listing..." : "Generate Optimized Listing"}
              </button>
            </div>

            {/* Smart Autofill */}
            <SmartAutofill
              title={title}
              description={description}
              price={price}
              category={category}
              onSuggestion={handleAutofill}
            />
          </div>

          {/* Right Column - Intelligence & Preview */}
          <div className="lg:col-span-7 space-y-4">
            {/* Panel Tabs */}
            <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
              {[
                { id: "competitors" as const, label: "Competitors", icon: Search },
                { id: "insights" as const, label: "Market", icon: FileText },
                { id: "preview" as const, label: "Preview", icon: Eye },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActivePanel(id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all ${
                    activePanel === id ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {/* Competitor Panel */}
            {activePanel === "competitors" && (
              <CompetitorPanel
                keyword={title || category}
                platform={platform}
                onSelectListing={handleSelectCompetitor}
                onIntelligenceLoaded={setCompetitorIntel}
              />
            )}

            {/* Market Insights */}
            {activePanel === "insights" && (
              competitorIntel ? (
                <MarketInsightsPanel insights={competitorIntel.marketInsights} />
              ) : (
                <div className="glass rounded-2xl p-12 text-center">
                  <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-1">No market insights yet</p>
                  <p className="text-[10px] text-muted-foreground mb-4">
                    Run competitor analysis to see real pricing, ratings, and keyword data for your niche
                  </p>
                  <button
                    onClick={() => setActivePanel("competitors")}
                    className="px-4 py-2 rounded-xl bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-all"
                  >
                    Analyze Competitors
                  </button>
                </div>
              )
            )}

            {/* Generated Result / Preview */}
            {activePanel === "preview" && result?.listing && (
              <ListingPreview
                listing={result.listing}
                platform={platform}
                price={parseFloat(price) || 0}
                images={scrapedImages}
                brand={scrapedBrand}
                specifications={specKeys.reduce((acc, k, i) => {
                  if (k.trim() && specVals[i]?.trim()) acc[k.trim()] = specVals[i].trim();
                  return acc;
                }, {} as Record<string, string>)}
              />
            )}

            {activePanel === "preview" && !result && (
              <div className="glass rounded-2xl p-12 text-center">
                <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground mb-1">Live Preview</p>
                <p className="text-[10px] text-muted-foreground">Generate a listing to see how it looks on {platform}</p>
              </div>
            )}

            {/* Quick Result Summary (when on other tabs) */}
            {result?.listing && activePanel !== "preview" && (
              <button
                onClick={() => setActivePanel("preview")}
                className="w-full glass rounded-xl p-3 flex items-center justify-between hover:border-accent/20 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${result.listing.optimizationScore >= 80 ? "bg-emerald-400/10" : "bg-amber-400/10"}`}>
                    <Check className={`h-5 w-5 ${result.listing.optimizationScore >= 80 ? "text-emerald-400" : "text-amber-400"}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-foreground">Listing Generated!</p>
                    <p className="text-[10px] text-muted-foreground">{result.listing.optimizationScore}% optimized · Click to preview</p>
                  </div>
                </div>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            {/* Generated Listing Detail (when on other tabs) */}
            {result?.listing && activePanel !== "preview" && (
              <div className="glass rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-sm font-semibold text-foreground">Generated Listing</h3>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${result.listing.optimizationScore >= 80 ? "bg-emerald-400/10 text-emerald-400" : result.listing.optimizationScore >= 50 ? "bg-amber-400/10 text-amber-400" : "bg-red-400/10 text-red-400"}`}>
                    {result.listing.optimizationScore}% optimized
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-muted-foreground">Title ({result.listing.characterCounts.title} chars)</label>
                    <button onClick={() => handleCopy(result.listing.title, "title")} className="p-1 rounded hover:bg-surface-hover">
                      {copiedField === "title" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                    </button>
                  </div>
                  <p className="text-sm text-foreground bg-surface rounded-lg p-2.5">{result.listing.title}</p>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-muted-foreground">Description ({result.listing.characterCounts.description} chars)</label>
                    <button onClick={() => handleCopy(result.listing.description, "desc")} className="p-1 rounded hover:bg-surface-hover">
                      {copiedField === "desc" ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                    </button>
                  </div>
                  <p className="text-xs text-foreground bg-surface rounded-lg p-2.5 whitespace-pre-line">{result.listing.description}</p>
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">Bullet Points</label>
                  <div className="space-y-1">
                    {result.listing.bulletPoints.map((bp: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-foreground bg-surface rounded-lg p-2">
                        <span className="text-accent mt-0.5">•</span>
                        <span className="flex-1">{bp}</span>
                        <button onClick={() => handleCopy(bp, `bp-${i}`)} className="p-0.5 rounded hover:bg-surface-hover shrink-0">
                          {copiedField === `bp-${i}` ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted-foreground mb-1 block">SEO Tags</label>
                  <div className="flex flex-wrap gap-1">
                    {result.listing.seoTags.map((tag: string, i: number) => (
                      <span key={i} className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-[9px] font-semibold">{tag}</span>
                    ))}
                  </div>
                </div>

                {result.listing.backendKeywords && (
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Backend Keywords</label>
                    <p className="text-[10px] text-muted-foreground bg-surface rounded-lg p-2">{result.listing.backendKeywords.join(", ")}</p>
                  </div>
                )}

                {result.listing.storyDescription && (
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Story Description</label>
                    <p className="text-[10px] text-muted-foreground bg-surface rounded-lg p-2 whitespace-pre-line">{result.listing.storyDescription}</p>
                  </div>
                )}

                {result.keywordSuggestions?.length > 0 && (
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block">Keyword Suggestions</label>
                    <div className="space-y-1">
                      {result.keywordSuggestions.map((kw: { keyword: string; volume: string; competition: string }, i: number) => (
                        <div key={i} className="flex items-center justify-between text-[10px] bg-surface rounded-lg px-2.5 py-1.5">
                          <span className="text-foreground">{kw.keyword}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">{kw.volume}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-semibold ${kw.competition === "low" ? "bg-emerald-400/10 text-emerald-400" : kw.competition === "medium" ? "bg-amber-400/10 text-amber-400" : "bg-red-400/10 text-red-400"}`}>
                              {kw.competition}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {!result && activePanel === "preview" && (
              <div className="glass rounded-2xl p-12 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Enter product details and click Generate to create an optimized listing</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "saved" && (
        <div className="space-y-4">
          {stats && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
              <div className="glass rounded-xl p-3"><p className="text-lg font-bold text-foreground">{stats.totalGenerated}</p><p className="text-[10px] text-muted-foreground">Total Generated</p></div>
              <div className="glass rounded-xl p-3"><p className="text-lg font-bold text-foreground">{Object.keys(stats.byPlatform || {}).length}</p><p className="text-[10px] text-muted-foreground">Platforms Used</p></div>
              <div className="glass rounded-xl p-3"><p className="text-lg font-bold text-foreground">{stats.avgOptimizationScore}%</p><p className="text-[10px] text-muted-foreground">Avg Score</p></div>
              <div className="glass rounded-xl p-3"><p className="text-lg font-bold text-foreground">{listings.length}</p><p className="text-[10px] text-muted-foreground">Saved Listings</p></div>
            </div>
          )}

          {listingsLoading ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Loader2 className="h-8 w-8 text-muted-foreground mx-auto mb-3 animate-spin" />
              <p className="text-sm text-muted-foreground">Loading your saved listings…</p>
            </div>
          ) : listingsError ? (
            <div className="glass rounded-2xl p-12 text-center">
              <p className="text-sm text-muted-foreground mb-1">Couldn&apos;t load your saved listings.</p>
              <p className="text-[10px] text-muted-foreground mb-4">Check your connection and try again.</p>
              <button
                onClick={() => mutateListings()}
                className="px-4 py-2 rounded-xl bg-surface border border-border text-xs font-semibold text-foreground hover:bg-surface-hover transition-all"
              >
                Retry
              </button>
            </div>
          ) : listings.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No saved listings yet. Generate your first listing!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {listings.map((l) => (
                <div key={l.id} className="glass rounded-xl p-4 space-y-2 hover:border-accent/20 transition-all">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold text-accent uppercase">{l.platform}</span>
                    <div className="flex items-center gap-1">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${l.optimizationScore >= 80 ? "bg-emerald-400/10 text-emerald-400" : "bg-amber-400/10 text-amber-400"}`}>{l.optimizationScore}%</span>
                      <button onClick={() => handleDelete(l.id)} aria-label={`Delete saved listing ${l.title}`} title="Delete listing" className="p-1 rounded hover:bg-surface-hover"><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
                    </div>
                  </div>
                  <h4 className="text-sm font-medium text-foreground line-clamp-2">{l.title}</h4>
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{l.description?.slice(0, 120)}...</p>
                  <div className="flex flex-wrap gap-1">
                    {l.seoTags?.slice(0, 3).map((tag: string, i: number) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-accent/10 text-accent text-[8px]">{tag}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDeleteId}
        title="Delete saved listing?"
        description="This permanently removes the listing from your saved library. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}
