"use client";

import { useState } from "react";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";

interface RepricingRule {
  enabled: boolean;
  type: "maintain_margin" | "undercut" | "fixed_price";
  value: number;
}

interface RepricingRuleEditorProps {
  monitoredId: string;
  currentRule?: RepricingRule;
  supplierPrice: number;
  currentSellPrice: number;
  onSave: () => void;
}

export default function RepricingRuleEditor({
  monitoredId,
  currentRule,
  supplierPrice,
  currentSellPrice,
  onSave,
}: RepricingRuleEditorProps) {
  const { error: toastError, success: toastSuccess } = useToast();
  const [enabled, setEnabled] = useState(currentRule?.enabled ?? false);
  const [type, setType] = useState<RepricingRule["type"]>(currentRule?.type ?? "maintain_margin");
  const [value, setValue] = useState(String(currentRule?.value ?? 30));
  const [saving, setSaving] = useState(false);

  const calculatedPrice = (() => {
    const v = Number(value) || 0;
    if (type === "maintain_margin") {
      return v > 0 && v < 100 ? supplierPrice / (1 - v / 100) : null;
    }
    if (type === "undercut") {
      const newPrice = currentSellPrice * (1 - v / 100);
      return Math.max(supplierPrice * 1.05, newPrice);
    }
    if (type === "fixed_price") {
      return v > 0 ? v : null;
    }
    return null;
  })();

  const handleSave = async () => {
    try {
      setSaving(true);
      await safeFetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "setRepricingRule",
          monitoredId,
          rule: {
            enabled,
            type,
            value: Number(value) || 0,
          },
        }),
      });
      toastSuccess("Repricing rule saved");
      onSave();
    } catch {
      toastError("Failed to save repricing rule");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Repricing Rule</h4>

      <div className="flex items-center gap-2">
        <label className="text-[10px] text-muted-foreground">Enabled:</label>
        <button
          onClick={() => setEnabled(!enabled)}
          className={`w-8 h-4 rounded-full transition-all ${enabled ? "bg-accent" : "bg-border"}`}
        >
          <div className={`w-3 h-3 rounded-full bg-white transition-all ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[10px] text-muted-foreground">Rule Type:</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as RepricingRule["type"])}
          className="bg-background border border-border rounded-lg px-2 py-1 text-xs text-foreground"
        >
          <option value="maintain_margin">Maintain Margin</option>
          <option value="undercut">Undercut Competitor</option>
          <option value="fixed_price">Fixed Price</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label className="text-[10px] text-muted-foreground">
          {type === "maintain_margin" ? "Margin %:" : type === "undercut" ? "Undercut %:" : "Price $:"}
        </label>
        <input
          type="number"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          min="0"
          max={type === "maintain_margin" ? "99" : type === "fixed_price" ? "99999" : "50"}
          step="1"
          className="w-20 px-2 py-1 rounded-lg bg-background border border-border text-xs text-foreground"
        />
      </div>

      {calculatedPrice !== null && calculatedPrice > 0 && (
        <div className="p-2 rounded-lg bg-surface/50 border border-border/50">
          <p className="text-[10px] text-muted-foreground">
            Calculated sell price: <span className="text-foreground font-semibold">${calculatedPrice.toFixed(2)}</span>
          </p>
          {calculatedPrice <= supplierPrice && (
            <p className="text-[10px] text-red-400 mt-0.5">
              Warning: Calculated price is below supplier cost (${supplierPrice.toFixed(2)})
            </p>
          )}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        className="px-3 py-1.5 rounded-lg bg-accent text-white text-[10px] font-semibold hover:bg-accent/90 transition-all disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save Rule"}
      </button>
    </div>
  );
}
