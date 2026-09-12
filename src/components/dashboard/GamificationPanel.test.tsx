import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const mockUseAuth = vi.fn(() => ({ user: null }));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: (...args: any[]) => mockUseAuth(...args),
}));

vi.mock("@/components/ui/ScoreRing", () => ({
  default: ({ label }: { label: string }) => <div data-testid="score-ring">{label}</div>,
}));

import GamificationPanel from "./GamificationPanel";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: null });
  const store: Record<string, string> = {};
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { Object.keys(store).forEach((k) => delete store[k]); }),
  });
});

describe("GamificationPanel", () => {
  it("renders default state (no data)", () => {
    render(<GamificationPanel />);
    expect(screen.getByText("Progress")).toBeInTheDocument();
    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.getByText("0 XP")).toBeInTheDocument();
    expect(screen.getByText("0 day streak")).toBeInTheDocument();
    expect(screen.getByText(/100 XP to next level/)).toBeInTheDocument();
  });

  it("renders with full data", () => {
    const data = {
      xp: 350,
      level: 3,
      streak: 10,
      badges: [
        { name: "First Sale", earned: true, icon: "sale" },
        { name: "Top Seller", earned: true, icon: "top" },
      ],
    };
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(data));

    render(<GamificationPanel />);
    expect(screen.getByText("Level 3")).toBeInTheDocument();
    expect(screen.getByText("350 XP")).toBeInTheDocument();
    expect(screen.getByText("10 day streak")).toBeInTheDocument();
    expect(screen.getByText(/250 XP to next level/)).toBeInTheDocument();
    expect(screen.getByText("First Sale")).toBeInTheDocument();
    expect(screen.getByText("Top Seller")).toBeInTheDocument();
  });

  it("shows earned badges with Star icon", () => {
    const data = {
      xp: 100,
      level: 2,
      streak: 0,
      badges: [
        { name: "Early Adopter", earned: true, icon: "early" },
        { name: "Bronze Seller", earned: true, icon: "bronze" },
      ],
    };
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(data));

    render(<GamificationPanel />);
    expect(screen.getByText("Early Adopter")).toBeInTheDocument();
    expect(screen.getByText("Bronze Seller")).toBeInTheDocument();
  });

  it("shows XP progress", () => {
    const data = { xp: 50, level: 1, streak: 0, badges: [] };
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(data));

    render(<GamificationPanel />);
    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.getByText("50 XP")).toBeInTheDocument();
    expect(screen.getByText(/50 XP to next level/)).toBeInTheDocument();
  });

  it("shows level", () => {
    const data = { xp: 0, level: 5, streak: 0, badges: [] };
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(data));

    render(<GamificationPanel />);
    expect(screen.getByText("Level 5")).toBeInTheDocument();
    expect(screen.queryByText("Level 1")).not.toBeInTheDocument();
  });

  it("shows challenges completed", () => {
    const data = { xp: 200, level: 2, streak: 5, badges: [] };
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(data));

    render(<GamificationPanel />);
    expect(screen.getByText("200 XP")).toBeInTheDocument();
    expect(screen.getByText(/200 XP to next level/)).toBeInTheDocument();
  });

  it("shows streak", () => {
    render(<GamificationPanel />);
    expect(screen.getByText("0 day streak")).toBeInTheDocument();
  });

  it("shows streak with value from data", () => {
    const data = { xp: 10, level: 1, streak: 7, badges: [] };
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(data));

    render(<GamificationPanel />);
    expect(screen.getByText("7 day streak")).toBeInTheDocument();
  });

  it("hides unearned badges", () => {
    const data = {
      xp: 100,
      level: 2,
      streak: 0,
      badges: [
        { name: "Earned Badge", earned: true, icon: "e" },
        { name: "Locked Badge", earned: false, icon: "l" },
      ],
    };
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(data));

    render(<GamificationPanel />);
    expect(screen.getByText("Earned Badge")).toBeInTheDocument();
    expect(screen.queryByText("Locked Badge")).not.toBeInTheDocument();
  });

  it("renders empty badge container when all badges are unearned", () => {
    const data = {
      xp: 10,
      level: 1,
      streak: 0,
      badges: [
        { name: "Badge A", earned: false, icon: "a" },
        { name: "Badge B", earned: false, icon: "b" },
      ],
    };
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(data));

    render(<GamificationPanel />);
    expect(screen.queryByText("Badge A")).not.toBeInTheDocument();
    expect(screen.queryByText("Badge B")).not.toBeInTheDocument();
  });

  it("hides badge section entirely when no badges exist", () => {
    const data = { xp: 10, level: 1, streak: 0, badges: [] };
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(data));

    const { container } = render(<GamificationPanel />);
    expect(container.querySelector(".flex.gap-2.mt-3.flex-wrap")).not.toBeInTheDocument();
  });

  it("handles malformed localStorage data gracefully", () => {
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
    (localStorage.getItem as any).mockReturnValue("not-valid-json");

    render(<GamificationPanel />);
    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.getByText("0 XP")).toBeInTheDocument();
  });

  it("renders ScoreRing with correct level label", () => {
    render(<GamificationPanel />);
    expect(screen.getByTestId("score-ring")).toHaveTextContent("Lv.1");
  });

  it("calculates xpProgress correctly for level-up boundary", () => {
    const data = { xp: 100, level: 1, streak: 0, badges: [] };
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(data));

    render(<GamificationPanel />);
    expect(screen.getByText(/100 XP to next level/)).toBeInTheDocument();
    expect(screen.getByTestId("score-ring")).toHaveTextContent("Lv.1");
  });

  it("does not read localStorage when user is null", () => {
    render(<GamificationPanel />);
    expect(localStorage.getItem).not.toHaveBeenCalled();
    expect(screen.getByText("Level 1")).toBeInTheDocument();
  });

  it("renders XP progress bar with correct width style", () => {
    const data = { xp: 75, level: 1, streak: 0, badges: [] };
    mockUseAuth.mockReturnValue({ user: { uid: "test-uid" } });
    (localStorage.getItem as any).mockReturnValue(JSON.stringify(data));

    const { container } = render(<GamificationPanel />);
    const bar = container.querySelector(".bg-gradient-to-r");
    expect(bar).toHaveStyle({ width: "75%" });
  });
});
