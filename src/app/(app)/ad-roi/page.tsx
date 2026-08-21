"use client";

import { useState, useMemo } from "react";
import {
  DollarSign, TrendingUp, TrendingDown, Target, Zap,
  BarChart3, Calendar, AlertTriangle, CheckCircle2, ArrowUpRight,
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
}

const defaultScenarios: BudgetScenario[] = [
  { name: "Conservative", monthlyBudget: 500, cpc: 0.80, conversionRate: 2.5, avgOrderValue: 35 },
  { name: "Moderate", monthlyBudget: 1500, cpc: 0.95, conversionRate: 3.0, avgOrderValue: 35 },
  { name: "Aggressive", monthlyBudget: 5000, cpc: 1.10, conversionRate: 3.5, avgOrderValue: 35 },
];

const marketTimingData: MarketTiming[] = [
  { month: "January", demand: 65, competition: 40, suggestedAction: "launch", notes: "New Year resolutions, fitness/health peaks" },
  { month: "February", demand: 55, competition: 35, suggestedAction: "scale", notes: "Valentine's Day niche opportunities" },
  { month: "March", demand: 60, competition: 45, suggestedAction: "maintain", notes: "Spring cleaning, home improvement" },
  { month: "April", demand: 65, competition: 50, suggestedAction: "scale", notes: "Spring shopping, outdoor products" },
  { month: "May", demand: 70, competition: 55, suggestedAction: "scale", notes: "Mother's Day, graduation season" },
  { month: "June", demand: 75, competition: 60, suggestedAction: "maintain", notes: "Summer starts, outdoor/gadget peaks" },
  { month: "July", demand: 80, competition: 65, suggestedAction: "maintain", notes: "Peak summer, Prime Day effects" },
  { month: "August", demand: 75, competition: 60, suggestedAction: "maintain", notes: "Back to school, late summer deals" },
  { month: "September", demand: 70, competition: 55, suggestedAction: "scale", notes: "Fall transition, early holiday prep" },
  { month: "October", demand: 85, competition: 70, suggestedAction: "launch", notes: "Halloween, early Black Friday prep" },
  { month: "November", demand: 100, competition: 95, suggestedAction: "scale", notes: "Black Friday, Cyber Monday, peak season" },
  { month: "December", demand: 95, competition: 90, suggestedAction: "reduce", notes: "Holiday rush, shipping deadlines, margins thin" },
];

const adPlatforms = [
  { name: "Facebook Ads", avgCPC: 0.97, avgCTR: 0.90, bestFor: ["Fashion", "Home", "Beauty", "Health"] },
  { name: "TikTok Ads", avgCPC: 1.00, avgCTR: 1.20, bestFor: ["Trending products", "Youth audience", "Viral items"] },
  { name: "Google Shopping", avgCPC: 0.66, avgCTR: 1.50, bestFor: ["High-intent buyers", "Electronics", "Specific products"] },
  { name: "Instagram Ads", avgCPC: 0.80, avgCTR: 0.80, bestFor: ["Visual products", "Lifestyle", "Fashion"] },
  { name: "Pinterest Ads", avgCPC: 0.50, avgCTR: 0.60, bestFor: ["Home decor", "Fashion", "DIY", "Food"] },
];

