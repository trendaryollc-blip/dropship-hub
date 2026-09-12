"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Shield, Search, BarChart3, Handshake } from "lucide-react";
import dynamic from "next/dynamic";

const DiscoverTab = dynamic(() => import("./tabs/DiscoverTab"), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const IntelTab = dynamic(() => import("./tabs/IntelTab"), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

const SRMTab = dynamic(() => import("./tabs/SRMTab"), {
  loading: () => (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

type TabId = "discover" | "intel" | "srm";

const tabs = [
  { id: "discover" as TabId, label: "Discover", icon: Search },
  { id: "intel" as TabId, label: "Intel", icon: BarChart3 },
  { id: "srm" as TabId, label: "SRM", icon: Handshake },
];

function SuppliersPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeTab = (searchParams.get("tab") as TabId) || "discover";

  const setActiveTab = (tab: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`?${params.toString()}`);
  };

  const validTab = tabs.some((t) => t.id === activeTab) ? activeTab : "discover";

  return (
    <div className="max-w-7xl mx-auto space-y-5 md:space-y-6 pb-16 md:pb-24">
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight flex items-center justify-center gap-3">
          <Shield className="h-8 w-8 text-accent" /> Supplier Intelligence
        </h1>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Discover, monitor, and manage your suppliers in one place.
        </p>
      </div>

      <div className="flex justify-center">
        <div className="flex gap-1 p-1 rounded-2xl bg-surface border border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = validTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-accent text-white shadow-lg shadow-accent/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {validTab === "discover" && <DiscoverTab />}
      {validTab === "intel" && <IntelTab />}
      {validTab === "srm" && <SRMTab />}
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={
      <div className="max-w-7xl mx-auto flex items-center justify-center py-20">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading suppliers...</p>
        </div>
      </div>
    }>
      <SuppliersPageContent />
    </Suspense>
  );
}
