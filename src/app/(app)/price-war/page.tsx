"use client";

import { useState } from "react";
import { DollarSign, Plus, Trash2, Play, Pause, Loader2, TrendingDown, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { useAPI } from "@/hooks/useAPI";
import { useToast } from "@/components/ui/Toast";
import type { PriceRule, PriceAdjustmentLog } from "@/types/price-war";

const STRATEGIES = [
  { id: "match_lowest", label: "Match Lowest", desc: "Match the lowest competitor price" },
  { id: "stay_below", label: "Stay Below", desc: "Stay X% below lowest competitor" },
  { id: "maintain_margin", label: "Maintain Margin", desc: "Keep minimum margin while competing" },
  { id: "undercut_percent", label: "Undercut %", desc: "Undercut by a fixed percentage" },
  { id: "fixed", label: "Fixed Price", desc: "Never auto-adjust" },
] as const;

const STRAT_COLORS: Record<string, string> = {
  match_lowest: "bg-blue-400/10 text-blue-400",
  stay_below: "bg-emerald-400/10 text-emerald-400",
  maintain_margin: "bg-purple-400/10 text-purple-400",
  undercut_percent: "bg-amber-400/10 text-amber-400",
  fixed: "bg-gray-400/10 text-gray-400",
};

export default function PriceWarPage() {
  const { user } = useAuth();
  const uid = user?.uid || "";
  const { error: toastError } = useToast();

  const { data: rulesData, mutate: mutateRules } = useAPI<{ rules?: PriceRule[] }>(uid ? `/api/ai/price-war?uid=${uid}` : null);
  const { data: statsData } = useAPI<{ stats?: any }>(uid ? `/api/ai/price-war?type=stats&uid=${uid}` : null);
  const { data: logsData } = useAPI<{ logs?: PriceAdjustmentLog[] }>(uid ? `/api/ai/price-war/history?uid=${uid}` : null);

  const rules = rulesData?.rules || [];
  const stats = statsData?.stats || null;
  const logs = logsData?.logs || [];

  const [showAdd, setShowAdd] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [form, setForm] = useState({
    productTitle: "", myPrice: "", cost: "", floorPrice: "", minMargin: "20",
    strategy: "match_lowest" as string, undercutPercent: "3", belowPercent: "5", targetMargin: "25",
    platforms: "amazon", competitorUrls: "",
  });

  const handleAdd = async () => {
    try {
      const res = await fetch("/api/ai/price-war", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productTitle: form.productTitle,
          myPrice: parseFloat(form.myPrice) || 0,
          cost: parseFloat(form.cost) || 0,
          floorPrice: parseFloat(form.floorPrice) || 0,
          minMargin: parseFloat(form.minMargin) || 0,
          strategy: form.strategy,
          strategyConfig: {
            undercutPercent: parseFloat(form.undercutPercent) || undefined,
            belowPercent: parseFloat(form.belowPercent) || undefined,
            targetMargin: parseFloat(form.targetMargin) || undefined,
          },
          platforms: form.platforms.split(",").map((s) => s.trim()).filter(Boolean),
          competitorUrls: form.competitorUrls.split("\n").map((s) => s.trim()).filter(Boolean).length > 0
            ? form.competitorUrls.split("\n").map((s) => s.trim()).filter(Boolean)
            : ["https://example.com/competitor"],
        }),
      });
      if (res.ok) {
        mutateRules();
        setShowAdd(false);
        setForm({ productTitle: "", myPrice: "", cost: "", floorPrice: "", minMargin: "20", strategy: "match_lowest", undercutPercent: "3", belowPercent: "5", targetMargin: "25", platforms: "amazon", competitorUrls: "" });
      }
    } catch (e) { if (process.env.NODE_ENV === "development") console.error(e); toastError("Failed to add price rule"); }
  };

  const handleExecute = async (dryRun: boolean = false) => {
    setExecuting(true);
    try {
      await fetch("/api/ai/price-war/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun }),
      });
      mutateRules();
    } catch (e) { if (process.env.NODE_ENV === "development") console.error(e); toastError("Failed to run price check"); }
    finally { setExecuting(false); }
  };

  const handleToggle = async (rule: PriceRule) => {
    const newStatus = rule.status === "active" ? "paused" : "active";
    try {
      await fetch("/api/ai/price-war", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rule, status: newStatus }),
      });
      mutateRules();
    } catch (e) { if (process.env.NODE_ENV === "development") console.error(e); toastError("Failed to update rule status"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/ai/price-war?id=${id}`, { method: "DELETE" });
      mutateRules();
    } catch (e) { if (process.env.NODE_ENV === "development") console.error(e); toastError("Failed to delete price rule"); }
  };

  const getMargin = (price: number, cost: number) => price > 0 ? Math.round(((price - cost) / price) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-3 sm:px-4 lg:px-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Price War Bot</h1>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-400/10 text-emerald-400 text-[10px] font-bold">AI POWERED</span>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">Monitor competitor prices 24/7 and auto-adjust to stay competitive while maintaining margins.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => handleExecute(true)} disabled={executing} className="px-3 py-1.5 rounded-xl bg-surface border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5">
            {executing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
            Dry Run
          </button>
          <button onClick={() => handleExecute(false)} disabled={executing} className="px-3 py-1.5 rounded-xl bg-accent text-white text-[10px] font-semibold hover:bg-accent/80 transition-all flex items-center gap-1.5">
            {executing ? <Loader2 className="h-3 w-3 animate-spin" /> : <DollarSign className="h-3 w-3" />}
            Execute Check
          </button>
          <button onClick={() => setShowAdd(!showAdd)} className="px-3 py-1.5 rounded-xl bg-accent text-white text-[10px] font-semibold hover:bg-accent/80 transition-all flex items-center gap-1.5">
            <Plus className="h-3 w-3" /> Add Rule
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <div className="glass rounded-xl p-3"><p className="text-lg font-bold text-foreground">{stats.activeRules}</p><p className="text-[10px] text-muted-foreground">Active Rules</p></div>
          <div className="glass rounded-xl p-3"><p className="text-lg font-bold text-foreground">{stats.triggeredToday}</p><p className="text-[10px] text-muted-foreground">Triggered Today</p></div>
          <div className="glass rounded-xl p-3"><p className="text-lg font-bold text-foreground">{stats.avgMarginMaintained}%</p><p className="text-[10px] text-muted-foreground">Avg Margin</p></div>
          <div className="glass rounded-xl p-3"><p className="text-lg font-bold text-foreground">{stats.totalAdjustments}</p><p className="text-[10px] text-muted-foreground">Total Adjustments</p></div>
        </div>
      )}

      {showAdd && (
        <div className="glass rounded-2xl p-4 sm:p-5 space-y-3">
          <h3 className="font-display text-sm font-semibold text-foreground">New Price Rule</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.productTitle} onChange={(e) => setForm({ ...form, productTitle: e.target.value })} placeholder="Product title" className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <input value={form.myPrice} onChange={(e) => setForm({ ...form, myPrice: e.target.value })} placeholder="My price ($)" type="number" step="0.01" className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <input value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="Cost ($)" type="number" step="0.01" className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
            <input value={form.floorPrice} onChange={(e) => setForm({ ...form, floorPrice: e.target.value })} placeholder="Floor price ($)" type="number" step="0.01" className="px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Strategy</label>
            <div className="flex flex-wrap gap-1.5">
              {STRATEGIES.map((s) => (
                <button key={s.id} onClick={() => setForm({ ...form, strategy: s.id })} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold transition-all ${form.strategy === s.id ? "bg-accent text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <textarea value={form.competitorUrls} onChange={(e) => setForm({ ...form, competitorUrls: e.target.value })} placeholder="Competitor URLs (one per line)" rows={2} className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/40 resize-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 rounded-xl bg-surface border border-border text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-all">Cancel</button>
            <button onClick={handleAdd} disabled={!form.productTitle || !form.myPrice} className="px-3 py-1.5 rounded-xl bg-accent text-white text-[10px] font-semibold hover:bg-accent/80 disabled:opacity-50 transition-all">Save Rule</button>
          </div>
        </div>
      )}

      <div className="glass rounded-2xl overflow-hidden">
        <div className="p-4 border-b border-border">
          <h3 className="font-display text-sm font-semibold text-foreground">Price Rules</h3>
        </div>
        {rules.length === 0 ? (
          <div className="p-12 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No price rules yet. Add your first rule to start monitoring.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {rules.map((rule) => {
              const margin = getMargin(rule.myPrice, rule.cost);
              return (
                <div key={rule.id} className="p-3 sm:p-4 hover:bg-surface-hover transition-all">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-medium text-foreground truncate">{rule.productTitle}</h4>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${STRAT_COLORS[rule.strategy] || "bg-gray-400/10 text-gray-400"}`}>{rule.strategy.replace(/_/g, " ")}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${rule.status === "active" ? "bg-emerald-400/10 text-emerald-400" : rule.status === "paused" ? "bg-amber-400/10 text-amber-400" : "bg-red-400/10 text-red-400"}`}>{rule.status}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                        <span>Price: <span className="text-foreground font-semibold">${rule.myPrice.toFixed(2)}</span></span>
                        <span>Cost: <span className="text-foreground font-semibold">${rule.cost.toFixed(2)}</span></span>
                        <span>Margin: <span className={`font-semibold ${margin >= 30 ? "text-emerald-400" : margin >= 15 ? "text-amber-400" : "text-red-400"}`}>{margin}%</span></span>
                        <span>Floor: <span className="text-foreground font-semibold">${rule.floorPrice.toFixed(2)}</span></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleToggle(rule)} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                        {rule.status === "active" ? <Pause className="h-3.5 w-3.5 text-amber-400" /> : <Play className="h-3.5 w-3.5 text-emerald-400" />}
                      </button>
                      <button onClick={() => handleDelete(rule.id)} className="p-1.5 rounded-lg hover:bg-surface-hover transition-colors">
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="glass rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-display text-sm font-semibold text-foreground">Recent Adjustments</h3>
          </div>
          <div className="divide-y divide-border max-h-[400px] overflow-y-auto">
            {logs.slice(0, 20).map((log) => (
              <div key={log.id} className="p-3 flex items-center justify-between text-[10px]">
                <div>
                  <span className="text-foreground font-medium">{log.productTitle}</span>
                  <span className="text-muted-foreground ml-2">{log.reason?.slice(0, 60)}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-muted-foreground">${log.previousPrice.toFixed(2)}</span>
                  <span className={log.newPrice > log.previousPrice ? "text-red-400" : "text-emerald-400"}>
                    {log.newPrice > log.previousPrice ? <TrendingUp className="h-3 w-3 inline" /> : <TrendingDown className="h-3 w-3 inline" />}
                    ${log.newPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
