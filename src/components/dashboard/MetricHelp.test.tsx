import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MetricHelp } from "./MetricHelp";

vi.mock("lucide-react", () => ({ Info: () => null }));

describe("MetricHelp", () => {
  it("renders a help button with an accessible label", () => {
    render(<MetricHelp label="profit margin" text="Profit divided by revenue." />);
    expect(
      screen.getByRole("button", { name: /what is profit margin/i })
    ).toBeInTheDocument();
  });

  it("shows the tooltip on focus", () => {
    render(<MetricHelp label="profit margin" text="Profit divided by revenue." />);
    fireEvent.focus(screen.getByRole("button", { name: /what is profit margin/i }));
    expect(screen.getByRole("tooltip")).toHaveTextContent("Profit divided by revenue.");
  });

  it("toggles the tooltip on click", () => {
    render(<MetricHelp label="profit margin" text="Profit divided by revenue." />);
    const btn = screen.getByRole("button", { name: /what is profit margin/i });
    fireEvent.click(btn);
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
    fireEvent.click(btn);
    expect(screen.queryByRole("tooltip")).toBeNull();
  });
});
