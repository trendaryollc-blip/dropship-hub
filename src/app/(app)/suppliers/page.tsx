"use client";

import { useState, useMemo } from "react";
import {
  Search, Shield, MapPin, Clock, Star, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, CheckCircle2, Truck,
  TrendingUp,
} from "lucide-react";
import { allSuppliers, findBackupSuppliers, ExtendedSupplier } from "@/lib/mock-suppliers";

type SortBy = "reliability" | "rating" | "speed" | "price" | "orders";
type Tab = "find" | "redundancy";

const badgeConfig: Record<string, { label: string; color: string }> = {
  gold: { label: "Gold", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  silver: { label: "Silver", color: "text-gray-300 bg-gray-300/10 border-gray-300/20" },
  bronze: { label: "Bronze", color: "text-orange-400 bg-orange-400/10 border-orange-400/20" },
};

function ScoreBar({ score, color }: { score: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono text-foreground w-8 text-right">{score}</span>
    </div>
  );
}

function SupplierCard({
  supplier, expanded, onToggle, onFindBackups,
}: {
  supplier: ExtendedSupplier;
  expanded: boolean;
  onToggle: () => void;
  onFindBackups?: () => void;
}) {
  const badge = badgeConfig[supplier.trustBadge];
  const overallScore = Math.round(
    supplier.reliabilityScore * 0.35 + supplier.communicationScore * 0.25 +
    supplier.qualityScore * 0.25 + supplier.priceCompetitiveness * 0.15
  );

  return (
    <div className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${expanded ? "border-accent/20" : "hover:border-accent/10"}`}>
      <div className="p-5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center font-display text-sm font-bold text-accent shrink-0">
            {supplier.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-display text-sm font-semibold text-foreground">{supplier.name}</h3>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${badge.color}`}>{badge.label}</span>
              {supplier.reliabilityScore >= 95 && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase">Top Rated</span>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {supplier.location}</span>
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {supplier.responseTime}</span>
              <span className="flex items-center gap-1"><Truck className="h-3 w-3" /> {supplier.shippingDays} days</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="relative w-14 h-14">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" stroke="currentColor" strokeWidth="3" className="text-surface" />
                <circle cx="28" cy="28" r="24" fill="none" strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={`${(overallScore / 100) * 151} 151`}
                  className={overallScore >= 90 ? "stroke-emerald-400" : overallScore >= 75 ? "stroke-accent" : "stroke-amber-400"} />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="font-display text-sm font-bold text-foreground">{overallScore}</span>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground uppercase mt-0.5">AI Score</p>
          </div>
          <button className="p-1 text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-5 border-t border-border pt-4 animate-slide-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {[
              { label: "Reliability", score: supplier.reliabilityScore, color: "bg-emerald-400" },
              { label: "Communication", score: supplier.communicationScore, color: "bg-accent" },
              { label: "Quality", score: supplier.qualityScore, color: "bg-purple-400" },
              { label: "Price", score: supplier.priceCompetitiveness, color: "bg-amber-400" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">{item.label}</p>
                <ScoreBar score={item.score} color={item.color} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-3 mb-4">
            {[
              { icon: Star, label: "Rating", value: `${supplier.rating}/5`, color: "text-amber-400" },
              { icon: CheckCircle2, label: "Completion", value: `${supplier.orderCompletionRate}%`, color: "text-emerald-400" },
              { icon: AlertTriangle, label: "Disputes", value: `${supplier.disputeRate}%`, color: supplier.disputeRate < 1 ? "text-emerald-400" : "text-amber-400" },
              { icon: TrendingUp, label: "Monthly", value: `${(supplier.monthlyOrders / 1000).toFixed(0)}K`, color: "text-accent" },
            ].map((m) => (
              <div key={m.label} className="p-3 rounded-xl bg-surface/50 border border-border text-center">
                <m.icon className={`h-4 w-4 ${m.color} mx-auto mb-1`} />
                <p className="text-xs font-bold text-foreground">{m.value}</p>
                <p className="text-[9px] text-muted-foreground uppercase">{m.label}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Shipping Methods</p>
              <div className="flex flex-wrap gap-1.5">
                {supplier.shippingMethods.map((m) => (
                  <span key={m} className="px-2 py-1 rounded-lg bg-surface border border-border text-[10px] text-muted-foreground">{m}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Certifications</p>
              <div className="flex flex-wrap gap-1.5">
                {supplier.certifications.map((c) => (
                  <span key={c} className="px-2 py-1 rounded-lg bg-accent/10 border border-accent/20 text-[10px] text-accent font-medium">{c}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Categories</p>
              <div className="flex flex-wrap gap-1.5">
                {supplier.categories.map((c) => (
                  <span key={c} className="px-2 py-1 rounded-lg bg-surface border border-border text-[10px] text-muted-foreground">{c}</span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Details</p>
              <p className="text-xs text-foreground">{supplier.returnPolicy}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Est. {supplier.yearEstablished} | Processing: {supplier.avgProcessingTime}</p>
            </div>
          </div>

          {onFindBackups && (
            <button
              onClick={(e) => { e.stopPropagation(); onFindBackups(); }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-accent-warm/10 border border-accent-warm/20 text-accent-warm text-sm font-medium hover:bg-accent-warm/20 transition-all"
            >
              <RefreshCw className="h-4 w-4" /> Find Backup Suppliers
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function SuppliersPage() {
  const [activeTab, setActiveTab] = useState<Tab>("find");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("reliability");
  const [trustFilter, setTrustFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedPrimary, setSelectedPrimary] = useState<string>("");
  const [backupResults, setBackupResults] = useState<ExtendedSupplier[]>([]);
  const [redundancyExpanded, setRedundancyExpanded] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let results = [...allSuppliers];
    if (query) {
      const q = query.toLowerCase();
      results = results.filter((s) => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q) || s.categories.some((c) => c.toLowerCase().includes(q)));
    }
    if (trustFilter !== "all") results = results.filter((s) => s.trustBadge === trustFilter);
    switch (sortBy) {
      case "rating": results.sort((a, b) => b.rating - a.rating); break;
      case "speed": results.sort((a, b) => a.shippingDays - b.shippingDays); break;
      case "price": results.sort((a, b) => b.priceCompetitiveness - a.priceCompetitiveness); break;
      case "orders": results.sort((a, b) => b.monthlyOrders - a.monthlyOrders); break;
      default: results.sort((a, b) => b.reliabilityScore - a.reliabilityScore);
    }
    return results;
  }, [query, sortBy, trustFilter]);

  const handleFindBackups = (primaryId: string) => {
    setSelectedPrimary(primaryId);
    setBackupResults(findBackupSuppliers(primaryId));
    setActiveTab("redundancy");
  };

  const primaryName = allSuppliers.find((s) => s.id === selectedPrimary)?.name || "";
  const inputClass = "w-full px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all text-sm";

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
          <Shield className="h-7 w-7 text-accent" /> Supplier Intelligence
        </h1>
        <p className="text-muted-foreground">AI-scored suppliers with reliability data and automatic backup discovery.</p>
      </div>

      <div className="flex gap-2 mb-6">
        <button onClick={() => setActiveTab("find")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === "find" ? "bg-accent text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
          <Search className="h-4 w-4" /> Find Suppliers
        </button>
        <button onClick={() => setActiveTab("redundancy")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${activeTab === "redundancy" ? "bg-accent-warm text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
          <RefreshCw className="h-4 w-4" /> Redundancy Planner
          <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[9px] font-bold">UNIQUE</span>
        </button>
      </div>

      {/* FIND TAB */}
      {activeTab === "find" && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass rounded-2xl p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name, location, or category..." className={inputClass.replace("w-full", "w-full pl-11")} />
              </div>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)} className="px-4 py-3 rounded-xl bg-surface border border-border text-sm text-foreground">
                <option value="reliability">Sort: Reliability</option>
                <option value="rating">Sort: Rating</option>
                <option value="speed">Sort: Speed</option>
                <option value="price">Sort: Price</option>
                <option value="orders">Sort: Volume</option>
              </select>
              <div className="flex gap-1.5">
                {["all", "gold", "silver", "bronze"].map((t) => (
                  <button key={t} onClick={() => setTrustFilter(t)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${trustFilter === t ? "bg-accent text-white" : "bg-surface border border-border text-muted-foreground hover:text-foreground"}`}>
                    {t === "all" ? "All" : badgeConfig[t].label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{filtered.length} suppliers found</p>

          <div className="space-y-3">
            {filtered.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} expanded={expandedId === supplier.id}
                onToggle={() => setExpandedId(expandedId === supplier.id ? null : supplier.id)}
                onFindBackups={() => handleFindBackups(supplier.id)} />
            ))}
          </div>
        </div>
      )}

      {/* REDUNDANCY TAB */}
      {activeTab === "redundancy" && (
        <div className="space-y-6 animate-slide-up">
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <RefreshCw className="h-5 w-5 text-accent-warm" />
              <div>
                <h3 className="font-display text-lg font-semibold text-foreground">Supplier Redundancy Planner</h3>
                <p className="text-xs text-muted-foreground">Find backup suppliers to protect your business from supply chain failures.</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Select Primary Supplier</label>
              <select value={selectedPrimary} onChange={(e) => { setSelectedPrimary(e.target.value); if (e.target.value) setBackupResults(findBackupSuppliers(e.target.value)); }}
                className={inputClass}>
                <option value="">Choose a supplier...</option>
                {allSuppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.location})</option>
                ))}
              </select>
            </div>
          </div>

          {selectedPrimary && backupResults.length > 0 && (
            <>
              <div className="p-4 rounded-xl bg-accent-warm/5 border border-accent-warm/20 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-accent-warm shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">Found {backupResults.length} backup suppliers for {primaryName}</p>
                  <p className="text-xs text-muted-foreground mt-1">Ranked by composite AI score: reliability (40%) + communication (25%) + quality (25%) + price (10%)</p>
                </div>
              </div>

              <div className="space-y-3">
                {backupResults.map((supplier, idx) => (
                  <div key={supplier.id} className="relative">
                    {idx === 0 && (
                      <div className="absolute -left-2 top-4 px-2 py-0.5 rounded-md bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase z-10">
                        Best Match
                      </div>
                    )}
                    <SupplierCard supplier={supplier} expanded={redundancyExpanded === supplier.id}
                      onToggle={() => setRedundancyExpanded(redundancyExpanded === supplier.id ? null : supplier.id)} />
                  </div>
                ))}
              </div>
            </>
          )}

          {selectedPrimary && backupResults.length === 0 && (
            <div className="glass rounded-2xl p-12 text-center">
              <AlertTriangle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No backup suppliers found for this supplier.</p>
            </div>
          )}

          {!selectedPrimary && (
            <div className="glass rounded-2xl p-12 text-center">
              <RefreshCw className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Select a primary supplier above to find backups.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
