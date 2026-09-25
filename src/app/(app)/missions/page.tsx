"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Trophy, Flame, Zap, CheckCircle2, Target, Crown, Sparkles, RefreshCw,
  Plus, History, ChevronUp, Trash2, Award, BarChart3,
  Calendar, TrendingUp, Star, Clock, Medal,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import { useAPI, useMutation, revalidate } from "@/hooks/useAPI";
import { useAuth } from "@/components/auth/AuthProvider";
import { useToast } from "@/components/ui/Toast";
import { BADGE_DEFINITIONS, XP_PER_CATEGORY } from "@/lib/data/missions";

interface Mission {
  id: string;
  text: string;
  priority: "high" | "medium" | "low";
  category: string;
  impact: string;
  done: boolean;
  date: string;
  source: string;
  type: "daily" | "weekly" | "achievement" | "bonus";
  progress: number;
  totalSteps: number;
  expiresAt?: string;
  xpAwarded?: number;
  aiGenerated?: boolean;
  deleted?: boolean;
}

interface MissionStats {
  totalXP: number;
  level: number;
  currentXP: number;
  nextLevelXP: number;
  streak: number;
  longestStreak: number;
  totalMissionsCompleted: number;
  badges: string[];
  weeklyXP: number;
  todayXP: number;
}

interface HistoryMission {
  id: string;
  text: string;
  done: boolean;
  date: string;
  category: string;
  priority: string;
  type: string;
  createdAt: string;
}

interface MissionHistoryData {
  missions: HistoryMission[];
  total: number;
  totalCompleted: number;
  totalXP: number;
  categoryBreakdown: Record<string, { completed: number; xp: number }>;
  dailyCompletionRates: Record<string, number>;
}

type View = "today" | "badges" | "history";

const categoryIcons: Record<string, typeof Target> = {
  revenue: Target,
  products: Sparkles,
  suppliers: Target,
  "customer-service": Target,
  alerts: Target,
  store: Target,
  setup: Target,
  research: Target,
  weekly: Calendar,
  achievement: Award,
  bonus: Zap,
  custom: Star,
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
  weekly: "text-orange-400",
  achievement: "text-yellow-400",
  bonus: "text-pink-400",
  custom: "text-gray-400",
};

