"use client";

import { useState, useRef, useEffect } from "react";
import { Palette, Check } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { themes, themeOrder } from "@/lib/themes";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-all"
        aria-label="Change theme"
      >
        <Palette className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl py-2 border border-border bg-surface shadow-2xl animate-slide-up z-50">
          <div className="px-3 py-2 mb-1">
            <p className="text-sm font-semibold text-foreground">Themes</p>
          </div>
          <div className="border-t border-border my-1" />
          {themeOrder.map((name) => {
            const t = themes[name];
            const isActive = theme === name;
            return (
              <button
                key={name}
                onClick={() => {
                  setTheme(name);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left ${
                  isActive
                    ? "bg-surface-hover"
                    : "hover:bg-surface-hover"
                }`}
              >
                <div className="flex gap-1 shrink-0">
                  {t.swatch.map((color, i) => (
                    <span
                      key={i}
                      className="h-3.5 w-3.5 rounded-full border border-border"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <span
                  className={`text-sm flex-1 ${
                    isActive ? "text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  {t.label}
                </span>
                {isActive && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
