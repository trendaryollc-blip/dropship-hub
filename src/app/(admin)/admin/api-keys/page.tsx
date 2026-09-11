"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key, Eye, EyeOff, Loader2, Globe, Plus, Trash2, TestTube,
  RotateCcw, Settings, CheckCircle2, XCircle, GripVertical,
  ChevronDown, ChevronUp, AlertTriangle, Shield,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface ApiKeyEntry {
  id: string;
  key: string;
  label: string;
  priority: number;
  requestsUsed: number;
  requestsLimit: number;
  resetDate: string;
  lastError: string | null;
  lastTested: { seconds: number; nanoseconds: number } | null;
  lastStatus: "healthy" | "error" | "untested";
}

interface PlatformKeySummary {
  id: string;
  name: string;
  method: string;
  enabled: boolean;
  lastHealth: string;
  keys: ApiKeyEntry[];
}

const METHOD_LABELS: Record<string, string> = {
  official_api: "Official API",
  rainforest: "Rainforest API",
  serpapi: "SerpAPI",
  serper: "Serper.dev",
  rapidapi_walmart: "Walmart RapidAPI",
  scraperapi: "ScraperAPI",
  custom_scraper: "Custom Scraper",
};

export default function AdminApiKeysPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [platforms, setPlatforms] = useState<PlatformKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);

  const [showAddKeyFor, setShowAddKeyFor] = useState<string | null>(null);
  const [addKeyVal, setAddKeyVal] = useState("");
  const [addKeyLabel, setAddKeyLabel] = useState("");
  const [addKeyLimit, setAddKeyLimit] = useState("100");
  const [addKeyReset, setAddKeyReset] = useState("");
  const [addingKey, setAddingKey] = useState(false);

  const [editingKey, setEditingKey] = useState<{ platformId: string; keyId: string } | null>(null);
  const [editKeyVal, setEditKeyVal] = useState("");
  const [editKeyLabel, setEditKeyLabel] = useState("");
  const [editKeyLimit, setEditKeyLimit] = useState("");
  const [editKeyReset, setEditKeyReset] = useState("");

  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const [confirmRemoveKey, setConfirmRemoveKey] = useState<{ platformId: string; keyId: string } | null>(null);

  const [draggedKey, setDraggedKey] = useState<{ platformId: string; keyId: string } | null>(null);
  const [dragOverKey, setDragOverKey] = useState<{ platformId: string; keyId: string } | null>(null);

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId); else next.add(keyId);
      return next;
    });
  };

  const fetchPlatforms = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const data = await safeFetch<{ platforms?: PlatformKeySummary[] }>("/api/platforms/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data?.platforms) setPlatforms(data.platforms);
    } catch (err) {
      console.error("[AdminApiKeys] Failed to fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchPlatforms(); }, [fetchPlatforms]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  const handleAddKey = async (platformId: string) => {
    if (!addKeyVal.trim() || !user) return;
    setAddingKey(true);
    try {
      const headers = await getAuthHeaders();
      await safeFetch("/api/platforms/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "add_key", platformId, key: addKeyVal.trim(),
          label: addKeyLabel.trim() || "Fallback", requestsLimit: parseInt(addKeyLimit) || 100,
          resetDate: addKeyReset || undefined,
        }),
      });
      setShowAddKeyFor(null);
      setAddKeyVal(""); setAddKeyLabel(""); setAddKeyLimit("100"); setAddKeyReset("");
      toast.success("Key added successfully");
      await fetchPlatforms();
    } catch {
      toast.error("Failed to add key");
    } finally { setAddingKey(false); }
  };

  const startEditKey = (platformId: string, key: ApiKeyEntry) => {
    setEditingKey({ platformId, keyId: key.id });
    setEditKeyVal(key.key); setEditKeyLabel(key.label);
    setEditKeyLimit(String(key.requestsLimit)); setEditKeyReset(key.resetDate);
  };

  const handleSaveEditKey = async () => {
    if (!editingKey || !user) return;
    const headers = await getAuthHeaders();
    await safeFetch("/api/platforms/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        action: "update_key", platformId: editingKey.platformId, keyId: editingKey.keyId,
        updates: { key: editKeyVal.trim(), label: editKeyLabel.trim(), requestsLimit: parseInt(editKeyLimit) || 100, resetDate: editKeyReset },
      }),
    });
    setEditingKey(null);
    toast.success("Key updated");
    await fetchPlatforms();
  };

  const confirmRemoveApiKey = async () => {
    if (!confirmRemoveKey || !user) return;
    const headers = await getAuthHeaders();
    await safeFetch("/api/platforms/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ action: "remove_key", platformId: confirmRemoveKey.platformId, keyId: confirmRemoveKey.keyId }),
    });
    toast.success("Key removed");
    await fetchPlatforms();
    setConfirmRemoveKey(null);
  };

  const handleTest = async (platform: PlatformKeySummary, key: ApiKeyEntry) => {
    setTesting(`${platform.id}_${key.id}`);
    setTestResult(null);
    try {
      const headers = await getAuthHeaders();
      const data = await safeFetch<{ success: boolean; message: string }>("/api/platforms/admin/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ platformId: platform.id, keyId: key.id, key: key.key, method: platform.method }),
      });
      setTestResult({ id: `${platform.id}_${key.id}`, success: data.success, message: data.message });
      await fetchPlatforms();
    } catch {
      setTestResult({ id: `${platform.id}_${key.id}`, success: false, message: "Test request failed" });
    } finally { setTesting(null); }
  };

  const handleResetUsage = async (platformId: string, keyId: string) => {
    if (!user) return;
    const headers = await getAuthHeaders();
    await safeFetch("/api/platforms/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ action: "reset_usage", platformId, keyId }),
    });
    toast.success("Usage reset");
    await fetchPlatforms();
  };

  const handleDragStart = (platformId: string, keyId: string) => setDraggedKey({ platformId, keyId });
  const handleDragOver = (e: React.DragEvent, platformId: string, keyId: string) => {
    e.preventDefault();
    if (draggedKey && draggedKey.platformId === platformId && draggedKey.keyId !== keyId) setDragOverKey({ platformId, keyId });
  };
  const handleDragLeave = () => setDragOverKey(null);
  const handleDrop = async (platformId: string, targetKeyId: string) => {
    if (!draggedKey || draggedKey.platformId !== platformId || draggedKey.keyId === targetKeyId) { setDraggedKey(null); setDragOverKey(null); return; }
    const platform = platforms.find((p) => p.id === platformId);
    if (!platform) { setDraggedKey(null); setDragOverKey(null); return; }
    const sortedKeys = [...platform.keys].sort((a, b) => a.priority - b.priority);
    const draggedIndex = sortedKeys.findIndex((k) => k.id === draggedKey.keyId);
    const targetIndex = sortedKeys.findIndex((k) => k.id === targetKeyId);
    if (draggedIndex === -1 || targetIndex === -1) { setDraggedKey(null); setDragOverKey(null); return; }
    const newOrder = [...sortedKeys];
    const [moved] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, moved);
    setDraggedKey(null); setDragOverKey(null);
    try {
      const headers = await getAuthHeaders();
      await safeFetch("/api/platforms/admin", {
        method: "POST", headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action: "reorder_keys", platformId, keyIds: newOrder.map((k) => k.id) }),
      });
      await fetchPlatforms();
    } catch (err) { console.error("[AdminApiKeys] Reorder failed:", err); }
  };
  const handleDragEnd = () => { setDraggedKey(null); setDragOverKey(null); };

  const totalKeys = platforms.reduce((sum, p) => sum + p.keys.length, 0);
  const healthyKeys = platforms.reduce((sum, p) => sum + p.keys.filter((k) => k.lastStatus === "healthy").length, 0);
  const errorKeys = platforms.reduce((sum, p) => sum + p.keys.filter((k) => k.lastStatus === "error").length, 0);
  const totalUsed = platforms.reduce((sum, p) => sum + p.keys.reduce((s, k) => s + k.requestsUsed, 0), 0);
  const totalLimit = platforms.reduce((sum, p) => sum + p.keys.reduce((s, k) => s + k.requestsLimit, 0), 0);

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
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <Shield className="h-7 w-7 text-accent" /> API Key Management
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage API keys for all platforms. Add, test, edit, and monitor key usage.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1"><Key className="h-3.5 w-3.5 text-blue-400" /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Keys</span></div>
          <p className="text-2xl font-bold text-foreground">{totalKeys}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Healthy</span></div>
          <p className="text-2xl font-bold text-emerald-400">{healthyKeys}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle className="h-3.5 w-3.5 text-red-400" /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Errors</span></div>
          <p className="text-2xl font-bold text-red-400">{errorKeys}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1"><Globe className="h-3.5 w-3.5 text-purple-400" /><span className="text-[10px] text-muted-foreground uppercase tracking-wider">Usage</span></div>
          <p className="text-2xl font-bold text-purple-400">{totalUsed.toLocaleString()}/{totalLimit.toLocaleString()}</p>
        </div>
      </div>

      <div className="space-y-3">
        {platforms.map((platform) => (
          <div key={platform.id}
            className={`glass rounded-2xl border overflow-hidden transition-all ${
              platform.enabled ? "border-border hover:border-accent/30" : "border-border/50 opacity-60"
            }`}>
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    platform.lastHealth === "healthy" ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                    : platform.lastHealth === "error" ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]"
                    : "bg-muted-foreground/40"
                  }`} />
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="font-display font-semibold text-foreground text-lg">{platform.name}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface border border-border text-muted-foreground uppercase">
                        {METHOD_LABELS[platform.method] || platform.method}
                      </span>
                      {platform.keys.length > 0 && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-400/10 text-purple-400 border border-purple-400/20">
                          {platform.keys.length} key{platform.keys.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">ID: {platform.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowAddKeyFor(platform.id); setExpandedPlatform(platform.id); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-all">
                    <Plus className="h-3 w-3" /> Add Key
                  </button>
                  <button onClick={() => setExpandedPlatform(expandedPlatform === platform.id ? null : platform.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all">
                    {expandedPlatform === platform.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {expandedPlatform === platform.id ? "Collapse" : "Keys"}
                  </button>
                </div>
              </div>
            </div>

            {expandedPlatform === platform.id && (
              <div className="border-t border-border p-5 space-y-4 bg-surface/30">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Key className="h-4 w-4 text-accent" /> API Keys
                    <span className="text-xs font-normal text-muted-foreground">({platform.keys.length})</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setShowAddKeyFor(showAddKeyFor === platform.id ? null : platform.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent/20 transition-all">
                      <Plus className="h-3 w-3" /> Add Another Key
                    </button>
                  </div>
                </div>

                {platform.keys.length === 0 ? (
                  <div className="p-4 rounded-xl bg-surface/50 border border-border text-center">
                    <Key className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">No API keys configured</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {platform.keys.sort((a, b) => a.priority - b.priority).map((key) => (
                      <div key={key.id}
                        draggable={editingKey?.platformId !== platform.id || editingKey?.keyId !== key.id}
                        onDragStart={() => handleDragStart(platform.id, key.id)}
                        onDragOver={(e) => handleDragOver(e, platform.id, key.id)}
                        onDragLeave={handleDragLeave}
                        onDrop={() => handleDrop(platform.id, key.id)}
                        onDragEnd={handleDragEnd}
                        className={`p-4 rounded-xl bg-surface/50 border transition-all ${
                          draggedKey?.keyId === key.id ? "opacity-50 border-accent/50"
                          : dragOverKey?.keyId === key.id ? "border-accent/50 bg-accent/5"
                          : "border-border"
                        }`}>
                        {editingKey?.platformId === platform.id && editingKey?.keyId === key.id ? (
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Key Value</label>
                                <input type="text" value={editKeyVal} onChange={(e) => setEditKeyVal(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-mono focus:outline-none focus:border-accent/50" /></div>
                              <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Label</label>
                                <input type="text" value={editKeyLabel} onChange={(e) => setEditKeyLabel(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50" /></div>
                              <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Request Limit</label>
                                <input type="number" value={editKeyLimit} onChange={(e) => setEditKeyLimit(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50" /></div>
                              <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Reset Date</label>
                                <input type="date" value={editKeyReset} onChange={(e) => setEditKeyReset(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50" /></div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={handleSaveEditKey} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-all">
                                <CheckCircle2 className="h-3 w-3" /> Save
                              </button>
                              <button onClick={() => setEditingKey(null)} className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground transition-all">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing mt-0.5">
                                <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-accent transition-colors" />
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">#{key.priority}</span>
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
                                <button onClick={() => handleTest(platform, key)} disabled={testing === `${platform.id}_${key.id}`}
                                  className="p-1.5 rounded-lg text-blue-400/60 hover:text-blue-400 hover:bg-blue-400/10 transition-colors disabled:opacity-50" title="Test key">
                                  {testing === `${platform.id}_${key.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <TestTube className="h-3.5 w-3.5" />}
                                </button>
                                <button onClick={() => handleResetUsage(platform.id, key.id)} className="p-1.5 rounded-lg text-amber-400/60 hover:text-amber-400 hover:bg-amber-400/10 transition-colors" title="Reset usage">
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => startEditKey(platform.id, key)} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors" title="Edit key">
                                  <Settings className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => setConfirmRemoveKey({ platformId: platform.id, keyId: key.id })} className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-400/10 transition-colors" title="Remove key">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                        {testResult && testResult.id === `${platform.id}_${key.id}` && (
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

                {showAddKeyFor === platform.id && (
                  <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-3">
                    <h5 className="text-xs font-semibold text-accent uppercase tracking-wider">Add New API Key</h5>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">API Key *</label>
                        <input type="text" value={addKeyVal} onChange={(e) => setAddKeyVal(e.target.value)} placeholder="Enter API key" className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-mono focus:outline-none focus:border-accent/50" /></div>
                      <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Label</label>
                        <input type="text" value={addKeyLabel} onChange={(e) => setAddKeyLabel(e.target.value)} placeholder="e.g., Account 2" className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50" /></div>
                      <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Request Limit</label>
                        <input type="number" value={addKeyLimit} onChange={(e) => setAddKeyLimit(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50" /></div>
                      <div><label className="text-[10px] text-muted-foreground uppercase tracking-wider">Resets On</label>
                        <input type="date" value={addKeyReset} onChange={(e) => setAddKeyReset(e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50" /></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleAddKey(platform.id)} disabled={addingKey || !addKeyVal.trim()}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-all disabled:opacity-50">
                        {addingKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />} Add Key
                      </button>
                      <button onClick={() => { setShowAddKeyFor(null); setAddKeyVal(""); setAddKeyLabel(""); setAddKeyLimit("100"); setAddKeyReset(""); }}
                        className="px-4 py-2 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground transition-all">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {platforms.length === 0 && (
        <div className="glass rounded-2xl border border-border px-6 py-12 text-center">
          <Key className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No platforms configured yet</p>
        </div>
      )}

      <ConfirmDialog open={!!confirmRemoveKey} title="Remove API Key" danger
        description="This will permanently remove this API key from the platform."
        confirmLabel="Remove" cancelLabel="Cancel"
        onConfirm={confirmRemoveApiKey} onCancel={() => setConfirmRemoveKey(null)} />
    </div>
  );
}
