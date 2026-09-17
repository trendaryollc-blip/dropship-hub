"use client";

import { useState, useEffect } from "react";
import { Bell, Mail, BellOff } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";
import { safeFetch } from "@/lib/safe-fetch";
import { useToast } from "@/components/ui/Toast";

interface NotificationPreferences {
  priceAlerts: boolean;
  stockAlerts: boolean;
  orderUpdates: boolean;
  aiRecommendations: boolean;
  weeklyDigest: boolean;
  email?: string;
  pushEnabled?: boolean;
}

export default function NotificationPreferencesPanel() {
  const { success: toastSuccess, error: toastError } = useToast();
  const { data, mutate } = useAPI<{ preferences: NotificationPreferences }>("/api/settings/notifications");
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    priceAlerts: true,
    stockAlerts: true,
    orderUpdates: true,
    aiRecommendations: true,
    weeklyDigest: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.preferences) setPrefs(data.preferences);
  }, [data]);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      setSaving(true);
      await safeFetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { [key]: updated[key] } }),
      });
      mutate();
      toastSuccess("Preferences saved");
    } catch {
      setPrefs(prefs);
      toastError("Failed to save preferences");
    } finally {
      setSaving(false);
    }
  };

  const handleEmailChange = async (email: string) => {
    const updated = { ...prefs, email };
    setPrefs(updated);
    try {
      setSaving(true);
      await safeFetch("/api/settings/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { email } }),
      });
      mutate();
    } catch {
      setPrefs(prefs);
      toastError("Failed to save email");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider">Notification Preferences</h3>

      <div className="space-y-2">
        <ToggleRow
          icon={<Bell className="h-4 w-4 text-amber-400" />}
          label="Price Alerts"
          description="Get notified when monitored product prices change"
          enabled={prefs.priceAlerts}
          onToggle={() => handleToggle("priceAlerts")}
          disabled={saving}
        />
        <ToggleRow
          icon={<BellOff className="h-4 w-4 text-red-400" />}
          label="Stock Alerts"
          description="Get notified when products go out of stock or back in stock"
          enabled={prefs.stockAlerts}
          onToggle={() => handleToggle("stockAlerts")}
          disabled={saving}
        />
        <ToggleRow
          icon={<Bell className="h-4 w-4 text-blue-400" />}
          label="Order Updates"
          description="Get notified about order status changes"
          enabled={prefs.orderUpdates}
          onToggle={() => handleToggle("orderUpdates")}
          disabled={saving}
        />
        <ToggleRow
          icon={<Mail className="h-4 w-4 text-emerald-400" />}
          label="Email Notifications"
          description="Receive alerts via email for critical events"
          enabled={!!prefs.email}
          onToggle={() => handleEmailChange(prefs.email ? "" : "trendaryo206@gmail.com")}
          disabled={saving}
        />
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  description,
  enabled,
  onToggle,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  enabled: boolean;
  onToggle: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-xl bg-surface/50 border border-border/50">
      <div className="flex items-center gap-3">
        <div className="p-1.5 rounded-lg bg-surface">{icon}</div>
        <div>
          <p className="text-xs font-medium text-foreground">{label}</p>
          <p className="text-[10px] text-muted-foreground">{description}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`w-10 h-5 rounded-full transition-all disabled:opacity-50 ${enabled ? "bg-accent" : "bg-border"}`}
      >
        <div className={`w-4 h-4 rounded-full bg-white transition-all ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}
