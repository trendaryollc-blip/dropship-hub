"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import {
  Settings, Loader2, Package, Store as StoreIcon, Link2, ArrowRight, LayoutDashboard,
} from "lucide-react";
import ConnectedStoresList, { type ConnectedStore } from "@/components/stores/ConnectedStoresList";
import { type PushedProduct } from "@/components/stores/PushedProductsList";
import StoreCuratedTab from "@/components/stores/StoreCuratedTab";
import StoreStatsBar from "@/components/stores/StoreStatsBar";
import StoreHealthPanel from "@/components/stores/StoreHealthPanel";
import GlobalStoreChat from "@/components/stores/GlobalStoreChat";
import { safeFetch } from "@/lib/safe-fetch";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function StorePage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const uid = user?.uid || "";
  const { data: connData, mutate: refetchConnections } = useAPI<{ connections?: ConnectedStore[] }>(uid ? `/api/store/connections?uid=${uid}` : null);
  const { data: pushData } = useAPI<{ products?: PushedProduct[] }>(uid ? `/api/store/push?uid=${uid}` : null);
  const connections = connData?.connections || [];
  const pushedProducts = pushData?.products || [];
  const loading = !user || (!connData && !pushData);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"stores" | "products">("stores");
  const [disconnectTarget, setDisconnectTarget] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  const handleDisconnect = (storeId: string) => { setDisconnectTarget(storeId); };

  const confirmDisconnect = async () => {
    if (!user || !disconnectTarget) return;
    setDisconnecting(true);
    try {
      const token = await user.getIdToken();
      await safeFetch(`/api/store/connections?uid=${user.uid}&storeId=${disconnectTarget}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      refetchConnections();
      success("Store disconnected successfully");
    } catch {
      toastError("Failed to disconnect store. Please try again.");
    }
    setDisconnectTarget(null);
    setDisconnecting(false);
  };

  const handleSync = async (store: ConnectedStore) => {
    if (!user || store.platform !== "trendaryo") return;
    setSyncing(store.id);
    try {
      const token = await user.getIdToken();
      const result = await safeFetch<{ error?: string; success?: boolean }>("/api/store/trendaryo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: "syncProducts", authToken: store.apiKey }),
      });
      refetchConnections();
      success("Store synced successfully");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to sync store";
      toastError(msg);
    }
    setSyncing(null);
  };

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

      {connections.length > 0 && (
        <Link
          href="/multi-store"
          className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-accent/5 to-accent/10 border border-accent/20 hover:border-accent/40 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent/10">
              <LayoutDashboard className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Go to Multi-Store Dashboard</p>
              <p className="text-xs text-muted-foreground">Manage orders, inventory, performance & bulk push across all stores</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-accent group-hover:translate-x-1 transition-all" />
        </Link>
      )}

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

      {activeTab === "products" && (
        <div className="space-y-5">
          {pushedProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold text-foreground mb-2">No products pushed yet</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Push products from the Multi-Store Dashboard or from any product page
              </p>
              <Link
                href="/multi-store"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all"
              >
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-foreground">Pushed Products</h2>
                <Link href="/multi-store" className="text-xs text-accent hover:text-accent-hover flex items-center gap-1 transition-colors">
                  Manage in Dashboard <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              {pushedProducts.map((product) => (
                <div
                  key={product.id}
                  className="glass rounded-2xl border border-border p-4 flex items-center gap-4 hover:border-accent/30 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-foreground truncate">{product.productTitle}</h4>
                    <p className="text-xs text-muted-foreground">
                      Pushed to <span className="text-accent">{product.storeName}</span> · ${product.productPrice.toFixed(2)}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                      product.status === "pushed" || product.status === "live"
                        ? "bg-emerald-400/10 text-emerald-400"
                        : "bg-red-400/10 text-red-400"
                    }`}
                  >
                    {product.status === "pushed" || product.status === "live" ? "✓ LIVE" : "⚠ ERROR"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <GlobalStoreChat connections={connections} pushedProducts={pushedProducts} />
      <ConfirmDialog
        open={!!disconnectTarget}
        title="Disconnect this store?"
        description="This will remove the store connection. You can reconnect it later."
        confirmLabel={disconnecting ? "Disconnecting..." : "Disconnect"}
        danger
        onConfirm={confirmDisconnect}
        onCancel={() => { setDisconnectTarget(null); setDisconnecting(false); }}
      />
    </div>
  );
}
