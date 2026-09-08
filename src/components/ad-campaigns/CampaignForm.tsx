"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useMutation, revalidate } from "@/hooks/useAPI";

interface CampaignFormProps {
  onClose: () => void;
}

const defaultMetrics = {
  impressions: 0,
  clicks: 0,
  conversions: 0,
  spend: 0,
  revenue: 0,
  roas: 0,
  cpc: 0,
  ctr: 0,
  conversionRate: 0,
};

export default function CampaignForm({ onClose }: CampaignFormProps) {
  const { trigger: createCampaign, isMutating } = useMutation("/api/ad-campaigns");
  const [form, setForm] = useState({
    name: "",
    platform: "manual" as "manual" | "facebook" | "google",
    productTitle: "",
    dailyBudget: 50,
    startDate: new Date().toISOString().split("T")[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createCampaign({
      body: {
        ...form,
        status: "draft",
        metrics: defaultMetrics,
      },
    });
    revalidate("/api/ad-campaigns");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-md border border-accent/20" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-lg font-semibold text-foreground">New Campaign</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface text-muted-foreground hover:text-foreground transition-all">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Campaign Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., Summer Sale - Facebook"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm focus:outline-none focus:border-accent/50 transition-all"
              required
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Platform</label>
            <select
              value={form.platform}
              onChange={(e) => setForm({ ...form, platform: e.target.value as typeof form.platform })}
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm focus:outline-none focus:border-accent/50 transition-all"
            >
              <option value="manual">Manual (No API)</option>
              <option value="facebook">Facebook Ads</option>
              <option value="google">Google Ads</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Product Title</label>
            <input
              type="text"
              value={form.productTitle}
              onChange={(e) => setForm({ ...form, productTitle: e.target.value })}
              placeholder="e.g., Wireless Earbuds Pro"
              className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm focus:outline-none focus:border-accent/50 transition-all"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Daily Budget ($)</label>
              <input
                type="number"
                value={form.dailyBudget}
                onChange={(e) => setForm({ ...form, dailyBudget: Number(e.target.value) })}
                min="1"
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm font-mono focus:outline-none focus:border-accent/50 transition-all"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Start Date</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm focus:outline-none focus:border-accent/50 transition-all"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl bg-surface border border-border text-sm font-medium text-muted-foreground hover:text-foreground transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isMutating || !form.name || !form.productTitle}
              className="flex-1 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-sm font-medium text-accent hover:bg-accent/20 transition-all disabled:opacity-50"
            >
              {isMutating ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
