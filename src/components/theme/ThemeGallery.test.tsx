import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeGallery from "./ThemeGallery";

vi.mock("./ThemeProvider", () => ({
  useTheme: () => ({
    theme: "crimson-noir",
    setTheme: vi.fn(),
    previewTheme: vi.fn(),
    restoreTheme: vi.fn(),
  }),
}));

vi.mock("@/lib/themes", () => ({
  themes: {
    "crimson-noir": { name: "crimson-noir", label: "Crimson Noir", background: "#000", foreground: "#fff", surface: "#111", surfaceHover: "#222", border: "#333", accent: "#e11d48", accentHover: "#be123c", accentWarm: "#f97316", accentWarmHover: "#ea580c", sidebar: "#0a0a0a", muted: "#666", mutedFg: "#999", success: "#22c55e", warning: "#f59e0b", danger: "#ef4444", glassBg: "rgba(0,0,0,0.5)", glassBorder: "rgba(255,255,255,0.1)", gradientStart: "#e11d48", gradientMid: "#be123c", gradientEnd: "#9f1239", glowColor: "#e11d48", swatch: ["#e11d48", "#000", "#fff"] },
    "ember-glow": { name: "ember-glow", label: "Ember Glow", background: "#1a0a00", foreground: "#fff", surface: "#2a1a0a", surfaceHover: "#3a2a1a", border: "#4a3a2a", accent: "#f97316", accentHover: "#ea580c", accentWarm: "#f59e0b", accentWarmHover: "#d97706", sidebar: "#1a0a00", muted: "#888", mutedFg: "#aaa", success: "#22c55e", warning: "#f59e0b", danger: "#ef4444", glassBg: "rgba(26,10,0,0.5)", glassBorder: "rgba(255,255,255,0.1)", gradientStart: "#f97316", gradientMid: "#ea580c", gradientEnd: "#c2410c", glowColor: "#f97316", swatch: ["#f97316", "#1a0a00", "#fff"] },
  },
  themeOrder: ["crimson-noir", "ember-glow"],
}));

vi.mock("lucide-react", () => ({
  Palette: () => <div />,
  Check: () => <div />,
  Sparkles: () => <div />,
}));

describe("ThemeGallery", () => {
  it("renders trigger button", () => {
    render(<ThemeGallery />);
    expect(screen.getByLabelText("Open theme gallery")).toBeDefined();
  });

  it("opens gallery on click", () => {
    render(<ThemeGallery />);
    fireEvent.click(screen.getByLabelText("Open theme gallery"));
    expect(screen.getByText("Choose Theme")).toBeDefined();
  });

  it("renders theme grid", () => {
    render(<ThemeGallery />);
    fireEvent.click(screen.getByLabelText("Open theme gallery"));
    expect(screen.getByText("Crimson Noir")).toBeDefined();
    expect(screen.getByText("Ember Glow")).toBeDefined();
  });

  it("select theme", () => {
    render(<ThemeGallery />);
    fireEvent.click(screen.getByLabelText("Open theme gallery"));
    fireEvent.click(screen.getByText("Ember Glow"));
  });
});
