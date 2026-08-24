"use client";

import { useState } from "react";
import Link from "next/link";
import { Trophy, Flame, Star, Search, DollarSign, TrendingUp, Truck, Zap, ChevronRight, X, CheckCircle2, Lock } from "lucide-react";
import { useInView } from "@/hooks/useInView";
import type { DailyMission as DailyMissionType } from "@/lib/mock-dashboard";

const badgeIcons: Record<string, typeof Star> = {
  search: Search,
  dollar: DollarSign,
  trending: TrendingUp,
  truck: Truck,
  flame: Flame,
};

const badgeDetails: Record<string, { description: string; requirement: string }> = {
  "First Search": { description: "Completed your first product search", requirement: "Search for any product category" },
  "Profit Master": { description: "Found a product with 50%+ profit margin", requirement: "Analyze product margins and find high-profit items" },
  "Trend Spotter": { description: "Identified a trending product niche", requirement: "Discover a product with rising search volume" },
  "Supply Chain Pro": { description: "Connected with a gold-tier supplier", requirement: "Partner with a supplier rated gold tier" },
  "10-Day Streak": { description: "Maintained a 10-day activity streak", requirement: "Log in and complete actions for 10 consecutive days" },
};

function ProgressRing({ progress, size = 56 }: { progress: number; size?: number }) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#missionGradient)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 -rotate-90"
      />
      <defs>
        <linearGradient id="missionGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function DailyMission({ mission }: { mission: DailyMissionType }) {
  const { ref, isInView } = useInView({ threshold: 0.2 });
  const [selectedBadge, setSelectedBadge] = useState<number | null>(null);
  const xpProgress = Math.round((mission.currentXP / mission.nextLevelXP) * 100);
  const challengeProgress = Math.round((mission.badges.filter((b) => b.earned).length / mission.badges.length) * 100);

  return (
    <div ref={ref} className={`glass rounded-2xl p-5 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      {/* Top row: Ring + Title + CTA */}
      <div className="flex items-center gap-4 mb-4">
        <Link href="/missions" className="relative w-14 h-14 shrink-0 hover:opacity-80 transition-opacity">
          <ProgressRing progress={challengeProgress} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[9px] font-bold text-amber-400">{mission.streak}d</span>
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <h3 className="font-display text-sm font-semibold text-foreground">Daily Mission</h3>
          </div>
          <Link href="/missions" className="text-xs text-muted-foreground leading-snug line-clamp-2 hover:text-foreground transition-colors">
            {mission.challenge}
          </Link>
          <div className="flex items-center gap-1.5 mt-1">
            <Zap className="h-3 w-3 text-accent" />
            <span className="text-[10px] font-semibold text-accent">+{mission.xpReward} XP</span>
          </div>
        </div>

        <Link href="/missions" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all shrink-0">
          Continue
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Bottom row: Badges + Challenge Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Badges */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-muted-foreground">Badges</span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {mission.badges.filter((b) => b.earned).length}/{mission.badges.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {mission.badges.map((badge, i) => {
              const Icon = badgeIcons[badge.icon] || Star;
              return (
                <button
                  key={badge.name}
                  onClick={() => setSelectedBadge(selectedBadge === i ? null : i)}
                  className={`relative flex h-8 w-8 items-center justify-center rounded-lg transition-all group ${badge.earned ? "bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 cursor-pointer" : "bg-surface border border-border text-muted-foreground/40 grayscale hover:grayscale-0 hover:text-muted-foreground/60 cursor-pointer"}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-surface border border-border text-[9px] text-muted-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {badge.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Challenge Progress + Level */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-muted-foreground">Challenge</span>
            <span className="text-[10px] font-semibold text-amber-400">{challengeProgress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-1000"
              style={{ width: `${challengeProgress}%` }}
            />
          </div>
          <Link href="/missions" className="flex items-center justify-between mb-1 hover:opacity-80 transition-opacity">
            <span className="text-[10px] text-muted-foreground">Lv.{mission.level}</span>
            <span className="text-[10px] text-muted-foreground">
              {mission.currentXP.toLocaleString()}/{mission.nextLevelXP.toLocaleString()} XP
            </span>
          </Link>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-1000"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Badge Detail Modal */}
      {selectedBadge !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedBadge(null)}>
          <div
            className="glass rounded-2xl p-5 w-[90vw] max-w-sm border border-border/50 animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {(() => {
                  const badge = mission.badges[selectedBadge];
                  const Icon = badgeIcons[badge.icon] || Star;
                  return (
                    <>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${badge.earned ? "bg-accent/10 border border-accent/20 text-accent" : "bg-surface border border-border text-muted-foreground/40"}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className="font-display text-sm font-semibold text-foreground">{badge.name}</h4>
                        <p className="text-[10px] text-muted-foreground">
                          {badge.earned ? "Earned" : "Locked"}
                        </p>
                      </div>
                    </>
                  );
                })()}
              </div>
              <button
                onClick={() => setSelectedBadge(null)}
                className="flex h-6 w-6 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface transition-all"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {(() => {
              const badge = mission.badges[selectedBadge];
              const detail = badgeDetails[badge.name] || { description: "Complete challenges to earn this badge", requirement: "Keep progressing through daily missions" };
              return (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground leading-relaxed">{detail.description}</p>
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-surface/50 border border-border/50">
                    {badge.earned ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                    ) : (
                      <Lock className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground mb-0.5">Requirement</p>
                      <p className="text-xs text-foreground">{detail.requirement}</p>
                    </div>
                  </div>
                  {!badge.earned && (
                    <Link
                      href="/missions"
                      onClick={() => setSelectedBadge(null)}
                      className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all"
                    >
                      Start Working <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
