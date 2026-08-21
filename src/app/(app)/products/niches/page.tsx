"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Target, TrendingUp, TrendingDown, Search, Filter,
  ChevronDown, ChevronUp, ArrowUpRight, BarChart3,
} from "lucide-react";

interface Niche {
  id: string;
  name: string;
  description: string;
  monthlySearches: number;
  competitionLevel: "low" | "medium" | "high" | "very-high";
  profitMargin: number;
  trend: "rising" | "stable" | "declining";
  seasonality: string;
  avgProductPrice: number;
  topProducts: string[];
  topSuppliers: string[];
  marketSize: string;
  difficulty: number;
}

const niches: Niche[] = [
  {
    id: "n1", name: "Smart Home Gadgets", description: "WiFi plugs, LED lights, smart sensors, home automation devices",
    monthlySearches: 280000, competitionLevel: "high", profitMargin: 45, trend: "rising",
    seasonality: "Year-round, peaks in Q4", avgProductPrice: 32, topProducts: ["Smart LED Strip", "WiFi Plug 4-Pack", "Smart Door Sensor"],
    topSuppliers: ["TechSource Global", "CJ Direct"], marketSize: "$12B", difficulty: 65,
  },
  {
    id: "n2", name: "Pet Tech", description: "GPS trackers, smart feeders, pet cameras, interactive toys",
    monthlySearches: 145000, competitionLevel: "medium", profitMargin: 55, trend: "rising",
    seasonality: "Year-round", avgProductPrice: 38, topProducts: ["GPS Smart Collar", "Pet Camera", "Interactive Cat Toy"],
    topSuppliers: ["PrimeDrop Fulfillment", "TechSource Global"], marketSize: "$8B", difficulty: 45,
  },
  {
    id: "n3", name: "Fitness & Wellness", description: "Yoga mats, resistance bands, posture correctors, massage guns",
    monthlySearches: 320000, competitionLevel: "high", profitMargin: 50, trend: "stable",
    seasonality: "Peaks in January", avgProductPrice: 28, topProducts: ["Yoga Mat Premium", "Resistance Band Set", "Posture Corrector"],
    topSuppliers: ["EuropaSupply", "NordicTrade Co"], marketSize: "$15B", difficulty: 70,
  },
  {
    id: "n4", name: "Kitchen Gadgets", description: "Portable espresso makers, silicone tools, kitchen organizers",
    monthlySearches: 195000, competitionLevel: "medium", profitMargin: 48, trend: "stable",
    seasonality: "Peaks in summer", avgProductPrice: 25, topProducts: ["Portable Espresso Maker", "Silicone Baking Set", "Kitchen Organizer"],
    topSuppliers: ["CJ Direct", "TechSource Global"], marketSize: "$9B", difficulty: 50,
  },
  {
    id: "n5", name: "Car Accessories", description: "Phone mounts, organizers, LED lights, dash cams",
    monthlySearches: 210000, competitionLevel: "very-high", profitMargin: 42, trend: "stable",
    seasonality: "Year-round", avgProductPrice: 22, topProducts: ["Magnetic Phone Mount", "Car LED Lights", "Seat Organizer"],
    topSuppliers: ["TechSource Global", "CJ Direct"], marketSize: "$7B", difficulty: 75,
  },
  {
    id: "n6", name: "Fashion Accessories", description: "Minimalist wallets, jewelry, sunglasses, bags",
    monthlySearches: 260000, competitionLevel: "very-high", profitMargin: 60, trend: "stable",
    seasonality: "Peaks in gift seasons", avgProductPrice: 20, topProducts: ["Minimalist Wallet", "Chain Necklace", "Polarized Sunglasses"],
    topSuppliers: ["CJ Direct", "NordicTrade Co"], marketSize: "$18B", difficulty: 80,
  },
  {
    id: "n7", name: "Baby & Kids", description: "Educational toys, baby monitors, safety products, clothing",
    monthlySearches: 175000, competitionLevel: "medium", profitMargin: 52, trend: "rising",
    seasonality: "Year-round", avgProductPrice: 30, topProducts: ["Baby Monitor", "Educational Toy Set", "Safety Corner Guards"],
    topSuppliers: ["PrimeDrop Fulfillment", "EuropaSupply"], marketSize: "$11B", difficulty: 55,
  },
  {
    id: "n8", name: "Office & Productivity", description: "Desk organizers, standing desks, ergonomic accessories",
    monthlySearches: 120000, competitionLevel: "low", profitMargin: 40, trend: "rising",
    seasonality: "Peaks in Jan/Aug", avgProductPrice: 35, topProducts: ["Desk Organizer Set", "Monitor Stand", "Ergonomic Mouse Pad"],
    topSuppliers: ["EuropaSupply", "NordicTrade Co"], marketSize: "$6B", difficulty: 35,
  },
];

