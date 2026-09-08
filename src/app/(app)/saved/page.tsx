"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Heart, Trash2, Package, ArrowLeft, Sparkles } from "lucide-react";
import { useSavedProducts, type SavedProduct } from "@/components/saved/SavedProductsProvider";
import SavedStatsBar from "@/components/saved/SavedStatsBar";
import SavedToolbar, { type SortOption } from "@/components/saved/SavedToolbar";
import SavedAIBar from "@/components/saved/SavedAIBar";
import SavedProductCard from "@/components/saved/SavedProductCard";
import SavedBulkBar from "@/components/saved/SavedBulkBar";
import SavedAIResults, { type AIResult } from "@/components/saved/SavedAIResults";
import SavedChatSidebar from "@/components/saved/SavedChatSidebar";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { safeFetch } from "@/lib/safe-fetch";

export default function SavedPage() {
  const router = useRouter();
  const { savedProducts, clearSaved } = useSavedProducts();

  const [confirmClear, setConfirmClear] = useState(false);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortOption>("savedAt-desc");
  const [platformFilter, setPlatformFilter] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [resultsTitle, setResultsTitle] = useState("");
  const [results, setResults] = useState<AIResult[]>([]);

  const filteredProducts = useMemo(() => {
    let list = [...savedProducts];

    if (search) {
      const q = search.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q) || p.source.toLowerCase().includes(q));
    }

    if (platformFilter.length > 0) {
      list = list.filter((p) => platformFilter.includes(p.source));
    }

    switch (sort) {
      case "savedAt-desc":
        list.sort((a, b) => b.savedAt - a.savedAt);
        break;
      case "savedAt-asc":
        list.sort((a, b) => a.savedAt - b.savedAt);
        break;
      case "price-desc":
        list.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
        break;
      case "price-asc":
        list.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity));
        break;
      case "rating-desc":
        list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
        break;
      case "rating-asc":
        list.sort((a, b) => (a.rating ?? Infinity) - (b.rating ?? Infinity));
        break;
      case "platform":
        list.sort((a, b) => a.source.localeCompare(b.source));
        break;
    }

    return list;
  }, [savedProducts, search, sort, platformFilter]);

  const executeAITool = useCallback(async (toolId: string, input: Record<string, unknown>): Promise<AIResult> => {
    try {
      const res = await safeFetch<{ success: boolean; summary?: string; data?: unknown; error?: string }>(
        "/api/ai/execute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: toolId, input }),
        }
      );
      return { tool: toolId, success: res.success, summary: res.summary || (res.success ? "Done" : "Failed"), data: res.data, error: res.error };
    } catch (e) {
      return { tool: toolId, success: false, summary: "Execution failed", error: String(e) };
    }
  }, []);

  const handleBulkAction = useCallback(async (action: string) => {
    setAiLoading(action);

    const actionMap: Record<string, { title: string; toolId: string; inputFn: (p: SavedProduct) => Record<string, unknown> }> = {
      "push-to-store": {
        title: "Push to Store",
        toolId: "push_to_store",
        inputFn: (p) => ({ productId: p.id, title: p.title }),
      },
      "calculate-margins": {
        title: "Calculate Margins",
        toolId: "calculate_cogs",
        inputFn: (p) => ({ productId: p.id, price: p.price ?? 0 }),
      },
      "generate-listings": {
        title: "Generate Listings",
        toolId: "generate_listing",
        inputFn: (p) => ({ productId: p.id, title: p.title, platform: p.source }),
      },
      "compare-suppliers": {
        title: "Compare Suppliers",
        toolId: "compare_suppliers",
        inputFn: (p) => ({ productId: p.id, title: p.title }),
      },
    };

    const config = actionMap[action];
    if (!config) { setAiLoading(null); return; }

    setResultsTitle(config.title);
    setResults([]);
    setResultsOpen(true);

    const batchResults: AIResult[] = [];
    for (const product of filteredProducts) {
      const result = await executeAITool(config.toolId, config.inputFn(product));
      batchResults.push({ ...result, summary: `${product.title}: ${result.summary}` });
      setResults([...batchResults]);
    }

    setAiLoading(null);
  }, [filteredProducts, executeAITool]);

  const handleAIBarAction = useCallback(async (action: string) => {
    setAiLoading(action);

    const actionConfig: Record<string, { title: string; toolId: string }> = {
      "analyze-all": { title: "Analyze All Products", toolId: "analyze_product" },
      "find-similar": { title: "Find Similar Products", toolId: "find_similar_products" },
      "optimize-pricing": { title: "Optimize Pricing", toolId: "optimize_pricing" },
      "generate-listings": { title: "Generate Listings", toolId: "generate_listing" },
    };

    const config = actionConfig[action];
    if (!config) { setAiLoading(null); return; }

    setResultsTitle(config.title);
    setResults([]);
    setResultsOpen(true);

    const batchResults: AIResult[] = [];
    for (const product of filteredProducts.slice(0, 10)) {
      const result = await executeAITool(config.toolId, { productId: product.id, title: product.title, price: product.price ?? 0 });
      batchResults.push({ ...result, summary: `${product.title}: ${result.summary}` });
      setResults([...batchResults]);
    }

    setAiLoading(null);
  }, [filteredProducts, executeAITool]);

  const handleCardAIAction = useCallback(async (action: string, product: SavedProduct) => {
    const toolMap: Record<string, { toolId: string; input: Record<string, unknown> }> = {
      analyze: { toolId: "analyze_product", input: { productId: product.id, title: product.title } },
      similar: { toolId: "find_similar_products", input: { productId: product.id, title: product.title } },
      listing: { toolId: "generate_listing", input: { productId: product.id, title: product.title, platform: product.source } },
      profit: { toolId: "calculate_cogs", input: { productId: product.id, price: product.price ?? 0 } },
      suppliers: { toolId: "compare_suppliers", input: { productId: product.id, title: product.title } },
      ask: {
        toolId: "__chat",
        input: { prompt: `Tell me about "${product.title}" from ${product.source}. Price: $${product.price?.toFixed(2) ?? "N/A"}. Rating: ${product.rating ?? "N/A"}. What should I know about this product?` },
      },
    };

    const config = toolMap[action];
    if (!config) return;

    if (config.toolId === "__chat") {
      router.push(`/ai?q=${encodeURIComponent(config.input.prompt as string)}`);
      return;
    }

    setResultsTitle(`${action.charAt(0).toUpperCase() + action.slice(1)} — ${product.title}`);
    setResults([]);
    setResultsOpen(true);

    const result = await executeAITool(config.toolId, config.input);
    setResults([{ ...result, summary: `${product.title}: ${result.summary}` }]);
  }, [executeAITool, router]);

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-1 flex items-center gap-3">
            <Heart className="h-7 w-7 text-accent fill-current" /> Saved Products
          </h1>
          <p className="text-muted-foreground text-sm">
            {savedProducts.length === 0
              ? "Products you save will appear here for later viewing."
              : `${savedProducts.length} saved product${savedProducts.length === 1 ? "" : "s"} — powered by AI`}
          </p>
        </div>
        {savedProducts.length > 0 && (
          <button
            onClick={() => setConfirmClear(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-red-400 hover:border-red-400/30 transition-all"
          >
            <Trash2 className="h-3.5 w-3.5" /> Clear all
          </button>
        )}
      </div>

      {savedProducts.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center">
          <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-5">
            <Package className="h-10 w-10 text-accent/40" />
          </div>
          <h3 className="font-display text-xl font-bold text-foreground mb-2">No saved products yet</h3>
          <p className="text-sm text-muted-foreground mb-3 max-w-md mx-auto">
            Tap the heart on any product card to save it here. Once saved, you can analyze, optimize, and manage them with AI.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/60 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-accent/40" />
            <span>AI-powered analysis, pricing optimization, and bulk actions</span>
          </div>
          <button
            onClick={() => router.push("/products")}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white text-sm font-medium hover:bg-accent-hover transition-all"
          >
            <ArrowLeft className="h-4 w-4" /> Find Products
          </button>
        </div>
      ) : (
        <>
          <SavedStatsBar />
          <SavedAIBar onAction={handleAIBarAction} loading={aiLoading} productCount={savedProducts.length} />
          <SavedToolbar
            search={search}
            setSearch={setSearch}
            sort={sort}
            setSort={setSort}
            platformFilter={platformFilter}
            setPlatformFilter={setPlatformFilter}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          {filteredProducts.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground/25 mx-auto mb-4" />
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">No matching products</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((p) => (
                <SavedProductCard key={p.id} product={p} viewMode="grid" onAIAction={handleCardAIAction} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((p) => (
                <SavedProductCard key={p.id} product={p} viewMode="list" onAIAction={handleCardAIAction} />
              ))}
            </div>
          )}
        </>
      )}

      <SavedBulkBar onBulkAction={handleBulkAction} loading={aiLoading} />
      <SavedChatSidebar />

      <SavedAIResults
        open={resultsOpen}
        onClose={() => setResultsOpen(false)}
        title={resultsTitle}
        results={results}
        loading={!!aiLoading}
      />

      <ConfirmDialog
        open={confirmClear}
        title="Clear all saved products?"
        description={`This will remove all ${savedProducts.length} saved products. This cannot be undone.`}
        confirmLabel="Clear All"
        danger
        onConfirm={() => { clearSaved(); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
