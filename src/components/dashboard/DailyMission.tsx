"use client";

import Link from "next/link";
import { Trophy, Flame, Zap, ChevronRight } from "lucide-react";
import { useAPI } from "@/hooks/useAPI";

interface MissionStats {
  totalXP: number;
  level: number;
  currentXP: number;
  nextLevelXP: number;
  streak: number;
}

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

export default function DailyMission() {
  const { data } = useAPI<{ stats: MissionStats; completed: number; total: number }>("/api/ai/missions");
  const stats = data?.stats || { totalXP: 0, level: 1, currentXP: 0, nextLevelXP: 500, streak: 0 };
  const completedCount = data?.completed ?? 0;
  const totalCount = data?.total ?? 0;

  const xpProgress = Math.round((stats.currentXP / stats.nextLevelXP) * 100);
  const challengeProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="glass rounded-2xl p-5 transition-all duration-700">
      <div className="flex items-center gap-4 mb-4">
        <Link href="/missions" className="relative w-14 h-14 shrink-0 hover:opacity-80 transition-opacity">
          <ProgressRing progress={challengeProgress} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="text-[9px] font-bold text-amber-400">{stats.streak}d</span>
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <Trophy className="h-3.5 w-3.5 text-amber-400" />
            <h3 className="font-display text-sm font-semibold text-foreground">Daily Mission</h3>
          </div>
          <Link href="/missions" className="text-xs text-muted-foreground leading-snug line-clamp-2 hover:text-foreground transition-colors">
            {totalCount > 0
              ? `${completedCount}/${totalCount} AI missions completed today`
              : "Generate today's AI missions to get started"}
          </Link>
          <div className="flex items-center gap-1.5 mt-1">
            <Zap className="h-3 w-3 text-accent" />
            <span className="text-[10px] font-semibold text-accent">Lv.{stats.level} · {stats.totalXP.toLocaleString()} XP</span>
          </div>
        </div>

        <Link href="/missions" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all shrink-0">
          Continue
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-medium text-muted-foreground">Missions</span>
            <span className="text-[11px] font-medium text-muted-foreground">
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-1000"
              style={{ width: `${challengeProgress}%` }}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-medium text-muted-foreground">Level {stats.level} → {stats.level + 1}</span>
            <span className="text-[10px] font-semibold text-accent">{xpProgress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-1000"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
