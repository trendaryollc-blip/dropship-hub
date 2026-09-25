import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DataUnavailable from "./DataUnavailable";

describe("DataUnavailable", () => {
  it("renders default title", () => {
    render(<DataUnavailable />);
    expect(screen.getByText("Data not available")).toBeInTheDocument();
  });

  it("renders reason and setup instructions", () => {
    render(
      <DataUnavailable
        reason="Search volume requires a live key"
        setup={{
          what: "SerpAPI key",
          whereToGet: "https://serpapi.com/manage/api-key",
          whereToSet: ".env.local → SERPAPI_KEYS",
          envVar: "SERPAPI_KEYS",
        }}
      />
    );
    expect(screen.getByText("Search volume requires a live key")).toBeInTheDocument();
    expect(screen.getByText("SerpAPI key")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "https://serpapi.com/manage/api-key" })
    ).toHaveAttribute("href", "https://serpapi.com/manage/api-key");
    expect(screen.getByText(/SERPAPI_KEYS/)).toBeInTheDocument();
  });

  it("calls onRetry when Retry is clicked", () => {
    const onRetry = vi.fn();
    render(<DataUnavailable onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("omits retry button when no handler", () => {
    render(<DataUnavailable />);
    expect(screen.queryByRole("button", { name: /retry/i })).not.toBeInTheDocument();
  });
});
