"use client";

import { useState, useEffect } from "react";
import {
  Key, Eye, EyeOff, Loader2, Globe,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";

interface PlatformKeySummary {
  id: string;
  name: string;
  method: string;
  enabled: boolean;
  lastHealth: string;
  keys: Array<{
    id: string;
    masked: string;
    label: string;
    priority: number;
    requestsUsed: number;
    requestsLimit: number;
    lastStatus: string;
  }>;
}

export default function AdminApiKeysPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [platforms, setPlatforms] = useState<PlatformKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const fetchKeys = async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const data = await safeFetch<{ platforms?: PlatformKeySummary[] }>("/api/platforms/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.platforms) {
        setPlatforms(data.platforms.map((p) => ({
          id: p.id,
          name: p.name,
          method: p.method,
          enabled: p.enabled,
          lastHealth: p.lastHealth,
          keys: p.keys,
        })));
      }
    } catch (err) {
      console.warn("[AdminApiKeys] Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchKeys(); }, [user]);

  const toggleVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId); else next.add(keyId);
      return next;
    });
  };

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    toast.success("Key copied to clipboard");
  };

  const totalKeys = platforms.reduce((sum, p) => sum + p.keys.length, 0);
  const healthyKeys = platforms.reduce((sum, p) => sum + p.keys.filter((k) => k.lastStatus === "healthy").length, 0);
  const errorKeys = platforms.reduce((sum, p) => sum + p.keys.filter((k) => k.lastStatus === "error").length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading API keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2">
          API Key Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Overview of all platform API keys across the system.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-blue-400/10 border border-blue-400/20"><Key className="h-4 w-4 text-blue-400" /></div>
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Total Keys</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalKeys}</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-emerald-400/10 border border-emerald-400/20"><Globe className="h-4 w-4 text-emerald-400" /></div>
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Healthy</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{healthyKeys}</p>
        </div>
        <div className="glass rounded-2xl p-5 border border-border">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-red-400/10 border border-red-400/20"><Eye className="h-4 w-4 text-red-400" /></div>
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest">Errors</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{errorKeys}</p>
        </div>
      </div>

      {/* Platform Key List */}
      <div className="space-y-4">
        {platforms.map((platform) => (
          <div key={platform.id} className="glass rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${
                  platform.lastHealth === "healthy" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                  : platform.lastHealth === "error" ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]"
                  : "bg-muted-foreground/40"
                }`} />
                <h3 className="font-display font-semibold text-foreground">{platform.name}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface border border-border text-muted-foreground uppercase">
                  {platform.method}
                </span>
                <span className="text-xs text-muted-foreground">{platform.keys.length} key{platform.keys.length !== 1 ? "s" : ""}</span>
              </div>
              <div>
                {platform.enabled ? (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">ENABLED</span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-muted-foreground/10 text-muted-foreground border border-border">DISABLED</span>
                )}
              </div>
            </div>
            <div className="divide-y divide-border">
              {platform.keys.length === 0 ? (
                <div className="px-6 py-8 text-center">
                  <Key className="h-6 w-6 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No keys configured</p>
                </div>
              ) : (
                platform.keys.map((key) => (
                  <div key={key.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-hover/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
                        #{key.priority}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{key.label}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            key.lastStatus === "healthy" ? "bg-emerald-400/10 text-emerald-400 border border-emerald-400/20"
                            : key.lastStatus === "error" ? "bg-red-400/10 text-red-400 border border-red-400/20"
                            : "bg-muted-foreground/10 text-muted-foreground border border-border"
                          }`}>{key.lastStatus.toUpperCase()}</span>
                        </div>
                        <span className="text-xs font-mono text-muted-foreground mt-0.5 block">{key.masked}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">{key.requestsUsed}/{key.requestsLimit}</p>
                        <p className="text-[10px] text-muted-foreground/60">requests</p>
                      </div>
                      <button onClick={() => toggleVisibility(key.id)}
                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors">
                        {visibleKeys.has(key.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {platforms.length === 0 && (
        <div className="glass rounded-2xl border border-border px-6 py-12 text-center">
          <Key className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No platforms configured yet</p>
        </div>
      )}
    </div>
  );
}
