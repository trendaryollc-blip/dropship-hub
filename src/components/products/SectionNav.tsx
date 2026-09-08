"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Calculator, BarChart3, MessageSquare, Truck, Lightbulb, Package, Search } from "lucide-react";

const sections = [
  { id: "price-comparison", label: "Price", icon: TrendingUp },
  { id: "calculator", label: "Calculator", icon: Calculator },
  { id: "market-intel", label: "Intelligence", icon: BarChart3 },
  { id: "reviews", label: "Reviews", icon: MessageSquare },
  { id: "suppliers", label: "Suppliers", icon: Truck },
  { id: "listings", label: "Listings", icon: Lightbulb },
  { id: "similar", label: "Similar", icon: Package },
  { id: "searches", label: "Searches", icon: Search },
];

export default function SectionNav() {
  const [active, setActive] = useState("");

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    sections.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActive(id);
          }
        },
        { threshold: 0.3, rootMargin: "-100px 0px -40% 0px" }
      );

      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <>
      {/* Desktop: floating right side nav */}
      <nav className="hidden xl:block fixed right-6 top-1/2 -translate-y-1/2 z-30">
        <div className="glass rounded-2xl p-2 space-y-1">
          {sections.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium transition-all ${
                active === id
                  ? "bg-accent/10 text-accent border border-accent/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile: horizontal scrollable tabs */}
      <nav className="xl:hidden sticky top-0 z-30 glass border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto py-2 scrollbar-hide">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all shrink-0 ${
                  active === id
                    ? "bg-accent/10 text-accent border border-accent/20"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-3 w-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </nav>
    </>
  );
}
