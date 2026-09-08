"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import {
  Settings, Loader2, Package, Store as StoreIcon, Link2, Sparkles,
} from "lucide-react";
import ConnectedStoresList, { type ConnectedStore } from "@/components/stores/ConnectedStoresList";
import PushedProductsList, { type PushedProduct } from "@/components/stores/PushedProductsList";
import StoreCuratedTab from "@/components/stores/StoreCuratedTab";
import StoreStatsBar from "@/components/stores/StoreStatsBar";
import StoreAIBar from "@/components/stores/StoreAIBar";
import StoreHealthPanel from "@/components/stores/StoreHealthPanel";
import StoreChatSidebar from "@/components/stores/StoreChatSidebar";
import { safeFetch } from "@/lib/safe-fetch";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function StorePage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const { data: connData, mutate: refetchConnections } = useAPI<{ connections?: ConnectedStore[] }>(uid ? `/api/store/connections?uid=${uid}` : null);
  const { data: pushData, mutate: refetchPushed } = useAPI<{ products?: PushedProduct[] }>(uid ? `/api/store/push?uid=${uid}` : null);
  const connections = connData?.connections || [];
  const pushedProducts = pushData?.products || [];
  const loading = !user || (!connData && !pushData);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stores" | "products">("stores");
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const handleDisconnect = async (storeId: string) => { setDisconnectTarget(storeId); };

  const confirmDisconnect = async () => {
    if (!user || !disconnectTarget) return;
    try { await safeFetch(`/api/store/connections?uid=${user.uid}&storeId=${disconnectTarget}`, { method: "DELETE" }); refetchConnections(); } catch { /* ignore */ }
    setDisconnectTarget(null);
  };

  const handleSync = async (store: ConnectedStore) => {
    if (!user || store.platform !== "trendaryo") return;
    setSyncing(store.id);
    try { await safeFetch("/api/store/trendaryo", { method: "GET" }); refetchConnections(); } catch { /* ignore */ }
    setSyncing(null);
  };

  const executeAITool = useCallback(async (toolId: string, input: Record<string, unknown>) => {
    try {
      return await safeFetch<{ success: boolean; summary?: string; data?: unknown; error?: string }>(
        "/api/ai/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: toolId, input }) }
      );
    } catch { return { success: false, summary: "Failed" }; }
  }, []);

  const handleAIBarAction = useCallback(async (action: string) => {
    setAiLoading(action);
    const configs: Record<string, { toolId: string; input: Record<string, unknown> }> = {
      "sync-inventory": { toolId: "sync_inventory", input: {} },
      "store-performance": { toolId: "get_store_performance", input: {} },
      "bulk-push": { toolId: "push_bulk_to_store", input: { productIds: [] } },
      "optimize-listings": { toolId: "generate_listing", input: {} },
    };
    const config = configs[action];
    if (config) await executeAITool(config.toolId, config.input);
    setAiLoading(null);
  }, [executeAITool]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-5 w-5 text-accent animate-spin" /></div>;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-5 pb-24">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Settings className="h-7 w-7 text-accent" /> My Stores
          </h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            Connect your stores to push products directly
            {connections.length > 0 && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-400/10 border border-emerald-400/20 text-xs font-medium text-emerald-400">
                <StoreIcon className="h-3 w-3" /> {connections.length} connected
              </span>
            )}
          </p>
        </div>
      </div>

      <StoreStatsBar connections={connections} pushedProducts={pushedProducts} />
      <StoreAIBar onAction={handleAIBarAction} loading={aiLoading} storeCount={connections.length} />

      <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border max-w-md">
        <button onClick={() => setActiveTab("stores")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "stores" ? "bg-accent text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}>
          <Link2 className="h-3.5 w-3.5" /> Connected Stores
        </button>
        <button onClick={() => setActiveTab("products")} className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "products" ? "bg-accent text-white shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/50"}`}>
          <Package className="h-3.5 w-3.5" /> Pushed Products ({pushedProducts.length})
        </button>
      </div>

      {activeTab === "stores" && (
        <div className="space-y-5">
          {connections.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">Your Connected Stores</h2>
              <ConnectedStoresList stores={connections} syncing={syncing} onRefresh={refetchConnections} onSync={handleSync} onDisconnect={handleDisconnect} />
            </div>
          )}
          <StoreHealthPanel connections={connections} />
          <StoreCuratedTab onConnected={refetchConnections} />
        </div>
      )}

      {activeTab === "products" && <PushedProductsList products={pushedProducts} />}

      <StoreChatSidebar connections={connections} pushedProducts={pushedProducts} />
      <ConfirmDialog open={!!disconnectTarget} title="Disconnect this store?" description="This will remove the store connection. You can reconnect it later." confirmLabel="Disconnect" danger onConfirm={confirmDisconnect} onCancel={() => setDisconnectTarget(null)} />
    </div>
  );
}
