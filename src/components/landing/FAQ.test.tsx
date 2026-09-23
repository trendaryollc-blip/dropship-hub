import { describe, it, expect } from "vitest";
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

    const first = buttons[0];
    expect(first).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(first);
    expect(first).toHaveAttribute("aria-expanded", "false");
  });

  it("hides collapsed panels from assistive tech", () => {
    render(<FAQ />);
    const panels = document.querySelectorAll('[id^="faq-panel-"]');
    expect(panels.length).toBeGreaterThan(0);
    panels.forEach((panel) => {
      expect(panel).toHaveAttribute("aria-hidden", "true");
    });
  });
});
