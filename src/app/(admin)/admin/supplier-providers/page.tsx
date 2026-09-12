"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Truck, Eye, EyeOff, Loader2, Plus, Trash2, TestTube,
  RotateCcw, Settings, CheckCircle2, XCircle, GripVertical,
  ChevronDown, ChevronUp, Key, Zap, ExternalLink,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface AdminSupplierKeyEntry {
  id: string;
  key: string;
  label: string;
  priority: number;
  requestsUsed: number;
  requestsLimit: number;
  resetDate: string;
  lastError: string | null;
  lastStatus: "healthy" | "error" | "untested";
  masked: string;
}

interface ProviderData {
  keys: AdminSupplierKeyEntry[];
  configured: boolean;
}

const PROVIDERS = [
  { id: "rainforest", name: "Rainforest API", freeTier: "500 credits/mo", usedFor: "Amazon product data & search", website: "https://rainforestapi.com" },
  { id: "serpapi", name: "SerpAPI", freeTier: "250 searches/mo", usedFor: "Google Shopping & Amazon search", website: "https://serpapi.com" },
  { id: "scraperapi", name: "ScraperAPI", freeTier: "1,000 credits", usedFor: "Multi-site product scraping", website: "https://scraperapi.com" },
  { id: "serper", name: "Serper.dev", freeTier: "2,500 queries/mo", usedFor: "Google Search results", website: "https://serper.dev" },
  { id: "rapidapi", name: "RapidAPI", freeTier: "1,000 requests/mo", usedFor: "Various supplier APIs marketplace", website: "https://rapidapi.com" },
  { id: "trendsi", name: "Trendsi", freeTier: "Free plan", usedFor: "Fashion dropshipping supplier", website: "https://trendsiapp.com" },
  { id: "veridion", name: "Veridion", freeTier: "Free tier", usedFor: "Supplier discovery (186M+ companies)", website: "https://veridion.com" },
  { id: "supplierio", name: "Supplier.io", freeTier: "Demo available", usedFor: "Supplier management & data", website: "https://supplier.io" },
  { id: "salehoo", name: "SaleHoo", freeTier: "$9/mo plan", usedFor: "8,000+ vetted suppliers directory", website: "https://salehoo.com" },
  { id: "spocket", name: "Spocket", freeTier: "Free plan", usedFor: "US/EU supplier directory", website: "https://spocket.co" },
  { id: "dataforseo", name: "DataForSEO", freeTier: "$50 trial credit", usedFor: "SEO & product data APIs", website: "https://dataforseo.com" },
  { id: "ecomsource", name: "EcomSource", freeTier: "10 lookups/day", usedFor: "UPC/ASIN product data API", website: "https://ecomsource.ai" },
];

