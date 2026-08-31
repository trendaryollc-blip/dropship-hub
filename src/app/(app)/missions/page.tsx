"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Flame,
  Zap,
  CheckCircle2,
  Target,
  Crown,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI, useMutation, revalidate } from "@/hooks/useAPI";
import { useAuth } from "@/components/auth/AuthProvider";

interface Mission {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
  category: string;
  impact: string;
  done: boolean;
  date: string;
  source: string;
}

interface MissionStats {
  totalXP: number;
  level: number;
  currentXP: number;
  nextLevelXP: number;
  streak: number;
}

const categoryIcons: Record<string, typeof Target> = {
  revenue: Target,
  products: Sparkles,
  suppliers: Target,
  "customer-service": Target,
  alerts: Target,
  store: Target,
  setup: Target,
  research: Target,
};

const categoryColors: Record<string, string> = {
  revenue: "text-emerald-400",
  products: "text-blue-400",
  suppliers: "text-amber-400",
  "customer-service": "text-purple-400",
  alerts: "text-red-400",
  store: "text-cyan-400",
  setup: "text-emerald-400",
  research: "text-indigo-400",
};

const priorityBadge: Record<string, { label: string; class: string }> = {
  high: { label: "high", class: "text-red-400 bg-red-400/10 border-red-400/20" },
  medium: { label: "medium", class: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  low: { label: "low", class: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
};

function ProgressRing({ progress, size = 120 }: { progress: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="url(#missionRingGradient)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 -rotate-90"
      />
      <defs>
        <linearGradient id="missionRingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f97316" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function LevelRing({ level, progress, size = 80 }: { level: number; progress: number; size?: number }) {
  const r = (size - 6) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="url(#levelGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000"
        />
        <defs>
          <linearGradient id="levelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-warm)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <Crown className="h-3.5 w-3.5 text-amber-400 mb-0.5" />
        <span className="font-display text-sm font-bold text-foreground">{level}</span>
      </div>
    </div>
  );
}

function TaskCard({ mission, delay, onComplete }: { mission: Mission; delay: number; onComplete: (id: string) => void }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const Icon = categoryIcons[mission.category] || Target;
  const color = categoryColors[mission.category] || "text-accent";
  const badge = priorityBadge[mission.priority] || priorityBadge.medium;

  return (
    <div
      ref={ref}
      className={`p-3 sm:p-4 rounded-xl border transition-all duration-500 ${
        mission.done
          ? "bg-emerald-400/5 border-emerald-400/20"
          : "bg-surface/50 border-border hover:border-accent/20 hover:bg-surface-hover"
      } ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${mission.done ? "bg-emerald-400/10" : "bg-surface"}`}>
          {mission.done ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <Icon className={`h-4 w-4 ${color}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={`text-sm font-semibold ${mission.done ? "text-emerald-400 line-through" : "text-foreground"}`}>{mission.text}</h4>
          </div>
          {mission.impact && <p className="text-[11px] text-muted-foreground leading-relaxed">{mission.impact}</p>}
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${badge.class}`}>
              {badge.label}
            </span>
            <span className="text-[10px] text-muted-foreground capitalize">{mission.category}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          {!mission.done && (
            <button
              onClick={() => onComplete(mission.id)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[10px] font-semibold hover:bg-accent/20 transition-all"
            >
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MissionsPage() {
  const { user } = useAuth();
  const [completingId, setCompletingId] = useState<string | null>(null);

  const { data, isLoading } = useAPI<{ missions: Mission[]; stats: MissionStats }>(
    user ? "/api/ai/missions" : null
  );

  const missions = data?.missions || [];
  const stats = data?.stats || { totalXP: 0, level: 1, currentXP: 0, nextLevelXP: 500, streak: 0 };

  const generateMutation = useMutation("/api/ai/missions");
  const completeMutation = useMutation("/api/ai/missions");

  const handleComplete = async (missionId: string) => {
    if (completingId) return;
    setCompletingId(missionId);
    try {
      const result = await completeMutation.trigger({ body: { missionId }, method: "PATCH" });
      if ((result as { success?: boolean })?.success) {
        revalidate("/api/ai/missions");
      }
    } catch {
      // Silently fail
    } finally {
      setCompletingId(null);
    }
  };

  const handleGenerate = async () => {
    try {
      await generateMutation.trigger({ body: {} });
      revalidate("/api/ai/missions");
    } catch {
      // Silently fail
    }
  };

  const generating = generateMutation.isMutating;
  const loading = isLoading;

  const completedCount = missions.filter((m) => m.done).length;
  const totalXPInDay = missions.reduce((sum, m) => sum + (m.done ? 25 : 0), 0);
  const xpProgress = Math.round((stats.currentXP / stats.nextLevelXP) * 100);
  const progressPercent = missions.length > 0 ? (completedCount / missions.length) * 100 : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              Daily Missions
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            AI-powered tasks based on your store activity. Complete them to earn XP and level up.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-xs font-bold text-foreground">{stats.streak} day streak</span>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
            Generate
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          <div className="shrink-0">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28">
              <ProgressRing progress={progressPercent} size={112} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <LevelRing level={stats.level} progress={xpProgress} size={70} />
              </div>
            </div>
          </div>

          <div className="flex-1 w-full">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
                <Crown className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                <p className="font-display text-lg font-bold text-foreground">Lv.{stats.level}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Level</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
                <Zap className="h-4 w-4 text-accent mx-auto mb-1" />
                <p className="font-display text-lg font-bold text-foreground">{stats.totalXP.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total XP</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
                <Flame className="h-4 w-4 text-orange-400 mx-auto mb-1" />
                <p className="font-display text-lg font-bold text-foreground">{stats.streak}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Day Streak</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
                <Trophy className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                <p className="font-display text-lg font-bold text-foreground">{completedCount}/{missions.length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Completed</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground">Level {stats.level} → {stats.level + 1}</span>
                <span className="text-[11px] text-muted-foreground">{stats.currentXP.toLocaleString()} / {stats.nextLevelXP.toLocaleString()} XP</span>
              </div>
              <div className="h-2 rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-1000"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{stats.nextLevelXP - stats.currentXP} XP to next level</p>
            </div>
          </div>
        </div>
      </div>

      {/* Today's Missions */}
      <div className="glass rounded-2xl p-4 sm:p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Today&apos;s AI Missions</h3>
            <p className="text-[11px] text-muted-foreground">
              {loading ? "Loading..." : `${completedCount}/${missions.length} tasks completed`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20">
            <Zap className="h-3.5 w-3.5 text-accent" />
            <span className="text-xs font-bold text-accent">+{totalXPInDay} XP today</span>
          </div>
        </div>
        {missions.length > 0 && (
          <div className="h-2 rounded-full bg-surface overflow-hidden mb-3">
            <div
              className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-1000"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <p className="text-xs text-muted-foreground mt-2">Loading missions...</p>
          </div>
        ) : missions.length === 0 ? (
          <div className="py-12 text-center">
            <Target className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-3">No missions generated yet for today</p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-xs font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
            >
              <Sparkles className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
              Generate AI Missions
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {missions.map((mission, i) => (
              <TaskCard key={mission.id} mission={mission} delay={i * 80} onComplete={handleComplete} />
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="glass rounded-2xl p-4 sm:p-5">
        <h3 className="font-display text-sm font-semibold text-foreground mb-3">How Missions Work</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
            <Sparkles className="h-4 w-4 text-accent mb-2" />
            <p className="text-xs font-medium text-foreground mb-0.5">AI-Generated</p>
            <p className="text-[11px] text-muted-foreground">Missions are created based on your actual store activity, revenue data, and supplier alerts.</p>
          </div>
          <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
            <Zap className="h-4 w-4 text-amber-400 mb-2" />
            <p className="text-xs font-medium text-foreground mb-0.5">Earn XP</p>
            <p className="text-[11px] text-muted-foreground">Complete missions to earn XP. Higher priority missions give more XP.</p>
          </div>
          <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
            <Trophy className="h-4 w-4 text-emerald-400 mb-2" />
            <p className="text-xs font-medium text-foreground mb-0.5">Level Up</p>
            <p className="text-[11px] text-muted-foreground">Accumulate XP to level up. Each level requires 500 XP.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
