"use client";

import React, { useState } from "react";
import { useAIMode } from "@/contexts/AIModeContext";
import type { ToolExecutionRecord } from "@/lib/ai/types";

// ─── Status Colors ───────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  pending: { bg: "bg-yellow-500/10", border: "border-yellow-500/30", text: "text-yellow-400", icon: "⏳", label: "Pending" },
  running: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", icon: "⚡", label: "Running" },
  completed: { bg: "bg-green-500/10", border: "border-green-500/30", text: "text-green-400", icon: "✅", label: "Done" },
  failed: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: "❌", label: "Failed" },
  cancelled: { bg: "bg-gray-500/10", border: "border-gray-500/30", text: "text-gray-400", icon: "🚫", label: "Cancelled" },
  awaiting_confirmation: { bg: "bg-orange-500/10", border: "border-orange-500/30", text: "text-orange-400", icon: "⚠️", label: "Awaiting" },
} as const;

// ─── Execution Item ──────────────────────────────────────────────────────────

function ExecutionItem({
  record,
  onConfirm,
  onCancel,
}: {
  record: ToolExecutionRecord;
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const config = STATUS_CONFIG[record.status] || STATUS_CONFIG.pending;
  const toolName = record.toolId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const duration = record.completedAt && record.startedAt
    ? `${((new Date(record.completedAt).getTime() - new Date(record.startedAt).getTime()) / 1000).toFixed(1)}s`
    : null;

  const inputSummary = Object.entries(record.input || {})
    .slice(0, 3)
    .map(([k, v]) => `${k}: ${typeof v === "string" && v.length > 30 ? v.slice(0, 30) + "..." : String(v)}`)
    .join(", ");

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-3 space-y-2`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span>{config.icon}</span>
          <span className="text-sm font-medium text-white">{toolName}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${config.text}`}>{config.label}</span>
          {duration && <span className="text-[10px] text-neutral-500">{duration}</span>}
        </div>
      </div>

      {/* Input Summary */}
      {inputSummary && (
        <p className="text-[11px] text-neutral-500 truncate">Input: {inputSummary}</p>
      )}

      {record.result?.summary && (
        <p className="text-xs text-neutral-400 line-clamp-2">{record.result.summary}</p>
      )}

      {record.error && record.error !== "confirmation_required" && (
        <p className="text-xs text-red-400">{record.error}</p>
      )}

      {/* Expandable Details */}
      {expanded && (
        <div className="mt-2 space-y-2">
          {Object.keys(record.input || {}).length > 0 && (
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Full Input</p>
              <pre className="text-[11px] text-neutral-400 bg-black/20 rounded p-2 overflow-x-auto max-h-24">
                {JSON.stringify(record.input, null, 2)}
              </pre>
            </div>
          )}
          {record.result?.data != null && typeof record.result.data === "object" && (
            <div>
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider mb-1">Result Data</p>
              <pre className="text-[11px] text-neutral-400 bg-black/20 rounded p-2 overflow-x-auto max-h-24">
                {JSON.stringify(record.result.data, null, 2) as string}
              </pre>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-neutral-500">
          <span>{new Date(record.startedAt).toLocaleTimeString()}</span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-neutral-500 hover:text-neutral-300 underline"
          >
            {expanded ? "Less" : "Details"}
          </button>
        </div>

        {record.status === "awaiting_confirmation" && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCancel?.(record.id)}
              className="px-2 py-1 text-xs rounded bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
            >
              Cancel
            </button>
            <button
              onClick={() => onConfirm?.(record.id)}
              className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
            >
              Confirm
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Tool Execution Panel ────────────────────────────────────────────────────

export function ToolExecutionPanel() {
  const { recentExecutions, pendingConfirmations, confirmAction, cancelAction, refreshRecent, refreshPending } = useAIMode();
  const [tab, setTab] = useState<"recent" | "pending">("recent");

  const handleConfirm = async (id: string) => {
    await confirmAction(id);
    refreshPending();
    refreshRecent();
  };

  const handleCancel = async (id: string) => {
    await cancelAction(id);
    refreshPending();
    refreshRecent();
  };

  const displayItems = tab === "pending" ? pendingConfirmations : recentExecutions;

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Tool Executions</h3>
          <div className="flex items-center gap-1">
            {pendingConfirmations.length > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-orange-500 text-white">
                {pendingConfirmations.length}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-2">
          <button
            onClick={() => setTab("recent")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              tab === "recent" ? "bg-neutral-700 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            Recent ({recentExecutions.length})
          </button>
          <button
            onClick={() => setTab("pending")}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              tab === "pending" ? "bg-orange-500/20 text-orange-400" : "text-neutral-400 hover:text-white"
            }`}
          >
            Pending ({pendingConfirmations.length})
          </button>
        </div>
      </div>

      {/* List */}
      <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
        {displayItems.length === 0 ? (
          <div className="text-center py-6 text-neutral-500 text-sm">
            {tab === "pending" ? "No pending confirmations" : "No recent executions"}
          </div>
        ) : (
          displayItems.map((record) => (
            <ExecutionItem
              key={record.id}
              record={record}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
            />
          ))
        )}
      </div>
    </div>
  );
}
