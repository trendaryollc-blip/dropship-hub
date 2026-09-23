"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  Package,
  Palette,
  Eye,
  BarChart3,
  Loader2,
  Check,
  Copy,
  ExternalLink,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Megaphone,
  Bell,
  Globe,
  Save,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { authJson } from "@/lib/auth-headers";
import { copyToClipboard } from "@/lib/clipboard";
import { isSafeHttpUrl } from "@/lib/tracking-page";
import type {
  TrackingPageConfig,
  TrackingPageTemplate,
  TrackingPageStats,
  TrackingPageTemplateOption,
  UpsellSlot,
} from "@/types/tracking-page";

type UpsellPosition = UpsellSlot["position"];

interface UpsellDraft {
  enabled: boolean;
  productTitle: string;
  productUrl: string;
  discount: number;
  ctaText: string;
}

const POSITIONS: UpsellPosition[] = ["header", "progress_bar", "delivery_info", "footer"];
const EMPTY_SLOT: UpsellDraft = { enabled: false, productTitle: "", productUrl: "", discount: 0, ctaText: "Shop now" };
const FONT_OPTIONS = ["Inter", "Poppins", "Montserrat", "Georgia", "Roboto", "system-ui"];
const HEX_RE = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const inputClass =
  "w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all";

function DataState({
  isLoading,
  error,
  label,
  onRetry,
}: {
  isLoading: boolean;
  error: unknown;
  label: string;
  onRetry: () => void;
}) {
  if (isLoading) {
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent mx-auto" />
        <p className="text-sm text-muted-foreground mt-2">Loading {label}…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="glass rounded-2xl p-6 text-center border border-red-500/20">
        <AlertCircle className="h-6 w-6 text-red-400 mx-auto mb-2" />
        <p className="text-sm text-foreground">Couldn&apos;t load {label}.</p>
        <button
          onClick={onRetry}
          className="mt-3 px-4 py-1.5 rounded-lg bg-surface border border-border text-xs font-medium text-muted-foreground hover:text-foreground transition-all inline-flex items-center gap-1.5"
        >
          <RefreshCw className="h-3 w-3" /> Retry
        </button>
      </div>
    );
  }
  return null;
}

interface StoreSummary {
  id: string;
  name: string;
  platform: string;
}

