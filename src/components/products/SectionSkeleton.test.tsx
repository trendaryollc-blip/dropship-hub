import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import SectionSkeleton from "./SectionSkeleton";

describe("SectionSkeleton", () => {
  it("renders default 3 rows", () => {
    const { container } = render(<SectionSkeleton />);
    const rows = container.querySelectorAll(".space-y-2");
    expect(rows).toHaveLength(3);
  });

  it("renders custom row count", () => {
    const { container } = render(<SectionSkeleton rows={5} />);
    const rows = container.querySelectorAll(".space-y-2");
    expect(rows).toHaveLength(5);
  });

  it("has animate-pulse elements", () => {
    const { container } = render(<SectionSkeleton />);
    const pulseElements = container.querySelectorAll(".animate-pulse");
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it("renders header skeleton", () => {
    const { container } = render(<SectionSkeleton />);
    const headerSquare = container.querySelector(".h-9.w-9.rounded-xl");
    expect(headerSquare).toBeTruthy();
  });
});
