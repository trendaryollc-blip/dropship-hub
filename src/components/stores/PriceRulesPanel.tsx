"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import { safeFetch } from "@/lib/safe-fetch";
import { SWR_REFRESH_INTERVALS } from "@/components/stores/constants";
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Trash2, Loader2,
  Bell, BellOff, Edit3, Save, X,
} from "lucide-react";
import type { ConnectedStore } from "@/components/stores/ConnectedStoresList";

interface PriceRule {
  id: string;
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  rule: "below" | "above" | "changed";
  targetPrice?: number;
  enabled: boolean;
  lastTriggered?: string;
}

interface Props {
  connections: ConnectedStore[];
}

export default function PriceRulesPanel({ connections }: Props) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const uid = user?.uid || "";
  const { data: rulesData, mutate: refetchRules } = useAPI<{ rules?: PriceRule[] }>(
    uid ? `/api/store/price-rules?uid=${uid}` : null,
    { refreshInterval: SWR_REFRESH_INTERVALS.default }
  );
  const rules = rulesData?.rules || [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ productId: "", storeId: "", rule: "below" as "below" | "above" | "changed", targetPrice: "" });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");

  const handleCreate = useCallback(async () => {
    if (!form.productId || !form.storeId) {
      toastError("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const result = await safeFetch<{ success?: boolean; error?: string }>("/api/store/price-rules", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          uid,
          productId: form.productId,
          storeId: form.storeId,
          rule: form.rule,
          targetPrice: form.targetPrice ? Number(form.targetPrice) : undefined,
        }),
      });
      if (result?.success) {
        success("Price rule created");
        setShowForm(false);
        setForm({ productId: "", storeId: "", rule: "below", targetPrice: "" });
        refetchRules();
      } else {
        toastError(result?.error || "Failed to create rule");
      }
    } catch {
      toastError("Failed to create rule");
    }
    setSaving(false);
  }, [form, uid, user, success, toastError, refetchRules]);

  const handleToggle = useCallback(async (ruleId: string, enabled: boolean) => {
    try {
      const token = await user?.getIdToken();
      await safeFetch("/api/store/price-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ uid, ruleId, enabled }),
      });
      refetchRules();
    } catch {
      toastError("Failed to update rule");
    }
  }, [uid, user, toastError, refetchRules]);

  const handleDelete = useCallback(async (ruleId: string) => {
    try {
      const token = await user?.getIdToken();
      await safeFetch("/api/store/price-rules", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ uid, ruleId }),
      });
      success("Rule deleted");
      refetchRules();
    } catch {
      toastError("Failed to delete rule");
    }
  }, [uid, user, success, toastError, refetchRules]);

  const handleUpdatePrice = useCallback(async (ruleId: string) => {
    try {
      const token = await user?.getIdToken();
      await safeFetch("/api/store/price-rules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ uid, ruleId, targetPrice: Number(editPrice) }),
      });
      setEditingId(null);
      refetchRules();
    } catch {
      toastError("Failed to update price");
    }
  }, [uid, user, editPrice, toastError, refetchRules]);

  const ruleIcon = (rule: string) => {
    switch (rule) {
      case "below": return <TrendingDown className="h-4 w-4 text-emerald-400" />;
      case "above": return <TrendingUp className="h-4 w-4 text-red-400" />;
      default: return <DollarSign className="h-4 w-4 text-blue-400" />;
    }
  };

  const ruleLabel = (rule: string) => {
    switch (rule) {
      case "below": return "Price drops below";
      case "above": return "Price rises above";
      default: return "Price changes";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Price Monitoring Rules</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Get notified when prices change</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Rule
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-2xl border border-border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Product ID</label>
              <input
                type="text"
                value={form.productId}
                onChange={(e) => setForm({ ...form, productId: e.target.value })}
                placeholder="Enter product ID"
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Store</label>
              <select
                value={form.storeId}
                onChange={(e) => setForm({ ...form, storeId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-accent/50"
              >
                <option value="">Select store</option>
                {connections.filter((c) => c.status === "connected").map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Rule Type</label>
              <select
                value={form.rule}
                onChange={(e) => setForm({ ...form, rule: e.target.value as "below" | "above" | "changed" })}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-accent/50"
              >
                <option value="below">Price drops below</option>
                <option value="above">Price rises above</option>
                <option value="changed">Any price change</option>
              </select>
            </div>
            {form.rule !== "changed" && (
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Target Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.targetPrice}
                  onChange={(e) => setForm({ ...form, targetPrice: e.target.value })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
                />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 rounded-xl bg-surface border border-border text-xs text-muted-foreground hover:text-foreground transition-all">
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !form.productId || !form.storeId}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              Create Rule
            </button>
          </div>
        </div>
      )}

      {rules.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center border border-border">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs font-medium text-foreground mb-1">No price rules</p>
          <p className="text-[10px] text-muted-foreground">Create a rule to monitor product prices</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div key={rule.id} className="glass rounded-xl border border-border p-3 flex items-center gap-3">
              <div className="p-1.5 rounded-lg bg-surface">{ruleIcon(rule.rule)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{rule.productName || rule.productId}</p>
                <p className="text-[10px] text-muted-foreground">
                  {ruleLabel(rule.rule)}
                  {rule.targetPrice != null && (
                    editingId === rule.id ? (
                      <span className="inline-flex items-center gap-1 ml-1">
                        <input
                          type="number"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="w-20 px-1.5 py-0.5 rounded bg-surface border border-border text-[10px] focus:outline-none"
                          autoFocus
                        />
                        <button onClick={() => handleUpdatePrice(rule.id)} className="text-emerald-400"><Save className="h-3 w-3" /></button>
                        <button onClick={() => setEditingId(null)} className="text-muted-foreground"><X className="h-3 w-3" /></button>
                      </span>
                    ) : (
                      <span className="ml-1">
                        ${rule.targetPrice.toLocaleString()}
                        <button onClick={() => { setEditingId(rule.id); setEditPrice(String(rule.targetPrice)); }} className="ml-1 text-muted-foreground hover:text-foreground">
                          <Edit3 className="h-2.5 w-2.5 inline" />
                        </button>
                      </span>
                    )
                  )}
                  <span className="text-muted-foreground"> on {rule.storeName}</span>
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggle(rule.id, !rule.enabled)}
                  className={`p-1.5 rounded-lg transition-all ${rule.enabled ? "text-accent bg-accent/10" : "text-muted-foreground bg-surface"}`}
                  title={rule.enabled ? "Disable rule" : "Enable rule"}
                >
                  {rule.enabled ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-all"
                  title="Delete rule"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
