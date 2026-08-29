"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowUpRight, Target, CheckCircle2, Search, DollarSign,
  Truck, Zap, BarChart3, Eye, EyeOff,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/components/auth/AuthProvider";

import MarketPulseTicker from "@/components/dashboard/MarketPulseTicker";
import AIDailyPick from "@/components/dashboard/AIDailyPick";
import RevenueForecast from "@/components/dashboard/RevenueForecast";
import IntelligenceHub from "@/components/dashboard/IntelligenceHub";
import NicheRadarCards from "@/components/dashboard/NicheRadarCards";
import SupplierStatusCards from "@/components/dashboard/SupplierStatusCards";
import DailyMission from "@/components/dashboard/DailyMission";
import MarketplaceHeatmap from "@/components/dashboard/MarketplaceHeatmap";
import InlineCalculator from "@/components/dashboard/InlineCalculator";
import QuickCompareBar from "@/components/dashboard/QuickCompareBar";
import TrendingProducts from "@/components/dashboard/TrendingProducts";
import GreetingCard from "@/components/dashboard/GreetingCard";
import DailyDigest from "@/components/dashboard/DailyDigest";

const gettingStartedSteps = [
  { id: "search", text: "Search for your first product", href: "/products", icon: Search },
  { id: "competitor", text: "Check the competition", href: "/competitors", icon: BarChart3 },
  { id: "calc", text: "Calculate your profit margin", href: "/calculator", icon: DollarSign },
  { id: "supplier", text: "Find a reliable supplier", href: "/suppliers", icon: Truck },
  { id: "store", text: "Connect your store", href: "/store", icon: Zap },
];

interface UserProfile {
  niche?: string;
  budget?: string;
  store?: string;
}

const nicheLabels: Record<string, string> = {
  pets: "Pet Supplies",
  home: "Home & Kitchen",
  tech: "Electronics & Tech",
  fitness: "Fitness & Health",
  fashion: "Fashion & Accessories",
  beauty: "Beauty & Skincare",
  automotive: "Automotive",
  outdoors: "Outdoor & Travel",
};

const budgetLabels: Record<string, string> = {
  starter: "Starter ($0-500/mo)",
  growing: "Growing ($500-2K/mo)",
  scaling: "Scaling ($2K-10K/mo)",
  pro: "Pro ($10K+/mo)",
};

export default function DashboardHome() {
  const { data, markAlertRead, markAllAlertsRead, addToCompare, removeFromCompare, clearCompare } = useDashboardData();
  const { user } = useAuth();
  const [advancedMode, setAdvancedMode] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Record<string, boolean>>({});
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`dashboard_steps_${user.uid}`);
      if (saved) {
        try { setCompletedSteps(JSON.parse(saved)); } catch {}
      }
      // Read onboarding profile for personalization
      try {
        const stored = localStorage.getItem("userProfile");
        if (stored) {
          setProfile(JSON.parse(stored));
        }
      } catch {}
    }
  }, [user]);

  const toggleStep = (stepId: string) => {
    const updated = { ...completedSteps, [stepId]: !completedSteps[stepId] };
    setCompletedSteps(updated);
    if (user) {
      localStorage.setItem(`dashboard_steps_${user.uid}`, JSON.stringify(updated));
    }
  };

  const completedCount = Object.values(completedSteps).filter(Boolean).length;
  const progressPct = Math.round((completedCount / gettingStartedSteps.length) * 100);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-24">
      {/* Header with mode toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your dropshipping command center</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">
            {advancedMode ? "Switch to a simplified dashboard" : "View detailed analytics and insights"}
          </span>
          <button
            onClick={() => setAdvancedMode(!advancedMode)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border border-border bg-surface hover:bg-surface-hover transition-all"
          >
            {advancedMode ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {advancedMode ? "Simple View" : "Advanced View"}
          </button>
        </div>
      </div>

      {/* Greeting */}
      <GreetingCard username={user?.displayName || user?.email?.split("@")[0] || "there"} />

      {/* Personalized profile badge */}
      {profile && (profile.niche || profile.budget) && (
        <div className="flex items-center gap-2 flex-wrap">
          {profile.niche && nicheLabels[profile.niche] && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-accent/10 text-accent border border-accent/20">
              {nicheLabels[profile.niche]}
            </span>
          )}
          {profile.budget && budgetLabels[profile.budget] && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
              {budgetLabels[profile.budget]}
            </span>
          )}
          {profile.store && profile.store !== "none" && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-purple-400/10 text-purple-400 border border-purple-400/20">
              {profile.store.charAt(0).toUpperCase() + profile.store.slice(1)}
            </span>
          )}
        </div>
      )}

      {/* Getting Started Checklist */}
      <div className="glass rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-accent" />
            <h3 className="font-display text-sm font-semibold text-foreground">Getting Started</h3>
          </div>
          <span className="text-xs text-muted-foreground">{completedCount}/{gettingStartedSteps.length} done</span>
        </div>

        <div className="h-1.5 rounded-full bg-surface overflow-hidden mb-4">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-emerald-400 transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="space-y-2">
          {gettingStartedSteps.map((step) => (
            <button
              key={step.id}
              onClick={() => toggleStep(step.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-surface/50 hover:bg-surface-hover transition-all group text-left"
            >
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-all ${
                completedSteps[step.id]
                  ? "bg-emerald-400/10 border border-emerald-400/20"
                  : "border border-border"
              }`}>
                {completedSteps[step.id] ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <step.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-accent transition-colors" />
                )}
              </div>
              <span className={`text-sm flex-1 text-left ${
                completedSteps[step.id] ? "text-muted-foreground line-through" : "text-muted-foreground group-hover:text-foreground"
              } transition-colors`}>
                {step.text}
              </span>
              {!completedSteps[step.id] && (
                <Link
                  href={step.href}
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-accent hover:text-accent/80 font-medium flex items-center gap-1 shrink-0"
                >
                  Do it <ArrowUpRight className="h-3 w-3" />
                </Link>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* AI Product of the Day */}
      {data.dailyPick && <AIDailyPick pick={data.dailyPick} />}

      {/* Advanced Mode: Show all widgets */}
      {advancedMode && (
        <>
          <MarketPulseTicker items={data.ticker} />

          <RevenueForecast
            actual={data.revenue.actual}
            predicted={data.revenue.predicted}
            stats={[]}
          />

          {data.mission && <DailyMission mission={data.mission} />}

          <IntelligenceHub
            alerts={data.alerts}
            onRead={markAlertRead}
            onReadAll={markAllAlertsRead}
            briefing={data.briefing}
            pulse={data.pulse}
            actionStats={data.actionStats}
          />

          <DailyDigest />

          <NicheRadarCards niches={data.niches} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <InlineCalculator />
            </div>
            <div className="lg:col-span-2">
              <SupplierStatusCards suppliers={data.suppliers} />
            </div>
          </div>

          <MarketplaceHeatmap categories={data.heatmap} />

          <TrendingProducts products={data.trending} onAddCompare={addToCompare} />

          <QuickCompareBar
            items={data.compareItems}
            onRemove={removeFromCompare}
            onClear={clearCompare}
          />
        </>
      )}
    </div>
  );
}
