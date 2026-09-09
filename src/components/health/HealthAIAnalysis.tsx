"use client";

import { useState } from "react";
import { Sparkles, AlertTriangle, CheckCircle, Lightbulb, Target, Zap } from "lucide-react";

interface AIInsight {
  type: "good" | "warning" | "tip" | "action" | "milestone";
  title: string;
  description: string;
  action?: string;
  actionHref?: string;
}

interface CategoryScore {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  items?: { label: string; done: boolean; impact: string }[];
}

interface HealthAIAnalysisProps {
  score: number;
  totalDone: number;
  totalItems: number;
  categories: CategoryScore[];
  onAskAI?: (prompt: string) => void;
}

function generateInsights(score: number, totalDone: number, totalItems: number, categories: CategoryScore[]): AIInsight[] {
  const insights: AIInsight[] = [];

  if (score >= 80) {
    insights.push({ type: "milestone", title: "Business Ready!", description: "Your health score indicates strong preparation. Focus on scaling and optimization." });
  } else if (score >= 60) {
    insights.push({ type: "good", title: "Solid Foundation", description: "Good progress! A few more steps and you'll be ready to launch." });
  } else if (score >= 40) {
    insights.push({ type: "tip", title: "Building Momentum", description: "You're halfway there. Focus on completing high-impact items first." });
  } else {
    insights.push({ type: "action", title: "Getting Started", description: "Complete the basics first - product research and supplier connections are critical." });
  }

  const weakest = categories.reduce((min, cat) => cat.score < min.score ? cat : min, categories[0]);
  const strongest = categories.reduce((max, cat) => cat.score > max.score ? cat : max, categories[0]);

  if (weakest.score < 15) {
    insights.push({
      type: "warning",
      title: `${weakest.label} Needs Attention`,
      description: `This category has the lowest score (${weakest.score}/${weakest.maxScore}). Prioritize completing these items.`,
    });
  }

  if (strongest.score >= 20 && categories.length > 1) {
    insights.push({
      type: "tip",
      title: `${strongest.label} is Strong`,
      description: `Score of ${strongest.score}/${strongest.maxScore} shows good progress. Leverage this strength.`,
    });
  }

  const highImpactUndone = categories.flatMap((cat) =>
    (cat.items || []).filter((item) => !item.done && item.impact === "high").map((item) => ({ ...item, catLabel: cat.label }))
  );

  if (highImpactUndone.length > 0) {
    insights.push({
      type: "action",
      title: "High-Impact Actions Available",
      description: `${highImpactUndone.length} high-impact items remain. Completing these will significantly boost your score.`,
    });
  }

  if (totalDone === 0) {
    insights.push({
      type: "tip",
      title: "First Step",
      description: "Start with 'Search for trending products' - it's the easiest way to begin building your score.",
    });
  }

  const completionRate = totalItems > 0 ? (totalDone / totalItems) * 100 : 0;
  if (completionRate > 0 && completionRate < 50) {
    insights.push({
      type: "tip",
      title: "Pace Check",
      description: `${Math.round(completionRate)}% complete. At this rate, you'll need to complete ${Math.ceil((totalItems - totalDone) / 2)} items per session to reach 50%.`,
    });
  }

  return insights.slice(0, 5);
}

const iconMap = {
  good: CheckCircle,
  warning: AlertTriangle,
  tip: Lightbulb,
  action: Zap,
  milestone: Target,
};

const colorMap = {
  good: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
  warning: "text-amber-400 bg-amber-400/10 border-amber-400/20",
  tip: "text-blue-400 bg-blue-400/10 border-blue-400/20",
  action: "text-violet-400 bg-violet-400/10 border-violet-400/20",
  milestone: "text-accent bg-accent/10 border-accent/20",
};

export default function HealthAIAnalysis({
  score,
  totalDone,
  totalItems,
  categories,
  onAskAI,
}: HealthAIAnalysisProps) {
  const [showAll, setShowAll] = useState(false);
  const insights = generateInsights(score, totalDone, totalItems, categories);
  const visibleInsights = showAll ? insights : insights.slice(0, 3);

  const handleAskAI = () => {
    if (!onAskAI) return;
    const prompt = `Analyze my dropshipping business health score: ${score}/100. Completed ${totalDone}/${totalItems} tasks. Categories: ${categories.map((c) => `${c.label} ${c.score}/${c.maxScore}`).join(", ")}. Give me a personalized 5-step action plan to reach 80+ score, prioritizing the highest-impact items. What specific actions should I take this week?`;
    onAskAI(prompt);
  };

  return (
    <div className="glass rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <span className="text-sm font-semibold text-foreground">AI Health Analysis</span>
        </div>
        {onAskAI && (
          <button
            onClick={handleAskAI}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-500/15 to-purple-500/15 text-violet-400 border border-violet-500/20 text-[11px] font-medium hover:border-violet-500/40 transition-all"
          >
            <Sparkles className="h-3 w-3" />
            Ask AI
          </button>
        )}
      </div>

      <div className="space-y-2">
        {visibleInsights.map((insight, i) => {
          const Icon = iconMap[insight.type];
          return (
            <div
              key={i}
              className={`flex items-start gap-2.5 p-3 rounded-xl border ${colorMap[insight.type]}`}
            >
              <Icon className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-medium">{insight.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{insight.description}</p>
              </div>
            </div>
          );
        })}
      </div>

      {insights.length > 3 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full mt-2 text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1"
        >
          {showAll ? "Show less" : `Show ${insights.length - 3} more insights`}
        </button>
      )}

      {onAskAI && (
        <button
          onClick={handleAskAI}
          className="w-full mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-medium hover:opacity-90 transition-all"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Get AI Health Roadmap
        </button>
      )}
    </div>
  );
}
