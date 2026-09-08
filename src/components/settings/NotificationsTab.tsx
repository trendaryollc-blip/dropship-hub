"use client";

import { Bell } from "lucide-react";

interface NotificationPrefs {
  priceAlerts: boolean;
  stockAlerts: boolean;
  orderUpdates: boolean;
  aiRecommendations: boolean;
  weeklyDigest: boolean;
}

interface NotificationsTabProps {
  notifPrefs: NotificationPrefs;
  onTogglePref: (key: keyof NotificationPrefs) => void;
}

export default function NotificationsTab({ notifPrefs, onTogglePref }: NotificationsTabProps) {
  return (
    <div className="space-y-4 animate-slide-up">
      <div className="glass rounded-2xl p-5 border border-accent/10">
        <div className="flex items-start gap-3">
          <Bell className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Notification Preferences</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose which notifications you want to receive. Changes are saved automatically.
            </p>
          </div>
        </div>
      </div>

      {[
        { key: "priceAlerts" as const, label: "Price Drop Alerts", description: "Get notified when monitored product prices drop" },
        { key: "stockAlerts" as const, label: "Stock Out Alerts", description: "Get notified when products go out of stock" },
        { key: "orderUpdates" as const, label: "Order Updates", description: "Get notified about order status changes" },
        { key: "aiRecommendations" as const, label: "AI Recommendations", description: "Get daily AI-powered product recommendations" },
        { key: "weeklyDigest" as const, label: "Weekly Digest", description: "Receive a weekly summary of your store performance" },
      ].map((pref) => (
        <div key={pref.key} className="glass rounded-2xl p-5 border border-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">{pref.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{pref.description}</p>
            </div>
            <button
              onClick={() => onTogglePref(pref.key)}
              className={`relative w-11 h-6 rounded-full transition-colors ${notifPrefs[pref.key] ? "bg-accent" : "bg-surface"}`}
            >
              <div className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${notifPrefs[pref.key] ? "translate-x-5" : ""}`} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
