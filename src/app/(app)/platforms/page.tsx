"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe, Plus, Trash2, Key, Shield, Zap, CheckCircle2, XCircle,
  Loader2, X, Eye, EyeOff, RotateCcw, GripVertical, AlertTriangle,
  Settings, RefreshCw, ChevronDown, ChevronUp, TestTube, Search,
  Layers, Store, MousePointer2, Brain,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import CuratedListTab from "@/components/platforms/CuratedListTab";
import NoCodeConnectorTab from "@/components/platforms/NoCodeConnectorTab";
import AiAutosetupTab from "@/components/platforms/AiAutosetupTab";
import { safeFetch } from "@/lib/safe-fetch";
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

interface PlatformData {
  id: string;
  name: string;
  method: string;
  enabled: boolean;
  keys: ApiKeyEntry[];
  lastHealth: "healthy" | "error" | "untested";
  lastSearched: { seconds: number; nanoseconds: number } | null;
  lastError: string | null;
  cooldownUntil: { seconds: number; nanoseconds: number } | null;
}

const METHOD_OPTIONS = [
  { value: "official_api", label: "Official API", description: "Platform's own API (e.g., CJ Dropshipping)" },
  { value: "rainforest", label: "Rainforest API", description: "Amazon data via Rainforest API" },
  { value: "serpapi", label: "SerpAPI", description: "Google Shopping via SerpAPI" },
  { value: "serper", label: "Serper.dev", description: "Google Shopping via Serper.dev (fast & cheap)" },
  { value: "rapidapi_walmart", label: "Walmart RapidAPI", description: "Walmart data via RapidAPI" },
  { value: "scraperapi", label: "ScraperAPI", description: "Web scraping via ScraperAPI" },
  { value: "custom_scraper", label: "Custom Scraper", description: "Custom scraping solution" },
];