export default function TrackingPageManager() {
  const [activeTab, setActiveTab] = useState<"templates" | "config" | "upsells" | "stats" | "preview">("templates");
  const [selectedTemplate, setSelectedTemplate] = useState<TrackingPageTemplate>("modern");
  const [previewHtml, setPreviewHtml] = useState("");
  const [branding, setBranding] = useState({
    logoUrl: "",
    primaryColor: "#6366f1",
    secondaryColor: "#818cf8",
    backgroundColor: "#f8fafc",
    fontFamily: "Inter",
    businessName: "",
    supportEmail: "",
    supportUrl: "",
  });
  const [upsellSlots, setUpsellSlots] = useState<Record<UpsellPosition, UpsellDraft>>({
    header: { ...EMPTY_SLOT },
    progress_bar: { ...EMPTY_SLOT },
    delivery_info: { ...EMPTY_SLOT },
    footer: { ...EMPTY_SLOT },
  });
  const [selectedStoreId, setSelectedStoreId] = useState("");
  const [activePublicId, setActivePublicId] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TrackingPageConfig | null>(null);
  const { success, error: showError } = useToast();
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const {
    data: templatesData,
    isLoading: templatesLoading,
    error: templatesError,
    mutate: mutateTemplates,
  } = useAPI<{ templates: TrackingPageTemplateOption[] }>("/api/tracking-page?type=templates");
  const {
    data: configsData,
    mutate: mutateConfigs,
    isLoading: configsLoading,
    error: configsError,
  } = useAPI<{ configs: TrackingPageConfig[] }>("/api/tracking-page?type=list");
  const {
    data: statsData,
    isLoading: statsLoading,
    error: statsError,
    mutate: mutateStats,
  } = useAPI<{ stats: TrackingPageStats }>("/api/tracking-page?type=stats");
  const {
    data: storesData,
    isLoading: storesLoading,
    error: storesError,
    mutate: mutateStores,
  } = useAPI<{ connections: StoreSummary[] }>("/api/store/connections");

  const templates = templatesData?.templates || [];
  const configs = configsData?.configs || [];
  const stores = storesData?.connections || [];
  const stats = statsData?.stats;

  const validationError = useMemo(() => {
    if (!branding.businessName.trim()) return "Business name is required";
    if (!selectedStoreId) return "Select a store to attach this tracking page to";
    if (!HEX_RE.test(branding.primaryColor)) return "Primary color must be a valid hex value (e.g. #6366f1)";
    if (!HEX_RE.test(branding.secondaryColor)) return "Secondary color must be a valid hex value";
    if (!HEX_RE.test(branding.backgroundColor)) return "Background color must be a valid hex value";
    if (branding.logoUrl && !isSafeHttpUrl(branding.logoUrl)) return "Logo URL must be a valid http(s) URL";
    if (branding.supportUrl && !isSafeHttpUrl(branding.supportUrl)) return "Support URL must be a valid http(s) URL";
    return null;
  }, [branding, selectedStoreId]);

  const handlePreview = useCallback(async () => {
    setPreviewLoading(true);
    try {
      const data = await authJson<{ html: string }>("/api/tracking-page", {
        action: "preview",
        template: selectedTemplate,
        storeName: branding.businessName.trim() || "My Store",
        branding,
      });
      setPreviewHtml(data.html);
      setActiveTab("preview");
      success("Preview generated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to generate preview");
    } finally {
      setPreviewLoading(false);
    }
  }, [branding, selectedTemplate, success, showError]);

  const handleSave = useCallback(async () => {
    if (validationError) {
      showError(validationError);
      return;
    }
    setSaving(true);
    try {
      const data = await authJson<{ id: string; publicId?: string }>("/api/tracking-page", {
        action: "save",
        storeId: selectedStoreId,
        storeName: branding.businessName.trim(),
        template: selectedTemplate,
        branding,
        upsells: POSITIONS.map((position) => ({ position, ...upsellSlots[position] })),
        enabled: true,
      });
      setActivePublicId(data.publicId || "");
      mutateConfigs();
      success("Tracking page saved — copy the embed code to publish it");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed to save tracking page");
    } finally {
      setSaving(false);
    }
  }, [validationError, selectedStoreId, branding, selectedTemplate, upsellSlots, mutateConfigs, success, showError]);

  const handleLoad = useCallback(
    (config: TrackingPageConfig) => {
      setSelectedTemplate(config.template || "modern");
      setSelectedStoreId(config.storeId || "");
      setBranding({
        logoUrl: config.branding?.logoUrl || "",
        primaryColor: config.branding?.primaryColor || "#6366f1",
        secondaryColor: config.branding?.secondaryColor || "#818cf8",
        backgroundColor: config.branding?.backgroundColor || "#f8fafc",
        fontFamily: config.branding?.fontFamily || "Inter",
        businessName: config.branding?.businessName || "",
        supportEmail: config.branding?.supportEmail || "",
        supportUrl: config.branding?.supportUrl || "",
      });
      const slots: Record<UpsellPosition, UpsellDraft> = {
        header: { ...EMPTY_SLOT },
        progress_bar: { ...EMPTY_SLOT },
        delivery_info: { ...EMPTY_SLOT },
        footer: { ...EMPTY_SLOT },
      };
      (config.upsells || []).forEach((u) => {
        if (slots[u.position]) {
          slots[u.position] = {
            enabled: u.enabled,
            productTitle: u.productTitle || "",
            productUrl: u.productUrl || "",
            discount: u.discount || 0,
            ctaText: u.ctaText || "Shop now",
          };
        }
      });
      setUpsellSlots(slots);
      setActivePublicId(config.publicId || "");
      setActiveTab("config");
      success("Config loaded — edit and save to update");
    },
    [success]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget.id);
    try {
      await authJson(`/api/tracking-page?id=${encodeURIComponent(deleteTarget.id)}`, undefined, "DELETE");
      success("Tracking page deleted");
      if (deleteTarget.publicId && deleteTarget.publicId === activePublicId) setActivePublicId("");
      setDeleteTarget(null);
      mutateConfigs();
    } catch (err) {
      showError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeletingId(null);
    }
  }, [deleteTarget, activePublicId, mutateConfigs, success, showError]);

  const handleCopyEmbed = useCallback(async () => {
    if (!activePublicId) {
      showError("Save your tracking page first to get an embed code");
      return;
    }
    const embed = `<iframe src="${window.location.origin}/t/${activePublicId}" width="100%" height="800" frameborder="0" style="border:0;" title="Order Tracking" loading="lazy"></iframe>`;
    const ok = await copyToClipboard(embed);
    if (!ok) {
      showError("Couldn't copy to clipboard");
      return;
    }
    setCopied(true);
    success("Embed code copied!");
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(false), 2000);
  }, [activePublicId, success, showError]);

  const updateSlot = useCallback((position: UpsellPosition, patch: Partial<UpsellDraft>) => {
    setUpsellSlots((prev) => ({ ...prev, [position]: { ...prev[position], ...patch } }));
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Package className="h-6 w-6 text-accent" />
          Branded Tracking Page
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Create a custom tracking page that reduces support tickets and drives upsells.
        </p>
      </div>

      {/* Stats */}
      <DataState isLoading={statsLoading} error={statsError} label="your analytics" onRetry={() => mutateStats()} />
      {!statsLoading && !statsError && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Page Views", value: stats.totalViews.toLocaleString() },
            { label: "Upsell CTR", value: `${stats.upsellClickRate}%` },
            { label: "Upsell CVR", value: `${stats.upsellConversionRate}%` },
            { label: "Tickets Saved", value: stats.supportTicketReduction.toLocaleString() },
          ].map((s) => (
            <div key={s.label} className="glass rounded-xl p-3">
              <span className="text-[10px] text-muted-foreground uppercase">{s.label}</span>
              <div className="font-display text-lg font-bold text-foreground mt-0.5">{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[
          { id: "templates" as const, label: "Templates", icon: Palette },
          { id: "config" as const, label: "Branding", icon: Globe },
          { id: "upsells" as const, label: "Upsells", icon: Megaphone },
          { id: "stats" as const, label: "Analytics", icon: BarChart3 },
          { id: "preview" as const, label: "Preview", icon: Eye },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} aria-pressed={activeTab === tab.id}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id ? "bg-accent/10 text-accent border border-accent/20" : "bg-surface border border-border text-muted-foreground hover:text-foreground"
            }`}>
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          <DataState isLoading={templatesLoading} error={templatesError} label="templates" onRetry={() => mutateTemplates()} />
          {!templatesLoading && !templatesError && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((t) => (
                <button key={t.id} onClick={() => setSelectedTemplate(t.id)} aria-pressed={selectedTemplate === t.id}
                  className={`glass rounded-2xl p-5 text-left transition-all ${
                    selectedTemplate === t.id ? "border-accent/40 bg-accent/5" : "hover:border-accent/10"
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-display text-sm font-semibold text-foreground">{t.name}</h4>
                    {selectedTemplate === t.id && <Check className="h-4 w-4 text-accent" />}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{t.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {t.features.map((f) => (
                      <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">{f}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Saved tracking pages */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-1">Saved Tracking Pages</h3>
            <p className="text-xs text-muted-foreground mb-3">Load a saved configuration to edit it, or delete pages you no longer use.</p>
            <DataState isLoading={configsLoading} error={configsError} label="saved pages" onRetry={() => mutateConfigs()} />
            {!configsLoading && !configsError && configs.length === 0 && (
              <p className="text-xs text-muted-foreground">No saved tracking pages yet — configure branding in the Branding tab and hit Save.</p>
            )}
            {!configsLoading && !configsError && configs.length > 0 && (
              <div className="space-y-2">
                {configs.map((config) => (
                  <div key={config.id} className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border/50 gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-foreground truncate">{config.branding?.businessName || config.storeName || config.storeId}</p>
                      <p className="text-xs text-muted-foreground">
                        {config.template} • {config.enabled !== false ? "Enabled" : "Disabled"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => handleLoad(config)}
                        aria-label="Edit this tracking page" title="Edit"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all">
                        <Palette className="h-3.5 w-3.5" />
                      </button>
                      {config.publicId && (
                        <a
                          href={`/t/${config.publicId}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label="Open public tracking page" title="Open public page"
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                      <button onClick={() => setDeleteTarget(config)} disabled={deletingId === config.id}
                        aria-label="Delete this tracking page" title="Delete"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50">
                        {deletingId === config.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Branding Config */}
      {activeTab === "config" && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-sm font-semibold text-foreground">Brand Settings</h3>

          {/* Store selector */}
          <div>
            <label htmlFor="tp-store" className="block text-xs font-medium text-muted-foreground mb-1.5">Store *</label>
            {storesLoading ? (
              <p className="text-xs text-muted-foreground flex items-center gap-2 py-2"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading stores…</p>
            ) : storesError ? (
              <div className="flex items-center gap-2 py-2">
                <span className="text-xs text-red-400">Couldn&apos;t load stores.</span>
                <button onClick={() => mutateStores()} className="text-xs text-accent hover:underline inline-flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" /> Retry
                </button>
              </div>
            ) : stores.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No stores connected yet — connect one from the Stores page first.</p>
            ) : (
              <select
                id="tp-store"
                value={selectedStoreId}
                onChange={(e) => setSelectedStoreId(e.target.value)}
                className={inputClass}
              >
                <option value="">Select a store…</option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name || store.id} ({store.platform})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tp-business" className="block text-xs font-medium text-muted-foreground mb-1.5">Business Name *</label>
              <input id="tp-business" type="text" value={branding.businessName} maxLength={100}
                onChange={(e) => setBranding({ ...branding, businessName: e.target.value })}
                placeholder="My Store" className={inputClass} />
            </div>
            <div>
              <label htmlFor="tp-logo" className="block text-xs font-medium text-muted-foreground mb-1.5">Logo URL</label>
              <input id="tp-logo" type="url" value={branding.logoUrl} maxLength={500}
                onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png" className={inputClass} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { key: "primaryColor" as const, label: "Primary Color" },
              { key: "secondaryColor" as const, label: "Secondary Color" },
              { key: "backgroundColor" as const, label: "Background Color" },
            ]).map((field) => (
              <div key={field.key}>
                <label htmlFor={`tp-${field.key}-text`} className="block text-xs font-medium text-muted-foreground mb-1.5">{field.label}</label>
                <div className="flex gap-2">
                  <input id={`tp-${field.key}-picker`} type="color" aria-label={`${field.label} picker`}
                    value={HEX_RE.test(branding[field.key]) ? branding[field.key] : "#000000"}
                    onChange={(e) => setBranding({ ...branding, [field.key]: e.target.value })}
                    className="w-10 h-10 rounded-lg border border-border cursor-pointer shrink-0" />
                  <input id={`tp-${field.key}-text`} type="text" aria-label={`${field.label} hex value`} value={branding[field.key]} maxLength={7}
                    onChange={(e) => setBranding({ ...branding, [field.key]: e.target.value })}
                    className={`flex-1 min-w-0 px-3 py-2 rounded-xl bg-surface border text-sm text-foreground font-mono focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all ${
                      HEX_RE.test(branding[field.key]) ? "border-border" : "border-red-500/50"
                    }`} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="tp-support-email" className="block text-xs font-medium text-muted-foreground mb-1.5">Support Email</label>
              <input id="tp-support-email" type="email" value={branding.supportEmail} maxLength={200}
                onChange={(e) => setBranding({ ...branding, supportEmail: e.target.value })}
                placeholder="support@mystore.com" className={inputClass} />
            </div>
            <div>
              <label htmlFor="tp-support-url" className="block text-xs font-medium text-muted-foreground mb-1.5">Support URL</label>
              <input id="tp-support-url" type="url" value={branding.supportUrl} maxLength={500}
                onChange={(e) => setBranding({ ...branding, supportUrl: e.target.value })}
                placeholder="https://mystore.com/support" className={inputClass} />
            </div>
          </div>

          <div className="sm:w-1/2">
            <label htmlFor="tp-font" className="block text-xs font-medium text-muted-foreground mb-1.5">Font Family</label>
            <select id="tp-font" value={branding.fontFamily} onChange={(e) => setBranding({ ...branding, fontFamily: e.target.value })} className={inputClass}>
              {FONT_OPTIONS.map((font) => (
                <option key={font} value={font}>{font}</option>
              ))}
            </select>
          </div>

          {validationError && (
            <p className="text-xs text-red-400 flex items-center gap-1.5">
              <AlertCircle className="h-3 w-3" /> {validationError}
            </p>
          )}
          {activePublicId && !validationError && (
            <p className="text-xs text-emerald-400 flex items-center gap-1.5">
              <Check className="h-3 w-3" /> Saved — public page: /t/{activePublicId}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button onClick={handlePreview} disabled={previewLoading}
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-surface border border-border text-sm text-foreground font-medium hover:border-accent/20 transition-all disabled:opacity-50">
              {previewLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Generate Preview
            </button>
            <button onClick={handleSave} disabled={saving || !!validationError}
              title={validationError || "Save tracking page"}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Tracking Page
            </button>
            <button onClick={handleCopyEmbed} disabled={!activePublicId}
              title={activePublicId ? "Copy the iframe embed code" : "Save your tracking page first to get an embed code"}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-all disabled:opacity-50">
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied!" : "Copy Embed Code"}
            </button>
          </div>
        </div>
      )}

      {/* Upsells */}
      {activeTab === "upsells" && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-sm font-semibold text-foreground">Upsell Slots</h3>
          <p className="text-xs text-muted-foreground">
            Add products to show as upsells on your tracking page. Customers see these while waiting for delivery.
            Configure each slot, then hit Save on the Branding tab.
          </p>
          <div className="space-y-3">
            {POSITIONS.map((position) => {
              const slot = upsellSlots[position];
              return (
                <div key={position} className="p-3 rounded-xl bg-surface/50 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <Megaphone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground capitalize">{position.replace(/_/g, " ")} Slot</p>
                        <p className="text-xs text-muted-foreground">Show an upsell product in this position</p>
                      </div>
                    </div>
                    <button
                      onClick={() => updateSlot(position, { enabled: !slot.enabled })}
                      role="switch"
                      aria-checked={slot.enabled}
                      aria-label={`${position.replace(/_/g, " ")} upsell slot`}
                      className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all shrink-0"
                    >
                      {slot.enabled ? <ToggleRight className="h-5 w-5 text-accent" /> : <ToggleLeft className="h-5 w-5" />}
                    </button>
                  </div>
                  {slot.enabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label htmlFor={`us-${position}-title`} className="block text-[10px] font-medium text-muted-foreground mb-1">Product Title</label>
                        <input id={`us-${position}-title`} type="text" value={slot.productTitle} maxLength={200}
                          onChange={(e) => updateSlot(position, { productTitle: e.target.value })}
                          placeholder="e.g. Pro Wireless Earbuds" className={inputClass} />
                      </div>
                      <div>
                        <label htmlFor={`us-${position}-url`} className="block text-[10px] font-medium text-muted-foreground mb-1">Product URL</label>
                        <input id={`us-${position}-url`} type="url" value={slot.productUrl} maxLength={500}
                          onChange={(e) => updateSlot(position, { productUrl: e.target.value })}
                          placeholder="https://mystore.com/product" className={inputClass} />
                      </div>
                      <div>
                        <label htmlFor={`us-${position}-discount`} className="block text-[10px] font-medium text-muted-foreground mb-1">Discount %</label>
                        <input id={`us-${position}-discount`} type="number" min={0} max={100} value={slot.discount}
                          onChange={(e) => updateSlot(position, { discount: Math.max(0, Math.min(100, Number(e.target.value) || 0)) })}
                          className={inputClass} />
                      </div>
                      <div>
                        <label htmlFor={`us-${position}-cta`} className="block text-[10px] font-medium text-muted-foreground mb-1">CTA Text</label>
                        <input id={`us-${position}-cta`} type="text" value={slot.ctaText} maxLength={100}
                          onChange={(e) => updateSlot(position, { ctaText: e.target.value })}
                          placeholder="Shop now" className={inputClass} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Analytics detail */}
      {activeTab === "stats" && !statsLoading && !statsError && stats && (
        <div className="space-y-4">
          {stats.topCountries.length === 0 && stats.deviceBreakdown.length === 0 ? (
            <div className="glass rounded-2xl p-12 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No tracking page views yet</p>
              <p className="text-xs text-muted-foreground mt-1">Save your page, copy the embed code, and add it to your store — views will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="glass rounded-2xl p-5">
                <h4 className="text-sm font-semibold text-foreground mb-3">Top Countries</h4>
                <div className="space-y-2">
                  {stats.topCountries.map((c) => (
                    <div key={c.country} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{c.country}</span>
                      <span className="text-sm text-muted-foreground">{c.views}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="glass rounded-2xl p-5">
                <h4 className="text-sm font-semibold text-foreground mb-3">Device Breakdown</h4>
                <div className="space-y-2">
                  {stats.deviceBreakdown.map((d) => (
                    <div key={d.device} className="flex items-center justify-between">
                      <span className="text-sm text-foreground capitalize">{d.device}</span>
                      <span className="text-sm text-muted-foreground">{d.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {activeTab === "preview" && (
        <div className="glass rounded-2xl overflow-hidden">
          {previewHtml ? (
            <>
              <p className="text-xs text-muted-foreground px-4 py-2 border-b border-border/50">
                Sample order data — the saved page renders real order info passed via query params.
              </p>
              {/* sandboxed: user-shaped content must not run with the app's origin */}
              <iframe srcDoc={previewHtml} sandbox="" className="w-full h-[600px] border-0" title="Tracking Page Preview" />
            </>
          ) : (
            <div className="p-12 text-center">
              <Eye className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Configure branding and click &quot;Generate Preview&quot;</p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete tracking page?"
        description={`This removes the branded tracking page for "${deleteTarget?.branding?.businessName || deleteTarget?.storeName || "this store"}". Customers with the old link will see a "not found" page.`}
        confirmLabel="Delete"
        danger
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

