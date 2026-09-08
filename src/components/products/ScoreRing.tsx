"use client";

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  colorScheme?: "risk" | "reliability";
}

export default function ScoreRing({ score, size = 52, strokeWidth, colorScheme = "risk" }: ScoreRingProps) {
  const stroke = strokeWidth || (size <= 44 ? 2.5 : 3);
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  let color: string;
  if (colorScheme === "risk") {
    color = score <= 30 ? "#22c55e" : score <= 60 ? "#f59e0b" : "#ef4444";
  } else {
    color = score >= 85 ? "#22c55e" : score >= 70 ? "#f59e0b" : "#ef4444";
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`font-bold text-foreground ${size <= 44 ? "text-[9px]" : "text-xs"}`}>{score}</span>
      </div>
    </div>
  );
}
