import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuotaExhausted from "./QuotaExhausted";

describe("QuotaExhausted", () => {
  it("renders provider name and key count", () => {
    render(<QuotaExhausted provider="SerpAPI" keyCount={4} />);
    expect(screen.getByText("SerpAPI quota exhausted")).toBeInTheDocument();
    expect(screen.getByText(/All 4 keys/)).toBeInTheDocument();
  });

  it("shows reset time when provided", () => {
    const resetsAt = new Date("2030-01-15T10:30:00Z");
    render(<QuotaExhausted provider="SerpAPI" resetsAt={resetsAt} />);
    expect(screen.getByText(/Resets around/)).toBeInTheDocument();
  });

  it("states that no fallback numbers are shown", () => {
    render(<QuotaExhausted provider="SerpAPI" />);
    expect(
      screen.getByText(/No fallback numbers are shown/)
    ).toBeInTheDocument();
  });

  it("calls onRetry", () => {
    const onRetry = vi.fn();
    render(<QuotaExhausted provider="SerpAPI" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
