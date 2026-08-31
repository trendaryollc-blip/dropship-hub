"use client";

export const badgeConfig: Record<string, { label: string; color: string; border: string; glow: string }> = {
  gold: { label: "Gold", color: "text-amber-400 bg-amber-400/10", border: "border-amber-400/20", glow: "shadow-[0_0_12px_rgba(251,191,36,0.15)]" },
  silver: { label: "Silver", color: "text-slate-300 bg-slate-300/10", border: "border-slate-300/20", glow: "shadow-[0_0_12px_rgba(148,163,184,0.15)]" },
  bronze: { label: "Bronze", color: "text-orange-400 bg-orange-400/10", border: "border-orange-400/20", glow: "shadow-[0_0_12px_rgba(251,146,60,0.15)]" },
};

export const dataSourceConfig: Record<string, { label: string; color: string; description: string }> = {
  live: { label: "LIVE DATA", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", description: "Real-time data from API" },
  estimated: { label: "ESTIMATED", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", description: "Based on public information" },
  sample: { label: "SAMPLE DATA", color: "text-muted-foreground bg-surface border-border", description: "For demonstration purposes" },
};

export function ScoreRing({ score, size = 36 }: { score: number; size?: number }) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 90 ? "#22c55e" : score >= 75 ? "#3b82f6" : "#f59e0b";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="2.5" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold text-foreground">{score}</span>
      </div>
    </div>
  );
}
