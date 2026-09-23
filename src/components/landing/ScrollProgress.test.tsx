import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import ScrollProgress from "./ScrollProgress";

describe("ScrollProgress", () => {
  it("renders without crashing", () => {
    const { container } = render(<ScrollProgress />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("has fixed positioning", () => {
    const { container } = render(<ScrollProgress />);
    const bar = container.firstChild as HTMLElement;
    expect(bar.className).toContain("fixed");
  });

  it("renders progress bar", () => {
    const { container } = render(<ScrollProgress />);
    const innerBar = container.querySelector(".bg-gradient-to-r");
    expect(innerBar).toBeInTheDocument();
  });

  it("exposes progressbar role with values", () => {
    const { container } = render(<ScrollProgress />);
    const bar = container.firstChild as HTMLElement;
    expect(bar).toHaveAttribute("role", "progressbar");
    expect(bar).toHaveAttribute("aria-valuemin", "0");
    expect(bar).toHaveAttribute("aria-valuemax", "100");
  });
});
