import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import DynamicSuggestions from "./DynamicSuggestions";

vi.mock("lucide-react", () => ({
  Search: (props: any) => <div data-testid="icon-search" {...props} />,
  TrendingUp: (props: any) => <div data-testid="icon-trending" {...props} />,
  Clock: (props: any) => <div data-testid="icon-clock" {...props} />,
  Tag: (props: any) => <div data-testid="icon-tag" {...props} />,
  Loader2: (props: any) => <div data-testid="icon-loader" {...props} />,
}));

const mockSuggestions = [
  { text: "wireless earbuds", category: "trending" },
  { text: "wireless charger", category: "category", categoryLabel: "electronics" },
];

describe("DynamicSuggestions", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ suggestions: mockSuggestions }),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders nothing when not open", () => {
    const { container } = render(<DynamicSuggestions onSelect={vi.fn()} currentValue="" />);
    expect(container.querySelector("[data-testid='dynamic-suggestions']")).toBeNull();
  });

  it("fetches suggestions on input change after debounce", async () => {
    render(<DynamicSuggestions onSelect={vi.fn()} currentValue="wire" />);

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/search/suggestions?q=wire")
    );
  });

  it("shows no suggestions message for short queries", async () => {
    render(<DynamicSuggestions onSelect={vi.fn()} currentValue="a" />);

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.queryByTestId("dynamic-suggestions")).toBeNull();
  });

  it("calls onSelect when suggestion clicked", async () => {
    const onSelect = vi.fn();
    render(<DynamicSuggestions onSelect={onSelect} currentValue="wire" />);

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    fireEvent.click(screen.getByText("wireless earbuds"));
    expect(onSelect).toHaveBeenCalledWith("wireless earbuds");
  });

  it("groups suggestions by category", async () => {
    render(<DynamicSuggestions onSelect={vi.fn()} currentValue="wire" />);

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByText("Trending")).toBeInTheDocument();
    expect(screen.getByText("Categories")).toBeInTheDocument();
  });

  it("closes on escape key", async () => {
    render(<DynamicSuggestions onSelect={vi.fn()} currentValue="wire" />);

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    const container = screen.getByTestId("dynamic-suggestions").parentElement!;
    fireEvent.keyDown(container, { key: "Escape" });

    await act(async () => {});
  });

  it("handles empty suggestions response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ suggestions: [] }),
    });

    render(<DynamicSuggestions onSelect={vi.fn()} currentValue="xyz123" />);

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByText("No suggestions found")).toBeInTheDocument();
  });

  it("handles fetch failure", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));

    render(<DynamicSuggestions onSelect={vi.fn()} currentValue="wire" />);

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(screen.getByText("No suggestions found")).toBeInTheDocument();
  });

  it("does not fetch for empty currentValue", async () => {
    render(<DynamicSuggestions onSelect={vi.fn()} currentValue="" />);

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("debounces rapid input changes", async () => {
    const { rerender } = render(<DynamicSuggestions onSelect={vi.fn()} currentValue="a" />);

    rerender(<DynamicSuggestions onSelect={vi.fn()} currentValue="ab" />);
    rerender(<DynamicSuggestions onSelect={vi.fn()} currentValue="abc" />);

    await act(async () => {
      vi.advanceTimersByTime(350);
    });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("abc")
    );
  });
});
