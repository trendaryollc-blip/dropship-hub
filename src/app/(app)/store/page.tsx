"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import {
  Settings, Loader2, Package, Store as StoreIcon, Link2,
} from "lucide-react";
import ConnectedStoresList, { type ConnectedStore } from "@/components/stores/ConnectedStoresList";
import PushedProductsList, { type PushedProduct } from "@/components/stores/PushedProductsList";
import StoreCuratedTab from "@/components/stores/StoreCuratedTab";
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

  const handleDisconnect = async (storeId: string) => {
    if (!user) return;
    setDisconnectTarget(storeId);
  };

  const confirmDisconnect = async () => {
    if (!user || !disconnectTarget) return;
    try {
      await safeFetch(`/api/store/connections?uid=${user.uid}&storeId=${disconnectTarget}`, { method: "DELETE" });
      refetchConnections();
    } catch { /* ignore */ }
    setDisconnectTarget(null);
  };

  const handleSync = async (store: ConnectedStore) => {
    if (!user || store.platform !== "trendaryo") return;
    setSyncing(store.id);
    try {
      await safeFetch("/api/store/trendaryo", { method: "GET" });
      refetchConnections();
    } catch { /* ignore */ }
    setSyncing(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-5 w-5 text-accent animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Settings className="h-7 w-7 text-accent" /> My Stores
          </h1>
          <p className="text-muted-foreground">
            Connect your stores to push products directly from DropShip Hub
          </p>
        </div>
        {connections.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-400/10 border border-emerald-400/20">
            <StoreIcon className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">
              {connections.length} store{connections.length !== 1 ? "s" : ""} connected
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border max-w-md">
        <button
          onClick={() => setActiveTab("stores")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "stores"
              ? "bg-accent text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          <Link2 className="h-3.5 w-3.5" />
          Connected Stores
        </button>
        <button
          onClick={() => setActiveTab("products")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeTab === "products"
              ? "bg-accent text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          }`}
        >
          <Package className="h-3.5 w-3.5" />
          Pushed Products ({pushedProducts.length})
        </button>
      </div>

      {/* ═══ Tab: Stores ═══ */}
      {activeTab === "stores" && (
        <>
          {/* Connected Stores */}
          {connections.length > 0 && (
            <div>
              <h2 className="font-display text-lg font-semibold text-foreground mb-4">Your Connected Stores</h2>
              <ConnectedStoresList
                stores={connections}
                syncing={syncing}
                onRefresh={refetchConnections}
                onSync={handleSync}
                onDisconnect={handleDisconnect}
              />
            </div>
          )}

          {/* Curated Store Catalog */}
          <StoreCuratedTab onConnected={refetchConnections} />
        </>
      )}

      {/* ═══ Tab: Products ═══ */}
      {activeTab === "products" && (
        <PushedProductsList products={pushedProducts} />
      )}
      <ConfirmDialog
        open={!!disconnectTarget}
        title="Disconnect this store?"
        description="This will remove the store connection. You can reconnect it later."
        confirmLabel="Disconnect"
        danger
        onConfirm={confirmDisconnect}
        onCancel={() => setDisconnectTarget(null)}
      />
    </div>
  );
}
