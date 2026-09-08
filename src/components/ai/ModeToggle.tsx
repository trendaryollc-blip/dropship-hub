"use client";

import React, { useState } from "react";
import { useFeatureMode } from "@/contexts/AIModeContext";
import type { ExecutionMode } from "@/lib/ai/types";

// ─── Mode Badge ──────────────────────────────────────────────────────────────

const MODE_CONFIG = {
  manual: { icon: "✋", label: "Manual", color: "text-neutral-400", bg: "bg-neutral-700/50", description: "No tools — AI provides advice and recommendations only" },
  ai_assist: { icon: "🤖", label: "AI Assist", color: "text-blue-400", bg: "bg-blue-500/10", description: "AI can execute tools when you ask it to do something" },
  auto: { icon: "⚡", label: "Auto", color: "text-green-400", bg: "bg-green-500/10", description: "AI proactively executes tools based on your business data" },
} as const;

// ─── Mode Toggle (Compact) ──────────────────────────────────────────────────

export function ModeToggle({ feature }: { feature: string }) {
  const { mode, setMode } = useFeatureMode(feature);
  const [isOpen, setIsOpen] = useState(false);

  const currentConfig = MODE_CONFIG[mode];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${currentConfig.bg} ${currentConfig.color} hover:opacity-80`}
      >
        <span>{currentConfig.icon}</span>
        <span>{currentConfig.label}</span>
        <svg className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-1 z-50 w-56 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-neutral-700">
              <p className="text-[10px] text-neutral-500 uppercase tracking-wider font-semibold">Execution Mode</p>
            </div>
            {(Object.entries(MODE_CONFIG) as [ExecutionMode, typeof MODE_CONFIG.manual][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => {
                  setMode(key);
                  setIsOpen(false);
                }}
                className={`w-full flex items-start gap-3 px-3 py-2.5 transition-colors ${
                  mode === key
                    ? "bg-blue-600/20 text-blue-400"
                    : "text-neutral-300 hover:bg-neutral-700"
                }`}
              >
                <span className="text-base mt-0.5">{config.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{config.label}</span>
                    {mode === key && (
                      <svg className="w-3.5 h-3.5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{config.description}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Mode Toggle (Full) ─────────────────────────────────────────────────────

export function ModeToggleFull({ feature }: { feature: string }) {
  const { mode, setMode } = useFeatureMode(feature);

  return (
    <div className="flex items-center gap-1 p-1 bg-neutral-800/50 rounded-lg border border-neutral-700/50">
      {(Object.entries(MODE_CONFIG) as [ExecutionMode, typeof MODE_CONFIG.manual][]).map(([key, config]) => (
        <button
          key={key}
          onClick={() => setMode(key)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            mode === key
              ? `${config.bg} ${config.color} shadow-sm`
              : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <span>{config.icon}</span>
          <span>{config.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Global Mode Indicator ───────────────────────────────────────────────────

export function GlobalModeIndicator() {
  const { preferences } = useAIModeLocal();
  const mode = preferences?.globalMode ?? "ai_assist";
  const config = MODE_CONFIG[mode];

  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${config.bg} ${config.color}`}>
      <span>{config.icon}</span>
      <span className="font-medium">{config.label}</span>
    </div>
  );
}

// Local hook to avoid circular dependency
function useAIModeLocal() {
  const [preferences, setPreferences] = useState<{ globalMode: ExecutionMode } | null>(null);

  React.useEffect(() => {
    fetch("/api/ai/modes")
      .then((res) => res.json())
      .then((data) => setPreferences(data.preferences))
      .catch(() => {});
  }, []);

  return { preferences };
}
