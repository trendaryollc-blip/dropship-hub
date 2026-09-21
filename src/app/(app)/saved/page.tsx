"use client";

import { useState, useMemo, useCallback, useRef } from "react";
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
import { auth } from "@/lib/firebase";

// Every /api/ai/* route is behind withAuth — requests must carry the caller's
// Firebase ID token or they get a 401.
async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    return { Authorization: `Bearer ${await user.getIdToken()}` };
  } catch {
    return {};
  }
}

interface StoreConnectionLite {
  id: string;
  platform: string;
  name?: string;
  status?: string;
}

// Bulk actions are capped so a large saved list can't fire unbounded AI tool
// calls (rate limits + cost); results stream into the modal as they complete.
const BULK_ACTION_LIMIT = 20;

// Map supplier source platforms to valid selling platforms for listing generation.
function mapSourceToPlatform(source: string): "shopify" | "amazon" | "etsy" | "ebay" | "walmart" {
  const s = source.toLowerCase();
  if (s.includes("amazon")) return "amazon";
  if (s.includes("etsy")) return "etsy";
  if (s.includes("ebay")) return "ebay";
  if (s.includes("walmart")) return "walmart";
  return "shopify";
}

// generate_listing's schema requires description (min 1) and category (min 1)
// plus http(s) image URLs. Saved records only carry title/price/source, so we
// seed the generator with what we know and let it write the actual copy.
function buildListingInput(product: SavedProduct): Record<string, unknown> {
  const input: Record<string, unknown> = {
    productId: product.id,
    title: product.title,
    description: product.title,
    price: product.price ?? 0,
    category: "General",
    platform: mapSourceToPlatform(product.source),
  };
  if (product.image && /^https?:\/\//i.test(product.image)) {
    input.images = [product.image];
  }
  return input;
}

