"use client";

import { useInView } from "@/hooks/useInView";
import { Star, Quote } from "lucide-react";

const testimonials = [
  {
    name: "Sarah Chen",
    role: "Full-time Dropshipper",
    avatar: "SC",
    avatarBg: "bg-accent/10 text-accent",
    content: "I was paying $200/mo for separate product research, supplier vetting, and profit calculator tools. DropShip Hub replaced all of them. The landed cost calculator alone saved me from two bad product launches.",
    stars: 5,
  },
  {
    name: "Marcus Rodriguez",
    role: "Shopify Store Owner",
    avatar: "MR",
    avatarBg: "bg-emerald-400/10 text-emerald-400",
    content: "The competitor pricing research is insane. I found a product where competitors were charging $45 but I could source it for $8. That one product now does $3K/mo in profit. Worth every minute I spent on this tool.",
    stars: 5,
  },
  {
    name: "Aisha Patel",
    role: "E-commerce Agency Owner",
    avatar: "AP",
    avatarBg: "bg-purple-400/10 text-purple-400",
    content: "We manage 12 client stores. The multi-platform product search and supplier scoring system lets us find winning products in minutes instead of hours. Our clients are seeing better margins already.",
    stars: 5,
  },
  {
    name: "Jake Thompson",
    role: "Part-time Seller",
    avatar: "JT",
    avatarBg: "bg-amber-400/10 text-amber-400",
    content: "The business health score told me exactly what I was doing wrong. My supplier network was weak and I was underpricing. Fixed those two things and my profit margin went from 12% to 34%.",
    stars: 5,
  },
  {
    name: "Elena Kowalski",
    role: "TikTok Shop Seller",
    avatar: "EK",
    avatarBg: "bg-pink-400/10 text-pink-400",
    content: "The ad ROI calculator is a game changer. I can simulate different budget scenarios before spending a dime. No more guessing if a product is worth scaling with paid ads.",
    stars: 5,
  },
  {
    name: "David Park",
    role: "Amazon FBA + Dropship Hybrid",
    avatar: "DP",
    avatarBg: "bg-cyan-400/10 text-cyan-400",
    content: "Being able to compare prices across AliExpress, CJ, and Alibaba side by side for the same product is exactly what I needed. Found a supplier that cut my cost by 30%.",
    stars: 5,
  },
];

export default function Testimonials() {
  const { ref, isInView } = useInView({ threshold: 0.05 });

  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="absolute inset-0 bg-accent/[0.02]" />

      <div className="mx-auto max-w-7xl px-6" ref={ref}>
        <div className={`text-center max-w-3xl mx-auto mb-16 md:mb-20 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-4">
            Testimonials
          </p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Loved by{" "}
            <span className="gradient-text">Dropshippers Worldwide</span>
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Real feedback from sellers who use DropShip Hub every day to run
            their ecommerce businesses.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`glass rounded-2xl p-6 transition-all duration-500 hover:border-accent/20 hover:bg-surface-hover ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, j) => (
                  <Star key={j} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <div className="relative mb-4">
                <Quote className="absolute -top-1 -left-1 h-8 w-8 text-accent/10" />
                <p className="text-sm text-muted-foreground leading-relaxed relative z-10 pl-4">
                  {t.content}
                </p>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${t.avatarBg}`}>
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
