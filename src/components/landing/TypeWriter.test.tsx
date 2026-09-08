import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TypeWriter from "./TypeWriter";

describe("TypeWriter", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders cursor", () => {
    const { container } = render(<TypeWriter words={["Hello"]} />);
    const cursor = container.querySelector(".animate-pulse");
    expect(cursor).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<TypeWriter words={["Hello"]} className="text-xl" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain("text-xl");
  });

  it("renders with empty initial text", () => {
    const { container } = render(<TypeWriter words={["Hello World"]} />);
    const textSpan = container.querySelector(".transition-opacity");
    expect(textSpan).toBeInTheDocument();
  });
});
