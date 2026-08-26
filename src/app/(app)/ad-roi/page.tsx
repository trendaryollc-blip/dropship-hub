"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  DollarSign, Target, Zap,
  BarChart3, Calendar, AlertTriangle, ArrowUpRight,
  ExternalLink, Info, Settings,
  Search, RefreshCcw, ChevronDown, ChevronUp,
} from "lucide-react";

interface BudgetScenario {
  name: string;
  monthlyBudget: number;
  cpc: number;
  conversionRate: number;
  avgOrderValue: number;
}

interface MarketTiming {
  month: string;
  demand: number;
  competition: number;
  suggestedAction: "launch" | "scale" | "maintain" | "reduce";
  notes: string;
  keywords: string[];
}

const defaultScenarios: BudgetScenario[] = [
  { name: "Conservative", monthlyBudget: 500, cpc: 0.80, conversionRate: 2.5, avgOrderValue: 35 },
  { name: "Moderate", monthlyBudget: 1500, cpc: 0.95, conversionRate: 3.0, avgOrderValue: 35 },
  { name: "Aggressive", monthlyBudget: 5000, cpc: 1.10, conversionRate: 3.5, avgOrderValue: 35 },
];

const marketTimingData: MarketTiming[] = [
  { month: "January", demand: 65, competition: 40, suggestedAction: "launch", notes: "New Year resolutions, fitness/health peaks", keywords: ["fitness", "health", "resolutions"] },
  { month: "February", demand: 55, competition: 35, suggestedAction: "scale", notes: "Valentine's Day niche opportunities", keywords: ["valentine", "gift", "romantic"] },
  { month: "March", demand: 60, competition: 45, suggestedAction: "maintain", notes: "Spring cleaning, home improvement", keywords: ["spring cleaning", "home", "organize"] },
  { month: "April", demand: 65, competition: 50, suggestedAction: "scale", notes: "Spring shopping, outdoor products", keywords: ["spring", "outdoor", "garden"] },
  { month: "May", demand: 70, competition: 55, suggestedAction: "scale", notes: "Mother's Day, graduation season", keywords: ["mother", "gift", "graduation"] },
  { month: "June", demand: 75, competition: 60, suggestedAction: "maintain", notes: "Summer starts, outdoor/gadget peaks", keywords: ["summer", "outdoor", "gadget"] },
  { month: "July", demand: 80, competition: 65, suggestedAction: "maintain", notes: "Peak summer, Prime Day effects", keywords: ["prime day", "summer", "deals"] },
  { month: "August", demand: 75, competition: 60, suggestedAction: "maintain", notes: "Back to school, late summer deals", keywords: ["back to school", "student", "supplies"] },
  { month: "September", demand: 70, competition: 55, suggestedAction: "scale", notes: "Fall transition, early holiday prep", keywords: ["fall", "autumn", "prepare"] },
  { month: "October", demand: 85, competition: 70, suggestedAction: "launch", notes: "Halloween, early Black Friday prep", keywords: ["halloween", "costume", "horror"] },
  { month: "November", demand: 100, competition: 95, suggestedAction: "scale", notes: "Black Friday, Cyber Monday, peak season", keywords: ["black friday", "cyber monday", "deals"] },
  { month: "December", demand: 95, competition: 90, suggestedAction: "reduce", notes: "Holiday rush, shipping deadlines, margins thin", keywords: ["holiday", "christmas", "gift"] },
];

const adPlatforms = [
  { name: "Facebook Ads", avgCPC: 0.97, avgCTR: 0.90, bestFor: ["Fashion", "Home", "Beauty", "Health"], color: "text-blue-400", bgColor: "bg-blue-400/10", searchQuery: "facebook ads dropshipping" },
  { name: "TikTok Ads", avgCPC: 1.00, avgCTR: 1.20, bestFor: ["Trending products", "Youth audience", "Viral items"], color: "text-pink-400", bgColor: "bg-pink-400/10", searchQuery: "tiktok trending products" },
  { name: "Google Shopping", avgCPC: 0.66, avgCTR: 1.50, bestFor: ["High-intent buyers", "Electronics", "Specific products"], color: "text-emerald-400", bgColor: "bg-emerald-400/10", searchQuery: "google shopping products" },
  { name: "Instagram Ads", avgCPC: 0.80, avgCTR: 0.80, bestFor: ["Visual products", "Lifestyle", "Fashion"], color: "text-purple-400", bgColor: "bg-purple-400/10", searchQuery: "instagram products aesthetic" },
  { name: "Pinterest Ads", avgCPC: 0.50, avgCTR: 0.60, bestFor: ["Home decor", "Fashion", "DIY", "Food"], color: "text-red-400", bgColor: "bg-red-400/10", searchQuery: "pinterest trending products" },
];

