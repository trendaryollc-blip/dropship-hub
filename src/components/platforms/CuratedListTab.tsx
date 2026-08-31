"use client";

import { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { PLATFORM_CATALOG, CATALOG_METHOD_LABELS, type CatalogPlatform } from "@/lib/platform-catalog";
import { Loader2, Key, Globe, ExternalLink } from "lucide-react";
import { safeFetch } from "@/lib/safe-fetch";

interface Props {
  onCreated: () => void;
}

export default function CuratedListTab({ onCreated }: Props) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"all" | "Dropshipping" | "Marketplace" | "Search Supplier">("all");
  const [connecting, setConnecting] = useState<string | null>(null);
  const [result, setResult] = useState<{ id: string; ok: boolean; msg: string } | null>(null);

  const filtered = filter === "all"
    ? PLATFORM_CATALOG
    : PLATFORM_CATALOG.filter((p) => p.category === filter);

  const handleConnect = async (catalog: CatalogPlatform) => {
    if (!user) return;
    setConnecting(catalog.id);
    setResult(null);
    try {
      const token = await user.getIdToken();
      // Check if the platform already exists in Firestore
      const data = await safeFetch<{ platforms?: { id: string }[] }>("/api/platforms/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const platforms: { id: string }[] = data.platforms || [];
      const exists = platforms.find((p) => p.id === catalog.id);

      if (exists) {
        setResult({ id: catalog.id, ok: true, msg: `${catalog.name} is already connected. Go to the Platforms tab to manage its API keys.` });
        return;
      }

      await safeFetch("/api/platforms/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: catalog.name,
          slug: catalog.id,
          method: catalog.method,
          enabled: false,
        }),
      });
      setResult({ id: catalog.id, ok: true, msg: `${catalog.name} connected! Go to the Platforms tab to add an API key and enable it.` });
      onCreated();
    } catch {
      setResult({ id: catalog.id, ok: false, msg: "Network error — try again." });
    } finally {
      setConnecting(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground mb-1">Curated Platforms</h2>
        <p className="text-sm text-muted-foreground">
          Pick a platform from the list below. One click creates it in your platform list — then add an API key in the Platforms tab and enable it.
        </p>
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "Dropshipping", "Marketplace", "Search Supplier"] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === cat
                ? "bg-accent text-white"
                : "bg-surface border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat === "all" ? "All" : cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((catalog) => (
          <div
            key={catalog.id}
            className="glass rounded-xl border border-border p-4 flex flex-col justify-between hover:border-accent/30 transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground text-sm">{catalog.name}</h3>
                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-surface border border-border text-muted-foreground uppercase">
                  {CATALOG_METHOD_LABELS[catalog.method]}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mb-2 leading-relaxed">{catalog.description}</p>
              <div className="flex items-center gap-1.5 mb-1">
                <Key className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] text-muted-foreground">{catalog.keyHint}</span>
              </div>
              <a
                href={catalog.keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover transition-colors mb-3"
              >
                Get API Key <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>

            <button
              onClick={() => handleConnect(catalog)}
              disabled={connecting === catalog.id}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
            >
              {connecting === catalog.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Globe className="h-3 w-3" />
              )}
              {connecting === catalog.id ? "Adding..." : "Connect"}
            </button>
          </div>
        ))}
      </div>

      {result && (
        <div className={`p-4 rounded-xl border ${result.ok ? "bg-emerald-400/5 border-emerald-400/20" : "bg-red-400/5 border-red-400/20"}`}>
          <p className={`text-sm font-medium ${result.ok ? "text-emerald-400" : "text-red-400"}`}>{result.msg}</p>
        </div>
      )}
    </div>
  );
}
