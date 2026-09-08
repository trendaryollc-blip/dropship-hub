export function getChartColors() {
  if (typeof window === "undefined") {
    return {
      accent: "#FF2348",
      success: "#00D4AA",
      warning: "#FFB347",
      danger: "#FF2348",
      muted: "#8A8A8A",
      border: "#341111",
      foreground: "#FAFAFA",
      surface: "#1a1a1a",
    };
  }

  const root = document.documentElement;
  const style = getComputedStyle(root);

  return {
    accent: style.getPropertyValue("--accent").trim() || "#FF2348",
    success: style.getPropertyValue("--success").trim() || "#00D4AA",
    warning: style.getPropertyValue("--warning").trim() || "#FFB347",
    danger: style.getPropertyValue("--danger").trim() || "#FF2348",
    muted: style.getPropertyValue("--muted-fg").trim() || "#8A8A8A",
    border: style.getPropertyValue("--border-color").trim() || "#341111",
    foreground: style.getPropertyValue("--foreground").trim() || "#FAFAFA",
    surface: style.getPropertyValue("--surface").trim() || "#1a1a1a",
  };
}

export const chartTooltipStyle = {
  contentStyle: {
    backgroundColor: "var(--surface-elevated, rgba(30,30,30,0.9))",
    border: "1px solid var(--surface-elevated-border, rgba(255,255,255,0.08))",
    borderRadius: "12px",
    fontSize: "12px",
    color: "var(--foreground, #FAFAFA)",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    backdropFilter: "blur(12px)",
  },
  cursor: { stroke: "var(--border-color, #341111)", strokeWidth: 1, strokeDasharray: "4 4" },
};
