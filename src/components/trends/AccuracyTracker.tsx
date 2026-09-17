"use client";

import { useState, useEffect } from "react";
import { Target, Loader2 } from "lucide-react";
import ScoreRing from "@/components/ui/ScoreRing";

interface AccuracyStats {
  totalPredictions: number;
  verifiedPredictions: number;
  overallAccuracy: number;
  directionAccuracy: number;
  peakAccuracy: number;
  avgScoreAccuracy: number;
}

interface AccuracyTrackerProps {
  uid: string;
  className?: string;
}

export default function AccuracyTracker({ uid, className = "" }: AccuracyTrackerProps) {
  const [stats, setStats] = useState<AccuracyStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchStats = async () => {
      try {
        const res = await fetch("/api/ai/trends/accuracy?action=overall");
        if (res.ok && !cancelled) {
          setStats(await res.json());
        }
      } catch {
        // Non-critical
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchStats();
    return () => { cancelled = true; };
  }, [uid]);

  if (loading) {
    return (
      <div className={`glass rounded-2xl p-4 flex items-center justify-center ${className}`} style={{ minHeight: 120 }}>
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats || stats.totalPredictions === 0) {
    return (
      <div className={`glass rounded-2xl p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold text-foreground">Prediction Accuracy</span>
        </div>
        <p className="text-xs text-muted-foreground">No verified predictions yet. Analyze keywords to track accuracy over time.</p>
      </div>
    );
  }

  return (
    <div className={`glass rounded-2xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <Target className="h-4 w-4 text-accent" />
        <span className="text-xs font-semibold text-foreground">Prediction Accuracy</span>
        <span className="text-[10px] text-muted-foreground">({stats.verifiedPredictions} verified)</span>
      </div>

      <div className="flex items-center gap-4">
        <ScoreRing value={stats.overallAccuracy} size={70} />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Direction Accuracy</span>
            <span className="text-xs font-bold text-foreground">{stats.directionAccuracy}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-background overflow-hidden">
            <div className="h-full bg-accent rounded-full" style={{ width: `${stats.directionAccuracy}%` }} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Peak Timing</span>
            <span className="text-xs font-bold text-foreground">{stats.peakAccuracy}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-background overflow-hidden">
            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${stats.peakAccuracy}%` }} />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Score Accuracy</span>
            <span className="text-xs font-bold text-foreground">{stats.avgScoreAccuracy}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-background overflow-hidden">
            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${stats.avgScoreAccuracy}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
