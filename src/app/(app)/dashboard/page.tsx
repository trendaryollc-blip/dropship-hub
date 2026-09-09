"use client";

import { useState } from "react";
import {
  DollarSign, ShoppingCart, Package, TrendingUp,
  LayoutGrid, Crown, Search,
} from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useAuth } from "@/components/auth/AuthProvider";
import MetricCard from "@/components/ui/MetricCard";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import { layoutPresets } from "@/components/dashboard/BentoLayoutPresets";
import BentoGrid, { BentoGridItem } from "@/components/dashboard/BentoGrid";

import MarketPulseTicker from "@/components/dashboard/MarketPulseTicker";
import AIDailyPick from "@/components/dashboard/AIDailyPick";
import { AIMonitoringPanelWrapper } from "@/components/dashboard/IntelligenceHub";
import LiveIntelligenceFeedCard from "@/components/dashboard/LiveIntelligenceFeedCard";
import NicheRadarCards from "@/components/dashboard/NicheRadarCards";
import SupplierStatusCards from "@/components/dashboard/SupplierStatusCards";
import DailyMission from "@/components/dashboard/DailyMission";
import MarketplaceHeatmap from "@/components/dashboard/MarketplaceHeatmap";
import TrendingProducts from "@/components/dashboard/TrendingProducts";
import QuickCompareBar from "@/components/dashboard/QuickCompareBar";
import CommandStatusOrbital from "@/components/dashboard/CommandStatusOrbital";
import ContextualActions from "@/components/dashboard/ContextualActions";
import FulfillmentPipeline from "@/components/dashboard/FulfillmentPipeline";
import { PageErrorBoundary } from "@/components/ui/PageErrorBoundary";

const presetIcons: Record<string, typeof Crown> = {
  executive: Crown,
  "product-scout": Search,
  "financial-focus": DollarSign,
  "command-center": LayoutGrid,
};

