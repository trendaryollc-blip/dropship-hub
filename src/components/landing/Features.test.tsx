import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Features from "./Features";

describe("Features", () => {
  it("renders features section", () => {
    render(<Features />);
    expect(screen.getByText(/Intelligence That/i)).toBeInTheDocument();
  });

  it("renders feature cards", () => {
    render(<Features />);
    const headings = screen.getAllByRole("heading");
    expect(headings.length).toBeGreaterThan(1);
  });
});
