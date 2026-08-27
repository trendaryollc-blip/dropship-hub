"use client";

import { useState } from "react";
import { Target, CheckCircle, Clock, AlertTriangle, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";

interface BusinessGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  category: string;
  deadline: string;
  progress: number;
  status: "on-track" | "behind" | "achieved" | "at-risk";
  aiInsight: string;
}

interface GoalsResult {
  goals: BusinessGoal[];
  summary: { totalGoals: number; achieved: number; onTrack: number; behind: number; overallProgress: number };
  suggestions: string[];
}

export default function GoalsTracker({ uid }: { uid: string }) {
  const [data, setData] = useState<GoalsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      setData(await res.json());
    } catch {}
    setLoading(false);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case "achieved": return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
      case "on-track": return <Clock className="w-3.5 h-3.5 text-blue-400" />;
      case "behind": return <AlertTriangle className="w-3.5 h-3.5 text-yellow-400" />;
      case "at-risk": return <AlertTriangle className="w-3.5 h-3.5 text-red-400" />;
      default: return null;
    }
  };

  const progressColor = (progress: number) => {
    if (progress >= 80) return "bg-emerald-500";
    if (progress >= 60) return "bg-blue-500";
    if (progress >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="bg-[#0d0d15] border border-[#1e1e2e] rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-medium text-[#e0e0e0]">Goals Tracker</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-xs px-3 py-1 rounded-lg bg-[#1a1a2e] text-[#a0a0b0] hover:text-[#e0e0e0] hover:bg-[#25253a] transition-all disabled:opacity-50"
        >
          {loading ? "Loading..." : "Track"}
        </button>
      </div>

      {!data && !loading && (
        <p className="text-xs text-[#606070]">Set business goals and track AI-powered progress insights.</p>
      )}

      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-[#1a1a2e] rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {data && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-1.5">
            <div className="bg-[#1a1a2e] rounded-lg p-1.5 text-center min-w-0">
              <p className="text-sm md:text-lg font-bold text-emerald-400">{data.summary.achieved}</p>
              <p className="text-[9px] md:text-[10px] text-[#606070]">Achieved</p>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-1.5 text-center min-w-0">
              <p className="text-sm md:text-lg font-bold text-blue-400">{data.summary.onTrack}</p>
              <p className="text-[9px] md:text-[10px] text-[#606070]">On Track</p>
            </div>
            <div className="bg-[#1a1a2e] rounded-lg p-1.5 text-center min-w-0">
              <p className="text-sm md:text-lg font-bold text-yellow-400">{data.summary.behind}</p>
              <p className="text-[9px] md:text-[10px] text-[#606070]">Behind</p>
            </div>
          </div>

          <div className="space-y-1.5">
            {data.goals.map((goal) => (
              <div key={goal.id} className="bg-[#1a1a2e] rounded-lg overflow-hidden">
                <button
                  onClick={() => setExpanded(expanded === goal.id ? null : goal.id)}
                  className="w-full flex items-center justify-between p-2.5 text-left hover:bg-[#25253a] transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {statusIcon(goal.status)}
                    <span className="text-xs text-[#e0e0e0] truncate">{goal.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#a0a0b0]">{goal.progress}%</span>
                    {expanded === goal.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </div>
                </button>
                {expanded === goal.id && (
                  <div className="px-2.5 pb-2.5 border-t border-[#25253a]">
                    <div className="w-full h-1.5 bg-[#25253a] rounded-full mt-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${progressColor(goal.progress)}`}
                        style={{ width: `${goal.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-[#606070]">
                        {goal.unit === "$" ? "$" : ""}{goal.current.toLocaleString()}{goal.unit === "%" ? "%" : ""} / {goal.unit === "$" ? "$" : ""}{goal.target.toLocaleString()}{goal.unit === "%" ? "%" : ""}
                      </span>
                      <span className="text-[10px] text-[#606070]">{goal.deadline}</span>
                    </div>
                    <p className="text-[11px] text-[#9090a0] mt-1.5">{goal.aiInsight}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {data.suggestions.length > 0 && (
            <div className="space-y-1">
              {data.suggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2 text-[11px] text-[#9090a0] bg-[#1a1a2e] rounded-lg p-2">
                  <TrendingUp className="w-3 h-3 mt-0.5 shrink-0 text-emerald-400" />
                  <span>{s}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
