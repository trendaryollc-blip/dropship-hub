"use client";

import { useInView } from "@/hooks/useInView";
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter";

const stats = [
  { end: 10, suffix: "+", label: "Platforms Connected", sublabel: "Amazon, AliExpress, eBay..." },
  { end: 847, suffix: "+", label: "Products Analyzed Daily", sublabel: "AI-scored for profit potential" },
  { end: 92, suffix: "%", label: "AI Accuracy Score", sublabel: "On trending product picks" },
  { end: 0, suffix: "", label: "To Get Started", sublabel: "Free forever, upgrade anytime", isFree: true },
];

function StatItem({ stat, isInView }: { stat: typeof stats[0]; isInView: boolean }) {
  const count = useAnimatedCounter(stat.end, 2000, isInView);

  return (
    <div className="text-center">
      <p className="font-display text-4xl md:text-5xl font-bold gradient-text mb-2">
        {stat.isFree ? "Free" : `${count}${stat.suffix}`}
      </p>
      <p className="font-display text-sm font-semibold text-foreground mb-1">
        {stat.label}
      </p>
      <p className="text-xs text-muted-foreground">{stat.sublabel}</p>
    </div>
  );
}

export default function Stats() {
  const { ref, isInView } = useInView({ threshold: 0.3 });

  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-0 bg-accent/[0.02]" />

      <div className="relative mx-auto max-w-7xl px-6" ref={ref}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
          {stats.map((stat) => (
            <StatItem key={stat.label} stat={stat} isInView={isInView} />
          ))}
        </div>
      </div>
    </section>
  );
}
