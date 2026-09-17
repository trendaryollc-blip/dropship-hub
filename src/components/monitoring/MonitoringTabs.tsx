"use client";

import { Settings } from "lucide-react";

export type Tab = "products" | "alerts" | "metrics" | "audit" | "settings";

interface MonitoringTabsProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  productCount: number;
  alertCount: number;
}

export default function MonitoringTabs({ activeTab, onTabChange, productCount, alertCount }: MonitoringTabsProps) {
  const tabs: { key: Tab; label: string; icon?: React.ReactNode }[] = [
    { key: "products", label: `Products (${productCount})` },
    { key: "alerts", label: `Alerts (${alertCount})` },
    { key: "metrics", label: "Metrics" },
    { key: "audit", label: "Audit Log" },
    { key: "settings", label: "Settings", icon: <Settings className="h-3 w-3" /> },
  ];

  return (
    <div className="flex items-center bg-surface rounded-xl border border-border p-0.5">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          onClick={() => onTabChange(tab.key)}
          className={`flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-xs font-semibold transition-all capitalize ${
            activeTab === tab.key
              ? "bg-accent text-white shadow-lg shadow-accent/20"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );
}
