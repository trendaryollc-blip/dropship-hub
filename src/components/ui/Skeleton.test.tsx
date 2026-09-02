import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Skeleton, ProductCardSkeleton, KPICardSkeleton, TableRowSkeleton, TableSkeleton, DashboardWidgetSkeleton, ChartSkeleton, ListItemSkeleton, SettingsSkeleton } from "./Skeleton";

describe("Skeleton components", () => {
  it("Skeleton renders with animate-pulse", () => {
    const { container } = render(<Skeleton className="test" />);
    expect(container.firstChild).toHaveClass("animate-pulse");
  });

  it("ProductCardSkeleton renders", () => {
    const { container } = render(<ProductCardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("KPICardSkeleton renders", () => {
    const { container } = render(<KPICardSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("TableRowSkeleton renders with default cols", () => {
    const { container } = render(<TableRowSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("TableSkeleton renders rows", () => {
    const { container } = render(<TableSkeleton rows={3} cols={4} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("DashboardWidgetSkeleton renders", () => {
    const { container } = render(<DashboardWidgetSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("ChartSkeleton renders with height", () => {
    const { container } = render(<ChartSkeleton height={300} />);
    expect(container.firstChild).toBeTruthy();
  });

  it("ListItemSkeleton renders", () => {
    const { container } = render(<ListItemSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  it("SettingsSkeleton renders", () => {
    const { container } = render(<SettingsSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });
});
