"use client";

import { useState } from "react";
import { Trophy, Star, Flame, Target, Award, ChevronDown, ChevronUp } from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: typeof Trophy;
  color: string;
  bg: string;
  unlocked: boolean;
  category: string;
  requirement: string;
}

interface HealthAchievementsProps {
  score: number;
  totalDone: number;
  categories: { id: string; label?: string; score: number; maxScore?: number; done: number; total?: number }[];
}

function getAchievements(score: number, totalDone: number, categories: { id: string; score: number; done: number }[]): Achievement[] {
  const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));

  return [
    {
      id: "first-step",
      title: "First Step",
      description: "Complete your first task",
      icon: Star,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      unlocked: totalDone >= 1,
      category: "Getting Started",
      requirement: "1 task completed",
    },
    {
      id: "five-tasks",
      title: "Getting Momentum",
      description: "Complete 5 tasks",
      icon: Flame,
      color: "text-orange-400",
      bg: "bg-orange-400/10",
      unlocked: totalDone >= 5,
      category: "Progress",
      requirement: "5 tasks completed",
    },
    {
      id: "half-way",
      title: "Half Way There",
      description: "Reach 50% health score",
      icon: Target,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      unlocked: score >= 50,
      category: "Milestone",
      requirement: "50% health score",
    },
    {
      id: "product-pro",
      title: "Product Pro",
      description: "Complete all Product Research tasks",
      icon: Award,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      unlocked: (catMap.product?.score ?? 0) >= 25,
      category: "Category Master",
      requirement: "25/25 in Product Research",
    },
    {
      id: "supplier-master",
      title: "Supplier Master",
      description: "Complete all Supplier Network tasks",
      icon: Award,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      unlocked: (catMap.supplier?.score ?? 0) >= 25,
      category: "Category Master",
      requirement: "25/25 in Supplier Network",
    },
    {
      id: "financial-guru",
      title: "Financial Guru",
      description: "Complete all Financial Health tasks",
      icon: Award,
      color: "text-amber-400",
      bg: "bg-amber-400/10",
      unlocked: (catMap.financial?.score ?? 0) >= 25,
      category: "Category Master",
      requirement: "25/25 in Financial Health",
    },
    {
      id: "market-savvy",
      title: "Market Savvy",
      description: "Complete all Market Intelligence tasks",
      icon: Award,
      color: "text-purple-400",
      bg: "bg-purple-400/10",
      unlocked: (catMap.market?.score ?? 0) >= 25,
      category: "Category Master",
      requirement: "25/25 in Market Intelligence",
    },
    {
      id: "score-80",
      title: "Business Ready",
      description: "Reach 80+ health score",
      icon: Trophy,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
      unlocked: score >= 80,
      category: "Elite",
      requirement: "80+ health score",
    },
    {
      id: "perfect-score",
      title: "Perfect Score",
      description: "Complete all tasks for 100/100",
      icon: Trophy,
      color: "text-accent",
      bg: "bg-accent/10",
      unlocked: score >= 100,
      category: "Elite",
      requirement: "100/100 health score",
    },
  ];
}

export default function HealthAchievements({ score, totalDone, categories }: HealthAchievementsProps) {
  const [showAll, setShowAll] = useState(false);
  const achievements = getAchievements(score, totalDone, categories);
  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const visibleAchievements = showAll ? achievements : achievements.slice(0, 6);

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-foreground">Achievements</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-400 font-medium">
            {unlockedCount}/{achievements.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {visibleAchievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`relative p-3 rounded-xl border transition-all ${
              achievement.unlocked
                ? `${achievement.bg} border-border`
                : "bg-surface/30 border-border/50 opacity-50"
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${achievement.bg}`}>
                <achievement.icon className={`h-3.5 w-3.5 ${achievement.color}`} />
              </div>
              <span className={`text-[10px] font-medium ${achievement.unlocked ? "text-foreground" : "text-muted-foreground"}`}>
                {achievement.title}
              </span>
            </div>
            <p className="text-[9px] text-muted-foreground">{achievement.requirement}</p>
            {achievement.unlocked && (
              <div className="absolute top-2 right-2">
                <span className="text-[8px] px-1 py-0.5 rounded bg-emerald-400/10 text-emerald-400 font-bold">UNLOCKED</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {achievements.length > 6 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-3 flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {showAll ? (
            <>Show less <ChevronUp className="h-3 w-3" /></>
          ) : (
            <>Show {achievements.length - 6} more <ChevronDown className="h-3 w-3" /></>
          )}
        </button>
      )}

      {/* Progress bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[9px] text-muted-foreground">Overall Progress</span>
          <span className="text-[9px] font-medium text-foreground">{unlockedCount}/{achievements.length}</span>
        </div>
        <div className="h-1.5 rounded-full bg-surface/50 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
            style={{ width: `${(unlockedCount / achievements.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