export default function PlatformsPage() {
  const { user } = useAuth();
  const [platforms, setPlatforms] = useState<PlatformData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"platforms" | "curated" | "connector" | "ai">("platforms");
  const [showAddModal, setShowAddModal] = useState(false);
  const [expandedPlatform, setExpandedPlatform] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  // Add platform form state
  const [newName, setNewName] = useState("");
  const [newMethod, setNewMethod] = useState("official_api");
  const [newKey, setNewKey] = useState("");
  const [newKeyLabel, setNewKeyLabel] = useState("Primary");
  const [newRequestsLimit, setNewRequestsLimit] = useState("100");
  const [newResetDate, setNewResetDate] = useState("");
  const [adding, setAdding] = useState(false);

  // Add key form state
  const [showAddKeyFor, setShowAddKeyFor] = useState<string | null>(null);
  const [addKeyVal, setAddKeyVal] = useState("");
  const [addKeyLabel, setAddKeyLabel] = useState("");
  const [addKeyLimit, setAddKeyLimit] = useState("100");
  const [addKeyReset, setAddKeyReset] = useState("");
  const [addingKey, setAddingKey] = useState(false);

  // Edit key state
  const [editingKey, setEditingKey] = useState<{ platformId: string; keyId: string } | null>(null);

  // Confirm dialog state
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmRemoveKey, setConfirmRemoveKey] = useState<{ platformId: string; keyId: string } | null>(null);
  const [editKeyVal, setEditKeyVal] = useState("");
  const [editKeyLabel, setEditKeyLabel] = useState("");
  const [editKeyLimit, setEditKeyLimit] = useState("");
  const [editKeyReset, setEditKeyReset] = useState("");

  // Seed state
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);

  // Drag-and-drop state for key reordering
  const [draggedKey, setDraggedKey] = useState<{ platformId: string; keyId: string } | null>(null);
  const [dragOverKey, setDragOverKey] = useState<{ platformId: string; keyId: string } | null>(null);

  // Visibility state for API keys
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId);
      else next.add(keyId);
      return next;
    });
  };

  const fetchPlatforms = useCallback(async () => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      let meData;
      try {
        meData = await safeFetch<{ isOwner: boolean }>("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        return;
      }
      if (typeof meData.isOwner !== "boolean") {
        return;
      }
      setIsOwner(meData.isOwner);
      if (!meData.isOwner) {
        return;
      }
      const data = await safeFetch<{ platforms?: PlatformData[] }>("/api/platforms/admin", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPlatforms(data.platforms || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Async data fetch on mount — state updates happen only after awaits.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchPlatforms();
  }, [fetchPlatforms]);

  const getAuthHeaders = async (): Promise<Record<string, string>> => {
    if (!user) return {};
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  };

  // ── Seed Platforms ─────────────────────────────────────────────────────

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    setSeedResult(null);
    try {
      const headers = await getAuthHeaders();
      const data = await safeFetch<{ message?: string }>("/api/platforms/admin/seed?reset=true", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({}),
      });
      setSeedResult(data.message ?? null);
      await fetchPlatforms();
    } finally {
      setSeeding(false);
    }
  };

  // ── Clear Cooldowns ────────────────────────────────────────────────────

  const [clearingCooldowns, setClearingCooldowns] = useState(false);

  const handleClearCooldowns = async () => {
    if (!user) return;
    setClearingCooldowns(true);
    try {
      const headers = await getAuthHeaders();
      const data = await safeFetch<{ message?: string }>("/api/platforms/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ action: "clear_cooldowns" }),
      });
      setSeedResult(data.message || "Cooldowns cleared");
      await fetchPlatforms();
    } finally {
      setClearingCooldowns(false);
    }
  };

  // ── Add Platform ───────────────────────────────────────────────────────

  const handleAddPlatform = async () => {
    if (!newName.trim() || !user) return;
    setAdding(true);
    try {
      const headers = await getAuthHeaders();
      await safeFetch("/api/platforms/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          name: newName.trim(),
          method: newMethod,
          apiKey: newKey.trim() || undefined,
          keyLabel: newKeyLabel.trim() || "Primary",
          requestsLimit: parseInt(newRequestsLimit) || 100,
          resetDate: newResetDate || undefined,
        }),
      });
      setShowAddModal(false);
      setNewName("");
      setNewMethod("official_api");
      setNewKey("");
      setNewKeyLabel("Primary");
      setNewRequestsLimit("100");
      setNewResetDate("");
      await fetchPlatforms();
    } finally {
      setAdding(false);
    }
  };

  // ── Toggle Enabled ─────────────────────────────────────────────────────

  const handleToggleEnabled = async (id: string, current: boolean) => {
    if (!user) return;
    const headers = await getAuthHeaders();
    await safeFetch("/api/platforms/admin", {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ id, enabled: !current }),
    });
    setPlatforms((prev) =>
      prev.map((p) => (p.id === id ? { ...p, enabled: !current } : p))
    );
  };

  // ── Delete Platform ────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    setConfirmDelete(id);
  };

  const confirmDeletePlatform = async () => {
    if (!confirmDelete || !user) return;
    const headers = await getAuthHeaders();
    await safeFetch(`/api/platforms/admin?id=${confirmDelete}`, {
      method: "DELETE",
      headers,
    });
    setPlatforms((prev) => prev.filter((p) => p.id !== confirmDelete));
    setConfirmDelete(null);
  };

  // ── Test Connection ────────────────────────────────────────────────────

  const handleTest = async (platform: PlatformData, key: ApiKeyEntry) => {
    setTesting(`${platform.id}_${key.id}`);
    setTestResult(null);
    try {
      const headers = await getAuthHeaders();
      const data = await safeFetch<{ success: boolean; message: string }>("/api/platforms/admin/test", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          platformId: platform.id,
          keyId: key.id,
          key: key.key,
          method: platform.method,
        }),
      });
      setTestResult({ id: `${platform.id}_${key.id}`, success: data.success, message: data.message });
      await fetchPlatforms();
    } finally {
      setTesting(null);
    }
  };

  // ── Add Key ────────────────────────────────────────────────────────────

  const handleAddKey = async (platformId: string) => {
    if (!addKeyVal.trim() || !user) return;
    setAddingKey(true);
    try {
      const headers = await getAuthHeaders();
      await safeFetch("/api/platforms/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "add_key",
          platformId,
          key: addKeyVal.trim(),
          label: addKeyLabel.trim() || "Fallback",
          requestsLimit: parseInt(addKeyLimit) || 100,
          resetDate: addKeyReset || undefined,
        }),
      });
      setShowAddKeyFor(null);
      setAddKeyVal("");
      setAddKeyLabel("");
      setAddKeyLimit("100");
      setAddKeyReset("");
      await fetchPlatforms();
    } finally {
      setAddingKey(false);
    }
  };

  // ── Remove Key ─────────────────────────────────────────────────────────

  const handleRemoveKey = async (platformId: string, keyId: string) => {
    setConfirmRemoveKey({ platformId, keyId });
  };

  const confirmRemoveApiKey = async () => {
    if (!confirmRemoveKey || !user) return;
    const headers = await getAuthHeaders();
    await safeFetch("/api/platforms/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ action: "remove_key", platformId: confirmRemoveKey.platformId, keyId: confirmRemoveKey.keyId }),
    });
    await fetchPlatforms();
    setConfirmRemoveKey(null);
  };

  // ── Edit Key ───────────────────────────────────────────────────────────

  const startEditKey = (platformId: string, key: ApiKeyEntry) => {
    setEditingKey({ platformId, keyId: key.id });
    setEditKeyVal(key.key);
    setEditKeyLabel(key.label);
    setEditKeyLimit(String(key.requestsLimit));
    setEditKeyReset(key.resetDate);
  };

  const handleSaveEditKey = async () => {
    if (!editingKey || !user) return;
    const headers = await getAuthHeaders();
    await safeFetch("/api/platforms/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({
        action: "update_key",
        platformId: editingKey.platformId,
        keyId: editingKey.keyId,
        updates: {
          key: editKeyVal.trim(),
          label: editKeyLabel.trim(),
          requestsLimit: parseInt(editKeyLimit) || 100,
          resetDate: editKeyReset,
        },
      }),
    });
    setEditingKey(null);
    await fetchPlatforms();
  };

  // ── Drag-and-Drop Reorder ───────────────────────────────────────────────

  const handleDragStart = (platformId: string, keyId: string) => {
    setDraggedKey({ platformId, keyId });
  };

  const handleDragOver = (e: React.DragEvent, platformId: string, keyId: string) => {
    e.preventDefault();
    if (draggedKey && draggedKey.platformId === platformId && draggedKey.keyId !== keyId) {
      setDragOverKey({ platformId, keyId });
    }
  };

  const handleDragLeave = () => {
    setDragOverKey(null);
  };

  const handleDrop = async (platformId: string, targetKeyId: string) => {
    if (!draggedKey || draggedKey.platformId !== platformId || draggedKey.keyId === targetKeyId) {
      setDraggedKey(null);
      setDragOverKey(null);
      return;
    }

    const platform = platforms.find((p) => p.id === platformId);
    if (!platform) {
      setDraggedKey(null);
      setDragOverKey(null);
      return;
    }

    const sortedKeys = [...platform.keys].sort((a, b) => a.priority - b.priority);
    const draggedIndex = sortedKeys.findIndex((k) => k.id === draggedKey.keyId);
    const targetIndex = sortedKeys.findIndex((k) => k.id === targetKeyId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedKey(null);
      setDragOverKey(null);
      return;
    }

    const newOrder = [...sortedKeys];
    const [moved] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, moved);

    const newKeyIds = newOrder.map((k) => k.id);

    setDraggedKey(null);
    setDragOverKey(null);

    try {
      const headers = await getAuthHeaders();
      await safeFetch("/api/platforms/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({
          action: "reorder_keys",
          platformId,
          keyIds: newKeyIds,
        }),
      });
      await fetchPlatforms();
    } catch {
      // silent
    }
  };

  const handleDragEnd = () => {
    setDraggedKey(null);
    setDragOverKey(null);
  };

  // ── Reset Usage ────────────────────────────────────────────────────────

  const handleResetUsage = async (platformId: string, keyId: string) => {
    if (!user) return;
    const headers = await getAuthHeaders();
    await safeFetch("/api/platforms/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ action: "reset_usage", platformId, keyId }),
    });
    await fetchPlatforms();
  };

  // ── Stats ──────────────────────────────────────────────────────────────

  const totalPlatforms = platforms.length;
  const enabledCount = platforms.filter((p) => p.enabled).length;
  const healthyCount = platforms.filter((p) => p.lastHealth === "healthy").length;
  const errorCount = platforms.filter((p) => p.lastHealth === "error").length;
  const totalKeys = platforms.reduce((sum, p) => sum + p.keys.length, 0);
  // A platform is "searchable" when it's enabled AND has at least one API key —
  // these are the only platforms that appear in the product search for users.
  const searchableCount = platforms.filter((p) => p.enabled && p.keys.length > 0).length;

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading platforms...</span>
        </div>
      </div>
    );
  }

  // Only the app owner may access platform management.
  if (!isOwner) {
    return (
      <div className="max-w-7xl mx-auto flex items-center justify-center min-h-[60vh]">
        <div className="glass rounded-2xl p-12 border border-border text-center max-w-md">
          <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">
            Platform management is available only to the app owner.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
        <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Settings className="h-7 w-7 text-accent" /> Platform Management
          </h1>
          <p className="text-muted-foreground">
            Manage API keys, add new platforms, and monitor platform health. Changes take effect immediately.
          </p>
          {seedResult && (
            <p className="text-xs text-accent mt-2">{seedResult}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground hover:border-accent/30 transition-all disabled:opacity-50"
          >
            {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Import from .env
          </button>
          {errorCount > 0 && (
            <button
              onClick={handleClearCooldowns}
              disabled={clearingCooldowns}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-400/10 border border-amber-400/20 text-sm text-amber-400 hover:bg-amber-400/20 transition-all disabled:opacity-50"
            >
              {clearingCooldowns ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Clear Errors
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all shadow-[0_0_15px_rgba(var(--glow-color),0.2)]"
          >
            <Plus className="h-4 w-4" /> Add Platform
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface border border-border">
        {([
          { key: "platforms" as const, label: "Platforms", icon: <Layers className="h-3.5 w-3.5" /> },
          { key: "curated" as const, label: "Curated", icon: <Store className="h-3.5 w-3.5" /> },
          { key: "connector" as const, label: "No-Code", icon: <MousePointer2 className="h-3.5 w-3.5" /> },
          { key: "ai" as const, label: "AI Setup", icon: <Brain className="h-3.5 w-3.5" /> },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              tab === t.key
                ? "bg-accent text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ Tab: Platforms (managed platform list) ═══ */}
      {tab === "platforms" && (
        <>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="h-3.5 w-3.5 text-accent" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</span>
          </div>
          <p className="text-2xl font-bold text-foreground">{totalPlatforms}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Enabled</span>
          </div>
          <p className="text-2xl font-bold text-emerald-400">{enabledCount}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Healthy</span>
          </div>
          <p className="text-2xl font-bold text-blue-400">{healthyCount}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Errors</span>
          </div>
          <p className="text-2xl font-bold text-red-400">{errorCount}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Key className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">API Keys</span>
          </div>
          <p className="text-2xl font-bold text-purple-400">{totalKeys}</p>
        </div>
        <div className="glass rounded-xl p-4 border border-border">
          <div className="flex items-center gap-2 mb-1">
            <Search className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">In Search</span>
          </div>
          <p className="text-2xl font-bold text-cyan-400">{searchableCount}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">enabled + have keys</p>
        </div>
      </div>

      {/* Platform List */}
      {platforms.length === 0 ? (
        <div className="glass rounded-2xl p-12 border border-border text-center">
          <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-lg font-semibold text-foreground mb-2">No Platforms Configured</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Add your first platform to start searching across multiple sources.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all"
          >
            <Plus className="h-4 w-4" /> Add Your First Platform
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className={`glass rounded-2xl border overflow-hidden transition-all ${
                platform.enabled
                  ? "border-border hover:border-accent/30"
                  : "border-border/50 opacity-60"
              }`}
            >
              {/* Platform Header */}
              <div className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {/* Health indicator */}
                    <div
                      className={`w-3 h-3 rounded-full ${
                        platform.lastHealth === "healthy"
                          ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                          : platform.lastHealth === "error"
                            ? "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.5)]"
                            : "bg-muted-foreground/40"
                      }`}
                    />
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-display font-semibold text-foreground text-lg">{platform.name}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface border border-border text-muted-foreground uppercase">
                          {METHOD_OPTIONS.find((m) => m.value === platform.method)?.label || platform.method}
                        </span>
                        {platform.keys.length > 0 && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-400/10 text-purple-400 border border-purple-400/20">
                            {platform.keys.length} key{platform.keys.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        {platform.enabled && (
                          platform.keys.length > 0 ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-400/10 text-cyan-400 border border-cyan-400/20">
                              In Search
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400/10 text-amber-400 border border-amber-400/20">
                              Needs Key
                            </span>
                          )
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        ID: {platform.id}
                        {platform.lastSearched && (
                          <> · Last searched: {new Date(platform.lastSearched.seconds * 1000).toLocaleString()}</>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Enable/Disable toggle */}
                    <button
                      onClick={() => handleToggleEnabled(platform.id, platform.enabled)}
                      className={`relative w-12 h-6 rounded-full transition-colors ${
                        platform.enabled ? "bg-emerald-500" : "bg-muted-foreground/30"
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          platform.enabled ? "left-7" : "left-1"
                        }`}
                      />
                    </button>

                    {/* Expand */}
                    <button
                      onClick={() => setExpandedPlatform(expandedPlatform === platform.id ? null : platform.id)}
                      className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                    >
                      {expandedPlatform === platform.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(platform.id)}
                      className="p-2 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Error message */}
                {platform.lastError && (
                  <div className="mt-3 p-3 rounded-xl bg-red-400/5 border border-red-400/20">
                    <p className="text-xs text-red-400 flex items-center gap-2">
                      <AlertTriangle className="h-3 w-3" />
                      {platform.lastError}
                    </p>
                  </div>
                )}
              </div>

              {/* Expanded: Keys Management */}
              {expandedPlatform === platform.id && (
                <div className="border-t border-border p-5 space-y-4 bg-surface/30">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                      <Key className="h-4 w-4 text-accent" /> API Keys
                    </h4>
                    <button
                      onClick={() => setShowAddKeyFor(showAddKeyFor === platform.id ? null : platform.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent/10 border border-accent/20 text-accent text-xs font-medium hover:bg-accent/20 transition-all"
                    >
                      <Plus className="h-3 w-3" /> Add Key
                    </button>
                  </div>

                  {/* Keys list */}
                  {platform.keys.length === 0 ? (
                    <div className="p-4 rounded-xl bg-surface/50 border border-border text-center">
                      <Key className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">No API keys configured</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {platform.keys
                        .sort((a, b) => a.priority - b.priority)
                        .map((key) => (
                          <div
                            key={key.id}
                            draggable={editingKey?.platformId !== platform.id || editingKey?.keyId !== key.id}
                            onDragStart={() => handleDragStart(platform.id, key.id)}
                            onDragOver={(e) => handleDragOver(e, platform.id, key.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={() => handleDrop(platform.id, key.id)}
                            onDragEnd={handleDragEnd}
                            className={`p-4 rounded-xl bg-surface/50 border transition-all ${
                              draggedKey?.keyId === key.id
                                ? "opacity-50 border-accent/50"
                                : dragOverKey?.keyId === key.id
                                  ? "border-accent/50 bg-accent/5"
                                  : "border-border"
                            }`}
                          >
                            {editingKey?.platformId === platform.id && editingKey?.keyId === key.id ? (
                              /* Edit mode */
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Key Value</label>
                                    <input
                                      type="text"
                                      value={editKeyVal}
                                      onChange={(e) => setEditKeyVal(e.target.value)}
                                      className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-mono focus:outline-none focus:border-accent/50"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Label</label>
                                    <input
                                      type="text"
                                      value={editKeyLabel}
                                      onChange={(e) => setEditKeyLabel(e.target.value)}
                                      className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Request Limit</label>
                                    <input
                                      type="number"
                                      value={editKeyLimit}
                                      onChange={(e) => setEditKeyLimit(e.target.value)}
                                      className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Reset Date</label>
                                    <input
                                      type="date"
                                      value={editKeyReset}
                                      onChange={(e) => setEditKeyReset(e.target.value)}
                                      className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50"
                                    />
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={handleSaveEditKey}
                                    className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-all"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingKey(null)}
                                    className="px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground transition-all"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Display mode */
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <div className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing">
                                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/60 hover:text-accent transition-colors" />
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">
                                      #{key.priority}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium text-foreground">{key.label}</span>
                                      <span
                                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                          key.lastStatus === "healthy"
                                            ? "bg-emerald-400/10 text-emerald-400"
                                            : key.lastStatus === "error"
                                              ? "bg-red-400/10 text-red-400"
                                              : "bg-muted-foreground/10 text-muted-foreground"
                                        }`}
                                      >
                                        {key.lastStatus.toUpperCase()}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1">
                                      <span className="text-xs font-mono text-muted-foreground">
                                        {visibleKeys.has(key.id)
                                          ? key.key
                                          : `${key.key.slice(0, 8)}${"•".repeat(12)}${key.key.slice(-4)}`}
                                      </span>
                                      <button
                                        onClick={() => toggleKeyVisibility(key.id)}
                                        className="text-muted-foreground hover:text-foreground"
                                      >
                                        {visibleKeys.has(key.id) ? (
                                          <EyeOff className="h-3 w-3" />
                                        ) : (
                                          <Eye className="h-3 w-3" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-4">
                                  {/* Usage bar */}
                                  <div className="text-right min-w-[100px]">
                                    <div className="flex items-center gap-1.5 justify-end mb-1">
                                      <span className="text-xs text-muted-foreground">
                                        {key.requestsUsed}/{key.requestsLimit}
                                      </span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-surface overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          key.requestsUsed / key.requestsLimit > 0.8
                                            ? "bg-red-400"
                                            : key.requestsUsed / key.requestsLimit > 0.5
                                              ? "bg-amber-400"
                                              : "bg-emerald-400"
                                        }`}
                                        style={{
                                          width: `${Math.min(100, (key.requestsUsed / key.requestsLimit) * 100)}%`,
                                        }}
                                      />
                                    </div>
                                    {key.resetDate && (
                                      <p className="text-[9px] text-muted-foreground mt-0.5">
                                        Resets: {key.resetDate}
                                      </p>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1">
                                    <button
                                      onClick={() => handleTest(platform, key)}
                                      disabled={testing === `${platform.id}_${key.id}`}
                                      className="p-1.5 rounded-lg text-blue-400/60 hover:text-blue-400 hover:bg-blue-400/10 transition-colors disabled:opacity-50"
                                      title="Test connection"
                                    >
                                      {testing === `${platform.id}_${key.id}` ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      ) : (
                                        <TestTube className="h-3.5 w-3.5" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() => handleResetUsage(platform.id, key.id)}
                                      className="p-1.5 rounded-lg text-amber-400/60 hover:text-amber-400 hover:bg-amber-400/10 transition-colors"
                                      title="Reset usage counter"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => startEditKey(platform.id, key)}
                                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
                                      title="Edit key"
                                    >
                                      <Settings className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveKey(platform.id, key.id)}
                                      className="p-1.5 rounded-lg text-red-400/40 hover:text-red-400 hover:bg-red-400/10 transition-colors"
                                      title="Remove key"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Test result */}
                            {testResult && testResult.id === `${platform.id}_${key.id}` && (
                              <div
                                className={`mt-3 p-3 rounded-lg text-xs flex items-center gap-2 ${
                                  testResult.success
                                    ? "bg-emerald-400/5 border border-emerald-400/20 text-emerald-400"
                                    : "bg-red-400/5 border border-red-400/20 text-red-400"
                                }`}
                              >
                                {testResult.success ? (
                                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                                ) : (
                                  <XCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                )}
                                {testResult.message}
                              </div>
                            )}

                            {/* Last error */}
                            {key.lastError && !testResult && (
                              <div className="mt-3 p-3 rounded-lg bg-red-400/5 border border-red-400/20 text-xs text-red-400 flex items-center gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                                {key.lastError}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Add Key Form */}
                  {showAddKeyFor === platform.id && (
                    <div className="p-4 rounded-xl bg-accent/5 border border-accent/20 space-y-3">
                      <h5 className="text-xs font-semibold text-accent uppercase tracking-wider">Add New API Key</h5>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">API Key</label>
                          <input
                            type="text"
                            value={addKeyVal}
                            onChange={(e) => setAddKeyVal(e.target.value)}
                            placeholder="Enter API key"
                            className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm font-mono focus:outline-none focus:border-accent/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Label</label>
                          <input
                            type="text"
                            value={addKeyLabel}
                            onChange={(e) => setAddKeyLabel(e.target.value)}
                            placeholder="e.g., Account 2, Backup"
                            className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Request Limit</label>
                          <input
                            type="number"
                            value={addKeyLimit}
                            onChange={(e) => setAddKeyLimit(e.target.value)}
                            className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Resets On</label>
                          <input
                            type="date"
                            value={addKeyReset}
                            onChange={(e) => setAddKeyReset(e.target.value)}
                            className="w-full mt-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAddKey(platform.id)}
                          disabled={addingKey || !addKeyVal.trim()}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent-hover transition-all disabled:opacity-50"
                        >
                          {addingKey ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                          Add Key
                        </button>
                        <button
                          onClick={() => setShowAddKeyFor(null)}
                          className="px-4 py-2 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Platform Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass rounded-2xl border border-border w-full max-w-lg p-6 space-y-5 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
                <Plus className="h-5 w-5 text-accent" /> Add New Platform
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Platform Name */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Platform Name *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., DHgate, CJ Dropshipping, Amazon"
                  className="w-full mt-1.5 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 transition-all text-sm"
                />
              </div>

              {/* Method */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">API Method *</label>
                <select
                  value={newMethod}
                  onChange={(e) => setNewMethod(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-accent/50 transition-all text-sm appearance-none cursor-pointer"
                >
                  {METHOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label} — {opt.description}
                    </option>
                  ))}
                </select>
              </div>

              {/* API Key */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">API Key</label>
                <input
                  type="password"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  placeholder="Enter API key (optional — can add later)"
                  className="w-full mt-1.5 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 transition-all text-sm font-mono"
                />
              </div>

              {/* Key Label */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Key Label</label>
                  <input
                    type="text"
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    placeholder="Primary"
                    className="w-full mt-1.5 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/50 transition-all text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Request Limit</label>
                  <input
                    type="number"
                    value={newRequestsLimit}
                    onChange={(e) => setNewRequestsLimit(e.target.value)}
                    className="w-full mt-1.5 px-4 py-3 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-accent/50 transition-all text-sm"
                  />
                </div>
              </div>

              {/* Reset Date */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rate Limit Resets On</label>
                <input
                  type="date"
                  value={newResetDate}
                  onChange={(e) => setNewResetDate(e.target.value)}
                  className="w-full mt-1.5 px-4 py-3 rounded-xl bg-surface border border-border text-foreground focus:outline-none focus:border-accent/50 transition-all text-sm"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleAddPlatform}
                disabled={adding || !newName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all disabled:opacity-50"
              >
                {adding ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Add Platform
                  </>
                )}
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-3 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* ═══ Tab: Curated List ═══ */}
      {tab === "curated" && (
        <CuratedListTab onCreated={() => fetchPlatforms()} />
      )}

      {/* ═══ Tab: No-Code Connector ═══ */}
      {tab === "connector" && (
        <NoCodeConnectorTab onCreated={() => fetchPlatforms()} />
      )}

      {/* ═══ Tab: AI Autosetup ═══ */}
      {tab === "ai" && (
        <AiAutosetupTab onCreated={() => fetchPlatforms()} />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete this platform?"
        description="This platform and all its API keys will be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={confirmDeletePlatform}
        onCancel={() => setConfirmDelete(null)}
      />
      <ConfirmDialog
        open={!!confirmRemoveKey}
        title="Remove this API key?"
        description="This key will be removed from the platform. You can add it back later."
        confirmLabel="Remove"
        danger
        onConfirm={confirmRemoveApiKey}
        onCancel={() => setConfirmRemoveKey(null)}
      />
    </div>
  );
}
