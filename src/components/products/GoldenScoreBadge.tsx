"use client";

interface GoldenScoreBadgeProps {
  score: number;
  rank?: "S" | "A" | "B" | "C" | "D";
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
}

const RANK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  S: { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  A: { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30" },
  B: { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  C: { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  D: { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
};

const RANK_DESCRIPTIONS: Record<string, string> = {
  S: "Exceptional product - high profit, low competition",
  A: "Strong product - good margins, manageable competition",
  B: "Average product - moderate potential",
  C: "Below average - high competition or low margins",
  D: "Poor product - avoid",
};

function getRank(score: number): "S" | "A" | "B" | "C" | "D" {
  if (score >= 85) return "S";
  if (score >= 70) return "A";
  if (score >= 50) return "B";
  if (score >= 30) return "C";
  return "D";
}

const SIZE_CLASSES = {
  sm: "h-5 w-5 text-[9px]",
  md: "h-7 w-7 text-[11px]",
  lg: "h-9 w-9 text-sm",
};

export default function GoldenScoreBadge({
  score,
  rank,
  size = "sm",
  showTooltip = true,
}: GoldenScoreBadgeProps) {
  const resolvedRank = rank || getRank(score);
  const colors = RANK_COLORS[resolvedRank];
  const description = RANK_DESCRIPTIONS[resolvedRank];

  return (
    <div className="relative group inline-flex" data-testid="golden-score-badge">
      <div
        className={`${SIZE_CLASSES[size]} ${colors.bg} ${colors.text} border ${colors.border} rounded-lg flex items-center justify-center font-bold transition-transform hover:scale-110`}
        title={showTooltip ? description : undefined}
      >
        {resolvedRank}
      </div>
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 border border-white/10 rounded-xl text-xs text-gray-300 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
          <div className="font-bold text-white mb-0.5">Golden Score: {score}</div>
          <div>{description}</div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
