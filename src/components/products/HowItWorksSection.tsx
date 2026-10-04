"use client";

import { Search, TrendingUp, ShoppingCart, Zap, ArrowRight } from "lucide-react";
import { useInView } from "@/hooks/useInView";

export default function HowItWorksSection() {
  const { ref, isInView } = useInView({ threshold: 0.1 });
  const steps = [
    { icon: Search, title: "Search Across Platforms", desc: "Find products from Amazon, eBay, AliExpress, and more in one search", color: "text-blue-400", bg: "bg-blue-400/10" },
    { icon: TrendingUp, title: "Compare & Analyze", desc: "Compare prices, margins, and demand data to find winning products", color: "text-emerald-400", bg: "bg-emerald-400/10" },
    { icon: ShoppingCart, title: "Source & Sell", desc: "Connect with verified suppliers and start selling with confidence", color: "text-purple-400", bg: "bg-purple-400/10" },
  ];
  return (
    <div ref={ref} className={`transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"}`}>
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-4 w-4 text-accent" aria-hidden="true" />
        <h3 className="font-display text-sm font-semibold text-foreground">How It Works</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((step, i) => (
          <div
            key={step.title}
            className={`glass rounded-2xl p-5 transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            style={{ transitionDelay: `${i * 100}ms` }}
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${step.bg} mb-3`}>
              <step.icon className={`h-5 w-5 ${step.color}`} aria-hidden="true" />
            </div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-muted-foreground/40">STEP {i + 1}</span>
              {i < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/20 hidden md:block" aria-hidden="true" />}
            </div>
            <h4 className="font-display text-sm font-semibold text-foreground mb-1">{step.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