export default function AdminSupplierProvidersPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [providers, setProviders] = useState<Record<string, ProviderData>>({});
  const [loading, setLoading] = useState(true);
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const [showAddKeyFor, setShowAddKeyFor] = useState<string | null>(null);
  const [addKeyVal, setAddKeyVal] = useState("");
  const [addKeyLabel, setAddKeyLabel] = useState("");
  const [addKeyLimit, setAddKeyLimit] = useState("1000");
  const [addKeyReset, setAddKeyReset] = useState("");
  const [addingKey, setAddingKey] = useState(false);

  const [editingKey, setEditingKey] = useState<{ providerId: string; keyId: string } | null>(null);
  const [editKeyVal, setEditKeyVal] = useState("");
  const [editKeyLabel, setEditKeyLabel] = useState("");
  const [editKeyLimit, setEditKeyLimit] = useState("");
  const [editKeyReset, setEditKeyReset] = useState("");

  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const [confirmRemoveKey, setConfirmRemoveKey] = useState<{ providerId: string; keyId: string } | null>(null);

  const [draggedKey, setDraggedKey] = useState<{ providerId: string; keyId: string } | null>(null);
  const [dragOverKey, setDragOverKey] = useState<{ providerId: string; keyId: string } | null>(null);

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId); else next.add(keyId);
      return next;
    });
  };

  const fetchProviders = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const data = await safeFetch<{ providers?: Record<string, ProviderData> }>("/api/admin/supplier-keys", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.providers) setProviders(data.providers);
    } catch (err) {
      console.error("[AdminSupplierKeys] Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchProviders(); }, [fetchProviders]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  const handleAddKey = async (providerId: string) => {
    if (!addKeyVal.trim() || !user) return;
    setAddingKey(true);
    try {
      const headers = await getAuthHeaders();
      await safeFetch("/api/admin/supplier-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "add_key", provider: providerId, key: addKeyVal.trim(),
          label: addKeyLabel.trim() || "Primary", requestsLimit: parseInt(addKeyLimit) || 1000,
          resetDate: addKeyReset || undefined,
        }),
      });
      setShowAddKeyFor(null);
      setAddKeyVal(""); setAddKeyLabel(""); setAddKeyLimit("1000"); setAddKeyReset("");
      toast.success("Key added successfully");
      await fetchProviders();
    } catch {
      toast.error("Failed to add key");
    } finally { setAddingKey(false); }
  };

  const startEditKey = (providerId: string, key: AdminSupplierKeyEntry) => {
    setEditingKey({ providerId, keyId: key.id });
    setEditKeyVal(key.key); setEditKeyLabel(key.label);
    setEditKeyLimit(String(key.requestsLimit)); setEditKeyReset(key.resetDate);
  };

  const handleSaveEditKey = async () => {
    if (!editingKey || !user) return;
    const headers = await getAuthHeaders();
    await safeFetch("/api/admin/supplier-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        action: "update_key", provider: editingKey.providerId, keyId: editingKey.keyId,
        updates: { key: editKeyVal.trim(), label: editKeyLabel.trim(), requestsLimit: parseInt(editKeyLimit) || 1000, resetDate: editKeyReset },
      }),
    });
    setEditingKey(null);
    toast.success("Key updated");
    await fetchProviders();
  };

  const confirmRemoveApiKey = async () => {
    if (!confirmRemoveKey || !user) return;
    const headers = await getAuthHeaders();
    await safeFetch("/api/admin/supplier-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ action: "remove_key", provider: confirmRemoveKey.providerId, keyId: confirmRemoveKey.keyId }),
    });
    toast.success("Key removed");
    await fetchProviders();
    setConfirmRemoveKey(null);
  };

  const handleTest = async (providerId: string, key: AdminSupplierKeyEntry) => {
    setTesting(`${providerId}_${key.id}`);
    setTestResult(null);
    try {
      const headers = await getAuthHeaders();
      const data = await safeFetch<{ success: boolean; message: string }>("/api/platforms/admin/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ platformId: providerId, keyId: key.id, key: key.key, method: "supplier_provider" }),
      });
      setTestResult({ id: `${providerId}_${key.id}`, success: data.success, message: data.message });
      await fetchProviders();
    } catch {
      setTestResult({ id: `${providerId}_${key.id}`, success: false, message: "Test request failed" });
    } finally { setTesting(null); }
  };

  const handleResetUsage = async (providerId: string, keyId: string) => {
    if (!user) return;
    const headers = await getAuthHeaders();
    await safeFetch("/api/admin/supplier-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ action: "reset_usage", provider: providerId, keyId }),
    });
    toast.success("Usage reset");
    await fetchProviders();
  };

  const handleDragStart = (providerId: string, keyId: string) => setDraggedKey({ providerId, keyId });
  const handleDragOver = (e: React.DragEvent, providerId: string, keyId: string) => {
    e.preventDefault();
    if (draggedKey && draggedKey.providerId === providerId && draggedKey.keyId !== keyId) setDragOverKey({ providerId, keyId });
  };
  const handleDragLeave = () => setDragOverKey(null);
  const handleDrop = async (providerId: string, targetKeyId: string) => {
    if (!draggedKey || draggedKey.providerId !== providerId || draggedKey.keyId === targetKeyId) { setDraggedKey(null); setDragOverKey(null); return; }
    const prov = providers[providerId];
    if (!prov) { setDraggedKey(null); setDragOverKey(null); return; }
    const sortedKeys = [...prov.keys].sort((a, b) => a.priority - b.priority);
    const draggedIndex = sortedKeys.findIndex((k) => k.id === draggedKey.keyId);
    const targetIndex = sortedKeys.findIndex((k) => k.id === targetKeyId);
    if (draggedIndex === -1 || targetIndex === -1) { setDraggedKey(null); setDragOverKey(null); return; }
    const newOrder = [...sortedKeys];
    const [moved] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, moved);
    setDraggedKey(null); setDragOverKey(null);
    try {
      const headers = await getAuthHeaders();
      await safeFetch("/api/admin/supplier-keys", {
        method: "POST", headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action: "reorder_keys", provider: providerId, keyIds: newOrder.map((k) => k.id) }),
      });
      await fetchProviders();
    } catch (err) { console.error("[AdminSupplierKeys] Reorder failed:", err); }
  };
  const handleDragEnd = () => { setDraggedKey(null); setDragOverKey(null); };

  const totalKeys = Object.values(providers).reduce((sum, p) => sum + p.keys.length, 0);
  const healthyKeys = Object.values(providers).reduce((sum, p) => sum + p.keys.filter((k) => k.lastStatus === "healthy").length, 0);
  const errorKeys = Object.values(providers).reduce((sum, p) => sum + p.keys.filter((k) => k.lastStatus === "error").length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading supplier provider keys...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <Truck className="h-7 w-7 text-emerald-400" /> Supplier Provider Keys
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage shared supplier data provider API keys. These keys are used as fallback when users don&apos;t have their own keys configured.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1"><Key className="h-3.5 w-3.5 text-emerald-400" /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Keys</span></div>
          <p className="text-2xl font-bold text-foreground">{totalKeys}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Healthy</span></div>
          <p className="text-2xl font-bold text-emerald-400">{healthyKeys}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1"><XCircle className="h-3.5 w-3.5 text-red-400" /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Errors</span></div>
          <p className="text-2xl font-bold text-red-400">{errorKeys}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1"><Zap className="h-3.5 w-3.5 text-cyan-400" /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Providers</span></div>
          <p className="text-2xl font-bold text-cyan-400">{PROVIDERS.length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {PROVIDERS.map((prov) => {
          const data = providers[prov.id] || { keys: [], configured: false };
          return (
            <div key={prov.id}
              className={`glass rounded-2xl border overflow-hidden transition-all ${
                data.configured ? "border-border hover:border-emerald-400/30" : "border-border/50 opacity-70"
              }`}>
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      data.keys.some((k) => k.lastStatus === "healthy") ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                      : data.keys.some((k) => k.lastStatus === "error") ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]"
                      : "bg-muted-foreground/40"
                    }`} />
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-display font-semibold text-foreground text-lg">{prov.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                          {prov.freeTier}
                        </span>
                        {data.keys.length > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
                            {data.keys.length} key{data.keys.length !== 1 ? "s" : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{prov.usedFor}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={prov.website} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground hover:border-emerald-400/30 transition-all">
                      <ExternalLink className="h-3 w-3" /> Website
                    </a>
                    <button onClick={() => { setShowAddKeyFor(prov.id); setExpandedProvider(prov.id); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-all">
                      <Plus className="h-3 w-3" /> Add Key
                    </button>
                    <button onClick={() => setExpandedProvider(expandedProvider === prov.id ? null : prov.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground hover:border-emerald-400/30 transition-all">
                      {expandedProvider === prov.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      {expandedProvider === prov.id ? "Collapse" : "Keys"}
                    </button>
                  </div>
                </div>
              </div>

              {expandedProvider === prov.id && (
                <div className="border-t border-border p-5 space-y-4 bg-surface/30">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Key className="h-4 w-4 text-emerald-400" /> API Keys
                      <span className="text-xs font-normal text-muted-foreground">({data.keys.length})</span>
                    </h4>
                    <button onClick={() => setShowAddKeyFor(showAddKeyFor === prov.id ? null : prov.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-all">
                      <Plus className="h-3 w-3" /> Add Another Key
                    </button>
                  </div>

                  {data.keys.length === 0 ? (
                    <div className="p-4 rounded-xl bg-surface/50 border border-border text-center">
                      <Key className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No API keys configured</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.keys.sort((a, b) => a.priority - b.priority).map((key) => (
                        <div key={key.id}
                          draggable={editingKey?.providerId !== prov.id || editingKey?.keyId !== key.id}
                          onDragStart={() => handleDragStart(prov.id, key.id)}
                          onDragOver={(e) => handleDragOver(e, prov.id, key.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={() => handleDrop(prov.id, key.id)}
                          onDragEnd={handleDragEnd}
                          className={`p-4 rounded-xl bg-surface/50 border transition-all ${
                            draggedKey?.keyId === key.id ? "opacity-50 border-emerald-400/50"
                            : dragOverKey?.keyId === key.id ? "border-emerald-400/50 bg-emerald-400/5"
                            : "border-border"
                          }`}>
                          {editingKey?.providerId === prov.id && editingKey?.keyId === key.id ? (
                            <div className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Key Value</label>
                                  <input type="text" value={editKeyVal} onChange={(e) => setEditKeyVal(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-mono focus:outline-none focus:border-emerald-400/50" /></div>
                                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Label</label>
                                  <input type="text" value={editKeyLabel} onChange={(e) => setEditKeyLabel(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-emerald-400/50" /></div>
                                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Request Limit</label>
                                  <input type="number" value={editKeyLimit} onChange={(e) => setEditKeyLimit(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-emerald-400/50" /></div>
                                <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Reset Date</label>
                                  <input type="date" value={editKeyReset} onChange={(e) => setEditKeyReset(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-emerald-400/50" /></div>
                              </div>
                              <div className="flex gap-2">
                                <button onClick={handleSaveEditKey} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-all">
                                  <CheckCircle2 className="h-3 w-3" /> Save
                                </button>
                                <button onClick={() => setEditingKey(null)} className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground transition-all">Cancel</button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-4 min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing mt-0.5">
                                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-emerald-400 transition-colors" />
                                  <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">#{key.priority}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium text-foreground">{key.label}</span>
                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                      key.lastStatus === "healthy" ? "bg-emerald-400/10 text-emerald-400"
                                      : key.lastStatus === "error" ? "bg-red-400/10 text-red-400"
                                      : "bg-muted-foreground/10 text-muted-foreground"
                                    }`}>{key.lastStatus.toUpperCase()}</span>
                                  </div>
                                  <div className="mt-1">
                                    <span className="text-xs font-mono text-muted-foreground break-all leading-relaxed">
                                      {visibleKeys.has(key.id) ? key.key : `${key.key.slice(0, 8)}${"•".repeat(12)}${key.key.slice(-4)}`}
                                    </span>
                                    <button onClick={() => toggleKeyVisibility(key.id)} className="ml-2 text-muted-foreground hover:text-foreground inline align-middle">
                                      {visibleKeys.has(key.id) ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                    </button>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right min-w-[100px]">
                                  <div className="flex items-center gap-1.5 justify-end mb-1">
                                    <span className="text-xs text-muted-foreground">{key.requestsUsed}/{key.requestsLimit}</span>
                                  </div>
                                  <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
                                    <div className={`h-full rounded-full transition-all ${
                                      key.requestsLimit > 0 && key.requestsUsed / key.requestsLimit > 0.8 ? "bg-red-400"
                                      : key.requestsLimit > 0 && key.requestsUsed / key.requestsLimit > 0.5 ? "bg-amber-400" : "bg-emerald-400"
                                    }`} style={{ width: `${key.requestsLimit > 0 ? Math.min(100, (key.requestsUsed / key.requestsLimit) * 100) : 0}%` }} />
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <button onClick={() => handleTest(prov.id, key)} disabled={testing === `${prov.id}_${key.id}`}
                                    className="p-1.5 rounded-lg text-blue-400/60 hover:text-blue-400 hover:bg-blue-400/10 transition-colors disabled:opacity-50" title="Test key">
                                    {testing === `${prov.id}_${key.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube className="h-3.5 w-3.5" />}
                                  </button>
                                  <button onClick={() => handleResetUsage(prov.id, key.id)} className="p-1.5 rounded-lg text-amber-400/60 hover:text-amber-400 hover:bg-amber-400/10 transition-colors" title="Reset usage">
                                    <RotateCcw className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => startEditKey(prov.id, key)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors" title="Edit key">
                                    <Settings className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => setConfirmRemoveKey({ providerId: prov.id, keyId: key.id })} className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Remove key">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                          {testResult && testResult.id === `${prov.id}_${key.id}` && (
                            <div className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                              testResult.success ? "bg-emerald-400/5 border border-emerald-400/20 text-emerald-400" : "bg-red-400/5 border border-red-400/20 text-red-400"
                            }`}>
                              {testResult.success ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" /> : <XCircle className="h-3.5 w-3.5 shrink-0" />}
                              {testResult.message}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {showAddKeyFor === prov.id && (
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                      <h5 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Add New API Key</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">API Key *</label>
                          <input type="text" value={addKeyVal} onChange={(e) => setAddKeyVal(e.target.value)} placeholder="Enter API key" className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-mono focus:outline-none focus:border-emerald-400/50" /></div>
                        <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Label</label>
                          <input type="text" value={addKeyLabel} onChange={(e) => setAddKeyLabel(e.target.value)} placeholder="e.g., Account 2" className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-emerald-400/50" /></div>
                        <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Request Limit</label>
                          <input type="number" value={addKeyLimit} onChange={(e) => setAddKeyLimit(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-emerald-400/50" /></div>
                        <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Resets On</label>
                          <input type="date" value={addKeyReset} onChange={(e) => setAddKeyReset(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-emerald-400/50" /></div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleAddKey(prov.id)} disabled={addingKey || !addKeyVal.trim()}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white text-xs font-medium hover:bg-emerald-600 transition-all disabled:opacity-50">
                          {addingKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add Key
                        </button>
                        <button onClick={() => { setShowAddKeyFor(null); setAddKeyVal(""); setAddKeyLabel(""); setAddKeyLimit("1000"); setAddKeyReset(""); }}
                          className="px-4 py-2 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground transition-all">Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmDialog open={!!confirmRemoveKey} title="Remove Supplier Provider Key" danger
        description="This will permanently remove this API key from the provider."
        confirmLabel="Remove" cancelLabel="Cancel"
        onConfirm={confirmRemoveApiKey} onCancel={() => setConfirmRemoveKey(null)} />
    </div>
  );
}
