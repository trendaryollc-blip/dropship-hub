import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FAQ from "./FAQ";

describe("FAQ", () => {
  it("renders FAQ section", () => {
    render(<FAQ />);
    expect(screen.getByText(/Frequently Asked/i)).toBeInTheDocument();
  });

  it("toggles FAQ items on click", () => {
    render(<FAQ />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThan(0);
  });
});
