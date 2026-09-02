import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn(() => ({
    data: {
      stats: { totalXP: 1250, level: 3, currentXP: 250, nextLevelXP: 500, streak: 5 },
      completed: 2,
      total: 5,
    },
    isLoading: false,
    error: null,
  })),
}));

import DailyMission from "./DailyMission";

describe("DailyMission", () => {
  it("renders Daily Mission heading", () => {
    render(<DailyMission />);
    expect(screen.getByText("Daily Mission")).toBeInTheDocument();
  });

  it("renders streak count", () => {
    render(<DailyMission />);
    expect(screen.getByText("5d")).toBeInTheDocument();
  });

  it("renders level and XP", () => {
    render(<DailyMission />);
    expect(screen.getByText("Lv.3 · 1,250 XP")).toBeInTheDocument();
  });

  it("renders mission progress text", () => {
    render(<DailyMission />);
    expect(screen.getByText("2/5 AI missions completed today")).toBeInTheDocument();
  });

  it("renders Continue button", () => {
    render(<DailyMission />);
    expect(screen.getByText("Continue")).toBeInTheDocument();
  });

  it("renders Missions label", () => {
    render(<DailyMission />);
    expect(screen.getByText("Missions")).toBeInTheDocument();
  });
});
