"use client";

import React, { useState, useEffect, useCallback } from "react";
import { safeFetch } from "@/lib/safe-fetch";
import type { AutoModeRule, ToolCategory } from "@/lib/ai/types";

// ─── Auto Rules Panel ────────────────────────────────────────────────────────

export function AutoRulesPanel() {
  const [rules, setRules] = useState<AutoModeRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      const res = await safeFetch<{ rules: AutoModeRule[] }>("/api/ai/modes?action=rules");
      if (res?.rules) setRules(res.rules);
    } catch {
      console.error("Failed to fetch auto rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const toggleRule = async (ruleId: string, enabled: boolean) => {
    await safeFetch("/api/ai/modes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_rule", ruleId, enabled }),
    });
    fetchRules();
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm("Delete this auto rule?")) return;
    await safeFetch("/api/ai/modes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_rule", ruleId }),
    });
    fetchRules();
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Auto Mode Rules</h3>
          <p className="text-xs text-neutral-500 mt-0.5">Automated tool execution triggers</p>
        </div>
        <button
          onClick={() => {}}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500"
        >
          + Add Rule
        </button>
      </div>

      {/* Rules List */}
      <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-6 text-neutral-500 text-sm">Loading rules...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-neutral-500 text-sm">No auto rules configured</p>
            <p className="text-neutral-600 text-xs mt-1">Create rules to automate tool execution</p>
          </div>
        ) : (
          rules.map((rule) => (
            <RuleItem
              key={rule.id}
              rule={rule}
              onToggle={toggleRule}
              onDelete={deleteRule}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ─── Rule Item ───────────────────────────────────────────────────────────────

function RuleItem({
  rule,
  onToggle,
  onDelete,
}: {
  rule: AutoModeRule;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const toolName = rule.toolId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const triggerLabel = rule.trigger === "schedule"
    ? `Schedule: ${rule.schedule}`
    : rule.trigger === "event"
    ? `Event: ${rule.event}`
    : `Threshold: ${rule.threshold?.field} ${rule.threshold?.operator} ${rule.threshold?.value}`;

  return (
    <div className={`p-3 rounded-lg border transition-colors ${
      rule.enabled
        ? "bg-green-500/5 border-green-500/20"
        : "bg-neutral-800/50 border-neutral-700/50"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggle(rule.id, !rule.enabled)}
            className={`relative w-9 h-5 rounded-full transition-colors ${
              rule.enabled ? "bg-green-600" : "bg-neutral-600"
            }`}
          >
            <div
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                rule.enabled ? "left-[18px]" : "left-0.5"
              }`}
            />
          </button>
          <div>
            <p className="text-sm font-medium text-white">{toolName}</p>
            <p className="text-xs text-neutral-400">{triggerLabel}</p>
          </div>
        </div>

        <button
          onClick={() => onDelete(rule.id)}
          className="p-1.5 text-neutral-500 hover:text-red-400 rounded transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>

      {/* Last run */}
      {rule.lastRunAt && (
        <p className="text-[10px] text-neutral-600 mt-2">
          Last run: {new Date(rule.lastRunAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}

// ─── Create Rule Form ────────────────────────────────────────────────────────

export function CreateRuleForm({ onClose }: { onClose: () => void }) {
  const [toolId, setToolId] = useState("");
  const [trigger, setTrigger] = useState<"schedule" | "event" | "threshold">("schedule");
  const [schedule, setSchedule] = useState("daily");
  const [event, setEvent] = useState("");
  const [thresholdField, setThresholdField] = useState("");
  const [thresholdOperator, setThresholdOperator] = useState<"greater_than" | "less_than" | "equals">("greater_than");
  const [thresholdValue, setThresholdValue] = useState(0);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const rule: Omit<AutoModeRule, "id" | "uid" | "lastRunAt" | "nextRunAt" | "createdAt" | "updatedAt"> = {
      toolId,
      enabled: true,
      trigger,
      params: {},
      ...(trigger === "schedule" && { schedule }),
      ...(trigger === "event" && { event }),
      ...(trigger === "threshold" && {
        threshold: { field: thresholdField, operator: thresholdOperator, value: thresholdValue },
      }),
    };

    await safeFetch("/api/ai/modes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_rule", rule }),
    });

    setSaving(false);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
      <div>
        <label className="block text-xs text-neutral-400 mb-1">Tool</label>
        <select
          value={toolId}
          onChange={(e) => setToolId(e.target.value)}
          className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white"
          required
        >
          <option value="">Select a tool...</option>
          <optgroup label="Financial">
            <option value="calculate_profit">Calculate Profit</option>
            <option value="get_profit">Get Profit</option>
          </optgroup>
          <optgroup label="Monitoring">
            <option value="get_alerts">Get Alerts</option>
            <option value="monitor_price">Monitor Price</option>
          </optgroup>
          <optgroup label="Fulfillment">
            <option value="optimize_fulfillment">Optimize Fulfillment</option>
            <option value="sync_tracking">Sync Tracking</option>
          </optgroup>
        </select>
      </div>

      <div>
        <label className="block text-xs text-neutral-400 mb-1">Trigger Type</label>
        <div className="flex gap-2">
          {(["schedule", "event", "threshold"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTrigger(t)}
              className={`flex-1 px-3 py-2 text-xs rounded-lg border transition-colors ${
                trigger === t
                  ? "bg-blue-600/20 border-blue-500/50 text-blue-400"
                  : "bg-neutral-800 border-neutral-700 text-neutral-400"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {trigger === "schedule" && (
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Schedule</label>
          <select
            value={schedule}
            onChange={(e) => setSchedule(e.target.value)}
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white"
          >
            <option value="hourly">Every Hour</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
          </select>
        </div>
      )}

      {trigger === "event" && (
        <div>
          <label className="block text-xs text-neutral-400 mb-1">Event</label>
          <input
            type="text"
            value={event}
            onChange={(e) => setEvent(e.target.value)}
            placeholder="e.g., new_order, price_change"
            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500"
          />
        </div>
      )}

      {trigger === "threshold" && (
        <div className="grid grid-cols-3 gap-2">
          <input
            type="text"
            value={thresholdField}
            onChange={(e) => setThresholdField(e.target.value)}
            placeholder="Field"
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white placeholder-neutral-500"
          />
          <select
            value={thresholdOperator}
            onChange={(e) => setThresholdOperator(e.target.value as typeof thresholdOperator)}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white"
          >
            <option value="greater_than">&gt;</option>
            <option value="less_than">&lt;</option>
            <option value="equals">=</option>
          </select>
          <input
            type="number"
            value={thresholdValue}
            onChange={(e) => setThresholdValue(Number(e.target.value))}
            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-sm text-white"
          />
        </div>
      )}

      <div className="flex items-center gap-2 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !toolId}
          className="flex-1 px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Creating..." : "Create Rule"}
        </button>
      </div>
    </form>
  );
}
