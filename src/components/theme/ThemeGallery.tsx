"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Palette, Check, Sparkles } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { themes, themeOrder, type ThemeName } from "@/lib/themes";

const themeMeta: Record<string, { tagline: string }> = {
  "crimson-noir": { tagline: "Executive Power" },
  "ember-glow": { tagline: "Warm Commerce" },
  "royal-purple": { tagline: "Creative AI" },
  "emerald-forest": { tagline: "Growth & Wealth" },
  "ocean-teal": { tagline: "Calm Focus" },
  "golden-rose": { tagline: "Rich Elegance" },
  "royal-amethyst": { tagline: "Premium AI" },
  "sakura-neon": { tagline: "Cherry Blossom" },
  "arctic-ice": { tagline: "Modern Enterprise" },
  "obsidian-gold": { tagline: "Ultra Luxury" },
  "vanilla-latte": { tagline: "Warm Minimalism" },
  "arctic-white": { tagline: "Clean Light" },
};

function MiniPreview({ name }: { name: ThemeName }) {
  const t = themes[name];
  return (
    <div
      className="w-full aspect-[16/10] rounded-lg overflow-hidden flex border border-white/[0.06]"
      style={{ backgroundColor: t.background }}
    >
      {/* Sidebar */}
      <div
        className="w-[28%] h-full flex flex-col gap-1 p-1.5 border-r"
        style={{ backgroundColor: t.sidebar, borderColor: t.border }}
      >
        <div className="flex items-center gap-1 px-1">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: t.accent }}
          />
          <div
            className="h-1.5 flex-1 rounded-sm"
            style={{ backgroundColor: t.mutedFg, opacity: 0.4 }}
          />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-1.5 rounded-sm mx-1"
            style={{
              backgroundColor: i === 0 ? t.accent : t.mutedFg,
              opacity: i === 0 ? 0.3 : 0.15,
              width: `${70 - i * 10}%`,
            }}
          />
        ))}
      </div>
      {/* Main area */}
      <div className="flex-1 flex flex-col gap-1 p-1.5">
        {/* Header bar */}
        <div className="flex items-center gap-1">
          <div
            className="h-1.5 flex-1 rounded-sm"
            style={{ backgroundColor: t.mutedFg, opacity: 0.15 }}
          />
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: t.accent, opacity: 0.5 }}
          />
        </div>
        {/* Cards row */}
        <div className="flex gap-1 flex-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex-1 rounded-md p-1 flex flex-col gap-0.5 border"
              style={{
                backgroundColor: t.surface,
                borderColor: t.border,
              }}
            >
              <div
                className="h-1 w-[60%] rounded-sm"
                style={{ backgroundColor: t.mutedFg, opacity: 0.2 }}
              />
              <div
                className="h-1.5 w-[40%] rounded-sm"
                style={{ backgroundColor: t.accent, opacity: 0.7 }}
              />
              <div className="flex-1" />
              <div
                className="h-0.5 w-full rounded-full"
                style={{ backgroundColor: t.mutedFg, opacity: 0.1 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ThemeGallery() {
  const { theme, setTheme, previewTheme, restoreTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        restoreTheme();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [restoreTheme]);

  const handleEnter = useCallback(
    (name: ThemeName) => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = setTimeout(() => {
        previewTheme(name);
      }, 80);
    },
    [previewTheme]
  );

  const handleLeave = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    restoreTheme();
  }, [restoreTheme]);

  const handleSelect = useCallback(
    (name: ThemeName) => {
      setTheme(name);
      setOpen(false);
    },
    [setTheme]
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => {
          if (open) {
            restoreTheme();
            setOpen(false);
          } else {
            setOpen(true);
          }
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all duration-200"
        aria-label="Open theme gallery"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline">Themes</span>
      </button>

      {/* Gallery Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-3 w-[480px] max-h-[85vh] overflow-hidden rounded-2xl border border-border/60 shadow-2xl shadow-black/20 z-50"
          style={{
            background: "var(--surface)",
            backdropFilter: "blur(40px) saturate(1.5)",
            animation: "slide-down-fade 0.2s ease-out",
          }}
        >
          {/* Header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-display font-bold text-foreground tracking-tight">
                  Choose Theme
                </h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Personalize your workspace
                </p>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-accent/10 text-accent border border-accent/20">
                <Sparkles className="h-3 w-3" />
                Active
              </div>
            </div>
          </div>

          {/* Theme Grid */}
          <div className="px-6 pb-6 overflow-y-auto max-h-[calc(85vh-120px)]">
            <div className="grid grid-cols-2 gap-3">
              {themeOrder.map((name) => {
                const t = themes[name];
                const meta = themeMeta[name] || { tagline: "" };
                const isActive = theme === name;

                return (
                  <button
                    key={name}
                    onClick={() => handleSelect(name)}
                    onMouseEnter={() => handleEnter(name)}
                    onMouseLeave={handleLeave}
                    className={`group relative rounded-xl overflow-hidden text-left transition-all duration-200 hover:scale-[1.02] hover:-translate-y-0.5 ${
                      isActive
                        ? "ring-2 ring-accent shadow-lg shadow-accent/10"
                        : "ring-1 ring-border/50 hover:ring-border hover:shadow-lg hover:shadow-black/10"
                    }`}
                  >
                    {/* Mini Preview */}
                    <MiniPreview name={name} />

                    {/* Info Bar */}
                    <div
                      className="px-3 py-2.5 flex items-center justify-between"
                      style={{ backgroundColor: t.surface }}
                    >
                      <div>
                        <p
                          className="text-xs font-semibold leading-none"
                          style={{ color: t.foreground }}
                        >
                          {t.label}
                        </p>
                        <p
                          className="text-[10px] mt-0.5 leading-none"
                          style={{ color: t.mutedFg }}
                        >
                          {meta.tagline}
                        </p>
                      </div>
                      {isActive && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-accent/15">
                          <Check
                            className="h-3 w-3"
                            style={{ color: t.accent }}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
