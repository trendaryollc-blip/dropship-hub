import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DemoBadge from "./DemoBadge";

describe("DemoBadge", () => {
  it("renders demo badge text", () => {
    render(<DemoBadge />);
    expect(screen.getByText("Demo Data")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<DemoBadge className="test-class" />);
    expect(container.firstChild).toHaveClass("test-class");
  });
});
