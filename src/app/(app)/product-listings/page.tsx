"use client";

import { useState } from "react";
import { FileText, Copy, Check, Trash2, Loader2, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import type { PlatformType, ListingGenerationResponse, SavedListing, ListingStats } from "@/types/product-listing";

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
  const { error: toastError } = useToast();
  const uid = user?.uid || "";

  const { data: listingsData, mutate: mutateListings } = useAPI<{ listings?: SavedListing[] }>(uid ? `/api/ai/listings?uid=${uid}` : null);
  const { data: statsData } = useAPI<{ stats?: ListingStats }>(uid ? `/api/ai/listings?type=stats&uid=${uid}` : null);

  const [platform, setPlatform] = useState<PlatformType>("amazon");
  const [tone, setTone] = useState<string>("professional");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("");
  const [specKeys, setSpecKeys] = useState<string[]>([""]);
  const [specVals, setSpecVals] = useState<string[]>([""]);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<ListingGenerationResponse | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"generate" | "saved">("generate");

  const listings = listingsData?.listings || [];
  const stats = statsData?.stats || null;

  const handleGenerate = async () => {
    if (!title.trim() || !description.trim() || !price || !category.trim()) return;
    setGenerating(true);
    try {
      const specs: Record<string, string> = {};
      specKeys.forEach((k, i) => {
        if (k.trim() && specVals[i]?.trim()) specs[k.trim()] = specVals[i].trim();
      });

      const res = await fetch("/api/ai/listings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product: {
            title: title.trim(),
            description: description.trim(),
            price: parseFloat(price) || 0,
            category: category.trim(),
            images: [],
            specifications: specs,
          },
          platform,
          tone,
        }),
      });
      const data = await res.json();
      if (data.listing) setResult(data);
    } catch (e) {
      console.error("[ProductListings] Generation failed:", e instanceof Error ? e.message : e);
      toastError("Failed to generate listing");
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }).catch(() => {
      toastError("Failed to copy to clipboard");
    });
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/ai/listings?id=${id}`, { method: "DELETE" });
      mutateListings();
    } catch (e) {
      console.error("[ProductListings] Delete failed:", e instanceof Error ? e.message : e);
      toastError("Failed to delete listing");
    }
  };

  const addSpec = () => { setSpecKeys([...specKeys, ""]); setSpecVals([...specVals, ""]); };
  const removeSpec = (i: number) => { setSpecKeys(specKeys.filter((_, idx) => idx !== i)); setSpecVals(specVals.filter((_, idx) => idx !== i)); };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">AI Listing Generator</h1>
            <span className="px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-[10px] font-bold">AI POWERED</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">Generate platform-optimized product listings with AI. Titles, descriptions, bullet points, and SEO tags.</p>
        </div>
        <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
          {(["generate", "saved"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-all ${activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}>
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "generate" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
            <h3 className="font-display text-sm font-semibold text-foreground">Product Details</h3>

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

            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Product title" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />

            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Product description" rows={3} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40 resize-none" />

            <div className="grid grid-cols-2 gap-3">
              <input value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price ($)" type="number" step="0.01" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Category" className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
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
                  {specKeys.length > 1 && <button onClick={() => removeSpec(i)} className="text-red-400 text-[10px]">x</button>}
                </div>
              ))}
            </div>

            <button onClick={handleGenerate} disabled={generating || !title.trim() || !description.trim() || !price || !category.trim()} className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Generating..." : "Generate Listing"}
            </button>
          </div>

          <div className="space-y-4">
            {result?.listing && (
              <div className="glass rounded-2xl p-4 sm:p-5 space-y-4">
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

            {!result && (
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

          {listings.length === 0 ? (
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
                      <button onClick={() => handleDelete(l.id)} className="p-1 rounded hover:bg-surface-hover"><Trash2 className="h-3 w-3 text-muted-foreground" /></button>
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
    </div>
  );
}
