import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { badgeConfig, dataSourceConfig, ScoreRing } from "./supplier-shared";

describe("ScoreRing", () => {
  it("renders with correct size", () => {
    const { container } = render(<ScoreRing score={85} size={48} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: "48px", height: "48px" });
  });

  it("renders score number inside", () => {
    render(<ScoreRing score={92} />);
    expect(screen.getByText("92")).toBeInTheDocument();
  });

  it("renders default size of 36", () => {
    const { container } = render(<ScoreRing score={75} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: "36px", height: "36px" });
  });

  it("renders SVG with two circles", () => {
    const { container } = render(<ScoreRing score={80} />);
    expect(container.querySelectorAll("circle")).toHaveLength(2);
  });

  it("renders green color for score >= 90", () => {
    const { container } = render(<ScoreRing score={95} />);
    const circles = container.querySelectorAll("circle");
    const progressCircle = circles[1];
    expect(progressCircle).toHaveAttribute("stroke", "#22c55e");
  });

  it("renders green color for score exactly 90", () => {
    const { container } = render(<ScoreRing score={90} />);
    const circles = container.querySelectorAll("circle");
    const progressCircle = circles[1];
    expect(progressCircle).toHaveAttribute("stroke", "#22c55e");
  });

  it("renders blue color for score >= 75", () => {
    const { container } = render(<ScoreRing score={80} />);
    const circles = container.querySelectorAll("circle");
    const progressCircle = circles[1];
    expect(progressCircle).toHaveAttribute("stroke", "#3b82f6");
  });

  it("renders blue color for score exactly 75", () => {
    const { container } = render(<ScoreRing score={75} />);
    const circles = container.querySelectorAll("circle");
    const progressCircle = circles[1];
    expect(progressCircle).toHaveAttribute("stroke", "#3b82f6");
  });

  it("renders amber color for score < 75", () => {
    const { container } = render(<ScoreRing score={50} />);
    const circles = container.querySelectorAll("circle");
    const progressCircle = circles[1];
    expect(progressCircle).toHaveAttribute("stroke", "#f59e0b");
  });

  it("renders score 0", () => {
    render(<ScoreRing score={0} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("renders score 100", () => {
    render(<ScoreRing score={100} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("renders with custom size", () => {
    const { container } = render(<ScoreRing score={60} size={64} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveStyle({ width: "64px", height: "64px" });
  });

  it("background circle has correct stroke", () => {
    const { container } = render(<ScoreRing score={80} />);
    const circles = container.querySelectorAll("circle");
    const bgCircle = circles[0];
    expect(bgCircle).toHaveAttribute("stroke", "rgba(255,255,255,0.06)");
  });
});

describe("badgeConfig", () => {
  it("has gold badge with correct label", () => {
    expect(badgeConfig.gold.label).toBe("Gold");
  });

  it("has silver badge with correct label", () => {
    expect(badgeConfig.silver.label).toBe("Silver");
  });

  it("has bronze badge with correct label", () => {
    expect(badgeConfig.bronze.label).toBe("Bronze");
  });

  it("gold badge has amber color", () => {
    expect(badgeConfig.gold.color).toContain("amber");
  });

  it("silver badge has slate color", () => {
    expect(badgeConfig.silver.color).toContain("slate");
  });

  it("bronze badge has orange color", () => {
    expect(badgeConfig.bronze.color).toContain("orange");
  });

  it("all badges have border property", () => {
    expect(badgeConfig.gold.border).toBeDefined();
    expect(badgeConfig.silver.border).toBeDefined();
    expect(badgeConfig.bronze.border).toBeDefined();
  });

  it("all badges have glow property", () => {
    expect(badgeConfig.gold.glow).toBeDefined();
    expect(badgeConfig.silver.glow).toBeDefined();
    expect(badgeConfig.bronze.glow).toBeDefined();
  });

  it("all three badges exist", () => {
    expect(Object.keys(badgeConfig)).toHaveLength(3);
  });
});

describe("dataSourceConfig", () => {
  it("has live data config", () => {
    expect(dataSourceConfig.live.label).toBe("LIVE DATA");
    expect(dataSourceConfig.live.description).toBe("Real-time data from API");
  });

  it("has estimated data config", () => {
    expect(dataSourceConfig.estimated.label).toBe("ESTIMATED");
    expect(dataSourceConfig.estimated.description).toBe("Based on public information");
  });

  it("live data has emerald color", () => {
    expect(dataSourceConfig.live.color).toContain("emerald");
  });

  it("estimated data has amber color", () => {
    expect(dataSourceConfig.estimated.color).toContain("amber");
  });

  it("only has live and estimated configs", () => {
    expect(Object.keys(dataSourceConfig)).toHaveLength(2);
  });

  it("live config has required fields", () => {
    expect(dataSourceConfig.live).toHaveProperty("label");
    expect(dataSourceConfig.live).toHaveProperty("color");
    expect(dataSourceConfig.live).toHaveProperty("description");
  });

  it("estimated config has required fields", () => {
    expect(dataSourceConfig.estimated).toHaveProperty("label");
    expect(dataSourceConfig.estimated).toHaveProperty("color");
    expect(dataSourceConfig.estimated).toHaveProperty("description");
  });
});