export default function SavedPage() {
  const router = useRouter();
  const { savedProducts, clearSaved, syncError, selectedIds } = useSavedProducts();
  const resultIdCounter = useRef(0);

  // Stable id for each AI result so confirm/cancel can update the right entry.
  const nextResultId = useCallback((): string => {
    resultIdCounter.current += 1;
    return `saved-ai-${Date.now()}-${resultIdCounter.current}`;
  }, []);

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

  // AI and bulk actions honor the checkbox selection: if any product is
  // selected, act only on those; otherwise act on the whole filtered list.
  const actionTargets = useMemo(() => {
    if (selectedIds.size === 0) return filteredProducts;
    return savedProducts.filter((p) => selectedIds.has(p.id));
  }, [savedProducts, filteredProducts, selectedIds]);

  const executeAITool = useCallback(async (toolId: string, input: Record<string, unknown>): Promise<AIResult> => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await safeFetch<{ success: boolean; summary?: string; data?: unknown; error?: string; needsConfirmation?: boolean; executionId?: string }>(
        "/api/ai/execute",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ tool: toolId, input }),
        }
      );
      return {
        tool: toolId,
        id: nextResultId(),
        success: res.success,
        summary: res.summary || (res.success ? "Done" : "Failed"),
        data: res.data,
        error: res.error,
        needsConfirmation: res.needsConfirmation,
        executionId: res.executionId,
      };
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
        inputFn: (p) => buildListingInput(p),
      },
      "compare-suppliers": {
        title: "Compare Suppliers",
        toolId: "compare_suppliers",
        inputFn: (p) => ({ productId: p.id, title: p.title, price: p.price ?? 0 }),
      },
    };

    const config = actionMap[action];
    if (!config) { setAiLoading(null); return; }

    setResultsTitle(config.title);
    setResults([]);
    setResultsOpen(true);

    // push_to_store requires a concrete store connection (storeId + platform +
    // price). Resolve the first connected store once up front; if none is
    // connected, fail fast with an actionable message instead of N failures.
    let store: StoreConnectionLite | null = null;
    if (config.toolId === "push_to_store") {
      try {
        const authHeaders = await getAuthHeaders();
        const data = await safeFetch<{ connections?: StoreConnectionLite[] }>("/api/store/connections", {
          headers: authHeaders,
        });
        const connected = (data?.connections ?? []).filter((c) => c.status !== "disconnected");
        store = connected[0] ?? null;
      } catch {
        store = null;
      }
      if (!store) {
        setResults([{
          tool: "push_to_store",
          success: false,
          summary: "No store connected",
          error: "Connect a store (Shopify, WooCommerce, Etsy) under Stores first, then push your products.",
        }]);
        setAiLoading(null);
        return;
      }
    }

    const batchResults: AIResult[] = [];
    const targets = actionTargets.slice(0, BULK_ACTION_LIMIT);
    for (const product of targets) {
      const input = config.inputFn(product);
      if (config.toolId === "push_to_store" && store) {
        input.storeId = store.id;
        input.platform = store.platform;
        input.price = product.price ?? 0;
        // push_to_store's schema requires valid URLs — skip non-http images
        // (data URIs / relative paths would reject the whole push).
        if (product.image && /^https?:\/\//i.test(product.image)) input.images = [product.image];
      }
      const result = await executeAITool(config.toolId, input);
      batchResults.push({ ...result, titlePrefix: product.title });
      setResults([...batchResults]);
    }
    if (actionTargets.length > targets.length) {
      batchResults.push({
        tool: config.toolId,
        success: true,
        summary: `List truncated to the first ${BULK_ACTION_LIMIT} of ${actionTargets.length} products to respect rate limits.`,
      });
      setResults([...batchResults]);
    }

    setAiLoading(null);
  }, [actionTargets, executeAITool]);

  const handleAIBarAction = useCallback(async (action: string) => {
    setAiLoading(action);

    const actionConfig: Record<string, { title: string; toolId: string }> = {
      "analyze-all": { title: "Analyze All Products", toolId: "analyze_product" },
      "find-similar": { title: "Find Similar Products", toolId: "find_similar_products" },
      "optimize-pricing": { title: "Analyze Pricing", toolId: "analyze_product" },
      "generate-listings": { title: "Generate Listings", toolId: "generate_listing" },
    };

    const config = actionConfig[action];
    if (!config) { setAiLoading(null); return; }

    setResultsTitle(config.title);
    setResults([]);
    setResultsOpen(true);

    const batchResults: AIResult[] = [];
    for (const product of actionTargets.slice(0, 10)) {
      const input: Record<string, unknown> =
        config.toolId === "generate_listing"
          ? buildListingInput(product)
          : { productId: product.id, title: product.title, price: product.price ?? 0 };
      const result = await executeAITool(config.toolId, input);
      batchResults.push({ ...result, titlePrefix: product.title });
      setResults([...batchResults]);
    }

    setAiLoading(null);
  }, [actionTargets, executeAITool]);

  const handleCardAIAction = useCallback(async (action: string, product: SavedProduct) => {
    const toolMap: Record<string, { toolId: string; input: Record<string, unknown> }> = {
      analyze: { toolId: "analyze_product", input: { productId: product.id, title: product.title, price: product.price ?? 0 } },
      similar: { toolId: "find_similar_products", input: { productId: product.id, title: product.title } },
      listing: { toolId: "generate_listing", input: buildListingInput(product) },
      profit: { toolId: "calculate_cogs", input: { productId: product.id, price: product.price ?? 0 } },
      suppliers: { toolId: "compare_suppliers", input: { productId: product.id, title: product.title, price: product.price ?? 0 } },
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
    setResults([{ ...result, titlePrefix: product.title }]);
  }, [executeAITool, router]);

  // Approve a tool run that landed in "awaiting confirmation" state (Ask
  // Every Time / moderate+ modes). The confirmation re-executes the tool
  // server-side, so we swap the pending entry with the real result.
  const handleConfirmResult = useCallback(async (result: AIResult) => {
    if (!result.executionId) return;
    setResults((prev) => prev.map((r) => (r.id === result.id ? { ...r, confirming: true } : r)));
    try {
      const authHeaders = await getAuthHeaders();
      const res = await safeFetch<{ success?: boolean; result?: { success?: boolean; summary?: string; data?: unknown } }>(
        "/api/ai/confirm",
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ executionId: result.executionId, action: "confirm" }),
        }
      );
      setResults((prev) => prev.map((r) =>
        r.id === result.id
          ? {
              ...r,
              needsConfirmation: false,
              executionId: undefined,
              confirming: false,
              success: res?.result?.success ?? false,
              summary: res?.result?.summary ?? "Executed",
              data: res?.result?.data,
              error: res?.result?.success ? undefined : (res?.result?.summary ?? "Failed"),
            }
          : r
      ));
    } catch {
      setResults((prev) => prev.map((r) =>
        r.id === result.id
          ? { ...r, confirming: false, needsConfirmation: false, success: false, error: "Could not confirm this action" }
          : r
      ));
    }
  }, []);

  // Deny a tool run that landed in "awaiting confirmation" state.
  const handleCancelResult = useCallback(async (result: AIResult) => {
    if (!result.executionId) return;
    setResults((prev) => prev.map((r) => (r.id === result.id ? { ...r, confirming: true } : r)));
    try {
      const authHeaders = await getAuthHeaders();
      await safeFetch("/api/ai/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ executionId: result.executionId, action: "cancel" }),
      });
      setResults((prev) => prev.map((r) =>
        r.id === result.id
          ? { ...r, needsConfirmation: false, executionId: undefined, confirming: false, cancelled: true, success: false, summary: "Action cancelled by user", error: undefined }
          : r
      ));
    } catch {
      setResults((prev) => prev.map((r) =>
        r.id === result.id
          ? { ...r, confirming: false, error: "Could not cancel this action" }
          : r
      ));
    }
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-24">
      {syncError && (
        <div
          role="status"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs"
        >
          <span className="flex-1">
            Some changes couldn&apos;t sync to your account — they&apos;re saved on this device and will sync again on your next action.
          </span>
        </div>
      )}
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
          <SavedAIBar onAction={handleAIBarAction} loading={aiLoading} productCount={selectedIds.size > 0 ? actionTargets.length : savedProducts.length} />
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
        onConfirm={handleConfirmResult}
        onCancel={handleCancelResult}
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
