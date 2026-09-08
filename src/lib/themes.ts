export interface Theme {
  name: string;
  label: string;
  background: string;
  foreground: string;
  surface: string;
  surfaceHover: string;
  border: string;
  accent: string;
  accentHover: string;
  accentWarm: string;
  accentWarmHover: string;
  sidebar: string;
  muted: string;
  mutedFg: string;
  success: string;
  warning: string;
  danger: string;
  glassBg: string;
  glassBorder: string;
  gradientStart: string;
  gradientMid: string;
  gradientEnd: string;
  glowColor: string;
  swatch: string[];
  surfaceBase: string;
  surfaceRaised: string;
  surfaceElevated: string;
  surfaceFloating: string;
  surfaceRaisedBorder: string;
  surfaceElevatedBorder: string;
  surfaceFloatingBorder: string;
  surfaceRaisedShadow: string;
  surfaceElevatedShadow: string;
  surfaceFloatingShadow: string;
  colorConfidenceHigh: string;
  colorConfidenceMedium: string;
  colorConfidenceLow: string;
  colorTrendUp: string;
  colorTrendDown: string;
  colorTrendNeutral: string;
  colorDemandHigh: string;
  colorDemandMedium: string;
  colorDemandLow: string;
  colorStatusOnline: string;
  colorStatusBusy: string;
  colorStatusOffline: string;
  colorHeat1: string;
  colorHeat2: string;
  colorHeat3: string;
  colorHeat4: string;
  colorHeat5: string;
}

