import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import InsightsPanel from "./InsightsPanel";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("lucide-react", () => ({
  Lightbulb: () => <div data-testid="lightbulb" />,
  Check: () => <div data-testid="check" />,
  Copy: () => <div data-testid="copy" />,
}));

const mockInsights = [
  "Prices are trending downward this week",
  "High demand detected in the $15-$25 range",
  "Low competition opportunity in premium segment",
];

describe("InsightsPanel", () => {
  it("renders insights heading", () => {
    render(<InsightsPanel insights={mockInsights} />);
    expect(screen.getByText("Market Insights")).toBeInTheDocument();
    expect(screen.getByText("AI Generated")).toBeInTheDocument();
  });

  it("renders all insight items with numbers", () => {
    render(<InsightsPanel insights={mockInsights} />);
    expect(screen.getByText("Prices are trending downward this week")).toBeInTheDocument();
    expect(screen.getByText("High demand detected in the $15-$25 range")).toBeInTheDocument();
    expect(screen.getByText("Low competition opportunity in premium segment")).toBeInTheDocument();
  });

  it("displays numbered badges for each insight", () => {
    render(<InsightsPanel insights={mockInsights} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("shows copy icon for each insight", () => {
    render(<InsightsPanel insights={mockInsights} />);
    const copyIcons = screen.getAllByTestId("copy");
    expect(copyIcons).toHaveLength(3);
  });

  it("copies text to clipboard on click and shows check icon", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    render(<InsightsPanel insights={mockInsights} />);
    fireEvent.click(screen.getByText("Prices are trending downward this week"));
    expect(writeText).toHaveBeenCalledWith("Prices are trending downward this week");
    expect(screen.getByTestId("check")).toBeInTheDocument();
  });
});