export default function AdRoiPage() {
  const [scenarios, setScenarios] = useState(defaultScenarios);
  const [customCPC, setCustomCPC] = useState("0.95");
  const [customConvRate, setCustomConvRate] = useState("3.0");
  const [customAOV, setCustomAOV] = useState("35");
  const [activeTab, setActiveTab] = useState<"calculator" | "timing" | "platforms">("calculator");

  const results = useMemo(() => {
    return scenarios.map((s) => {
      const monthlyClicks = Math.round(s.monthlyBudget / s.cpc);
      const monthlyOrders = Math.round(monthlyClicks * (s.conversionRate / 100));
      const monthlyRevenue = monthlyOrders * s.avgOrderValue;
      const profit = monthlyRevenue - s.monthlyBudget;
      const roas = monthlyRevenue / s.monthlyBudget;
      const cpa = monthlyOrders > 0 ? s.monthlyBudget / monthlyOrders : 0;
      const breakEvenOrders = Math.ceil(s.monthlyBudget / (s.avgOrderValue - s.avgOrderValue * 0.3));
      const requiredConvRate = (breakEvenOrders / monthlyClicks) * 100;

      return {
        ...s,
        monthlyClicks,
        monthlyOrders,
        monthlyRevenue,
        profit,
        roas,
        cpa,
        breakEvenOrders,
        requiredConvRate,
      };
    });
  }, [scenarios]);

  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm";

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Target className="h-7 w-7 text-accent" /> Ad ROI Predictor & Market Timing
        </h1>
        <p className="text-muted-foreground">Predict ad returns and find the optimal launch timing for your products.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: "calculator" as const, label: "ROI Calculator", icon: DollarSign },
          { id: "timing" as const, label: "Market Timing", icon: Calendar },
          { id: "platforms" as const, label: "Platform Comparison", icon: BarChart3 },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id ? "bg-accent text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
            <tab.icon className="h-4 w-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* ROI Calculator Tab */}
      {activeTab === "calculator" && (
        <div className="space-y-6 animate-slide-up">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-4">Custom Parameters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Cost Per Click ($)</label>
                <input type="number" step="0.01" value={customCPC} onChange={(e) => setCustomCPC(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Conversion Rate (%)</label>
                <input type="number" step="0.1" value={customConvRate} onChange={(e) => setCustomConvRate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Avg Order Value ($)</label>
                <input type="number" step="1" value={customAOV} onChange={(e) => setCustomAOV(e.target.value)} className={inputClass} />
              </div>
            </div>
          </div>

          {/* Scenario Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {results.map((r) => (
              <div key={r.name} className="glass rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-display text-sm font-semibold text-foreground">{r.name}</h4>
                  <span className="text-xs text-muted-foreground">${r.monthlyBudget.toLocaleString()}/mo</span>
                </div>

                <div className="relative w-24 h-24 mx-auto mb-4">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-surface" />
                    <circle cx="50" cy="50" r="42" fill="none" strokeWidth="6" strokeLinecap="round"
                      strokeDasharray={`${Math.min(Math.max(r.roas / 5, 0), 1) * 264} 264`}
                      className={r.roas >= 3 ? "stroke-emerald-400" : r.roas >= 2 ? "stroke-accent" : "stroke-amber-400"} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-lg font-bold font-display ${r.roas >= 3 ? "text-emerald-400" : r.roas >= 2 ? "text-accent" : "text-amber-400"}`}>{r.roas.toFixed(1)}x</span>
                    <span className="text-[8px] text-muted-foreground uppercase">ROAS</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {[
                    { label: "Monthly Clicks", value: r.monthlyClicks.toLocaleString() },
                    { label: "Est. Orders", value: r.monthlyOrders.toLocaleString() },
                    { label: "Est. Revenue", value: `$${r.monthlyRevenue.toLocaleString()}` },
                    { label: "Net Profit", value: `$${r.profit.toLocaleString()}`, color: r.profit >= 0 ? "text-emerald-400" : "text-red-400" },
                    { label: "Cost Per Acquisition", value: `$${r.cpa.toFixed(2)}` },
                    { label: "Break-even Orders", value: r.breakEvenOrders.toLocaleString() },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between p-2 rounded-lg bg-surface/50">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className={`text-xs font-bold ${item.color || "text-foreground"}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Quick Comparison Bar Chart */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Profit Comparison</h3>
            <div className="space-y-3">
              {results.map((r) => {
                const maxProfit = Math.max(...results.map((x) => Math.abs(x.profit)));
                const width = maxProfit > 0 ? (Math.abs(r.profit) / maxProfit) * 100 : 0;
                return (
                  <div key={r.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 shrink-0">{r.name}</span>
                    <div className="flex-1 h-6 rounded-lg bg-surface overflow-hidden">
                      <div className={`h-full rounded-lg flex items-center px-3 ${r.profit >= 0 ? "bg-gradient-to-r from-emerald-400/80 to-emerald-400" : "bg-gradient-to-r from-red-400 to-red-400/80"}`}
                        style={{ width: `${width}%` }}>
                        <span className="text-[10px] font-bold text-white">${r.profit.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Market Timing Tab */}
      {activeTab === "timing" && (
        <div className="space-y-6 animate-slide-up">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">12-Market Demand Calendar</h3>
            <p className="text-xs text-muted-foreground mb-6">Based on historical e-commerce data. Demand and competition scored 0-100.</p>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {marketTimingData.map((m) => {
                const actionColors: Record<string, string> = {
                  launch: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
                  scale: "bg-accent/10 text-accent border-accent/20",
                  maintain: "bg-amber-400/10 text-amber-400 border-amber-400/20",
                  reduce: "bg-red-400/10 text-red-400 border-red-400/20",
                };
                return (
                  <div key={m.month} className="p-4 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-foreground">{m.month.slice(0, 3)}</span>
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
                    <p className="text-[9px] text-muted-foreground leading-relaxed">{m.notes}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Best Launch Windows */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4">Best Launch Windows</h3>
            <div className="space-y-2">
              {marketTimingData
                .filter((m) => m.suggestedAction === "launch" || m.suggestedAction === "scale")
                .sort((a, b) => (b.demand - b.competition) - (a.demand - a.competition))
                .slice(0, 5)
                .map((m) => (
                  <div key={m.month} className="flex items-center gap-3 p-3 rounded-xl bg-surface/50">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-400/10">
                      <Calendar className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">{m.month}</p>
                      <p className="text-xs text-muted-foreground">{m.notes}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-emerald-400">+{m.demand - m.competition} gap</p>
                      <p className="text-[9px] text-muted-foreground">demand - competition</p>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Platform Comparison Tab */}
      {activeTab === "platforms" && (
        <div className="space-y-6 animate-slide-up">
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">Ad Platform Comparison</h3>
            <p className="text-xs text-muted-foreground mb-6">Average benchmarks across e-commerce advertisers.</p>

            <div className="space-y-3">
              {adPlatforms.map((p) => (
                <div key={p.name} className="p-4 rounded-xl bg-surface/50 border border-border hover:border-accent/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <h4 className="font-display text-sm font-semibold text-foreground">{p.name}</h4>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground">Avg CPC: <span className="text-foreground font-bold">${p.avgCPC.toFixed(2)}</span></span>
                        <span className="text-xs text-muted-foreground">Avg CTR: <span className="text-foreground font-bold">{p.avgCTR}%</span></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase mb-1">Best For</p>
                      <div className="flex flex-wrap gap-1 justify-end max-w-[200px]">
                        {p.bestFor.map((b) => (
                          <span key={b} className="px-1.5 py-0.5 rounded bg-accent/10 text-[9px] text-accent">{b}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Platform Recommendation */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-400" /> Platform Recommendation
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-emerald-400/5 border border-emerald-400/20">
                <p className="text-xs font-bold text-emerald-400 uppercase mb-2">Best ROI</p>
                <p className="text-sm font-medium text-foreground">Google Shopping</p>
                <p className="text-xs text-muted-foreground mt-1">Highest conversion intent, lowest CPA for specific products</p>
              </div>
              <div className="p-4 rounded-xl bg-accent/5 border border-accent/20">
                <p className="text-xs font-bold text-accent uppercase mb-2">Best Reach</p>
                <p className="text-sm font-medium text-foreground">Facebook Ads</p>
                <p className="text-xs text-muted-foreground mt-1">Massive audience, excellent targeting, good for broad products</p>
              </div>
              <div className="p-4 rounded-xl bg-purple-400/5 border border-purple-400/20">
                <p className="text-xs font-bold text-purple-400 uppercase mb-2">Best Growth</p>
                <p className="text-sm font-medium text-foreground">TikTok Ads</p>
                <p className="text-xs text-muted-foreground mt-1">Viral potential, younger demographics, trending product goldmine</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
