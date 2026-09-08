"use client";

import { useState } from "react";
import { Settings, Zap, X } from "lucide-react";
import { PLATFORM_CONFIGS } from "@/types/fulfillment";
import type { FulfillmentSettings } from "@/types/fulfillment";

export default function SettingsTab({ settings, onSave, onClose }: { settings: FulfillmentSettings; onSave: (s: FulfillmentSettings) => void; onClose: () => void }) {
  const [local, setLocal] = useState<FulfillmentSettings>(settings);

  const toggleAutoApprove = (platformId: string) => {
    const updated = { ...local, autoApprove: { ...local.autoApprove, [platformId]: !local.autoApprove[platformId] } };
    setLocal(updated);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
          <Settings className="h-4 w-4 text-accent" /> Fulfillment Settings
        </h2>
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg hover:bg-surface transition-colors">
          <X className="h-3 w-3" /> Close
        </button>
      </div>

      {/* Automation */}
      <div className="glass rounded-xl p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Zap className="h-4 w-4 text-accent" /> Auto-Fulfillment by Platform
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Enable auto-ordering for platforms with API support. When new orders arrive, they&apos;ll be placed automatically.
        </p>
        <div className="space-y-2">
          {PLATFORM_CONFIGS.map((platform) => (
            <div key={platform.id} className="flex items-center justify-between p-3 rounded-lg bg-surface/50 hover:bg-surface transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-lg">{platform.icon}</span>
                <div>
                  <p className="text-xs font-medium text-foreground">{platform.name}</p>
                  <p className="text-[10px] text-muted-foreground">{platform.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {platform.autoOrderSupported ? (
                  <button
                    onClick={() => toggleAutoApprove(platform.id)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${local.autoApprove[platform.id] ? "bg-accent" : "bg-surface"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${local.autoApprove[platform.id] ? "left-[22px] translate-x-0" : "left-0.5"}`} />
                  </button>
                ) : (
                  <span className="text-[10px] text-muted-foreground px-2 py-1 rounded bg-surface">No API</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rules */}
      <div className="glass rounded-xl p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Settings className="h-4 w-4 text-accent" /> Fulfillment Rules
        </h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Min Supplier Reliability Score (%)</label>
            <input
              type="number"
              value={local.minReliabilityScore}
              onChange={(e) => setLocal({ ...local, minReliabilityScore: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 bg-surface border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Max Shipping Days</label>
            <input
              type="number"
              value={local.maxShippingDays}
              onChange={(e) => setLocal({ ...local, maxShippingDays: Number(e.target.value) })}
              className="w-full mt-1 px-3 py-2 bg-surface border border-white/10 rounded-lg text-sm text-foreground focus:outline-none focus:border-accent"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-foreground">Auto-switch supplier on degradation</p>
              <p className="text-[10px] text-muted-foreground">Switch if reliability drops below {local.degradationThreshold}%</p>
            </div>
            <button
              onClick={() => setLocal({ ...local, autoSwitchOnDegradation: !local.autoSwitchOnDegradation })}
              className={`relative w-10 h-5 rounded-full transition-colors ${local.autoSwitchOnDegradation ? "bg-accent" : "bg-surface"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${local.autoSwitchOnDegradation ? "left-[22px]" : "left-0.5"}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="glass rounded-xl p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-4">Notifications</h3>
        <div className="space-y-3">
          {[
            { key: "emailOnNewOrder" as const, label: "Email on new order" },
            { key: "emailOnShipment" as const, label: "Email on shipment" },
            { key: "emailOnDelivery" as const, label: "Email on delivery" },
            { key: "browserNotifications" as const, label: "Browser notifications" },
          ].map((item) => (
            <div key={item.key} className="flex items-center justify-between">
              <p className="text-xs text-foreground">{item.label}</p>
              <button
                onClick={() => setLocal({ ...local, [item.key]: !local[item.key] })}
                className={`relative w-10 h-5 rounded-full transition-colors ${local[item.key] ? "bg-accent" : "bg-surface"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${local[item.key] ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => onSave(local)}
        className="w-full py-3 bg-accent text-white rounded-xl font-medium hover:bg-accent/90 transition-all"
      >
        Save Settings
      </button>
    </div>
  );
}
