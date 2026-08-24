"use client";

import { useState } from "react";
import { useInView } from "@/hooks/useInView";
import { Check, X, Minus, GripVertical } from "lucide-react";

const rows = [
  { name: "AI daily product pick", hub: "check", manual: "x" },
  { name: "Live market monitoring", hub: "check", manual: "x" },
  { name: "Niche radar with AI scoring", hub: "check", manual: "x" },
  { name: "Trending product confidence scores", hub: "check", manual: "x" },
  { name: "Marketplace heatmap visualization", hub: "check", manual: "x" },
  { name: "Revenue forecast with AI predictions", hub: "check", manual: "x" },
  { name: "Gamified daily missions & XP", hub: "check", manual: "x" },
  { name: "Supplier reliability scoring", hub: "check", manual: "x" },
  { name: "5-in-1 profit calculator", hub: "check", manual: "partial" },
  { name: "Competitor price tracking", hub: "check", manual: "partial" },
];

function StatusIcon({ status }: { status: string }) {
  if (status === "check") return <Check className="h-4 w-4 text-emerald-400" />;
  if (status === "x") return <X className="h-4 w-4 text-red-400" />;
  return <Minus className="h-4 w-4 text-amber-400" />;
}

export default function Comparison() {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const { ref, isInView } = useInView({ threshold: 0.1 });

  const handleMove = (clientX: number, rect: DOMRect) => {
    const x = clientX - rect.left;
    const pct = Math.max(10, Math.min(90, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  return (
    <section className="relative py-24 md:py-32">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="mx-auto max-w-4xl px-6" ref={ref}>
        <div className={`text-center max-w-3xl mx-auto mb-16 transition-all duration-700 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          <p className="text-sm font-semibold text-accent uppercase tracking-widest mb-4">
            Why DropShip Hub
          </p>
          <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            <span className="gradient-text">One Tool</span> vs. Spreadsheets & Guesswork
          </h2>
          <p className="text-lg text-muted-foreground leading-relaxed">
            Drag the slider to compare what you get with DropShip Hub
            versus cobbling together free tools.
          </p>
        </div>

        <div className={`glass rounded-2xl overflow-hidden transition-all duration-700 delay-200 ${isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
          {/* Visual slider comparison */}
          <div
            className="relative h-48 md:h-64 overflow-hidden cursor-col-resize select-none"
            onMouseDown={(e) => {
              setIsDragging(true);
              handleMove(e.clientX, e.currentTarget.getBoundingClientRect());
            }}
            onMouseMove={(e) => {
              if (isDragging) handleMove(e.clientX, e.currentTarget.getBoundingClientRect());
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
            onTouchStart={(e) => {
              setIsDragging(true);
              handleMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
            }}
            onTouchMove={(e) => {
              if (isDragging) handleMove(e.touches[0].clientX, e.currentTarget.getBoundingClientRect());
            }}
            onTouchEnd={() => setIsDragging(false)}
          >
            {/* Before (Manual) side */}
            <div className="absolute inset-0 bg-gradient-to-br from-red-400/10 via-red-400/5 to-background">
              <div className="absolute inset-0 flex flex-col items-end justify-center p-8 pr-16">
                <div className="flex gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center">
                    <span className="text-lg">📊</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center">
                    <span className="text-lg">📋</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-red-400/10 flex items-center justify-center">
                    <span className="text-lg">🔍</span>
                  </div>
                </div>
                <p className="font-display text-lg font-bold text-foreground mb-1">Manual Research</p>
                <p className="text-sm text-muted-foreground text-right">Spreadsheets, browser tabs, guesswork</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
                  <span>4+ hours/day</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>$200+/mo in tools</span>
                </div>
              </div>
            </div>

            {/* After (Hub) side */}
            <div
              className="absolute inset-0 bg-gradient-to-br from-accent/10 via-accent/5 to-background"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              <div className="absolute inset-0 flex flex-col items-start justify-center p-8 pl-16">
                <div className="flex gap-2 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <span className="text-lg">🚀</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <span className="text-lg">⚡</span>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <span className="text-lg">🎯</span>
                  </div>
                </div>
                <p className="font-display text-lg font-bold text-foreground mb-1">DropShip Hub</p>
                <p className="text-sm text-muted-foreground text-left">One dashboard, real-time data</p>
                <div className="mt-4 flex items-center gap-4 text-xs text-emerald-400 font-medium">
                  <span>15 min/day</span>
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span>Free to start</span>
                </div>
              </div>
            </div>

            {/* Slider handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-accent shadow-[0_0_15px_rgba(var(--glow-color),0.5)] z-20"
              style={{ left: `${sliderPos}%`, transform: "translateX(-50%)" }}
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-14 rounded-full bg-accent border-2 border-white/20 flex items-center justify-center cursor-col-resize shadow-lg">
                <GripVertical className="h-4 w-4 text-white" />
              </div>
            </div>

            {/* Labels */}
            <div className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full bg-accent text-white text-xs font-bold">
              DropShip Hub
            </div>
            <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-surface border border-border text-muted-foreground text-xs font-bold">
              Manual
            </div>
          </div>

          {/* Feature comparison table */}
          <div className="border-t border-border">
            <div className="grid grid-cols-3 border-b border-border">
              <div className="p-4 md:p-5" />
              <div className="p-4 md:p-5 text-center border-x border-border">
                <p className="font-display text-sm font-bold text-accent">DropShip Hub</p>
              </div>
              <div className="p-4 md:p-5 text-center">
                <p className="font-display text-sm font-bold text-muted-foreground">Manual</p>
              </div>
            </div>

            {rows.map((row, i) => (
              <div
                key={row.name}
                className={`grid grid-cols-3 border-b border-border last:border-b-0 ${i % 2 === 0 ? "bg-surface/30" : ""}`}
              >
                <div className="p-4 md:p-5 flex items-center">
                  <span className="text-sm text-foreground">{row.name}</span>
                </div>
                <div className="p-4 md:p-5 flex items-center justify-center border-x border-border">
                  <StatusIcon status={row.hub} />
                </div>
                <div className="p-4 md:p-5 flex items-center justify-center">
                  <StatusIcon status={row.manual} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
