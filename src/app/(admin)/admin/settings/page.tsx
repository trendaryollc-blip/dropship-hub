"use client";

import { useState, useEffect } from "react";
import {
  Settings, Loader2, Save,
  Shield, Globe, Key,
} from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";

interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  defaultTier: string;
  maxFreeAiCalls: number;
  maxFreeSearches: number;
  allowedFreeProviders: string[];
}

const ALL_PROVIDERS = ["groq", "gemini", "huggingface", "openai", "deepseek", "mistral", "cohere", "together", "fireworks", "openrouter", "hpc"];

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    registrationEnabled: true,
    defaultTier: "free",
    maxFreeAiCalls: 50,
    maxFreeSearches: 20,
    allowedFreeProviders: ["groq", "gemini", "huggingface"],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchSettings = async () => {
      try {
        const token = await user.getIdToken();
        const data = await safeFetch<{ settings?: SystemSettings }>("/api/admin/settings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data?.settings) setSettings(data.settings);
      } catch (err) {
        console.warn("[AdminSettings] Failed to fetch:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      await safeFetch("/api/admin/settings", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const toggleSetting = (key: keyof SystemSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground mb-2">
            System Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure global platform settings and feature flags.
          </p>
        </div>
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent text-white font-semibold text-sm hover:bg-accent-hover transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(var(--glow-color),0.15)]">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </button>
      </div>

      {/* Platform Controls */}
      <div className="glass rounded-2xl p-6 border border-border">
        <h3 className="font-display text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
          <Shield className="h-4 w-4 text-red-400" /> Platform Controls
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-xl bg-surface/50 border border-border/50">
            <div>
              <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground mt-0.5">Temporarily disable access for all non-admin users</p>
            </div>
            <button onClick={() => toggleSetting("maintenanceMode")}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.maintenanceMode ? "bg-red-500" : "bg-muted-foreground/30"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.maintenanceMode ? "left-7" : "left-1"}`} />
            </button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-surface/50 border border-border/50">
            <div>
              <p className="text-sm font-medium text-foreground">Registration Enabled</p>
              <p className="text-xs text-muted-foreground mt-0.5">Allow new users to sign up</p>
            </div>
            <button onClick={() => toggleSetting("registrationEnabled")}
              className={`relative w-12 h-6 rounded-full transition-colors ${settings.registrationEnabled ? "bg-emerald-500" : "bg-muted-foreground/30"}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${settings.registrationEnabled ? "left-7" : "left-1"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Free Tier Limits */}
      <div className="glass rounded-2xl p-6 border border-border">
        <h3 className="font-display text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
          <Key className="h-4 w-4 text-amber-400" /> Free Tier Limits
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Max AI Calls / Day (Free)</label>
            <input type="number" value={settings.maxFreeAiCalls}
              onChange={(e) => setSettings((p) => ({ ...p, maxFreeAiCalls: parseInt(e.target.value) || 0 }))}
              className="w-full mt-2 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50 transition-colors" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Max Searches / Day (Free)</label>
            <input type="number" value={settings.maxFreeSearches}
              onChange={(e) => setSettings((p) => ({ ...p, maxFreeSearches: parseInt(e.target.value) || 0 }))}
              className="w-full mt-2 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50 transition-colors" />
          </div>
        </div>

        <div className="mt-5">
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Default Tier for New Users</label>
          <select value={settings.defaultTier}
            onChange={(e) => setSettings((p) => ({ ...p, defaultTier: e.target.value }))}
            className="w-full mt-2 px-4 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-accent/50 transition-colors">
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Allowed Free Providers */}
      <div className="glass rounded-2xl p-6 border border-border">
        <h3 className="font-display text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
          <Globe className="h-4 w-4 text-purple-400" /> Allowed Free Providers
        </h3>
        <p className="text-xs text-muted-foreground mb-5">AI providers that free-tier users can connect their own keys to.</p>
        <div className="flex flex-wrap gap-2">
          {ALL_PROVIDERS.map((provider) => {
            const allowed = settings.allowedFreeProviders.includes(provider);
            return (
              <button key={provider} onClick={() => {
                setSettings((p) => ({
                  ...p,
                  allowedFreeProviders: allowed
                    ? p.allowedFreeProviders.filter((x) => x !== provider)
                    : [...p.allowedFreeProviders, provider],
                }));
              }}
                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all border ${
                  allowed
                    ? "bg-accent/10 text-accent border-accent/20"
                    : "bg-surface text-muted-foreground border-border hover:border-accent/20"
                }`}>
                {provider}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