export default function DashboardHome() {
  const { data, markAlertRead, markAllAlertsRead, addToCompare, removeFromCompare, clearCompare, loading } = useDashboardData();
  const { user } = useAuth();
  const { layout, setLayout, isLoading: _layoutLoading } = useDashboardLayout();
  const [activePreset, setActivePreset] = useState("command-center");
  const [editMode, setEditMode] = useState(false);

  const stats = data.revenue.stats;

  const applyPreset = (presetId: string) => {
    const preset = layoutPresets.find((p) => p.id === presetId);
    if (preset) {
      setActivePreset(presetId);
      setLayout(preset.layout);
    }
  };

  const toggleItemVisibility = (id: string) => {
    setLayout(
      layout.map((item) =>
        item.id === id ? { ...item, visible: !item.visible } : item
      )
    );
  };

  const onlineSuppliers = data.suppliers.filter((s) => s.status === "online").length;

  return (
    <PageErrorBoundary>
    <div className="max-w-7xl mx-auto space-y-4 pb-24">

      {/* ═══ ZONE 1: COMMAND STATUS ORBITAL ═══ */}
      <CommandStatusOrbital
        username={user?.displayName || user?.email?.split("@")[0] || "there"}
        healthScore={87}
        revenue={stats.revenue ?? 0}
        orders={stats.orders ?? 0}
        profit={stats.avgOrder ?? 0}
        revenueChange={stats.growth}
        storesConnected={2}
        suppliersActive={onlineSuppliers}
        pendingOrders={data.fulfillmentPipeline.pending}
        contextualActions={data.contextualActions}
      />

      {/* ═══ ZONE 1: CONTEXTUAL ACTIONS ═══ */}
      {data.contextualActions.length > 0 && (
        <ContextualActions actions={data.contextualActions} />
      )}

      {/* ═══ ZONE 1: KPI ROW ═══ */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="surface-raised rounded-2xl p-5 animate-pulse">
              <div className="space-y-3">
                <div className="h-4 bg-surface-hover rounded-lg w-1/3" />
                <div className="h-3 bg-surface-hover rounded-lg w-2/3" />
                <div className="h-8 bg-surface-hover rounded-lg w-1/2 mt-4" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard icon={DollarSign} label="Revenue" value={stats.revenue ?? 0} prefix="$" change={stats.growth ?? 0} color="emerald" delay={0} />
          <MetricCard icon={ShoppingCart} label="Orders" value={stats.orders ?? 0} change={stats.avgOrder ?? 0} color="blue" delay={80} />
          <MetricCard icon={Package} label="Products Tracked" value={data.trending.length} color="amber" delay={160} />
          <MetricCard icon={TrendingUp} label="Opportunities" value={data.briefing.opportunities ?? 0} color="purple" delay={240} />
        </div>
      )}

      {/* Header with layout controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-foreground">Command Center</h2>
          <p className="text-xs text-muted-foreground">Your dropshipping operations at a glance</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Preset selector */}
          <div className="hidden sm:flex items-center gap-1 bg-surface rounded-xl border border-border p-0.5">
            {layoutPresets.map((preset) => {
              const Icon = presetIcons[preset.id] || LayoutGrid;
              return (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset.id)}
                  title={preset.description}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    activePreset === preset.id
                      ? "bg-accent text-white shadow-lg shadow-accent/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  <span className="hidden lg:inline">{preset.label}</span>
                </button>
              );
            })}
          </div>
          {/* Edit mode toggle */}
          <button
            onClick={() => setEditMode(!editMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
              editMode
                ? "bg-accent/10 text-accent border-accent/20"
                : "bg-surface text-muted-foreground border-border hover:text-foreground"
            }`}
          >
            <LayoutGrid className="h-3 w-3" />
            {editMode ? "Done" : "Customize"}
          </button>
        </div>
      </div>

      {/* ═══ ZONE 2 & 3: BENTO GRID ═══ */}
      <BentoGrid layout={layout} editMode={editMode}>
        {/* Fulfillment Pipeline */}
        {layout.find((i) => i.id === "fulfillment")?.visible !== false && (
          <BentoGridItem
            item={layout.find((i) => i.id === "fulfillment") || { id: "fulfillment", colSpan: 2, rowSpan: 2, visible: true }}
            editMode={editMode}
            onToggleVisibility={toggleItemVisibility}
          >
            <FulfillmentPipeline data={data.fulfillmentPipeline} />
          </BentoGridItem>
        )}

        {/* AI Daily Pick */}
        {layout.find((i) => i.id === "daily-pick")?.visible !== false && data.dailyPick && (
          <BentoGridItem
            item={layout.find((i) => i.id === "daily-pick") || { id: "daily-pick", colSpan: 2, rowSpan: 2, visible: true }}
            editMode={editMode}
            onToggleVisibility={toggleItemVisibility}
          >
            <AIDailyPick pick={data.dailyPick} />
          </BentoGridItem>
        )}

        {/* ═══ INTELLIGENCE SECTION: AI Market Intel + Live Feed ═══ */}
        <BentoGridItem
          item={{ id: "intelligence", colSpan: 4, rowSpan: 1, visible: true }}
          editMode={editMode}
          onToggleVisibility={toggleItemVisibility}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AIMonitoringPanelWrapper briefing={data.briefing} alerts={data.alerts} />
            <LiveIntelligenceFeedCard
              alerts={data.alerts}
              onRead={markAlertRead}
              onReadAll={markAllAlertsRead}
            />
          </div>
        </BentoGridItem>

        {/* ═══ TRENDING PRODUCTS: Full Width Carousel ═══ */}
        <BentoGridItem
          item={{ id: "trending", colSpan: 4, rowSpan: 1, visible: true }}
          editMode={editMode}
          onToggleVisibility={toggleItemVisibility}
        >
          <TrendingProducts products={data.trending} onAddCompare={addToCompare} />
        </BentoGridItem>

        {/* Niche Radar */}
        {layout.find((i) => i.id === "niches")?.visible !== false && (
          <BentoGridItem
            item={layout.find((i) => i.id === "niches") || { id: "niches", colSpan: 4, rowSpan: 1, visible: true }}
            editMode={editMode}
            onToggleVisibility={toggleItemVisibility}
          >
            <NicheRadarCards niches={data.niches} />
          </BentoGridItem>
        )}

        {/* Marketplace Heatmap */}
        {layout.find((i) => i.id === "heatmap")?.visible !== false && (
          <BentoGridItem
            item={layout.find((i) => i.id === "heatmap") || { id: "heatmap", colSpan: 4, rowSpan: 1, visible: true }}
            editMode={editMode}
            onToggleVisibility={toggleItemVisibility}
          >
            <MarketplaceHeatmap categories={data.heatmap} />
          </BentoGridItem>
        )}

        {/* Supplier Status */}
        {layout.find((i) => i.id === "suppliers")?.visible !== false && (
          <BentoGridItem
            item={layout.find((i) => i.id === "suppliers") || { id: "suppliers", colSpan: 2, rowSpan: 1, visible: true }}
            editMode={editMode}
            onToggleVisibility={toggleItemVisibility}
          >
            <SupplierStatusCards suppliers={data.suppliers} />
          </BentoGridItem>
        )}

        {/* Daily Mission */}
        {layout.find((i) => i.id === "mission")?.visible !== false && data.mission && (
          <BentoGridItem
            item={layout.find((i) => i.id === "mission") || { id: "mission", colSpan: 2, rowSpan: 1, visible: true }}
            editMode={editMode}
            onToggleVisibility={toggleItemVisibility}
          >
            <DailyMission />
          </BentoGridItem>
        )}
      </BentoGrid>

      {/* ═══ ZONE 3: MARKET PULSE TICKER ═══ */}
      <MarketPulseTicker items={data.ticker} />

      {/* Compare Bar */}
      <QuickCompareBar
        items={data.compareItems}
        onRemove={removeFromCompare}
        onClear={clearCompare}
      />
    </div>
    </PageErrorBoundary>
  );
}
