import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ViewToggle from "./ViewToggle";

describe("ViewToggle", () => {
  it("renders grid and list buttons", () => {
    const setViewMode = vi.fn();
    render(<ViewToggle viewMode="grid" setViewMode={setViewMode} />);
    expect(screen.getByLabelText("Grid view")).toBeInTheDocument();
    expect(screen.getByLabelText("List view")).toBeInTheDocument();
  });

  it("calls setViewMode on click", () => {
    const setViewMode = vi.fn();
    render(<ViewToggle viewMode="grid" setViewMode={setViewMode} />);
    fireEvent.click(screen.getByLabelText("List view"));
    expect(setViewMode).toHaveBeenCalledWith("list");
  });
});
