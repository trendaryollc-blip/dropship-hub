"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Trophy,
  Flame,
  Search,
  DollarSign,
  TrendingUp,
  Truck,
  Zap,
  CheckCircle2,
  Lock,
  Target,
  Award,
  Clock,
  Gift,
  Crown,
  Medal,
  ArrowUpRight,
  Calendar,
  Shield,
  Brain,
  Globe,
  Package,
} from "lucide-react";
import { useInView } from "@/hooks/useInView";
import DemoBadge from "@/components/ui/DemoBadge";
import { dailyMission } from "@/lib/mock-dashboard";

// ─── Types ───────────────────────────────────────────────────────────────────

interface MissionTask {
  id: string;
  title: string;
  description: string;
  xp: number;
  completed: boolean;
  icon: typeof Search;
  color: string;
  difficulty: "easy" | "medium" | "hard";
  category: string;
}

interface WeeklyChallenge {
  day: string;
  date: string;
  task: string;
  xp: number;
  completed: boolean;
  active: boolean;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  level: number;
  xp: number;
  streak: number;
  avatar: string;
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  color: string;
  earned: boolean;
  earnedDate?: string;
  xp: number;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const todayTasks: MissionTask[] = [
  { id: "t1", title: "Find a 70%+ margin product", description: "Search products and find one with 70%+ profit margin", xp: 75, completed: false, icon: Target, color: "text-emerald-400", difficulty: "medium", category: "Products" },
  { id: "t2", title: "Research a trending niche", description: "Explore the marketplace heatmap and identify a trending niche", xp: 50, completed: true, icon: TrendingUp, color: "text-blue-400", difficulty: "easy", category: "Research" },
  { id: "t3", title: "Compare 3 suppliers", description: "Use the calculator to compare shipping costs from 3 suppliers", xp: 60, completed: false, icon: Truck, color: "text-amber-400", difficulty: "easy", category: "Suppliers" },
  { id: "t4", title: "Analyze competitor pricing", description: "Check 3 competitors and note their pricing strategies", xp: 80, completed: false, icon: Shield, color: "text-purple-400", difficulty: "hard", category: "Competitors" },
  { id: "t5", title: "Calculate landed cost", description: "Calculate full landed cost for a product including tariffs", xp: 40, completed: true, icon: DollarSign, color: "text-emerald-400", difficulty: "easy", category: "Finance" },
];

const weeklyChallenges: WeeklyChallenge[] = [
  { day: "Mon", date: "Aug 18", task: "Complete 3 product searches", xp: 100, completed: true, active: false },
  { day: "Tue", date: "Aug 19", task: "Find a trending product", xp: 80, completed: true, active: false },
  { day: "Wed", date: "Aug 20", task: "Compare supplier prices", xp: 90, completed: true, active: false },
  { day: "Thu", date: "Aug 21", task: "Analyze competitor listings", xp: 110, completed: true, active: false },
  { day: "Fri", date: "Aug 22", task: "Calculate profit margins", xp: 75, completed: false, active: true },
  { day: "Sat", date: "Aug 23", task: "Research a new niche", xp: 85, completed: false, active: false },
  { day: "Sun", date: "Aug 24", task: "Review weekly analytics", xp: 120, completed: false, active: false },
];

const leaderboard: LeaderboardEntry[] = [
  { rank: 1, name: "DropMaster_Pro", level: 22, xp: 8920, streak: 34, avatar: "🏆" },
  { rank: 2, name: "NicheHunter", level: 19, xp: 7450, streak: 28, avatar: "🥈" },
  { rank: 3, name: "ProfitKing", level: 17, xp: 6800, streak: 21, avatar: "🥉" },
  { rank: 4, name: "trendaryo206", level: 14, xp: 3420, streak: 12, avatar: "⚡" },
  { rank: 5, name: "SupplierPro", level: 13, xp: 3100, streak: 9, avatar: "🔥" },
];

const allAchievements: Achievement[] = [
  { id: "a1", title: "First Search", description: "Completed your first product search", icon: Search, color: "text-blue-400", earned: true, earnedDate: "Jul 10", xp: 50 },
  { id: "a2", title: "Profit Master", description: "Found a product with 50%+ profit margin", icon: DollarSign, color: "text-emerald-400", earned: true, earnedDate: "Jul 15", xp: 100 },
  { id: "a3", title: "Trend Spotter", description: "Identified a trending product niche", icon: TrendingUp, color: "text-purple-400", earned: true, earnedDate: "Jul 22", xp: 75 },
  { id: "a4", title: "Supply Chain Pro", description: "Connected with a gold-tier supplier", icon: Truck, color: "text-amber-400", earned: false, xp: 150 },
  { id: "a5", title: "10-Day Streak", description: "Maintained a 10-day activity streak", icon: Flame, color: "text-orange-400", earned: false, xp: 200 },
  { id: "a6", title: "Market Explorer", description: "Analyzed products in 5 different categories", icon: Globe, color: "text-cyan-400", earned: true, earnedDate: "Aug 1", xp: 80 },
  { id: "a7", title: "Calculator Pro", description: "Used the profit calculator 10 times", icon: Target, color: "text-pink-400", earned: false, xp: 60 },
  { id: "a8", title: "AI Whisperer", description: "Used AI Assistant for 5 product recommendations", icon: Brain, color: "text-violet-400", earned: false, xp: 120 },
  { id: "a9", title: "Bulk Researcher", description: "Analyzed 50+ products in a single session", icon: Package, color: "text-teal-400", earned: false, xp: 100 },
  { id: "a10", title: "Weekend Warrior", description: "Completed missions on Saturday AND Sunday", icon: Award, color: "text-yellow-400", earned: false, xp: 90 },
  { id: "a11", title: "Gold Rush", description: "Found 3 gold-tier suppliers in one day", icon: Crown, color: "text-amber-400", earned: false, xp: 250 },
  { id: "a12", title: "Streak Master", description: "Maintained a 30-day activity streak", icon: Medal, color: "text-red-400", earned: false, xp: 500 },
];

const xpHistory = [
  { action: "Completed trending niche research", xp: 50, date: "Today" },
  { action: "Calculated landed cost", xp: 40, date: "Today" },
  { action: "Found high-margin product", xp: 75, date: "Yesterday" },
  { action: "Compared 3 suppliers", xp: 60, date: "Yesterday" },
  { action: "Completed daily challenge", xp: 120, date: "2 days ago" },
];

// ─── Sub-components ──────────────────────────────────────────────────────────

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

function TaskCard({ task, delay }: { task: MissionTask; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const Icon = task.icon;
  const diffColors = {
    easy: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
    medium: "text-amber-400 bg-amber-400/10 border-amber-400/20",
    hard: "text-red-400 bg-red-400/10 border-red-400/20",
  };

  return (
    <div
      ref={ref}
      className={`p-3 sm:p-4 rounded-xl border transition-all duration-500 ${
        task.completed
          ? "bg-emerald-400/5 border-emerald-400/20"
          : "bg-surface/50 border-border hover:border-accent/20 hover:bg-surface-hover"
      } ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg shrink-0 ${task.completed ? "bg-emerald-400/10" : "bg-surface"}`}>
          {task.completed ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : (
            <Icon className={`h-4 w-4 ${task.color}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4 className={`text-sm font-semibold ${task.completed ? "text-emerald-400 line-through" : "text-foreground"}`}>{task.title}</h4>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{task.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold border ${diffColors[task.difficulty]}`}>
              {task.difficulty}
            </span>
            <span className="text-[10px] text-muted-foreground">{task.category}</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-accent" />
            <span className="text-xs font-bold text-accent">+{task.xp}</span>
          </div>
          <span className="text-[9px] text-muted-foreground">XP</span>
        </div>
      </div>
    </div>
  );
}

function AchievementCard({ achievement, delay }: { achievement: Achievement; delay: number }) {
  const { ref, isInView } = useInView({ threshold: 0.3 });
  const Icon = achievement.icon;

  return (
    <div
      ref={ref}
      className={`relative p-4 rounded-xl border transition-all duration-500 ${
        achievement.earned
          ? "bg-surface/80 border-accent/20 hover:border-accent/30"
          : "bg-surface/30 border-border/50 opacity-60"
      } ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {achievement.earned && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
        </div>
      )}
      {!achievement.earned && (
        <div className="absolute top-2 right-2">
          <Lock className="h-3 w-3 text-muted-foreground/40" />
        </div>
      )}
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl mb-3 ${achievement.earned ? "bg-accent/10" : "bg-surface"}`}>
        <Icon className={`h-5 w-5 ${achievement.earned ? achievement.color : "text-muted-foreground/30"}`} />
      </div>
      <h4 className={`text-sm font-semibold mb-0.5 ${achievement.earned ? "text-foreground" : "text-muted-foreground/60"}`}>{achievement.title}</h4>
      <p className="text-[11px] text-muted-foreground leading-relaxed mb-2">{achievement.description}</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Zap className="h-3 w-3 text-accent" />
          <span className="text-[10px] font-semibold text-accent">{achievement.xp} XP</span>
        </div>
        {achievement.earned && achievement.earnedDate && (
          <span className="text-[9px] text-muted-foreground">{achievement.earnedDate}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function MissionsPage() {
  const [activeTab, setActiveTab] = useState<"today" | "weekly" | "badges" | "leaderboard">("today");
  const mission = dailyMission;
  const xpProgress = Math.round((mission.currentXP / mission.nextLevelXP) * 100);
  const challengeProgress = Math.round((mission.badges.filter((b) => b.earned).length / mission.badges.length) * 100);
  const totalXPEarned = todayTasks.reduce((sum, t) => sum + (t.completed ? t.xp : 0), 0);
  const totalXPAvailable = todayTasks.reduce((sum, t) => sum + t.xp, 0);
  const completedTasks = todayTasks.filter((t) => t.completed).length;

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 px-3 sm:px-4 lg:px-6 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="font-display text-xl sm:text-2xl md:text-3xl font-bold text-foreground">
              Daily Missions
            </h1>
            <DemoBadge />
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Complete tasks, earn XP, and level up your dropshipping game.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border">
            <Flame className="h-3.5 w-3.5 text-orange-400" />
            <span className="text-xs font-bold text-foreground">{mission.streak} day streak</span>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <div className="glass rounded-2xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Level Ring */}
          <div className="shrink-0">
            <div className="relative w-24 h-24 sm:w-28 sm:h-28">
              <ProgressRing progress={challengeProgress} size={112} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <LevelRing level={mission.level} progress={xpProgress} size={70} />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="flex-1 w-full">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
                <Crown className="h-4 w-4 text-amber-400 mx-auto mb-1" />
                <p className="font-display text-lg font-bold text-foreground">Lv.{mission.level}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Level</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
                <Zap className="h-4 w-4 text-accent mx-auto mb-1" />
                <p className="font-display text-lg font-bold text-foreground">{mission.currentXP.toLocaleString()}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total XP</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
                <Flame className="h-4 w-4 text-orange-400 mx-auto mb-1" />
                <p className="font-display text-lg font-bold text-foreground">{mission.streak}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Day Streak</p>
              </div>
              <div className="p-3 rounded-xl bg-surface/80 border border-border text-center">
                <Trophy className="h-4 w-4 text-emerald-400 mx-auto mb-1" />
                <p className="font-display text-lg font-bold text-foreground">{mission.badges.filter((b) => b.earned).length}/{mission.badges.length}</p>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Badges</p>
              </div>
            </div>

            {/* XP Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] text-muted-foreground">Level {mission.level} → {mission.level + 1}</span>
                <span className="text-[11px] text-muted-foreground">{mission.currentXP.toLocaleString()} / {mission.nextLevelXP.toLocaleString()} XP</span>
              </div>
              <div className="h-2 rounded-full bg-surface overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-1000"
                  style={{ width: `${xpProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{mission.nextLevelXP - mission.currentXP} XP to next level</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center bg-surface rounded-xl border border-border p-0.5 overflow-x-auto">
        {(["today", "weekly", "badges", "leaderboard"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 min-w-[70px] px-3 py-2 rounded-lg text-[11px] sm:text-xs font-semibold transition-all capitalize ${activeTab === tab ? "bg-accent text-white shadow-lg shadow-accent/20" : "text-muted-foreground hover:text-foreground"}`}
          >
            {tab === "today" ? "Today" : tab === "weekly" ? "Weekly" : tab === "badges" ? "Badges" : "Leaderboard"}
          </button>
        ))}
      </div>

      {/* Today's Missions */}
      {activeTab === "today" && (
        <div className="space-y-4">
          {/* Mission Summary */}
          <div className="glass rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Today&apos;s Challenge</h3>
                <p className="text-[11px] text-muted-foreground">{completedTasks}/{todayTasks.length} tasks completed</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/10 border border-accent/20">
                <Zap className="h-3.5 w-3.5 text-accent" />
                <span className="text-xs font-bold text-accent">{totalXPEarned}/{totalXPAvailable} XP</span>
              </div>
            </div>
            <div className="h-2 rounded-full bg-surface overflow-hidden mb-3">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent/70 transition-all duration-1000"
                style={{ width: `${(completedTasks / todayTasks.length) * 100}%` }}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">{mission.challenge}</span>
              <Link href="/products" className="text-[10px] text-accent hover:underline flex items-center gap-1">
                Start Mission <ArrowUpRight className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Task List */}
          <div>
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">Tasks</h3>
            <div className="space-y-2">
              {todayTasks.map((task, i) => (
                <TaskCard key={task.id} task={task} delay={i * 80} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Weekly Challenges */}
      {activeTab === "weekly" && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Weekly Challenge</h3>
                <p className="text-[11px] text-muted-foreground">Complete all 7 days to earn a bonus</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400/10 border border-amber-400/20">
                <Gift className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-bold text-amber-400">+500 XP Bonus</span>
              </div>
            </div>

            {/* Weekly Progress */}
            <div className="flex items-center gap-1 mb-4">
              {weeklyChallenges.map((day, i) => (
                <div key={i} className="flex-1">
                  <div className={`h-1.5 rounded-full ${day.completed ? "bg-emerald-400" : day.active ? "bg-accent" : "bg-surface"}`} />
                </div>
              ))}
            </div>

            {/* Day Cards */}
            <div className="space-y-2">
              {weeklyChallenges.map((day, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    day.completed
                      ? "bg-emerald-400/5 border border-emerald-400/20"
                      : day.active
                      ? "bg-accent/5 border border-accent/20"
                      : "bg-surface/30 border border-border/50"
                  }`}
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${day.completed ? "bg-emerald-400/10" : day.active ? "bg-accent/10" : "bg-surface"}`}>
                    {day.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : day.active ? (
                      <Clock className="h-4 w-4 text-accent" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground/40" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-foreground">{day.day}</span>
                      <span className="text-[10px] text-muted-foreground">{day.date}</span>
                      {day.active && <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[8px] font-bold uppercase">Today</span>}
                    </div>
                    <p className={`text-[11px] ${day.completed ? "text-emerald-400 line-through" : "text-muted-foreground"}`}>{day.task}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Zap className="h-3 w-3 text-accent" />
                    <span className="text-[10px] font-bold text-accent">+{day.xp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Badges Collection */}
      {activeTab === "badges" && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Badge Collection</h3>
                <p className="text-[11px] text-muted-foreground">{allAchievements.filter((a) => a.earned).length}/{allAchievements.length} earned</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border">
                <Trophy className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-bold text-foreground">{allAchievements.filter((a) => a.earned).length}</span>
              </div>
            </div>

            {/* Badge Progress */}
            <div className="h-2 rounded-full bg-surface overflow-hidden mb-4">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-1000"
                style={{ width: `${(allAchievements.filter((a) => a.earned).length / allAchievements.length) * 100}%` }}
              />
            </div>

            {/* Badge Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {allAchievements.map((achievement, i) => (
                <AchievementCard key={achievement.id} achievement={achievement} delay={i * 60} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Leaderboard */}
      {activeTab === "leaderboard" && (
        <div className="space-y-4">
          <div className="glass rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-display text-sm sm:text-base font-semibold text-foreground">Leaderboard</h3>
                <p className="text-[11px] text-muted-foreground">Top dropshippers this week</p>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-[10px] font-semibold text-muted-foreground">This Week</span>
              </div>
            </div>

            <div className="space-y-2">
              {leaderboard.map((entry, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    entry.name === "trendaryo206"
                      ? "bg-accent/5 border border-accent/20"
                      : "bg-surface/30 border border-border/50 hover:bg-surface-hover"
                  }`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 font-display text-sm font-bold ${
                    entry.rank === 1 ? "bg-amber-400/10 text-amber-400" :
                    entry.rank === 2 ? "bg-gray-300/10 text-gray-300" :
                    entry.rank === 3 ? "bg-orange-400/10 text-orange-400" :
                    "bg-surface text-muted-foreground"
                  }`}>
                    {entry.rank <= 3 ? (
                      entry.rank === 1 ? <Crown className="h-4 w-4" /> :
                      entry.rank === 2 ? <Medal className="h-4 w-4" /> :
                      <Award className="h-4 w-4" />
                    ) : (
                      entry.rank
                    )}
                  </div>
                  <span className="text-lg">{entry.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${entry.name === "trendaryo206" ? "text-accent" : "text-foreground"}`}>{entry.name}</span>
                      {entry.name === "trendaryo206" && <span className="px-1.5 py-0.5 rounded-full bg-accent/10 text-accent text-[8px] font-bold uppercase">You</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-muted-foreground">Lv.{entry.level}</span>
                      <span className="text-[10px] text-muted-foreground">{entry.xp.toLocaleString()} XP</span>
                      <span className="text-[10px] text-orange-400 flex items-center gap-0.5"><Flame className="h-2.5 w-2.5" />{entry.streak}d</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* XP History */}
          <div className="glass rounded-2xl p-4 sm:p-5">
            <h3 className="font-display text-sm font-semibold text-foreground mb-3">Recent XP Activity</h3>
            <div className="space-y-2">
              {xpHistory.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-surface/30 border border-border/50">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/10">
                      <Zap className="h-3 w-3 text-accent" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">{item.action}</p>
                      <p className="text-[10px] text-muted-foreground">{item.date}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-accent">+{item.xp} XP</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