const competitionColors: Record<string, string> = {
  low: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
  medium: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  high: "bg-orange-400/10 text-orange-400 border-orange-400/20",
  "very-high": "bg-red-400/10 text-red-400 border-red-400/20",
};

export default function NichesPage() {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"searches" | "profit" | "difficulty" | "trend">("searches");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let results = [...niches];
    if (query) {
      const q = query.toLowerCase();
      results = results.filter((n) => n.name.toLowerCase().includes(q) || n.description.toLowerCase().includes(q));
    }
    switch (sortBy) {
      case "profit": results.sort((a, b) => b.profitMargin - a.profitMargin); break;
      case "difficulty": results.sort((a, b) => a.difficulty - b.difficulty); break;
      case "trend": results.sort((a, b) => (b.trend === "rising" ? 1 : 0) - (a.trend === "rising" ? 1 : 0)); break;
      default: results.sort((a, b) => b.monthlySearches - a.monthlySearches);
    }
    return results;
  }, [query, sortBy]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Target className="h-7 w-7 text-accent" /> Niche Explorer
        </h1>
        <p className="text-muted-foreground">Discover profitable niches with AI-analyzed competition, trends, and supplier data.</p>
      </div>

      <div className="glass rounded-2xl p-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search niches..."
              className="w-full pl-11 pr-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm" />
          </div>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground">
            <option value="searches">Sort: Search Volume</option>
            <option value="profit">Sort: Profit Margin</option>
            <option value="difficulty">Sort: Difficulty (Low first)</option>
            <option value="trend">Sort: Trend</option>
          </select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground mb-4">{filtered.length} niches found</p>

      <div className="space-y-3">
        {filtered.map((niche) => (
          <div key={niche.id} className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${expandedId === niche.id ? "border-accent/20" : "hover:border-accent/10"}`}>
            <div className="p-5 cursor-pointer" onClick={() => setExpandedId(expandedId === niche.id ? null : niche.id)}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
                  <Target className="h-5 w-5 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-display text-sm font-semibold text-foreground">{niche.name}</h3>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${competitionColors[niche.competitionLevel]}`}>
                      {niche.competitionLevel}
                    </span>
                    {niche.trend === "rising" && (
                      <span className="flex items-center gap-0.5 px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-400 text-[10px] font-bold">
                        <TrendingUp className="h-3 w-3" /> Rising
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-1">{niche.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{(niche.monthlySearches / 1000).toFixed(0)}K searches/mo</span>
                    <span>{niche.profitMargin}% margins</span>
                    <span>{niche.marketSize} market</span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-lg font-bold font-display text-foreground">{niche.profitMargin}%</p>
                  <p className="text-[9px] text-muted-foreground uppercase">Margin</p>
                </div>
                <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                  {expandedId === niche.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {expandedId === niche.id && (
              <div className="px-5 pb-5 border-t border-border pt-4 animate-slide-up space-y-4">
                {/* Difficulty Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">Entry Difficulty</span>
                    <span className="text-xs font-bold text-foreground">{niche.difficulty}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${niche.difficulty < 40 ? "bg-emerald-400" : niche.difficulty < 60 ? "bg-amber-400" : "bg-red-400"}`}
                      style={{ width: `${niche.difficulty}%` }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Top Products</p>
                    <div className="space-y-1.5">
                      {niche.topProducts.map((p, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface/50">
                          <span className="text-[10px] font-bold text-accent">#{i + 1}</span>
                          <span className="text-xs text-foreground">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Top Suppliers</p>
                    <div className="space-y-1.5">
                      {niche.topSuppliers.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-surface/50">
                          <span className="text-xs text-foreground">{s}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">Avg Price: ${niche.avgProductPrice}</p>
                    <p className="text-xs text-muted-foreground">Seasonality: {niche.seasonality}</p>
                  </div>
                </div>

                <Link href="/products"
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-medium hover:bg-accent/20 transition-all">
                  Search Products in This Niche <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
