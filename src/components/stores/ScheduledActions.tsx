"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import { safeFetch } from "@/lib/safe-fetch";
import { SWR_REFRESH_INTERVALS } from "@/components/stores/constants";
import {
  Clock, Plus, Trash2, Loader2, Play, Pause, RotateCcw,
  RefreshCw, Send, BarChart3, Zap, CheckCircle2,
} from "lucide-react";
import type { ConnectedStore } from "@/components/stores/ConnectedStoresList";

interface ScheduledAction {
  id: string;
  name: string;
  type: "sync_inventory" | "push_products" | "sync_orders" | "generate_report" | "optimize_listings";
  storeIds: string[];
  schedule: { frequency: "hourly" | "daily" | "weekly" | "monthly"; time?: string; dayOfWeek?: number };
  enabled: boolean;
  lastRun?: string;
  nextRun?: string;
  status?: "running" | "success" | "failed";
}

interface Props {
  connections: ConnectedStore[];
}

const ACTION_TYPES = [
  { value: "sync_inventory", label: "Sync Inventory", icon: RefreshCw, color: "text-blue-400" },
  { value: "push_products", label: "Push Products", icon: Send, color: "text-accent" },
  { value: "sync_orders", label: "Sync Orders", icon: RotateCcw, color: "text-emerald-400" },
  { value: "generate_report", label: "Generate Report", icon: BarChart3, color: "text-purple-400" },
  { value: "optimize_listings", label: "Optimize Listings", icon: Zap, color: "text-amber-400" },
] as const;

const FREQUENCIES = [
  { value: "hourly", label: "Every hour" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

export default function ScheduledActions({ connections }: Props) {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const uid = user?.uid || "";
  const { data: actionsData, mutate: refetchActions } = useAPI<{ actions?: ScheduledAction[] }>(
    uid ? `/api/store/scheduled-actions?uid=${uid}` : null,
    { refreshInterval: SWR_REFRESH_INTERVALS.default }
  );
  const actions = actionsData?.actions || [];

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "sync_inventory" as ScheduledAction["type"],
    storeIds: [] as string[],
    frequency: "daily" as ScheduledAction["schedule"]["frequency"],
    time: "09:00",
  });
  const [saving, setSaving] = useState(false);

  const connectedStores = connections.filter((c) => c.status === "connected");

  const handleCreate = useCallback(async () => {
    if (!form.name || form.storeIds.length === 0) {
      toastError("Please fill in all required fields");
      return;
    }
    setSaving(true);
    try {
      const token = await user?.getIdToken();
      const result = await safeFetch<{ success?: boolean; error?: string }>("/api/store/scheduled-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          uid,
          name: form.name,
          type: form.type,
          storeIds: form.storeIds,
          schedule: { frequency: form.frequency, time: form.time },
        }),
      });
      if (result?.success) {
        success("Scheduled action created");
        setShowForm(false);
        setForm({ name: "", type: "sync_inventory", storeIds: [], frequency: "daily", time: "09:00" });
        refetchActions();
      } else {
        toastError(result?.error || "Failed to create action");
      }
    } catch {
      toastError("Failed to create action");
    }
    setSaving(false);
  }, [form, uid, user, success, toastError, refetchActions]);

  const handleToggle = useCallback(async (actionId: string, enabled: boolean) => {
    try {
      const token = await user?.getIdToken();
      await safeFetch("/api/store/scheduled-actions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ uid, actionId, enabled }),
      });
      refetchActions();
    } catch {
      toastError("Failed to update action");
    }
  }, [uid, user, toastError, refetchActions]);

  const handleDelete = useCallback(async (actionId: string) => {
    try {
      const token = await user?.getIdToken();
      await safeFetch("/api/store/scheduled-actions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ uid, actionId }),
      });
      success("Action deleted");
      refetchActions();
    } catch {
      toastError("Failed to delete action");
    }
  }, [uid, user, success, toastError, refetchActions]);

  const handleRunNow = useCallback(async (actionId: string) => {
    try {
      const token = await user?.getIdToken();
      await safeFetch("/api/store/scheduled-actions/run", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ uid, actionId }),
      });
      success("Action triggered");
      refetchActions();
    } catch {
      toastError("Failed to run action");
    }
  }, [uid, user, success, toastError, refetchActions]);

  const toggleStoreId = (storeId: string) => {
    setForm((prev) => ({
      ...prev,
      storeIds: prev.storeIds.includes(storeId)
        ? prev.storeIds.filter((id) => id !== storeId)
        : [...prev.storeIds, storeId],
    }));
  };

  const getActionInfo = (type: string) => ACTION_TYPES.find((a) => a.value === type) || ACTION_TYPES[0];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-semibold text-foreground">Scheduled Actions</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Automate recurring tasks across your stores</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-all"
        >
          <Plus className="h-3.5 w-3.5" />
          New Action
        </button>
      </div>

      {showForm && (
        <div className="glass rounded-2xl border border-border p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Action Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Daily inventory sync"
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Action Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as ScheduledAction["type"] })}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-accent/50"
              >
                {ACTION_TYPES.map((a) => (
                  <option key={a.value} value={a.value}>{a.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Select Stores</label>
            <div className="flex flex-wrap gap-2">
              {connectedStores.map((store) => (
                <button
                  key={store.id}
                  onClick={() => toggleStoreId(store.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    form.storeIds.includes(store.id)
                      ? "bg-accent/10 border-accent/30 text-accent"
                      : "bg-surface border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {store.name}
                </button>
              ))}
              {connectedStores.length === 0 && (
                <p className="text-[10px] text-muted-foreground">No connected stores available</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value as ScheduledAction["schedule"]["frequency"] })}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-accent/50"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
            {form.frequency !== "hourly" && (
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Time</label>
                <input
                  type="time"
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-xs text-foreground focus:outline-none focus:border-accent/50"
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
              disabled={saving || !form.name || form.storeIds.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-all disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              Create Action
            </button>
          </div>
        </div>
      )}

      {actions.length === 0 ? (
        <div className="glass rounded-2xl p-8 text-center border border-border">
          <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-xs font-medium text-foreground mb-1">No scheduled actions</p>
          <p className="text-[10px] text-muted-foreground">Create an action to automate tasks</p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((action) => {
            const info = getActionInfo(action.type);
            return (
              <div key={action.id} className="glass rounded-xl border border-border p-3 flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-surface">
                  <info.icon className={`h-4 w-4 ${info.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-foreground truncate">{action.name}</p>
                    {action.status === "running" && <Loader2 className="h-3 w-3 animate-spin text-accent" />}
                    {action.status === "success" && <CheckCircle2 className="h-3 w-3 text-emerald-400" />}
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    {FREQUENCIES.find((f) => f.value === action.schedule.frequency)?.label}
                    {action.schedule.time && ` at ${action.schedule.time}`}
                    {action.lastRun && ` · Last run: ${new Date(action.lastRun).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleRunNow(action.id)}
                    className="p-1.5 rounded-lg text-accent hover:bg-accent/10 transition-all"
                    title="Run now"
                  >
                    <Play className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleToggle(action.id, !action.enabled)}
                    className={`p-1.5 rounded-lg transition-all ${action.enabled ? "text-accent bg-accent/10" : "text-muted-foreground bg-surface"}`}
                    title={action.enabled ? "Pause" : "Resume"}
                  >
                    {action.enabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => handleDelete(action.id)}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-all"
                    title="Delete action"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
