"use client";

import { useState, useCallback } from "react";
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
} from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import type { TrackingPageConfig, TrackingPageTemplate, TrackingPageStats, TrackingPageTemplateOption } from "@/types/tracking-page";

export default function TrackingPageManager() {
  const [activeTab, setActiveTab] = useState<"templates" | "config" | "upsells" | "stats" | "preview">("templates");
  const [loading, setLoading] = useState(false);
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
    socialLinks: {} as Record<string, string>,
  });
  const [copied, setCopied] = useState(false);
  const { success, error: showError } = useToast();

  const { data: templatesData } = useAPI<{ templates: TrackingPageTemplateOption[] }>("/api/tracking-page?type=templates");
  const { data: configsData, mutate: mutateConfigs } = useAPI<{ configs: TrackingPageConfig[] }>("/api/tracking-page?type=list");
  const { data: statsData } = useAPI<{ stats: TrackingPageStats }>("/api/tracking-page?type=stats");

  const templates = templatesData?.templates || [];
  const configs = configsData?.configs || [];
  const stats = statsData?.stats;

  const handlePreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tracking-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "preview",
          storeName: branding.businessName || "My Store",
          branding: {
            primaryColor: branding.primaryColor,
            secondaryColor: branding.secondaryColor,
            logoUrl: branding.logoUrl,
            supportEmail: branding.supportEmail,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreviewHtml(data.html);
      setActiveTab("preview");
      success("Preview generated");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }, [branding, success, showError]);

  const handleCopyEmbed = () => {
    const embed = `<iframe src="https://tracking.dropshiphub.com/${branding.businessName?.toLowerCase().replace(/\s+/g, "-") || "store"}" width="100%" height="800" frameborder="0"></iframe>`;
    navigator.clipboard.writeText(embed);
    setCopied(true);
    success("Embed code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

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
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Page Views", value: stats.totalViews.toLocaleString() },
            { label: "Upsell CTR", value: `${stats.upsellClickRate}%` },
            { label: "Upsell CVR", value: `${stats.upsellConversionRate}%` },
            { label: "Tickets Saved", value: stats.supportTicketReduction },
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
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((t) => (
            <button key={t.id} onClick={() => setSelectedTemplate(t.id)}
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

      {/* Branding Config */}
      {activeTab === "config" && (
        <div className="glass rounded-2xl p-5 space-y-4">
          <h3 className="font-display text-sm font-semibold text-foreground">Brand Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Business Name</label>
              <input type="text" value={branding.businessName} onChange={(e) => setBranding({ ...branding, businessName: e.target.value })}
                placeholder="My Store"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Logo URL</label>
              <input type="url" value={branding.logoUrl} onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                placeholder="https://example.com/logo.png"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Primary Color</label>
              <div className="flex gap-2">
                <input type="color" value={branding.primaryColor} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                <input type="text" value={branding.primaryColor} onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Support Email</label>
              <input type="email" value={branding.supportEmail} onChange={(e) => setBranding({ ...branding, supportEmail: e.target.value })}
                placeholder="support@mystore.com"
                className="w-full px-3 py-2.5 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handlePreview} disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-semibold text-sm transition-all disabled:opacity-50">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
              Generate Preview
            </button>
            <button onClick={handleCopyEmbed}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-surface border border-border text-sm text-muted-foreground hover:text-foreground transition-all">
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
          <p className="text-xs text-muted-foreground">Add products to show as upsells on your tracking page. Customers see these while waiting for delivery.</p>
          <div className="space-y-3">
            {["header", "progress_bar", "delivery_info", "footer"].map((position) => (
              <div key={position} className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border/50">
                <div className="flex items-center gap-3">
                  <Megaphone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium text-foreground capitalize">{position.replace(/_/g, " ")} Slot</p>
                    <p className="text-xs text-muted-foreground">Show an upsell product in this position</p>
                  </div>
                </div>
                <button className="p-2 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-all">
                  <ToggleLeft className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stats */}
      {activeTab === "stats" && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3">Top Countries</h4>
              {stats.topCountries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.topCountries.map((c) => (
                    <div key={c.country} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{c.country}</span>
                      <span className="text-sm text-muted-foreground">{c.views}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="glass rounded-2xl p-5">
              <h4 className="text-sm font-semibold text-foreground mb-3">Device Breakdown</h4>
              {stats.deviceBreakdown.length === 0 ? (
                <p className="text-xs text-muted-foreground">No data yet</p>
              ) : (
                <div className="space-y-2">
                  {stats.deviceBreakdown.map((d) => (
                    <div key={d.device} className="flex items-center justify-between">
                      <span className="text-sm text-foreground">{d.device}</span>
                      <span className="text-sm text-muted-foreground">{d.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      {activeTab === "preview" && (
        <div className="glass rounded-2xl overflow-hidden">
          {previewHtml ? (
            <iframe srcDoc={previewHtml} className="w-full h-[600px] border-0" title="Tracking Page Preview" />
          ) : (
            <div className="p-12 text-center">
              <Eye className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Configure branding and click "Generate Preview"</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
