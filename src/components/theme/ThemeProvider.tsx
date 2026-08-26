"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { themes, type ThemeName, themeOrder } from "@/lib/themes";

const STORAGE_KEY = "dropship-theme";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
  previewTheme: (name: ThemeName) => void;
  restoreTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "crimson-noir",
  setTheme: () => {},
  previewTheme: () => {},
  restoreTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getInitialTheme(): ThemeName {
  if (typeof window === "undefined") return "crimson-noir";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && themeOrder.includes(stored as ThemeName)) {
    return stored as ThemeName;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (!prefersDark) return "arctic-white";

  return "crimson-noir";
}

function applyThemeToDOM(name: ThemeName) {
  const theme = themes[name];
  if (!theme) return;

  const root = document.documentElement;
  root.setAttribute("data-theme", name);

  root.style.setProperty("--background", theme.background);
  root.style.setProperty("--foreground", theme.foreground);
  root.style.setProperty("--surface", theme.surface);
  root.style.setProperty("--surface-hover", theme.surfaceHover);
  root.style.setProperty("--border-color", theme.border);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--accent-hover", theme.accentHover);
  root.style.setProperty("--accent-warm", theme.accentWarm);
  root.style.setProperty("--accent-warm-hover", theme.accentWarmHover);
  root.style.setProperty("--muted", theme.muted);
  root.style.setProperty("--sidebar", theme.sidebar);
  root.style.setProperty("--muted-fg", theme.mutedFg);
  root.style.setProperty("--success", theme.success);
  root.style.setProperty("--warning", theme.warning);
  root.style.setProperty("--danger", theme.danger);
  root.style.setProperty("--glass-bg", theme.glassBg);
  root.style.setProperty("--glass-border", theme.glassBorder);
  root.style.setProperty("--gradient-start", theme.gradientStart);
  root.style.setProperty("--gradient-mid", theme.gradientMid);
  root.style.setProperty("--gradient-end", theme.gradientEnd);
  root.style.setProperty("--glow-color", theme.glowColor);
}

function applyTheme(name: ThemeName) {
  applyThemeToDOM(name);
  localStorage.setItem(STORAGE_KEY, name);
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeName>("crimson-noir");
  const initializedRef = useRef(false);
  const previewingRef = useRef<ThemeName | null>(null);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initial = getInitialTheme();
    applyTheme(initial);
    setThemeState(initial);
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    previewingRef.current = null;
    setThemeState(name);
    applyTheme(name);
  }, []);

  const previewTheme = useCallback((name: ThemeName) => {
    previewingRef.current = name;
    applyThemeToDOM(name);
  }, []);

  const restoreTheme = useCallback(() => {
    if (previewingRef.current) {
      previewingRef.current = null;
      const root = document.documentElement;
      const current = themes[theme];
      if (current) {
        root.setAttribute("data-theme", theme);
        applyThemeToDOM(theme);
      }
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, previewTheme, restoreTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
