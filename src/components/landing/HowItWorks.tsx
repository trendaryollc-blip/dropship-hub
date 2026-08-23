"use client";

import Link from "next/link";
import { useInView } from "@/hooks/useInView";
import { Search, Calculator, Rocket, ArrowUpRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Search,
    title: "AI Discovers Winners",
    description:
      "Our AI scans 10+ platforms daily, scores products by margin and demand, and hands you the top pick with full market analysis — no more guessing.",
    color: "text-accent",
    bg: "bg-accent/10",
    border: "border-accent/20",
    href: "/products",
  },
  {
    number: "02",
    icon: Calculator,
    title: "Analyze & Compare",
    description:
      "Explore niche radar scores, trending products with confidence rings, marketplace heatmaps, and competitor pricing — all in one dashboard.",
    color: "text-accent-warm",
    bg: "bg-accent-warm/10",
    border: "border-accent-warm/20",
    href: "/competitors",
  },
  {
    number: "03",
    icon: Rocket,
    title: "Launch & Earn XP",
    description:
      "Push winning products to your store, complete daily missions, level up, and watch your revenue forecast climb — gamified for maximum profit.",
    color: "text-emerald-400",
    bg: "bg-emerald-400/10",
    border: "border-emerald-400/20",
    href: "/store",
  },
];

export default function HowItWorks() {
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section id="how-it-works" className="relative py-24 md:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-7xl px-6" ref={ref}>
        <div className={`text-center max-w-3xl mx-auto mb-16 md:mb-20 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-4">
            How It Works
          </p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            From Discovery to{" "}
            <span className="gradient-text">Profit in 3 Steps</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            No complex setup. No learning curve. Let our AI find winners,
            analyze the market, and help you launch in minutes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 relative">
          {/* Mobile connector lines */}
          <div className="md:hidden absolute left-8 top-16 bottom-16 w-px bg-gradient-to-b from-accent/30 via-accent-warm/30 to-emerald-400/30" />

          {steps.map((step, index) => (
            <div key={step.number} className={`relative transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`} style={{ transitionDelay: `${index * 150}ms` }}>
              {/* Desktop connector line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[calc(50%+80px)] right-[calc(-50%+80px)] h-px bg-gradient-to-r from-border via-border to-transparent" />
              )}

              <Link href={step.href} className="glass rounded-2xl p-8 text-center relative block group hover:border-accent/20 transition-all hover:bg-surface-hover cursor-pointer">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background border border-border text-xs font-mono text-muted-foreground">
                  {step.number}
                </div>

                <div
                  className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl ${step.bg} border ${step.border} mb-6 mt-4 group-hover:scale-110 transition-transform`}
                >
                  <step.icon className={`h-8 w-8 ${step.color}`} />
                </div>

                <h3 className="font-display text-xl font-semibold text-foreground mb-3 group-hover:text-accent transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                  {step.description}
                </p>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground mx-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
