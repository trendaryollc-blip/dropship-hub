import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import GoalsTracker from "./GoalsTracker";

const mockSafeFetch = vi.fn();
vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: (...args: any[]) => mockSafeFetch(...args),
}));

describe("GoalsTracker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title and Track button", () => {
    render(<GoalsTracker uid="user-1" />);
    expect(screen.getByText("Goals Tracker")).toBeInTheDocument();
    expect(screen.getByText("Track")).toBeInTheDocument();
  });

  it("renders description initially", () => {
    render(<GoalsTracker uid="user-1" />);
    expect(screen.getByText(/Set business goals/)).toBeInTheDocument();
  });

  it("shows loading state when Track clicked", async () => {
    mockSafeFetch.mockReturnValue(new Promise(() => {}));
    render(<GoalsTracker uid="user-1" />);
    fireEvent.click(screen.getByText("Track"));
    await waitFor(() => {
      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays goals after loading", async () => {
    mockSafeFetch.mockResolvedValue({
      goals: [
        { id: "g1", title: "Revenue Target", target: 10000, current: 7500, unit: "$", category: "revenue", deadline: "2025-02-01", progress: 75, status: "on-track", aiInsight: "Good progress" },
      ],
      summary: { totalGoals: 1, achieved: 0, onTrack: 1, behind: 0, overallProgress: 75 },
      suggestions: [],
    });
    render(<GoalsTracker uid="user-1" />);
    fireEvent.click(screen.getByText("Track"));
    await waitFor(() => expect(screen.getByText("Revenue Target")).toBeInTheDocument());
  });

  it("displays suggestions", async () => {
    mockSafeFetch.mockResolvedValue({
      goals: [],
      summary: { totalGoals: 0, achieved: 0, onTrack: 0, behind: 0, overallProgress: 0 },
      suggestions: ["Focus on high-margin products"],
    });
    render(<GoalsTracker uid="user-1" />);
    fireEvent.click(screen.getByText("Track"));
    await waitFor(() => expect(screen.getByText("Focus on high-margin products")).toBeInTheDocument());
  });
});
