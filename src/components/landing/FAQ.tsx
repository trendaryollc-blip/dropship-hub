"use client";

import { useState } from "react";
import { useInView } from "@/hooks/useInView";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How does the AI Daily Pick work?",
    a: "Every 24 hours, our AI analyzes thousands of products across 10+ platforms, scoring them on profit margin, demand trends, competition level, and supplier reliability. It then selects the single best opportunity and provides a full breakdown including why it's trending, competitor pricing, and an AI-generated listing suggestion.",
  },
  {
    q: "What is the Niche Radar?",
    a: "Niche Radar provides AI-scored analysis of entire market niches. Each niche card shows a radar chart with dimensions like market size, competition, growth rate, and margin potential. Scores range from 0-100, helping you identify untapped opportunities before they become saturated.",
  },
  {
    q: "How accurate are the trending product scores?",
    a: "Our AI confidence scores combine multiple signals: search volume trends, sales velocity, supplier reliability, margin stability, and competition density. Products scoring 85+ have historically shown strong performance. The score is updated in real-time as market conditions change.",
  },
  {
    q: "What are Daily Missions?",
    a: "Daily Missions are gamified challenges that help you build dropshipping skills while earning XP and badges. Tasks include analyzing niches, comparing suppliers, and calculating margins. Complete missions to level up, maintain streaks, and unlock advanced insights.",
  },
  {
    q: "How does the Marketplace Heatmap work?",
    a: "The heatmap visualizes marketplace activity across categories using color-coded tiles. Red tiles indicate overheating markets (high competition), green tiles show emerging trends, and blue tiles represent stable, profitable niches. Temperature scores update based on real-time sales data.",
  },
  {
    q: "Can I connect my Shopify or WooCommerce store?",
    a: "Yes. You can connect Shopify, WooCommerce, BigCommerce, Squarespace, or any custom store via API. Once connected, you can push winning products, sync inventory, and track orders from the dashboard.",
  },
  {
    q: "Is DropShip Hub really free?",
    a: "Yes. The core features — AI daily picks, niche radar, trending products, marketplace heatmap, calculators, and daily missions — are all free. You can use the full dashboard without entering a credit card.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { ref, isInView } = useInView({ threshold: 0.1 });

  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-0 bg-accent/[0.02]" />

      <div className="mx-auto max-w-3xl px-6" ref={ref}>
        <div className={`text-center mb-16 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-4">
            FAQ
          </p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Frequently Asked{" "}
            <span className="gradient-text">Questions</span>
          </h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`glass rounded-2xl overflow-hidden transition-all duration-500 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-display text-sm font-semibold text-foreground pr-4">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === i ? "max-h-40" : "max-h-0"
                }`}
              >
                <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                  {faq.a}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
