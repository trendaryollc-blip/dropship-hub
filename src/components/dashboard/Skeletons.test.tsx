import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import Skeleton, { KPISkeleton, TrendingSkeleton, IntelligenceSkeleton, NicheSkeleton, HeatmapSkeleton } from "./Skeletons";

describe("Skeletons", () => {
  it("Skeleton renders with default variant", () => {
    const { container } = render(<Skeleton />);
    const el = container.firstElementChild;
    expect(el).toHaveClass("animate-shimmer");
  });

  it("Skeleton supports circle variant", () => {
    const { container } = render(<Skeleton variant="circle" />);
    const el = container.firstElementChild;
    expect(el).toHaveClass("rounded-full");
  });

  it("KPISkeleton renders", () => {
    const { container } = render(<KPISkeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("TrendingSkeleton renders", () => {
    const { container } = render(<TrendingSkeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("IntelligenceSkeleton renders", () => {
    const { container } = render(<IntelligenceSkeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("NicheSkeleton renders", () => {
    const { container } = render(<NicheSkeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("HeatmapSkeleton renders", () => {
    const { container } = render(<HeatmapSkeleton />);
    expect(container.firstElementChild).toBeInTheDocument();
  });
});