function ScenarioCard({
  scenario,
  index,
  onUpdate,
  expanded,
  onToggle,
}: {
  scenario: BudgetScenario;
  index: number;
  onUpdate: (index: number, field: keyof BudgetScenario, value: number) => void;
  expanded: boolean;
  onToggle: () => void;
}) {
  const result = useMemo(() => {
    const monthlyClicks = Math.round(scenario.monthlyBudget / scenario.cpc);
    const monthlyOrders = Math.round(monthlyClicks * (scenario.conversionRate / 100));
    const monthlyRevenue = monthlyOrders * scenario.avgOrderValue;
    const profit = monthlyRevenue - scenario.monthlyBudget;
    const roas = scenario.monthlyBudget > 0 ? monthlyRevenue / scenario.monthlyBudget : 0;
    const cpa = monthlyOrders > 0 ? scenario.monthlyBudget / monthlyOrders : 0;
    const profitMargin = monthlyRevenue > 0 ? (profit / monthlyRevenue) * 100 : 0;
    const breakEvenOrders = Math.ceil(scenario.monthlyBudget / (scenario.avgOrderValue * 0.7));
    const requiredConvRate = monthlyClicks > 0 ? (breakEvenOrders / monthlyClicks) * 100 : 0;
    return { monthlyClicks, monthlyOrders, monthlyRevenue, profit, roas, cpa, profitMargin, breakEvenOrders, requiredConvRate };
  }, [scenario]);

  const tierColors: Record<string, { ring: string; text: string; border: string; bg: string }> = {
    Conservative: { ring: "stroke-emerald-400", text: "text-emerald-400", border: "border-emerald-400/20", bg: "bg-emerald-400/5" },
    Moderate: { ring: "stroke-accent", text: "text-accent", border: "border-accent/20", bg: "bg-accent/5" },
    Aggressive: { ring: "stroke-amber-400", text: "text-amber-400", border: "border-amber-400/20", bg: "bg-amber-400/5" },
  };
  const tc = tierColors[scenario.name] || tierColors.Moderate;

  const inputClass = "w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-xs font-mono focus:outline-none focus:border-accent/50 transition-all";

  return (
    <div className={`glass rounded-2xl overflow-hidden border transition-all ${result.profit >= 0 ? tc.border : "border-red-400/20"}`}>
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-display text-sm font-semibold text-foreground">{scenario.name}</h4>
            <p className="text-xs text-muted-foreground">${scenario.monthlyBudget.toLocaleString()}/mo budget</p>
          </div>
          <div className="text-right">
            <span className={`text-lg font-bold font-display ${tc.text}`}>{result.roas.toFixed(1)}x</span>
            <p className="text-[9px] text-muted-foreground uppercase">ROAS</p>
          </div>
        </div>

        {/* ROAS Ring */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-surface" />
            <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${Math.min(Math.max(result.roas / 5, 0), 1) * 264} 264`}
              className={tc.ring} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-base font-bold font-display ${tc.text}`}>{result.roas.toFixed(1)}x</span>
            <span className="text-[8px] text-muted-foreground uppercase">ROAS</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="p-2.5 rounded-lg bg-surface/50 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Revenue</p>
            <p className="text-sm font-bold text-foreground">${result.monthlyRevenue.toLocaleString()}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-surface/50 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Net Profit</p>
            <p className={`text-sm font-bold ${result.profit >= 0 ? "text-emerald-400" : "text-red-400"}`}>${result.profit.toLocaleString()}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-surface/50 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">Orders</p>
            <p className="text-sm font-bold text-foreground">{result.monthlyOrders.toLocaleString()}</p>
          </div>
          <div className="p-2.5 rounded-lg bg-surface/50 text-center">
            <p className="text-[10px] text-muted-foreground uppercase">CPA</p>
            <p className="text-sm font-bold text-foreground">${result.cpa.toFixed(2)}</p>
          </div>
        </div>

        {result.profit < 0 && (
          <div className="p-3 rounded-lg bg-red-400/5 border border-red-400/20 mb-4 flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-medium text-red-400">Losing ${Math.abs(result.profit).toLocaleString()}/mo</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">Need {result.breakEvenOrders.toLocaleString()} orders to break even ({result.requiredConvRate.toFixed(1)}% conv. rate)</p>
            </div>
          </div>
        )}

        {/* Expand/Collapse for editing */}
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-[10px] font-medium text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Hide" : "Edit"} Parameters
        </button>
      </div>

      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-border/50 pt-4 animate-slide-up">
          <div>
            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Monthly Budget ($)</label>
            <input type="number" step="100" value={scenario.monthlyBudget}
              onChange={(e) => onUpdate(index, "monthlyBudget", +e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">CPC ($)</label>
              <input type="number" step="0.01" value={scenario.cpc}
                onChange={(e) => onUpdate(index, "cpc", +e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Conv %</label>
              <input type="number" step="0.1" value={scenario.conversionRate}
                onChange={(e) => onUpdate(index, "conversionRate", +e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">AOV ($)</label>
              <input type="number" step="1" value={scenario.avgOrderValue}
                onChange={(e) => onUpdate(index, "avgOrderValue", +e.target.value)} className={inputClass} />
            </div>
          </div>
          <Link
            href={`/calculator?cost=${scenario.avgOrderValue * 0.3}&price=${scenario.avgOrderValue}`}
            className="flex items-center justify-center gap-1.5 w-full py-2 rounded-lg text-[10px] font-medium text-accent hover:text-accent/80 border border-accent/20 hover:bg-accent/5 transition-all"
          >
            <DollarSign className="h-3 w-3" /> Detailed Profit Calculator <ExternalLink className="h-2.5 w-2.5" />
          </Link>
        </div>
      )}
    </div>
  );
}

export default function AdRoiPage() {
  const [scenarios, setScenarios] = useState(defaultScenarios);
  const [activeTab, setActiveTab] = useState<"calculator" | "timing" | "platforms">("calculator");
  const [expandedCard, setExpandedCard] = useState<number | null>(null);
  const [timingView, setTimingView] = useState<"calendar" | "ranked">("calendar");

  const updateScenario = (index: number, field: keyof BudgetScenario, value: number) => {
    setScenarios((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const resetScenarios = () => setScenarios(defaultScenarios);

  const bestROI = useMemo(() => {
    return [...scenarios].sort((a, b) => {
      const ra = (a.avgOrderValue * a.conversionRate / 100) / a.cpc;
      const rb = (b.avgOrderValue * b.conversionRate / 100) / b.cpc;
      return rb - ra;
    })[0];
  }, [scenarios]);

  const rankedMonths = useMemo(() => {
    return [...marketTimingData].sort((a, b) => (b.demand - b.competition) - (a.demand - a.competition));
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Target className="h-7 w-7 text-accent" /> Ad ROI Predictor & Market Timing
        </h1>
        <p className="text-muted-foreground">Predict ad returns and find the optimal launch timing for your products.</p>
      </div>

      {/* Quick Links Bar */}
      <div className="flex flex-wrap gap-2">
        {[
          { href: "/calculator", label: "Profit Calculator", icon: DollarSign, color: "text-emerald-400" },
          { href: "/competitors", label: "Competitor Intel", icon: BarChart3, color: "text-purple-400" },
          { href: "/products", label: "Product Research", icon: Search, color: "text-blue-400" },
          { href: "/health", label: "Health Score", icon: Zap, color: "text-amber-400" },
          { href: "/settings", label: "Platform Settings", icon: Settings, color: "text-muted-foreground" },
        ].map((link) => (
          <Link key={link.href} href={link.href}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface border border-border text-xs text-muted-foreground hover:text-foreground hover:border-accent/20 transition-all">
            <link.icon className={`h-3 w-3 ${link.color}`} /> {link.label}
          </Link>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "calculator" as const, label: "ROI Calculator", icon: DollarSign },
          { id: "timing" as const, label: "Market Timing", icon: Calendar },
          { id: "platforms" as const, label: "Platform Comparison", icon: BarChart3 },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-accent text-white shadow-[0_0_15px_rgba(var(--glow-color),0.3)]" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ROI Calculator Tab */}
      {activeTab === "calculator" && (
        <div className="space-y-6 animate-slide-up">
          {/* How It Works */}
          <div className="glass rounded-2xl p-5 border border-accent/10">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">How ROI Calculation Works</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  We calculate your return on ad spend using: <span className="text-foreground font-mono">Clicks = Budget ÷ CPC</span>, then <span className="text-foreground font-mono">Orders = Clicks × Conversion Rate</span>, then <span className="text-foreground font-mono">Revenue = Orders × Avg Order Value</span>. Edit any parameter below to see real-time projections.
                </p>
              </div>
            </div>
          </div>

          {/* Scenario Results */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-sm font-semibold text-foreground">Budget Scenarios</h3>
              <button onClick={resetScenarios} className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCcw className="h-3 w-3" /> Reset to defaults
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {scenarios.map((s, i) => (
                <ScenarioCard
                  key={s.name}
                  scenario={s}
                  index={i}
                  onUpdate={updateScenario}
                  expanded={expandedCard === i}
                  onToggle={() => setExpandedCard(expandedCard === i ? null : i)}
                />
              ))}
            </div>
          </div>

          {/* Profit Comparison Bar Chart */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Profit Comparison</h3>
            <div className="space-y-3">
              {scenarios.map((s) => {
                const monthlyClicks = Math.round(s.monthlyBudget / s.cpc);
                const monthlyOrders = Math.round(monthlyClicks * (s.conversionRate / 100));
                const profit = (monthlyOrders * s.avgOrderValue) - s.monthlyBudget;
                const maxProfit = Math.max(...scenarios.map((x) => {
                  const mc = Math.round(x.monthlyBudget / x.cpc);
                  const mo = Math.round(mc * (x.conversionRate / 100));
                  return Math.abs((mo * x.avgOrderValue) - x.monthlyBudget);
                }));
                const width = maxProfit > 0 ? (Math.abs(profit) / maxProfit) * 100 : 0;
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">{s.name}</span>
                    <div className="flex-1 h-7 rounded-lg bg-surface overflow-hidden">
                      <div className={`h-full rounded-lg flex items-center px-3 ${profit >= 0 ? "bg-gradient-to-r from-emerald-400/80 to-emerald-400" : "bg-gradient-to-r from-red-400 to-red-400/80"}`}
                        style={{ width: `${Math.max(width, 8)}%` }}>
                        <span className="text-[10px] font-bold text-white">${profit.toLocaleString()}/mo</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Next Steps */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" /> Recommended Next Steps
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Link href={`/calculator?cost=${bestROI.avgOrderValue * 0.3}&price=${bestROI.avgOrderValue}`}
                className="p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20 hover:border-emerald-400/40 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-bold text-emerald-400 uppercase">Calculate Profits</span>
                </div>
                <p className="text-xs text-muted-foreground">Run detailed profit breakdown with your exact costs using the full calculator.</p>
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
              </Link>
              <Link href="/competitors"
                className="p-4 rounded-xl bg-purple-400/5 border border-purple-400/20 hover:border-purple-400/40 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <BarChart3 className="h-4 w-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-400 uppercase">Analyze Competitors</span>
                </div>
                <p className="text-xs text-muted-foreground">See competitor pricing, platform breakdown, and find opportunities.</p>
                <ArrowUpRight className="h-3.5 w-3.5 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
              </Link>
              <Link href="/products"
                className="p-4 rounded-xl bg-blue-400/5 border border-blue-400/20 hover:border-blue-400/40 transition-all group">
                <div className="flex items-center gap-2 mb-2">
                  <Search className="h-4 w-4 text-blue-400" />
                  <span className="text-xs font-bold text-blue-400 uppercase">Find Products</span>
                </div>
                <p className="text-xs text-muted-foreground">Search trending products across platforms to test your ad strategy on.</p>
                <ArrowUpRight className="h-3.5 w-3.5 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity mt-2" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Market Timing Tab */}
      {activeTab === "timing" && (
        <div className="space-y-6 animate-slide-up">
          {/* Timing Overview */}
          <div className="glass rounded-2xl p-5 border border-accent/10">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Understanding Market Timing</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <span className="text-emerald-400 font-semibold">Green months (launch/scale)</span> = high demand + low competition = best time to advertise.
                  <span className="text-red-400 font-semibold"> Red months (reduce)</span> = demand drops or competition spikes. Click any month to search trending products for that season.
                </p>
              </div>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-semibold text-foreground">12-Month Demand Calendar</h3>
            <div className="flex gap-1 bg-surface rounded-lg p-0.5 border border-border">
              <button onClick={() => setTimingView("calendar")}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${timingView === "calendar" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"}`}>
                Calendar
              </button>
              <button onClick={() => setTimingView("ranked")}
                className={`px-3 py-1.5 rounded-md text-[10px] font-medium transition-all ${timingView === "ranked" ? "bg-accent text-white" : "text-muted-foreground hover:text-foreground"}`}>
                Ranked
              </button>
            </div>
          </div>

          {timingView === "calendar" ? (
            <div className="glass rounded-2xl p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {marketTimingData.map((m) => {
                  const actionColors: Record<string, string> = {
                    launch: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
                    scale: "bg-accent/10 text-accent border-accent/20",
                    maintain: "bg-amber-400/10 text-amber-400 border-amber-400/20",
                    reduce: "bg-red-400/10 text-red-400 border-red-400/20",
                  };
                  return (
                    <Link
                      key={m.month}
                      href={`/products?q=${encodeURIComponent(m.keywords[0])}`}
                      className="p-4 rounded-xl bg-surface/50 border border-border hover:border-accent/30 hover:bg-surface transition-all group block"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-foreground group-hover:text-accent transition-colors">{m.month.slice(0, 3)}</span>
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${actionColors[m.suggestedAction]}`}>
                          {m.suggestedAction}
                        </span>
                      </div>
                      <div className="space-y-1.5 mb-2">
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] text-muted-foreground">Demand</span>
                            <span className="text-[9px] text-foreground font-bold">{m.demand}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${m.demand}%` }} />
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-[9px] text-muted-foreground">Competition</span>
                            <span className="text-[9px] text-foreground font-bold">{m.competition}</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
                            <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${m.competition}%` }} />
                          </div>
                        </div>
                      </div>
                      <p className="text-[9px] text-muted-foreground leading-relaxed mb-1.5">{m.notes}</p>
                      <p className="text-[9px] text-accent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        Search trends <ArrowUpRight className="h-2.5 w-2.5" />
                      </p>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass rounded-2xl p-6">
              <div className="space-y-2">
                {rankedMonths.map((m, i) => {
                  const gap = m.demand - m.competition;
                  const actionColors: Record<string, string> = {
                    launch: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
                    scale: "text-accent bg-accent/10 border-accent/20",
                    maintain: "text-amber-400 bg-amber-400/10 border-amber-400/20",
                    reduce: "text-red-400 bg-red-400/10 border-red-400/20",
                  };
                  return (
                    <Link
                      key={m.month}
                      href={`/products?q=${encodeURIComponent(m.keywords[0])}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-surface flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        #{i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{m.month}</p>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${actionColors[m.suggestedAction]}`}>
                            {m.suggestedAction}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{m.notes}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${gap > 0 ? "text-emerald-400" : gap < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                          {gap > 0 ? "+" : ""}{gap}
                        </p>
                        <p className="text-[9px] text-muted-foreground">demand gap</p>
                      </div>
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Best Launch Windows */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Best Launch Windows</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {marketTimingData
                .filter((m) => m.suggestedAction === "launch" || m.suggestedAction === "scale")
                .sort((a, b) => (b.demand - b.competition) - (a.demand - a.competition))
                .slice(0, 4)
                .map((m) => (
                  <Link
                    key={m.month}
                    href={`/products?q=${encodeURIComponent(m.keywords[0])}`}
                    className="flex items-center gap-3 p-4 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all group"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/10 shrink-0">
                      <Calendar className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{m.month}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.notes}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {m.keywords.map((k) => (
                          <span key={k} className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-muted-foreground">{k}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-400">+{m.demand - m.competition}</p>
                      <p className="text-[9px] text-muted-foreground">gap score</p>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
            </div>
          </div>

          {/* Timing to Competitors Link */}
          <div className="glass rounded-2xl p-5 border border-purple-400/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-purple-400/10">
                  <BarChart3 className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Found a good timing window?</p>
                  <p className="text-xs text-muted-foreground">Analyze competitor pricing and find gaps before you launch.</p>
                </div>
              </div>
              <Link href="/competitors"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-400/10 border border-purple-400/20 text-xs font-medium text-purple-400 hover:bg-purple-400/20 transition-all shrink-0">
                Analyze <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Platform Comparison Tab */}
      {activeTab === "platforms" && (
        <div className="space-y-6 animate-slide-up">
          {/* Platform Info */}
          <div className="glass rounded-2xl p-5 border border-accent/10">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Choosing the Right Platform</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Each ad platform has different strengths. <span className="text-emerald-400 font-semibold">Google Shopping</span> has the highest purchase intent.
                  <span className="text-blue-400 font-semibold"> Facebook</span> offers the best audience targeting.
                  <span className="text-pink-400 font-semibold"> TikTok</span> excels at viral product launches.
                  Click any platform to search competitors on that channel.
                </p>
              </div>
            </div>
          </div>

          {/* Platform Cards */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">Ad Platform Comparison</h3>
            <p className="text-xs text-muted-foreground mb-6">Average benchmarks across e-commerce advertisers.</p>

            <div className="space-y-3">
              {adPlatforms.map((p) => (
                <Link
                  key={p.name}
                  href={`/competitors`}
                  className="block p-4 rounded-xl bg-surface/50 border border-border hover:border-accent/20 hover:bg-surface transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2.5 rounded-xl ${p.bgColor} shrink-0`}>
                      <BarChart3 className={`h-5 w-5 ${p.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-display text-sm font-semibold text-foreground group-hover:text-accent transition-colors">{p.name}</h4>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">Avg CPC: <span className="text-foreground font-bold">${p.avgCPC.toFixed(2)}</span></span>
                        <span className="text-xs text-muted-foreground">Avg CTR: <span className="text-foreground font-bold">{p.avgCTR}%</span></span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.bestFor.map((b) => (
                          <span key={b} className="px-1.5 py-0.5 rounded bg-surface text-[9px] text-muted-foreground">{b}</span>
                        ))}
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* Platform Recommendation */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" /> Platform Recommendation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link href="/competitors"
                className="p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20 hover:border-emerald-400/40 transition-all group block">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-emerald-400 uppercase">Best ROI</p>
                  <ArrowUpRight className="h-3 w-3 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm font-medium text-foreground">Google Shopping</p>
                <p className="text-xs text-muted-foreground mt-1">Highest conversion intent, lowest CPA for specific products</p>
              </Link>
              <Link href="/competitors"
                className="p-4 rounded-xl bg-blue-400/5 border border-blue-400/20 hover:border-blue-400/40 transition-all group block">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-blue-400 uppercase">Best Reach</p>
                  <ArrowUpRight className="h-3 w-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm font-medium text-foreground">Facebook Ads</p>
                <p className="text-xs text-muted-foreground mt-1">Massive audience, excellent targeting, good for broad products</p>
              </Link>
              <Link href="/competitors"
                className="p-4 rounded-xl bg-pink-400/5 border border-pink-400/20 hover:border-pink-400/40 transition-all group block">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-pink-400 uppercase">Best Growth</p>
                  <ArrowUpRight className="h-3 w-3 text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm font-medium text-foreground">TikTok Ads</p>
                <p className="text-xs text-muted-foreground mt-1">Viral potential, younger demographics, trending product goldmine</p>
              </Link>
            </div>
          </div>

          {/* Platform Settings Link */}
          <div className="glass rounded-2xl p-5 border border-accent/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-accent/10">
                  <Settings className="h-4 w-4 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Need to configure platform integrations?</p>
                  <p className="text-xs text-muted-foreground">Set up API keys and connect your ad accounts in Settings.</p>
                </div>
              </div>
              <Link href="/settings"
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-xs font-medium text-accent hover:bg-accent/20 transition-all shrink-0">
                Settings <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
