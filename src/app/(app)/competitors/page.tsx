"use client";

import { useState, useMemo } from "react";
import {
  Search, TrendingUp, TrendingDown, Users, Globe, DollarSign,
  ChevronDown, ChevronUp, ExternalLink, AlertTriangle,
  BarChart3, Target,
} from "lucide-react";
import { mockCompetitors, Competitor } from "@/lib/mock-competitors";

type NicheFilter = "all" | "Consumer Electronics" | "Home & Kitchen" | "Fitness & Health" | "Pet Supplies" | "Fashion Accessories" | "Smart Home";

const niches: NicheFilter[] = ["all", "Consumer Electronics", "Home & Kitchen", "Fitness & Health", "Pet Supplies", "Fashion Accessories", "Smart Home"];

function MetricCard({ icon: Icon, label, value, color }: { icon: typeof TrendingUp; label: string; value: string; color: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-xl ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-bold font-display text-foreground">{value}</p>
        </div>
      </div>
    </div>
  );
}

function CompetitorCard({ competitor, expanded, onToggle }: { competitor: Competitor; expanded: boolean; onToggle: () => void }) {
  const totalFollowers = competitor.socialFollowers.reduce((sum, f) => sum + f.count, 0);
  const strategyColors: Record<string, string> = {
    premium: "bg-purple-400/10 text-purple-400 border-purple-400/20",
    competitive: "bg-accent/10 text-accent border-accent/20",
    budget: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  };
  const fulfillmentColors: Record<string, string> = {
    "self-fulfilled": "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    "3pl": "bg-accent/10 text-accent border-accent/20",
    "supplier-direct": "bg-purple-400/10 text-purple-400 border-purple-400/20",
    "hybrid": "bg-amber-400/10 text-amber-400 border-amber-400/20",
  };

  return (
    <div className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${expanded ? "border-accent/20" : "hover:border-accent/10"}`}>
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center font-display text-sm font-bold text-accent shrink-0">
            {competitor.storeName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-display text-sm font-semibold text-foreground">{competitor.storeName}</h3>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-surface border border-border text-muted-foreground">{competitor.platform}</span>
            </div>
            <p className="text-xs text-muted-foreground mb-1">{competitor.niche} · {competitor.country}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {(totalFollowers / 1000).toFixed(0)}K followers</span>
              <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> {(competitor.monthlyTraffic / 1000).toFixed(0)}K/mo</span>
              <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> ${(competitor.estimatedRevenue / 1000).toFixed(0)}K/mo</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className={`flex items-center gap-1 text-sm font-bold ${competitor.growthRate >= 20 ? "text-emerald-400" : "text-amber-400"}`}>
              {competitor.growthRate >= 20 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              +{competitor.growthRate}%
            </div>
            <p className="text-[9px] text-muted-foreground uppercase mt-0.5">Growth</p>
          </div>
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border pt-4 animate-slide-up space-y-4">
          <div className="flex gap-2 flex-wrap">
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${strategyColors[competitor.pricingStrategy]}`}>{competitor.pricingStrategy}</span>
            <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase border ${fulfillmentColors[competitor.fulfillmentMethod]}`}>{competitor.fulfillmentMethod}</span>
            <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-surface border border-border text-muted-foreground">DA: {competitor.domainAuthority}</span>
            <span className="px-2 py-1 rounded-lg text-[10px] font-medium bg-surface border border-border text-muted-foreground">Est. {competitor.founded}</span>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Top Sellers</p>
            <div className="space-y-2">
              {competitor.bestSellers.map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface/50 border border-border">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-xs font-bold text-accent">#{i + 1}</div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{item.name}</p>
                    <p className="text-[10px] text-muted-foreground">{item.sales.toLocaleString()} sold · {item.reviews.toLocaleString()} reviews</p>
                  </div>
                  <p className="text-sm font-bold text-foreground">${item.price}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-semibold text-emerald-400 mb-2 uppercase tracking-wider">Strengths</p>
              <ul className="space-y-1">
                {competitor.strengths.map((s, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5">+</span> {s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-400 mb-2 uppercase tracking-wider">Weaknesses</p>
              <ul className="space-y-1">
                {competitor.weaknesses.map((w, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <span className="text-amber-400 mt-0.5">-</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Ad Platforms</p>
            <div className="flex flex-wrap gap-1.5">
              {competitor.adPlatforms.map((p) => (
                <span key={p} className="px-2 py-1 rounded-lg bg-surface border border-border text-[10px] text-muted-foreground">{p}</span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CompetitorsPage() {
  const [query, setQuery] = useState("");
  const [nicheFilter, setNicheFilter] = useState<NicheFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let results = [...mockCompetitors];
    if (query) {
      const q = query.toLowerCase();
      results = results.filter((c) => c.storeName.toLowerCase().includes(q) || c.niche.toLowerCase().includes(q));
    }
    if (nicheFilter !== "all") results = results.filter((c) => c.niche === nicheFilter);
    return results;
  }, [query, nicheFilter]);

  const totalRevenue = mockCompetitors.reduce((sum, c) => sum + c.estimatedRevenue, 0);
  const avgGrowth = mockCompetitors.reduce((sum, c) => sum + c.growthRate, 0) / mockCompetitors.length;
  const avgTraffic = mockCompetitors.reduce((sum, c) => sum + c.monthlyTraffic, 0);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <BarChart3 className="h-7 w-7 text-accent" /> Competitor Intelligence
        </h1>
        <p className="text-muted-foreground">Analyze your competitors' stores, pricing, and strategies with AI-powered insights.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <MetricCard icon={Users} label="Total Competitors" value={`${mockCompetitors.length}`} color="bg-accent/10 text-accent" />
        <MetricCard icon={DollarSign} label="Combined Revenue" value={`$${(totalRevenue / 1000).toFixed(0)}K`} color="bg-emerald-400/10 text-emerald-400" />
        <MetricCard icon={TrendingUp} label="Avg Growth" value={`+${avgGrowth.toFixed(0)}%`} color="bg-purple-400/10 text-purple-400" />
        <MetricCard icon={Globe} label="Total Traffic" value={`${(avgTraffic / 1000).toFixed(0)}K`} color="bg-amber-400/10 text-amber-400" />
      </div>

      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search competitors..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {niches.map((n) => (
              <button key={n} onClick={() => setNicheFilter(n)}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${nicheFilter === n ? "bg-accent text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                {n === "all" ? "All Niches" : n}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{filtered.length} competitors found</p>

      <div className="space-y-3">
        {filtered.map((competitor) => (
          <CompetitorCard key={competitor.id} competitor={competitor} expanded={expandedId === competitor.id}
            onToggle={() => setExpandedId(expandedId === competitor.id ? null : competitor.id)} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="glass rounded-2xl p-12 text-center">
          <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No competitors match your search.</p>
        </div>
      )}
    </div>
  );
}