const priorityBadge: Record<string, { label: string; class: string }> = {
  high: { label: "high", class: "text-red-400 bg-red-400/10 border-red-400/20" },
  medium: { label: "medium", class: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  low: { label: "low", class: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" },
};

const typeBadge: Record<string, { label: string; class: string }> = {
  daily: { label: "daily", class: "text-blue-400 bg-blue-400/10" },
  weekly: { label: "weekly", class: "text-orange-400 bg-orange-400/10" },
  achievement: { label: "achievement", class: "text-yellow-400 bg-yellow-400/10" },
  bonus: { label: "bonus", class: "text-pink-400 bg-pink-400/10" },
};

const tierColors: Record<string, string> = {
  bronze: "text-amber-600 bg-amber-600/10 border-amber-600/20",
  silver: "text-gray-300 bg-gray-300/10 border-gray-300/20",
  gold: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  diamond: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
};

function ProgressRing({ progress, size = 120 }: { progress: number; size?: number }) {
  const r = (size - 8) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="url(#missionRingGradient)" strokeWidth="6" strokeLinecap="round"
        strokeDasharray={circumference} strokeDashoffset={offset}
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
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#levelGrad)" strokeWidth="4" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
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

function ProgressBar({ progress, total, color = "from-accent to-accent/70" }: { progress: number; total: number; color?: string }) {
  const percent = total > 0 ? Math.min((progress / total) * 100, 100) : 0;
  return (
    <div className="h-1.5 rounded-full bg-surface overflow-hidden">
      <div
        className={`h-full rounded-full bg-gradient-to-r ${color} transition-all duration-700`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function TaskCard({
  mission, delay, onComplete, onProgress, onDelete,
}: {
  mission: Mission; delay: number;
  onComplete: (id: string) => void;
  onProgress: (id: string, progress: number, total: number) => void;
  onDelete: (id: string) => void;
}) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const Icon = categoryIcons[mission.category] || Target;
  const color = categoryColors[mission.category] || "text-accent";
  const badge = priorityBadge[mission.priority] || priorityBadge.medium;
  const type = typeBadge[mission.type] || typeBadge.daily;
  const isMultiStep = (mission.totalSteps || 1) > 1;
  const progressPercent = isMultiStep ? Math.round(((mission.progress || 0) / (mission.totalSteps || 1)) * 100) : 0;
  const xpPerMission = Math.round((XP_PER_CATEGORY[mission.category] || 25) * ({ high: 1.5, medium: 1, low: 0.75 }[mission.priority] || 1));

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
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <h4 className={`text-sm font-semibold ${mission.done ? "text-emerald-400 line-through" : "text-foreground"}`}>{mission.text}</h4>
          </div>
          {mission.impact && <p className="text-[11px] text-muted-foreground leading-relaxed">{mission.impact}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${badge.class}`}>{badge.label}</span>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold ${type.class}`}>{type.label}</span>
            <span className="text-[10px] text-muted-foreground capitalize">{mission.category}</span>
            <span className="text-[10px] text-accent font-semibold">+{xpPerMission} XP</span>
          </div>
          {isMultiStep && !mission.done && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">{mission.progress || 0}/{mission.totalSteps} steps</span>
                <span className="text-[10px] text-muted-foreground">{progressPercent}%</span>
              </div>
              <ProgressBar progress={mission.progress || 0} total={mission.totalSteps || 1} />
            </div>
          )}
        </div>
        <div className="text-right shrink-0 flex flex-col items-end gap-1">
          {!mission.done && isMultiStep && (
            <button
              onClick={() => onProgress(mission.id, (mission.progress || 0) + 1, mission.totalSteps || 1)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[10px] font-semibold hover:bg-accent/20 transition-all"
            >
              <ChevronUp className="h-3 w-3" />
              +1
            </button>
          )}
          {!mission.done && !isMultiStep && (
            <button
              onClick={() => onComplete(mission.id)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent/10 border border-accent/20 text-accent text-[10px] font-semibold hover:bg-accent/20 transition-all"
            >
              <CheckCircle2 className="h-3 w-3" />
              Complete
            </button>
          )}
          {!mission.done && (
            <button
              onClick={() => onDelete(mission.id)}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-400/10 border border-red-400/20 text-red-400 text-[10px] font-semibold hover:bg-red-400/20 transition-all"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function BadgeCard({ badgeId, earned }: { badgeId: string; earned: boolean }) {
  const def = BADGE_DEFINITIONS.find((b) => b.id === badgeId);
  if (!def) return null;
  const tier = tierColors[def.tier] || tierColors.bronze;

  return (
    <div className={`p-3 rounded-xl border text-center transition-all ${earned ? tier : "bg-surface/30 border-border/50 opacity-40"}`}>
      <div className="text-2xl mb-1">{def.icon}</div>
      <p className={`text-xs font-semibold ${earned ? "text-foreground" : "text-muted-foreground"}`}>{def.name}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{def.description}</p>
      {!earned && <p className="text-[9px] text-muted-foreground/50 mt-1">Locked</p>}
    </div>
  );
}

function CreateMissionModal({ onClose, onCreate }: { onClose: () => void; onCreate: (text: string, priority: string, type: string) => void }) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState("medium");
  const [type, setType] = useState("daily");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="glass rounded-2xl p-6 w-full max-w-md mx-4 border border-border" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold text-foreground mb-4">Create Custom Mission</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Mission text</label>
            <input
              type="text" value={text} onChange={(e) => setText(e.target.value)}
              placeholder="e.g. Research 3 new product ideas"
              className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/40"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Priority</label>
              <select
                value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Type</label>
              <select
                value={type} onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface border border-border text-sm text-foreground"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="bonus">Bonus</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            <button
              onClick={() => { if (text.trim()) { onCreate(text.trim(), priority, type); onClose(); } }}
              disabled={!text.trim()}
              className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-accent text-sm font-semibold hover:bg-accent/20 transition-all disabled:opacity-50"
            >
              Create Mission
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function HistoryView({ data, loading }: { data?: MissionHistoryData; loading: boolean }) {
  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        <p className="text-xs text-muted-foreground mt-2">Loading history...</p>
      </div>
    );
  }

  if (!data || data.missions.length === 0) {
    return (
      <div className="py-12 text-center">
        <History className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">No mission history yet</p>
      </div>
    );
  }

  const missionsByDate: Record<string, HistoryMission[]> = {};
  for (const m of data.missions) {
    if (!missionsByDate[m.date]) missionsByDate[m.date] = [];
    missionsByDate[m.date].push(m);
  }

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
          <BarChart3 className="h-4 w-4 text-accent mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{data.totalCompleted}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Completed</p>
        </div>
        <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
          <Zap className="h-4 w-4 text-amber-400 mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{data.totalXP.toLocaleString()}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total XP</p>
        </div>
        <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
          <TrendingUp className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">
            {data.total > 0 ? Math.round((data.totalCompleted / data.total) * 100) : 0}%
          </p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Completion</p>
        </div>
        <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
          <Calendar className="h-4 w-4 text-blue-400 mx-auto mb-1" />
          <p className="font-display text-lg font-bold text-foreground">{Object.keys(data.dailyCompletionRates).length}</p>
          <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Active Days</p>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(data.categoryBreakdown).length > 0 && (
        <div className="p-4 rounded-xl bg-surface/50 border border-border">
          <h4 className="text-xs font-semibold text-foreground mb-3">Category Breakdown</h4>
          <div className="space-y-2">
            {Object.entries(data.categoryBreakdown)
              .sort(([, a], [, b]) => b.xp - a.xp)
              .map(([cat, data]) => (
                <div key={cat} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs capitalize ${categoryColors[cat] || "text-muted-foreground"}`}>{cat}</span>
                    <span className="text-[10px] text-muted-foreground">{data.completed} completed</span>
                  </div>
                  <span className="text-xs font-semibold text-accent">+{data.xp} XP</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Daily History */}
      {Object.entries(missionsByDate).map(([date, missions]) => (
        <div key={date}>
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-3 w-3 text-muted-foreground" />
            <h4 className="text-xs font-semibold text-foreground">{date}</h4>
            <span className="text-[10px] text-muted-foreground">
              {missions.filter((m) => m.done).length}/{missions.length} completed
            </span>
          </div>
          <div className="space-y-1">
            {missions.map((m) => (
              <div
                key={m.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg ${m.done ? "bg-emerald-400/5" : "bg-surface/30"}`}
              >
                {m.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Target className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
                <span className={`text-xs flex-1 ${m.done ? "text-emerald-400 line-through" : "text-foreground"}`}>{m.text}</span>
                <span className="text-[9px] text-muted-foreground capitalize">{m.category}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function MissionsPage() {
  const { user } = useAuth();
  const toast = useToast();
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [view, setView] = useState<View>("today");
  const [showCreate, setShowCreate] = useState(false);
  const [optimisticMissions, setOptimisticMissions] = useState<Mission[] | null>(null);

  const { data, isLoading } = useAPI<{ missions: Mission[]; stats: MissionStats; newBadges?: string[] }>(
    user ? "/api/ai/missions" : null
  );

  const { data: historyData, isLoading: historyLoading } = useAPI<MissionHistoryData>(
    user && view === "history" ? "/api/ai/missions?view=history" : null
  );

  const generateMutation = useMutation("/api/ai/missions");
  const completeMutation = useMutation("/api/ai/missions");
  const createMutation = useMutation("/api/ai/missions");

  const missions = optimisticMissions || data?.missions || [];
  const stats = data?.stats || { totalXP: 0, level: 1, currentXP: 0, nextLevelXP: 500, streak: 0, longestStreak: 0, totalMissionsCompleted: 0, badges: [], weeklyXP: 0, todayXP: 0 };

  const handleComplete = useCallback(async (missionId: string) => {
    if (completingId) return;
    setCompletingId(missionId);

    // Optimistic update
    setOptimisticMissions((prev) => {
      const current = prev || data?.missions || [];
      return current.map((m) => m.id === missionId ? { ...m, done: true } : m);
    });

    try {
      const result = await completeMutation.trigger({ body: { missionId }, method: "PATCH" }) as { success?: boolean; xpAwarded?: number };
      if (result?.success) {
        toast.success(`Mission completed! +${result.xpAwarded || 0} XP`);
        revalidate("/api/ai/missions");
      } else {
        setOptimisticMissions(null);
        toast.error("Failed to complete mission");
      }
    } catch {
      setOptimisticMissions(null);
      toast.error("Failed to complete mission");
    } finally {
      setCompletingId(null);
    }
  }, [completingId, data?.missions, completeMutation, toast]);

  const handleProgress = useCallback(async (missionId: string, progress: number, total: number) => {
    setOptimisticMissions((prev) => {
      const current = prev || data?.missions || [];
      return current.map((m) => m.id === missionId ? { ...m, progress, done: progress >= total } : m);
    });

    try {
      const result = await completeMutation.trigger({
        body: { missionId, action: "progress", progress, totalSteps: total },
        method: "PATCH",
      }) as { success?: boolean; done?: boolean; xpAwarded?: number };
      if (result?.success) {
        if (result.done) {
          toast.success(`Mission completed! +${result.xpAwarded || 0} XP`);
        } else {
          toast.info(`Progress updated: ${progress}/${total}`);
        }
        revalidate("/api/ai/missions");
      }
    } catch {
      setOptimisticMissions(null);
      toast.error("Failed to update progress");
    }
  }, [data?.missions, completeMutation, toast]);

  const handleDelete = useCallback(async (missionId: string) => {
    setOptimisticMissions((prev) => {
      const current = prev || data?.missions || [];
      return current.filter((m) => m.id !== missionId);
    });

    try {
      const result = await completeMutation.trigger({
        body: { missionId, action: "delete" },
        method: "PATCH",
      }) as { success?: boolean };
      if (result?.success) {
        toast.success("Mission deleted");
        revalidate("/api/ai/missions");
      }
    } catch {
      setOptimisticMissions(null);
      toast.error("Failed to delete mission");
    }
  }, [data?.missions, completeMutation, toast]);

  const handleGenerate = useCallback(async () => {
    try {
      await generateMutation.trigger({ body: {} });
      revalidate("/api/ai/missions");
      toast.success("New missions generated!");
    } catch {
      toast.error("Failed to generate missions");
    }
  }, [generateMutation, toast]);

  const handleCreate = useCallback(async (text: string, priority: string, type: string) => {
    try {
      await createMutation.trigger({ body: { action: "create", text, priority, type }, method: "PATCH" });
      revalidate("/api/ai/missions");
      toast.success("Custom mission created!");
    } catch {
      toast.error("Failed to create mission");
    }
  }, [createMutation, toast]);

  // Reset optimistic on data change
  useEffect(() => { setOptimisticMissions(null); }, [data]);

  const generating = generateMutation.isMutating;
  const loading = isLoading;

  const completedCount = missions.filter((m: Mission) => m.done).length;
  const totalXPInDay = stats.todayXP;
  const xpProgress = Math.round((stats.currentXP / stats.nextLevelXP) * 100);
  const progressPercent = missions.length > 0 ? (completedCount / missions.length) * 100 : 0;
  const allBadges = [...new Set([...(stats.badges || []), ...BADGE_DEFINITIONS.map((b) => b.id)])];

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">Missions</h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Missions from your store activity. Complete them to earn XP, unlock badges, and level up.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-xs font-bold text-foreground">{stats.streak} day streak</span>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold hover:bg-surface-hover transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
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
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
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
              <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
                <Medal className="h-4 w-4 text-purple-400 mx-auto mb-1" />
                <p className="font-display text-lg font-bold text-foreground">{(stats.badges || []).length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Badges</p>
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

      {/* View Tabs */}
      <div className="flex gap-1 p-1 rounded-xl bg-surface/50 border border-border w-fit">
        {([
          { key: "today", label: "Today", icon: Target },
          { key: "badges", label: "Badges", icon: Award },
          { key: "history", label: "History", icon: History },
        ] as const).map(({ key, label, icon: TabIcon }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              view === key
                ? "bg-accent/10 text-accent border border-accent/20"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <TabIcon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Today's Missions */}
      {view === "today" && (
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Today&apos;s Missions</h3>
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
                Generate Missions
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {missions.map((mission: Mission, i: number) => (
                <TaskCard
                  key={mission.id}
                  mission={mission}
                  delay={i * 80}
                  onComplete={handleComplete}
                  onProgress={handleProgress}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Badges View */}
      {view === "badges" && (
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Achievements & Badges</h3>
              <p className="text-[11px] text-muted-foreground">
                {(stats.badges || []).length}/{BADGE_DEFINITIONS.length} badges unlocked
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20">
              <Award className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-bold text-accent">{(stats.badges || []).length} earned</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {allBadges.map((badgeId) => (
              <BadgeCard key={badgeId} badgeId={badgeId} earned={(stats.badges || []).includes(badgeId)} />
            ))}
          </div>
        </div>
      )}

      {/* History View */}
      {view === "history" && (
        <div className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Mission History</h3>
              <p className="text-[11px] text-muted-foreground">Your past missions and performance</p>
            </div>
          </div>
          <HistoryView data={historyData} loading={historyLoading} />
        </div>
      )}

      {/* How it works */}
      {view === "today" && (
        <div className="glass rounded-2xl p-4 sm:p-5">
          <h3 className="font-display text-sm font-semibold text-foreground mb-3">How Missions Work</h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
              <Sparkles className="h-4 w-4 text-accent mb-2" />
              <p className="text-xs font-medium text-foreground mb-0.5">Rule-generated</p>
              <p className="text-[11px] text-muted-foreground">Missions are created based on your actual store activity, revenue data, and supplier alerts.</p>
            </div>
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
              <Zap className="h-4 w-4 text-amber-400 mb-2" />
              <p className="text-xs font-medium text-foreground mb-0.5">Earn XP</p>
              <p className="text-[11px] text-muted-foreground">Higher priority missions give more XP. Multi-step missions give bonus XP.</p>
            </div>
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
              <Trophy className="h-4 w-4 text-emerald-400 mb-2" />
              <p className="text-xs font-medium text-foreground mb-0.5">Level Up</p>
              <p className="text-[11px] text-muted-foreground">Accumulate XP to level up. Each level requires 500 XP.</p>
            </div>
            <div className="p-3 rounded-xl bg-surface/50 border border-border/50">
              <Award className="h-4 w-4 text-purple-400 mb-2" />
              <p className="text-xs font-medium text-foreground mb-0.5">Unlock Badges</p>
              <p className="text-[11px] text-muted-foreground">Earn badges by completing milestones. Badges grant bonus XP.</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Mission Modal */}
      {showCreate && (
        <CreateMissionModal onClose={() => setShowCreate(false)} onCreate={handleCreate} />
      )}
    </div>
  );
}
