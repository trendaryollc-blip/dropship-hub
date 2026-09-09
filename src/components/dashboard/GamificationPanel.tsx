"use client";

import { useState, useEffect } from "react";
import { Flame, Trophy, Star } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import ScoreRing from "@/components/ui/ScoreRing";

interface GamificationData {
  xp: number;
  level: number;
  streak: number;
  badges: { name: string; icon: string; earned: boolean; earnedAt?: string }[];
}

const defaultData: GamificationData = {
  xp: 0,
  level: 1,
  streak: 0,
  badges: [],
};

export default function GamificationPanel() {
  const { user } = useAuth();
  const [data, setData] = useState<GamificationData>(defaultData);

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(`gamification_${user.uid}`);
    if (stored) {
      try { setData(JSON.parse(stored)); } catch (_e) { /* ignore */ }
    }
  }, [user]);

  const xpForNextLevel = data.level * 100;
  const xpProgress = ((data.xp % xpForNextLevel) / xpForNextLevel) * 100;

  return (
    <div className="surface-raised rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10 border border-accent/20">
            <Trophy className="h-3.5 w-3.5 text-accent" />
          </div>
          <span className="font-display text-xs font-semibold text-foreground">Progress</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <Flame className="h-3 w-3 text-amber-400" />
          {data.streak} day streak
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ScoreRing value={xpProgress} size={56} strokeWidth={4} label={`Lv.${data.level}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground">Level {data.level}</span>
            <span className="text-[10px] font-mono text-accent">{data.xp} XP</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent-warm transition-all duration-500"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <p className="text-[9px] text-muted-foreground mt-1">
            {xpForNextLevel - (data.xp % xpForNextLevel)} XP to next level
          </p>
        </div>
      </div>

      {data.badges.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {data.badges.filter((b) => b.earned).slice(0, 5).map((badge) => (
            <div
              key={badge.name}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent/5 border border-accent/10 text-[9px] text-accent"
              title={badge.name}
            >
              <Star className="h-2.5 w-2.5" />
              {badge.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
