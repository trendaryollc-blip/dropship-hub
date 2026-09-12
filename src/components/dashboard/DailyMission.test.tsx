import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn(),
}));

import DailyMission from "./DailyMission";
import { useAPI } from "@/hooks/useAPI";

const mockUseAPI = vi.mocked(useAPI);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("DailyMission", () => {
  it("renders default state when no data", () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false, error: null });
    render(<DailyMission />);
    expect(screen.getByText("Daily Mission")).toBeInTheDocument();
    expect(screen.getByText("Lv.1 · 0 XP")).toBeInTheDocument();
    expect(screen.getByText("Generate today's AI missions to get started")).toBeInTheDocument();
    expect(screen.getByText("0d")).toBeInTheDocument();
  });

  it("renders with mission data", () => {
    mockUseAPI.mockReturnValue({
      data: {
        stats: { totalXP: 1250, level: 3, currentXP: 250, nextLevelXP: 500, streak: 5 },
        completed: 2,
        total: 5,
      },
      isLoading: false,
      error: null,
    });
    render(<DailyMission />);
    expect(screen.getByText("Daily Mission")).toBeInTheDocument();
    expect(screen.getByText("Lv.3 · 1,250 XP")).toBeInTheDocument();
    expect(screen.getByText("2/5 AI missions completed today")).toBeInTheDocument();
  });

  it("shows streak count", () => {
    mockUseAPI.mockReturnValue({
      data: {
        stats: { totalXP: 500, level: 2, currentXP: 100, nextLevelXP: 300, streak: 7 },
        completed: 1,
        total: 3,
      },
      isLoading: false,
      error: null,
    });
    render(<DailyMission />);
    expect(screen.getByText("7d")).toBeInTheDocument();
  });

  it("shows XP and level", () => {
    mockUseAPI.mockReturnValue({
      data: {
        stats: { totalXP: 3200, level: 5, currentXP: 200, nextLevelXP: 400, streak: 12 },
        completed: 4,
        total: 4,
      },
      isLoading: false,
      error: null,
    });
    render(<DailyMission />);
    expect(screen.getByText("Lv.5 · 3,200 XP")).toBeInTheDocument();
  });

  it("shows missions progress", () => {
    mockUseAPI.mockReturnValue({
      data: {
        stats: { totalXP: 800, level: 2, currentXP: 150, nextLevelXP: 400, streak: 3 },
        completed: 3,
        total: 5,
      },
      isLoading: false,
      error: null,
    });
    render(<DailyMission />);
    expect(screen.getByText("3/5 AI missions completed today")).toBeInTheDocument();
    expect(screen.getByText("Missions")).toBeInTheDocument();
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("shows Continue link to /missions", () => {
    mockUseAPI.mockReturnValue({ data: undefined, isLoading: false, error: null });
    render(<DailyMission />);
    const continueLink = screen.getByText("Continue").closest("a");
    expect(continueLink).toHaveAttribute("href", "/missions");
  });

  it("shows 'Generate today's AI missions' when 0 total", () => {
    mockUseAPI.mockReturnValue({
      data: {
        stats: { totalXP: 0, level: 1, currentXP: 0, nextLevelXP: 500, streak: 0 },
        completed: 0,
        total: 0,
      },
      isLoading: false,
      error: null,
    });
    render(<DailyMission />);
    expect(screen.getByText("Generate today's AI missions to get started")).toBeInTheDocument();
    expect(screen.queryByText(/\d+\/\d+ AI missions completed today/)).not.toBeInTheDocument();
  });

  it("shows completion ratio when missions exist", () => {
    mockUseAPI.mockReturnValue({
      data: {
        stats: { totalXP: 600, level: 2, currentXP: 100, nextLevelXP: 300, streak: 4 },
        completed: 3,
        total: 4,
      },
      isLoading: false,
      error: null,
    });
    render(<DailyMission />);
    expect(screen.getByText("3/4 AI missions completed today")).toBeInTheDocument();
    expect(screen.getByText("3/4")).toBeInTheDocument();
  });
});
