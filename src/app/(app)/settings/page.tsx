"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Brain, Key, LayoutDashboard, Search, DollarSign,
  Package, BarChart3,
  Store, Bell, User, Download,
} from "lucide-react";
import { safeFetch, FetchError } from "@/lib/safe-fetch";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { allProviders } from "@/components/settings/constants";
import type { AIProvider } from "@/components/settings/constants";
import ProvidersTab from "@/components/settings/ProvidersTab";
import StoresTab from "@/components/settings/StoresTab";
import NotificationsTab from "@/components/settings/NotificationsTab";
import AccountTab from "@/components/settings/AccountTab";
import DataTab from "@/components/settings/DataTab";
import SettingsChatSidebar from "@/components/settings/SettingsChatSidebar";

type SlotKey = string;

function slotId(provider: string, index: number): SlotKey {
  return `${provider}:${index}`;
}

export default function AISettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const [providers, setProviders] = useState<AIProvider[]>(allProviders);
  const [showKeys, setShowKeys] = useState<Record<SlotKey, boolean>>({});
  const [activeTab, setActiveTab] = useState<"providers" | "stores" | "notifications" | "account" | "data">("providers");

  const [apiKeys, setApiKeys] = useState<Record<string, string[]>>({});

  // Per-slot saved status: tracks whether a slot has a saved key in the DB
  // e.g. { "groq:0": { masked: "xxxx1234" }, "groq:1": null }
  const [savedSlots, setSavedSlots] = useState<Record<SlotKey, { masked: string } | null>>({});

  // Per-slot test status
  const [slotTestStatus, setSlotTestStatus] = useState<Record<SlotKey, { success: boolean; message: string }>>({});

  const [testingSlot, setTestingSlot] = useState<{ provider: string; index: number } | null>(null);
  const [savingSlot, setSavingSlot] = useState<{ provider: string; index: number } | null>(null);

  const [stores, setStores] = useState<Array<{ id: string; name: string; platform: string; status: string; url: string }>>([]);

  const [notifPrefs, setNotifPrefs] = useState({
    priceAlerts: true, stockAlerts: true, orderUpdates: true,
    aiRecommendations: true, weeklyDigest: true,
  });

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const getAuthHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!user) return {};
    try {
      const token = await user.getIdToken();
      return { Authorization: `Bearer ${token}` };
    } catch { return {}; }
  }, [user]);

  useEffect(() => {
    getAuthHeaders().then((authHeaders) => {
      Promise.all([
        safeFetch<{ providers?: Record<string, { configured: boolean }> }>("/api/ai", { headers: authHeaders }),
        safeFetch<{ connections?: Array<{ id: string; name: string; platform: string; status: string; url: string }> }>("/api/store/connections", { headers: authHeaders }),
        safeFetch<{ preferences?: typeof notifPrefs }>("/api/settings/notifications", { headers: authHeaders }),
        safeFetch<{ keys?: Record<string, { keys: Array<{ masked: string; index: number }>; configured: boolean }> }>("/api/settings/api-keys", { headers: authHeaders }),
      ]).then(([aiData, storeData, notifData, keyData]) => {
        if (aiData?.providers) {
          setProviders((prev) => prev.map((p) => ({ ...p, configured: aiData.providers![p.id]?.configured ?? false })));
        }
        if (storeData?.connections) setStores(storeData.connections);
        if (notifData?.preferences) setNotifPrefs(notifData.preferences);
        if (keyData?.keys) {
          const newSavedSlots: Record<SlotKey, { masked: string } | null> = {};
          const newApiKeys: Record<string, string[]> = {};
          for (const [id, info] of Object.entries(keyData.keys)) {
            newApiKeys[id] = info.keys.map(() => "");
            for (const k of info.keys) {
              newSavedSlots[slotId(id, k.index)] = { masked: k.masked };
            }
          }
          setSavedSlots(newSavedSlots);
          setApiKeys(newApiKeys);
          setProviders((prev) => prev.map((p) => ({
            ...p,
            configured: keyData.keys![p.id]?.configured ?? p.configured,
          })));
        }
      }).catch((e) => { console.warn("[SettingsPage] data fetch error:", e); });
    });
  }, [getAuthHeaders]);

  const handleToggleActive = (id: string) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p)));
  };

  const handlePriorityChange = (id: string, newPriority: number) => {
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, priority: newPriority } : p)));
  };

  const refreshSavedSlots = async (authHeaders: Record<string, string>) => {
    const updatedKeys = await safeFetch<{ keys?: Record<string, { keys: Array<{ masked: string; index: number }>; configured: boolean }> }>(`/api/settings/api-keys`, { headers: authHeaders });
    if (updatedKeys?.keys) {
      const newSavedSlots: Record<SlotKey, { masked: string } | null> = {};
      const newApiKeys: Record<string, string[]> = {};
      for (const [id, info] of Object.entries(updatedKeys.keys)) {
        newApiKeys[id] = info.keys.map(() => "");
        for (const k of info.keys) {
          newSavedSlots[slotId(id, k.index)] = { masked: k.masked };
        }
      }
      setSavedSlots(newSavedSlots);
      setApiKeys(newApiKeys);
      setProviders((prev) => prev.map((p) => ({
        ...p,
        configured: updatedKeys.keys![p.id]?.configured ?? p.configured,
      })));
    }
  };

  const handleSaveApiKey = async (provider: string, key: string, index: number) => {
    if (!key.trim()) return;
    setSavingSlot({ provider, index });
    try {
      const authHeaders = await getAuthHeaders();
      await safeFetch<{ masked?: string }>(`/api/settings/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ provider, key: key.trim(), index }),
      });
      await refreshSavedSlots(authHeaders);
      toast.success(`${provider} key ${index + 1} saved`);
    } catch (err) {
      const msg = err instanceof FetchError ? err.message : "Failed to save API key";
      toast.error(msg);
    } finally { setSavingSlot(null); }
  };

  const handleAddAdditionalKey = async (provider: string) => {
    try {
      const authHeaders = await getAuthHeaders();
      const res = await safeFetch<{ success: boolean }>(`/api/settings/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ provider, action: "addEmptySlot" }),
      });
      if (res?.success) {
        setApiKeys((prev) => {
          const current = prev[provider] || [];
          return { ...prev, [provider]: [...current, ""] };
        });
        toast.success(`Added new key slot for ${provider}`);
      }
    } catch (err) {
      const msg = err instanceof FetchError ? err.message : "Failed to add key slot";
      toast.error(msg);
    }
  };

  const handleDeleteApiKey = async (provider: string, index: number) => {
    try {
      const authHeaders = await getAuthHeaders();
      await safeFetch("/api/settings/api-keys", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ provider, index }),
      });
      setSlotTestStatus((prev) => {
        const next = { ...prev };
        delete next[slotId(provider, index)];
        return next;
      });
      await refreshSavedSlots(authHeaders);
      toast.success(`API key removed`);
    } catch { toast.error(`Failed to remove ${provider} API key`); }
  };

  const handleApiKeyChange = (id: string, value: string, index: number) => {
    setApiKeys((prev) => {
      const currentArray = [...(prev[id] || [])];
      while (currentArray.length <= index) currentArray.push("");
      currentArray[index] = value;
      return { ...prev, [id]: currentArray };
    });
  };

  const handleTestConnection = async (provider: string, index: number) => {
    const sid = slotId(provider, index);
    setTestingSlot({ provider, index });
    setSlotTestStatus((prev) => ({ ...prev, [sid]: { success: false, message: "" } }));
    try {
      const authHeaders = await getAuthHeaders();
      const key = apiKeys[provider]?.[index] || "";
      const res = await safeFetch<{ response?: string; error?: string; details?: string }>("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          messages: [{ role: "user", content: "Say hi" }],
          providerPriority: [{ id: provider, priority: 1, active: true }],
          stream: false,
          testKey: key || undefined,
        }),
      });
      if (res?.error) {
        const msg = res.details || res.error || "Connection failed";
        setSlotTestStatus((prev) => ({ ...prev, [sid]: { success: false, message: msg } }));
        toast.error(`${provider} key ${index + 1} test failed: ${msg}`);
      } else {
        setSlotTestStatus((prev) => ({ ...prev, [sid]: { success: true, message: "Connection successful!" } }));
        toast.success(`${provider} key ${index + 1} works`);
      }
    } catch (err) {
      setSlotTestStatus((prev) => ({ ...prev, [sid]: { success: false, message: err instanceof Error ? err.message : "Test failed" } }));
      toast.error(`${provider} key ${index + 1} test failed`);
    } finally { setTestingSlot(null); }
  };

  const handleNotifPrefChange = async (key: string) => {
    const updated = { ...notifPrefs, [key]: !(notifPrefs as Record<string, boolean>)[key] };
    setNotifPrefs(updated);
    try {
      const authHeaders = await getAuthHeaders();
      await safeFetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({ preferences: updated }),
      });
      toast.success("Notification preferences saved");
    } catch { toast.error("Failed to save preferences"); setNotifPrefs(notifPrefs); }
  };

  const handleChangePassword = async () => {
    if (!newPassword.trim()) { toast.error("Password cannot be empty"); return; }
    if (newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (newPassword !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setUpdatingPassword(true);
    try {
      const { updatePassword } = await import("firebase/auth");
      if (user && updatePassword) {
        await updatePassword(user, newPassword);
        toast.success("Password updated successfully");
        setNewPassword(""); setConfirmPassword("");
      }
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to update password"); }
    finally { setUpdatingPassword(false); }
  };

  const handleExportData = async () => {
    setExporting(true);
    try {
      const authHeaders = await getAuthHeaders();
      const data = await safeFetch<Record<string, unknown>>("/api/settings/export", { headers: authHeaders });
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `dropship-hub-export-${new Date().toISOString().split("T")[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Data exported successfully");
      }
    } catch { toast.error("Failed to export data"); }
    finally { setExporting(false); }
  };

  const handleImportData = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImporting(true);
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        const authHeaders = await getAuthHeaders();
        await safeFetch("/api/settings/import", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders },
          body: JSON.stringify({ data }),
        });
        toast.success("Data imported successfully");
      } catch { toast.error("Failed to import data — invalid file format"); }
      finally { setImporting(false); }
    };
    input.click();
  };

  const handleDeleteAccount = async () => {
    try {
      const authHeaders = await getAuthHeaders();
      await safeFetch("/api/settings/delete-account", { method: "POST", headers: authHeaders });
      toast.success("Account deleted");
      router.push("/");
    } catch { toast.error("Failed to delete account"); }
  };

  const _configuredCount = providers.filter((p) => p.configured).length;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground mb-2 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent"><Brain className="w-6 h-6 text-white" /></div>
          Settings
        </h1>
        <p className="text-muted-foreground">Configure your AI providers, platform integrations, and account settings.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { href: "/ai", label: "Try AI Assistant", icon: Brain, color: "text-accent" },
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-muted-foreground" },
          { href: "/products", label: "Products", icon: Search, color: "text-blue-400" },
          { href: "/suppliers", label: "Suppliers", icon: Package, color: "text-emerald-400" },
          { href: "/calculator", label: "Calculator", icon: DollarSign, color: "text-amber-400" },
          { href: "/competitors", label: "Competitors", icon: BarChart3, color: "text-purple-400" },
        ].map((link) => (
          <Link key={link.href} href={link.href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all">
            <link.icon className={`h-3 w-3 ${link.color}`} /> {link.label}
          </Link>
        ))}
      </div>

      <div className="flex gap-2 border-b border-border pb-2 overflow-x-auto">
        {[
          { id: "providers" as const, label: "API Providers", icon: Key },
          { id: "stores" as const, label: "Stores", icon: Store },
          { id: "notifications" as const, label: "Notifications", icon: Bell },
          { id: "account" as const, label: "Account", icon: User },
          { id: "data" as const, label: "Data", icon: Download },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${activeTab === tab.id ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground hover:bg-surface"}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

        {activeTab === "providers" && (
          <ProvidersTab
            providers={providers} apiKeys={apiKeys} showKeys={showKeys}
            savedSlots={savedSlots} slotTestStatus={slotTestStatus}
            testingSlot={testingSlot} savingSlot={savingSlot}
            onToggleActive={handleToggleActive} onPriorityChange={handlePriorityChange}
            onSaveApiKey={handleSaveApiKey} onAddAdditionalKey={handleAddAdditionalKey}
            onTestConnection={handleTestConnection}
            onDeleteApiKey={handleDeleteApiKey} onShowKeys={(id) => setShowKeys((p) => ({ ...p, [id]: !p[id] }))}
            onApiKeyChange={handleApiKeyChange}
          />
        )}

      {activeTab === "stores" && <StoresTab stores={stores} />}

      {activeTab === "notifications" && <NotificationsTab notifPrefs={notifPrefs} onTogglePref={handleNotifPrefChange} />}

      {activeTab === "account" && (
        <AccountTab user={user} newPassword={newPassword} confirmPassword={confirmPassword}
          updatingPassword={updatingPassword} onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword} onChangePassword={handleChangePassword}
          onDeleteConfirm={() => setShowDeleteConfirm(true)} />
      )}

      {activeTab === "data" && <DataTab exporting={exporting} importing={importing} onExport={handleExportData} onImport={handleImportData} />}

      <SettingsChatSidebar providers={providers} />

      <ConfirmDialog
        open={showDeleteConfirm}
        title="Delete Account"
        description="Are you sure you want to delete your account? This action cannot be undone."
        confirmLabel="Delete Account"
        cancelLabel="Cancel"
        danger
        onConfirm={() => { setShowDeleteConfirm(false); handleDeleteAccount(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}
