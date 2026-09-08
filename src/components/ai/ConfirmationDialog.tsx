"use client";

import React from "react";
import type { ToolExecutionRecord } from "@/lib/ai/types";

// ─── Confirmation Dialog ─────────────────────────────────────────────────────
// Modal dialog for confirming dangerous tool executions.

interface ConfirmationDialogProps {
  record: ToolExecutionRecord;
  onConfirm: (executionId: string) => void;
  onCancel: (executionId: string) => void;
  onClose: () => void;
}

export function ConfirmationDialog({ record, onConfirm, onCancel, onClose }: ConfirmationDialogProps) {
  const toolName = record.toolId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const inputEntries = Object.entries(record.input).filter(([key]) => !key.startsWith("_"));

  // Extract dollar amount if present
  const dollarFields = ["price", "cost", "total", "amount", "revenue", "value", "budget"];
  const dollarEntry = inputEntries.find(([key]) =>
    dollarFields.some((f) => key.toLowerCase().includes(f))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-neutral-900 border border-neutral-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-800 bg-orange-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-xl">
              ⚠️
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Action Requires Confirmation</h2>
              <p className="text-sm text-neutral-400">This action may have side effects</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          {/* Tool name */}
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-1">Action</p>
            <p className="text-sm font-medium text-white">{toolName}</p>
          </div>

          {/* Input details */}
          <div>
            <p className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Details</p>
            <div className="bg-neutral-800/50 rounded-lg p-3 space-y-2">
              {inputEntries.map(([key, value]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-neutral-400 capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                  <span className="text-white font-mono">
                    {typeof value === "object" ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Dollar warning */}
          {dollarEntry && (
            <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <span className="text-orange-400 mt-0.5">⚡</span>
              <p className="text-xs text-orange-300">
                This action involves a financial value of <strong>${String(dollarEntry[1])}</strong> and will affect your account.
              </p>
            </div>
          )}

          {/* Reason */}
          {record.error === "confirmation_required" && record.result?.summary && (
            <div className="text-xs text-neutral-400 italic">
              Reason: {record.result.summary}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-neutral-800 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              onCancel(record.id);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm(record.id);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-500 transition-colors"
          >
            Confirm & Execute
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Confirmation Banner (inline) ────────────────────────────────────────────

export function ConfirmationBanner({
  record,
  onConfirm,
  onCancel,
}: {
  record: ToolExecutionRecord;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
}) {
  const toolName = record.toolId.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="flex items-center gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
      <span className="text-orange-400 text-lg">⚠️</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium">{toolName}</p>
        <p className="text-xs text-neutral-400 truncate">{record.result?.summary || "Awaiting confirmation"}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onCancel(record.id)}
          className="px-3 py-1.5 text-xs rounded-md bg-neutral-700 text-neutral-300 hover:bg-neutral-600"
        >
          Deny
        </button>
        <button
          onClick={() => onConfirm(record.id)}
          className="px-3 py-1.5 text-xs rounded-md bg-blue-600 text-white hover:bg-blue-500"
        >
          Approve
        </button>
      </div>
    </div>
  );
}
