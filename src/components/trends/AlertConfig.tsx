"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Settings, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { TrendWatchlistEntry } from "@/types/trend-predictor";

interface AlertConfigProps {
  entry: TrendWatchlistEntry;
  onUpdate: (id: string, config: {
    alertOnRising: boolean;
    alertOnPeak: boolean;
    alertOnSaturation: boolean;
    customThreshold?: number;
  }) => Promise<void>;
  className?: string;
}

export default function AlertConfig({ entry, onUpdate, className = "" }: AlertConfigProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState({
    alertOnRising: entry.alertOnRising,
    alertOnPeak: entry.alertOnPeak,
    alertOnSaturation: entry.alertOnSaturation,
    customThreshold: entry.customThreshold ?? 50,
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(entry.id, config);
      setIsOpen(false);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setIsOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen]);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Configure alerts"
        className="p-1.5 rounded-lg hover:bg-surface transition-all"
        title="Configure alerts"
      >
        <Settings className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="absolute right-0 top-full mt-1 z-20 w-64 rounded-xl bg-background border border-border shadow-xl p-3 space-y-3"
          >
            <p className="text-xs font-semibold text-foreground">Alert Settings</p>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <Bell className="h-3 w-3 text-emerald-400" /> Rising Alert
              </span>
              <input
                type="checkbox"
                checked={config.alertOnRising}
                onChange={(e) => setConfig({ ...config, alertOnRising: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-accent"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <Bell className="h-3 w-3 text-amber-400" /> Peak Alert
              </span>
              <input
                type="checkbox"
                checked={config.alertOnPeak}
                onChange={(e) => setConfig({ ...config, alertOnPeak: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-accent"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer">
              <span className="flex items-center gap-2 text-xs text-foreground">
                <BellOff className="h-3 w-3 text-red-400" /> Saturation Alert
              </span>
              <input
                type="checkbox"
                checked={config.alertOnSaturation}
                onChange={(e) => setConfig({ ...config, alertOnSaturation: e.target.checked })}
                className="w-4 h-4 rounded border-border accent-accent"
              />
            </label>

            <div className="pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground mb-1">Growth threshold: {config.customThreshold}%</p>
              <input
                type="range"
                min="10"
                max="100"
                value={config.customThreshold}
                onChange={(e) => setConfig({ ...config, customThreshold: parseInt(e.target.value) })}
                className="w-full h-1.5 rounded-full bg-surface accent-accent"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-1.5 rounded-lg bg-surface text-xs font-medium text-foreground hover:bg-surface-hover transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all flex items-center justify-center gap-1"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                Save
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
