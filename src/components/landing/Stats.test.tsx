import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Stats from "./Stats";

describe("Stats", () => {
  it("renders stats section", () => {
    render(<Stats />);
    expect(screen.getByText(/Platforms Connected/i)).toBeInTheDocument();
  });
});
