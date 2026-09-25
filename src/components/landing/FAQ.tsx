"use client";

import { useState } from "react";
import { useInView } from "@/hooks/useInView";
import { ChevronDown } from "lucide-react";

const faqs = [
  {
    q: "How does the Daily Pick work?",
    a: "When your dashboard loads, the app scores the products returned by your latest supplier search with a fixed formula — rating, review count, price headroom, and margin — then highlights the top opportunity with its price, margin, and a suggested listing price. The pick is rule-based and refreshes whenever your search data refreshes.",
  },
  {
    q: "What is the Niche Radar?",
    a: "Niche Radar provides heuristic niche scores from catalog size and pricing. Each niche card compares niches on dimensions like market size, competition, growth rate, and margin potential. Scores range from 0-100, helping you spot niches with room to enter before they become saturated.",
  },
  {
    q: "How accurate are the trending product scores?",
    a: "Our rule-based confidence scores are computed from the listing data we can see: margin headroom, rating and review counts, how many platforms list the product, and the price spread between sellers. 85+ is our target threshold for promising products. Scores refresh whenever supplier data is refreshed — they are estimates from listing data, not sales measurements.",
  },
  {
    q: "What are Daily Missions?",
    a: "Daily Missions are gamified challenges that help you build dropshipping skills while earning XP and badges. Tasks include analyzing niches, comparing suppliers, and calculating margins. Complete missions to level up, maintain streaks, and unlock advanced insights.",
  },
  {
    q: "How does the Marketplace Heatmap work?",
    a: "The heatmap visualizes marketplace activity across categories using color-coded tiles. Red tiles indicate overcrowded categories, green tiles show rising categories, and blue tiles represent quieter niches. Temperature scores are based on listing density from supplier search, cached.",
  },
  {
    q: "Can I connect my Shopify or WooCommerce store?",
    a: "Yes. You can connect Shopify, WooCommerce, BigCommerce, Squarespace, or any custom store via API. Once connected, you can push winning products, sync inventory, and track orders from the dashboard.",
  },
  {
    q: "Is DropShip Hub really free?",
    a: "Yes. The core features — daily product picks, niche radar, trending products, calculators, and daily missions — are all free. You can use the full dashboard without entering a credit card.",
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
                type="button"
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                aria-expanded={openIndex === i}
                aria-controls={`faq-panel-${i}`}
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
                id={`faq-panel-${i}`}
                aria-hidden={openIndex !== i}
                className={`grid transition-all duration-300 ${
                  openIndex === i ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <p className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
