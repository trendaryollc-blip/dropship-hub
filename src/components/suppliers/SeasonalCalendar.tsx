"use client";

import { useState } from "react";
import { Calendar, Clock, Loader2 } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI } from "@/hooks/useAPI";
import type { SeasonalInsight } from "@/types/supplier";

const TIER_CONFIG = {
  elite: { label: "Elite", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
  reliable: { label: "Reliable", color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  risky: { label: "Risky", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  avoid: { label: "Avoid", color: "text-red-400 bg-red-400/10 border-red-400/20" },
};

const SEASON_COLORS: Record<string, string> = {
  q4: "from-red-500/20 to-amber-500/20",
  back_to_school: "from-blue-500/20 to-purple-500/20",
  summer: "from-emerald-500/20 to-cyan-500/20",
  valentines: "from-pink-500/20 to-rose-500/20",
  mothers_day: "from-purple-500/20 to-pink-500/20",
  custom: "from-gray-500/20 to-slate-500/20",
};

function EventTimeline({ insights }: { insights: SeasonalInsight[] }) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-white/10" />
      <div className="space-y-3">
        {insights.map((insight) => {
          const daysText = insight.daysUntilEvent > 0
            ? `${insight.daysUntilEvent} days away`
            : "Currently active";
          const isActive = insight.daysUntilEvent <= 0;

          return (
            <div key={insight.id} className="relative pl-8">
              <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 ${isActive ? "bg-accent border-accent" : "bg-white/10 border-white/20"}`} />
              <div className={`glass rounded-xl p-3 border border-border bg-gradient-to-r ${SEASON_COLORS[insight.season] || SEASON_COLORS.custom}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-xs font-semibold text-foreground">{insight.eventName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">{daysText}</span>
                      <span className="text-[9px] text-muted-foreground">{insight.startDate} → {insight.endDate}</span>
                    </div>
                  </div>
                  {isActive && <span className="px-1.5 py-0.5 rounded-full bg-accent/20 text-accent text-[8px] font-bold">ACTIVE</span>}
                </div>

                {insight.recommendations.map((rec, i) => {
                  const tierConfig = TIER_CONFIG[rec.tier];
                  return (
                    <div key={i} className="mt-2 p-2 rounded-lg bg-white/5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${tierConfig.color}`}>
                          {tierConfig.label}
                        </span>
                        <span className="text-[9px] text-muted-foreground">{rec.supplierIds.length} suppliers</span>
                      </div>
                      <p className="text-[10px] text-foreground">{rec.reason}</p>
                    </div>
                  );
                })}

                {insight.preparationTips.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    <p className="text-[9px] text-muted-foreground font-medium">Preparation Tips</p>
                    {insight.preparationTips.slice(0, 2).map((tip, i) => (
                      <p key={i} className="text-[9px] text-foreground">• {tip}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function SeasonalCalendar() {
  const { ref, isInView } = useInView();
  const [selectedSeason, setSelectedSeason] = useState<string>("");

  const url = isInView
    ? `/api/suppliers/seasonal${selectedSeason ? `?season=${selectedSeason}` : ""}`
    : null;

  const { data, isLoading } = useAPI<{ insights: SeasonalInsight[] }>(url);
  const insights = data?.insights || [];

  return (
    <div ref={ref} className="glass rounded-2xl border border-border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent" />
          <h3 className="text-sm font-semibold text-foreground">Seasonal Intelligence</h3>
        </div>
        <select
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          className="text-[10px] bg-white/5 border border-border rounded-lg px-2 py-1 text-foreground"
        >
          <option value="">All Events</option>
          <option value="q4">Q4 Holiday</option>
          <option value="back_to_school">Back to School</option>
          <option value="summer">Summer</option>
          <option value="valentines">Valentine&apos;s Day</option>
          <option value="mothers_day">Mother&apos;s Day</option>
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      ) : insights.length === 0 ? (
        <div className="text-center py-8">
          <Calendar className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">No seasonal insights available. Add suppliers to get started.</p>
        </div>
      ) : (
        <EventTimeline insights={insights} />
      )}
    </div>
  );
}
