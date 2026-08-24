"use client";

import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { themes, type ThemeName, themeOrder } from "@/lib/themes";

const STORAGE_KEY = "dropship-theme";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (name: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "midnight",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getInitialTheme(): ThemeName {
  if (typeof window === "undefined") return "midnight";

  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && themeOrder.includes(stored as ThemeName)) {
    return stored as ThemeName;
  }

  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (!prefersDark) return "arctic-white";

  return "midnight";
}

function applyTheme(name: ThemeName) {
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

  localStorage.setItem(STORAGE_KEY, name);
}

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<ThemeName>("midnight");
  const initializedRef = useRef(false);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const initial = getInitialTheme();
    applyTheme(initial);
    setThemeState(initial);
  }, []);

  const setTheme = useCallback((name: ThemeName) => {
    setThemeState(name);
    applyTheme(name);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
