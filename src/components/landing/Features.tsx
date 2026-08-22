"use client";

import { useInView } from "@/hooks/useInView";
import {
  Brain,
  Sparkles,
  Target,
  TrendingUp,
  Flame,
  BarChart3,
  Trophy,
  Calculator,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "AI Daily Pick",
    description:
      "Every 24 hours, our AI analyzes thousands of products and picks the single best opportunity based on margin, demand, competition, and trend data.",
    color: "text-pink-400",
    bg: "bg-pink-400/10",
    gradient: "from-pink-400/20 via-pink-500/10 to-transparent",
  },
  {
    icon: Sparkles,
    title: "Intelligence Hub",
    description:
      "Live AI monitoring detects opportunities, risks, and market trends in real-time. Get a daily briefing with sentiment analysis and actionable insights.",
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    gradient: "from-blue-400/20 via-blue-500/10 to-transparent",
  },
  {
    icon: Target,
    title: "Niche Radar",
    description:
      "AI-scored niche cards with radar charts showing market size, competition, growth, and margin potential. Find untapped niches before your competitors.",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    gradient: "from-purple-400/20 via-purple-500/10 to-transparent",
  },
  {
    icon: TrendingUp,
    title: "Revenue Forecast",
    description:
      "AI-powered revenue predictions with actual vs. forecast charts. Set goals, track progress, and see projected earnings with confidence intervals.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    gradient: "from-emerald-400/20 via-emerald-500/10 to-transparent",
  },
  {
    icon: Flame,
    title: "Trending Products",
    description:
      "Ranked trending products with AI confidence scores, demand and competition badges, supplier reliability, and expandable market analysis for each.",
    color: "text-orange-400",
    bg: "bg-orange-400/10",
    gradient: "from-orange-400/20 via-orange-500/10 to-transparent",
  },
  {
    icon: BarChart3,
    title: "Marketplace Heatmap",
    description:
      "Visual heat map showing marketplace activity across categories. Spot overheating markets, emerging trends, and cooling niches at a glance.",
    color: "text-amber-400",
    bg: "bg-amber-400/10",
    gradient: "from-amber-400/20 via-amber-500/10 to-transparent",
  },
  {
    icon: Trophy,
    title: "Daily Missions",
    description:
      "Gamified challenges with XP, levels, badges, and streaks. Complete daily missions to unlock insights and improve your dropshipping skills.",
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    gradient: "from-yellow-400/20 via-yellow-500/10 to-transparent",
  },
  {
    icon: Calculator,
    title: "Smart Calculator",
    description:
      "5-in-1 profit calculator with real-time margins, shipping costs, landed costs with tariffs, ROI forecasting, and ad spend breakpoints.",
    color: "text-cyan-400",
    bg: "bg-cyan-400/10",
    gradient: "from-cyan-400/20 via-cyan-500/10 to-transparent",
  },
];

export default function Features() {
  const { ref, isInView } = useInView({ threshold: 0.05 });

  return (
    <section id="features" className="relative py-24 md:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-6" ref={ref}>
        <div className={"text-center max-w-3xl mx-auto mb-16 md:mb-20 transition-all duration-700 " + (isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")}>
          <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-4">
            Features
          </p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Intelligence That{" "}
            <span className="gradient-text">Puts You Ahead</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Stop guessing. Our AI analyzes the market 24/7 and hands you
            winning products, untapped niches, and profit opportunities
            before anyone else sees them.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={"group relative rounded-2xl p-6 transition-all duration-500 cursor-default overflow-hidden " + (isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8")}
              style={{ transitionDelay: i * 80 + "ms" }}
            >
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-accent/0 via-accent/0 to-accent/0 group-hover:from-accent/20 group-hover:via-purple-500/10 group-hover:to-accent-warm/10 transition-all duration-500" />
              <div className="absolute inset-[1px] rounded-2xl bg-surface/90 backdrop-blur-xl" />

              <div className={"absolute -inset-1 rounded-2xl bg-gradient-to-br " + feature.gradient + " opacity-0 group-hover:opacity-100 blur-xl transition-opacity duration-500"} />

              <div className="relative z-10">
                <div
                  className={"inline-flex items-center justify-center w-12 h-12 rounded-xl " + feature.bg + " mb-4 group-hover:scale-110 transition-transform duration-300"}
                >
                  <feature.icon className={"h-6 w-6 " + feature.color} />
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground mb-2 group-hover:text-accent transition-colors duration-300">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