export const themes: Record<string, Theme> = {
  "crimson-noir": {
    name: "crimson-noir",
    label: "Crimson Noir",
    background: "#0c0c0c",
    foreground: "#FAFAFA",
    surface: "#1a1a1a",
    surfaceHover: "#242424",
    border: "#341111",
    accent: "#FF2348",
    accentHover: "#E01E40",
    accentWarm: "#FFB347",
    accentWarmHover: "#FFA033",
    sidebar: "#050505",
    muted: "#131313",
    mutedFg: "#8A8A8A",
    success: "#00D4AA",
    warning: "#FFB347",
    danger: "#FF2348",
    glassBg: "rgba(26, 26, 26, 0.6)",
    glassBorder: "rgba(255, 255, 255, 0.06)",
    gradientStart: "#FF2348",
    gradientMid: "#FF5B7A",
    gradientEnd: "#FFB347",
    glowColor: "255, 35, 72",
    swatch: ["#0c0c0c", "#FF2348", "#FFB347"],
    surfaceBase: "#0c0c0c",
    surfaceRaised: "#1a1a1a",
    surfaceElevated: "rgba(30, 30, 30, 0.85)",
    surfaceFloating: "rgba(36, 36, 36, 0.92)",
    surfaceRaisedBorder: "rgba(255, 255, 255, 0.06)",
    surfaceElevatedBorder: "rgba(255, 255, 255, 0.08)",
    surfaceFloatingBorder: "rgba(255, 255, 255, 0.1)",
    surfaceRaisedShadow: "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
    surfaceElevatedShadow: "0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)",
    surfaceFloatingShadow: "0 12px 40px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)",
    colorConfidenceHigh: "#00D4AA",
    colorConfidenceMedium: "#FFB347",
    colorConfidenceLow: "#FF2348",
    colorTrendUp: "#00D4AA",
    colorTrendDown: "#FF2348",
    colorTrendNeutral: "#8A8A8A",
    colorDemandHigh: "#00D4AA",
    colorDemandMedium: "#FFB347",
    colorDemandLow: "#8A8A8A",
    colorStatusOnline: "#00D4AA",
    colorStatusBusy: "#FFB347",
    colorStatusOffline: "#555555",
    colorHeat1: "#3b82f6",
    colorHeat2: "#22d3ee",
    colorHeat3: "#fbbf24",
    colorHeat4: "#f97316",
    colorHeat5: "#ef4444",
  },
  "emerald-forest": {
    name: "emerald-forest",
    label: "Emerald Forest",
    background: "#0A1611",
    foreground: "#F3FFF9",
    surface: "#162C22",
    surfaceHover: "#1D3629",
    border: "#244437",
    accent: "#00C875",
    accentHover: "#00A860",
    accentWarm: "#FBBF24",
    accentWarmHover: "#F59E0B",
    sidebar: "#040A08",
    muted: "#0E1C15",
    mutedFg: "#70917F",
    success: "#00C875",
    warning: "#FBBF24",
    danger: "#FF6B6B",
    glassBg: "rgba(22, 44, 34, 0.6)",
    glassBorder: "rgba(255, 255, 255, 0.06)",
    gradientStart: "#00C875",
    gradientMid: "#6EE7B7",
    gradientEnd: "#22D3EE",
    glowColor: "0, 200, 117",
    swatch: ["#0A1611", "#00C875", "#FBBF24"],
    surfaceBase: "#0A1611",
    surfaceRaised: "#162C22",
    surfaceElevated: "rgba(22, 44, 34, 0.85)",
    surfaceFloating: "rgba(29, 54, 41, 0.92)",
    surfaceRaisedBorder: "rgba(255, 255, 255, 0.06)",
    surfaceElevatedBorder: "rgba(255, 255, 255, 0.08)",
    surfaceFloatingBorder: "rgba(255, 255, 255, 0.1)",
    surfaceRaisedShadow: "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
    surfaceElevatedShadow: "0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)",
    surfaceFloatingShadow: "0 12px 40px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)",
    colorConfidenceHigh: "#00C875",
    colorConfidenceMedium: "#FBBF24",
    colorConfidenceLow: "#FF6B6B",
    colorTrendUp: "#00C875",
    colorTrendDown: "#FF6B6B",
    colorTrendNeutral: "#70917F",
    colorDemandHigh: "#00C875",
    colorDemandMedium: "#FBBF24",
    colorDemandLow: "#70917F",
    colorStatusOnline: "#00C875",
    colorStatusBusy: "#FBBF24",
    colorStatusOffline: "#555555",
    colorHeat1: "#3b82f6",
    colorHeat2: "#22d3ee",
    colorHeat3: "#fbbf24",
    colorHeat4: "#f97316",
    colorHeat5: "#ef4444",
  },
  "ocean-teal": {
    name: "ocean-teal",
    label: "Ocean Teal",
    background: "#081012",
    foreground: "#e8e8ed",
    surface: "#12201E",
    surfaceHover: "#182A28",
    border: "#1a2628",
    accent: "#14b8a6",
    accentHover: "#0d9488",
    accentWarm: "#8b5cf6",
    accentWarmHover: "#7c3aed",
    muted: "#0E181A",
    sidebar: "#030809",
    mutedFg: "#7a7a8f",
    success: "#22c55e",
    warning: "#eab308",
    danger: "#ef4444",
    glassBg: "rgba(18, 32, 30, 0.6)",
    glassBorder: "rgba(255, 255, 255, 0.06)",
    gradientStart: "#14b8a6",
    gradientMid: "#06b6d4",
    gradientEnd: "#8b5cf6",
    glowColor: "20, 184, 166",
    swatch: ["#081012", "#14b8a6", "#8b5cf6"],
    surfaceBase: "#081012",
    surfaceRaised: "#12201E",
    surfaceElevated: "rgba(18, 32, 30, 0.85)",
    surfaceFloating: "rgba(24, 42, 40, 0.92)",
    surfaceRaisedBorder: "rgba(255, 255, 255, 0.06)",
    surfaceElevatedBorder: "rgba(255, 255, 255, 0.08)",
    surfaceFloatingBorder: "rgba(255, 255, 255, 0.1)",
    surfaceRaisedShadow: "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
    surfaceElevatedShadow: "0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)",
    surfaceFloatingShadow: "0 12px 40px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)",
    colorConfidenceHigh: "#22c55e",
    colorConfidenceMedium: "#eab308",
    colorConfidenceLow: "#ef4444",
    colorTrendUp: "#22c55e",
    colorTrendDown: "#ef4444",
    colorTrendNeutral: "#7a7a8f",
    colorDemandHigh: "#22c55e",
    colorDemandMedium: "#eab308",
    colorDemandLow: "#7a7a8f",
    colorStatusOnline: "#22c55e",
    colorStatusBusy: "#eab308",
    colorStatusOffline: "#555555",
    colorHeat1: "#3b82f6",
    colorHeat2: "#22d3ee",
    colorHeat3: "#fbbf24",
    colorHeat4: "#f97316",
    colorHeat5: "#ef4444",
  },
  "obsidian-gold": {
    name: "obsidian-gold",
    label: "Obsidian Gold",
    background: "#080808",
    foreground: "#F8F5EE",
    surface: "#161616",
    surfaceHover: "#1E1E1E",
    border: "#2A2A2A",
    accent: "#D4AF37",
    accentHover: "#C49E2C",
    accentWarm: "#F8D67A",
    accentWarmHover: "#E6C15A",
    sidebar: "#030303",
    muted: "#0E0E0E",
    mutedFg: "#8D856C",
    success: "#00C896",
    warning: "#FFD700",
    danger: "#FF6B6B",
    glassBg: "rgba(22, 22, 22, 0.6)",
    glassBorder: "rgba(255, 255, 255, 0.06)",
    gradientStart: "#D4AF37",
    gradientMid: "#F8D67A",
    gradientEnd: "#FFD700",
    glowColor: "212, 175, 55",
    swatch: ["#080808", "#D4AF37", "#FFD700"],
    surfaceBase: "#080808",
    surfaceRaised: "#161616",
    surfaceElevated: "rgba(22, 22, 22, 0.85)",
    surfaceFloating: "rgba(30, 30, 30, 0.92)",
    surfaceRaisedBorder: "rgba(255, 255, 255, 0.06)",
    surfaceElevatedBorder: "rgba(255, 255, 255, 0.08)",
    surfaceFloatingBorder: "rgba(255, 255, 255, 0.1)",
    surfaceRaisedShadow: "0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
    surfaceElevatedShadow: "0 4px 16px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.2)",
    surfaceFloatingShadow: "0 12px 40px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(0, 0, 0, 0.3)",
    colorConfidenceHigh: "#00C896",
    colorConfidenceMedium: "#FFD700",
    colorConfidenceLow: "#FF6B6B",
    colorTrendUp: "#00C896",
    colorTrendDown: "#FF6B6B",
    colorTrendNeutral: "#8D856C",
    colorDemandHigh: "#00C896",
    colorDemandMedium: "#FFD700",
    colorDemandLow: "#8D856C",
    colorStatusOnline: "#00C896",
    colorStatusBusy: "#FFD700",
    colorStatusOffline: "#555555",
    colorHeat1: "#3b82f6",
    colorHeat2: "#22d3ee",
    colorHeat3: "#fbbf24",
    colorHeat4: "#f97316",
    colorHeat5: "#ef4444",
  },
  "arctic-white": {
    name: "arctic-white",
    label: "Arctic White",
    background: "#f8fafc",
    foreground: "#0f172a",
    surface: "#ffffff",
    surfaceHover: "#f1f5f9",
    border: "#e2e8f0",
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    accentWarm: "#ea580c",
    accentWarmHover: "#c2410c",
    sidebar: "#dfe5ed",
    muted: "#eef2f7",
    mutedFg: "#64748b",
    success: "#16a34a",
    warning: "#ca8a04",
    danger: "#dc2626",
    glassBg: "rgba(255, 255, 255, 0.7)",
    glassBorder: "rgba(0, 0, 0, 0.08)",
    gradientStart: "#2563eb",
    gradientMid: "#7c3aed",
    gradientEnd: "#ea580c",
    glowColor: "37, 99, 235",
    swatch: ["#f8fafc", "#2563eb", "#ea580c"],
    surfaceBase: "#f8fafc",
    surfaceRaised: "#ffffff",
    surfaceElevated: "rgba(255, 255, 255, 0.9)",
    surfaceFloating: "rgba(255, 255, 255, 0.95)",
    surfaceRaisedBorder: "rgba(0, 0, 0, 0.08)",
    surfaceElevatedBorder: "rgba(0, 0, 0, 0.1)",
    surfaceFloatingBorder: "rgba(0, 0, 0, 0.12)",
    surfaceRaisedShadow: "0 1px 3px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.06)",
    surfaceElevatedShadow: "0 4px 16px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)",
    surfaceFloatingShadow: "0 12px 40px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08)",
    colorConfidenceHigh: "#16a34a",
    colorConfidenceMedium: "#ca8a04",
    colorConfidenceLow: "#dc2626",
    colorTrendUp: "#16a34a",
    colorTrendDown: "#dc2626",
    colorTrendNeutral: "#64748b",
    colorDemandHigh: "#16a34a",
    colorDemandMedium: "#ca8a04",
    colorDemandLow: "#64748b",
    colorStatusOnline: "#16a34a",
    colorStatusBusy: "#ca8a04",
    colorStatusOffline: "#94a3b8",
    colorHeat1: "#3b82f6",
    colorHeat2: "#06b6d4",
    colorHeat3: "#eab308",
    colorHeat4: "#f97316",
    colorHeat5: "#dc2626",
  },
};

export const themeOrder = [
  "crimson-noir",
  "emerald-forest",
  "ocean-teal",
  "obsidian-gold",
  "arctic-white",
] as const;

export type ThemeName = (typeof themeOrder)[number];
