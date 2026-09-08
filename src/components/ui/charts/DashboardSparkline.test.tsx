import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import DashboardSparkline from "./DashboardSparkline";

describe("DashboardSparkline", () => {
  it("renders a chart container when data is provided", () => {
    const { container } = render(
      <DashboardSparkline data={[1, 2, 3, 4, 5]} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("returns null for empty data", () => {
    const { container } = render(<DashboardSparkline data={[]} />);
    expect(container.firstElementChild).toBeNull();
  });

  it("applies custom dimensions", () => {
    const { container } = render(
      <DashboardSparkline data={[1, 2, 3]} width={120} height={40} />
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveStyle({ width: "120px", height: "40px" });
  });

  it("applies custom className", () => {
    const { container } = render(
      <DashboardSparkline data={[1, 2, 3]} className="my-spark" />
    );
    expect(container.firstElementChild).toHaveClass("my-spark");
  });
});
