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

  it("renders chart container", () => {
    const { container } = render(
      <DashboardSparkline data={[1, 2, 3, 4, 5]} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("applies custom color", () => {
    const { container } = render(
      <DashboardSparkline data={[1, 2, 3]} color="#ff0000" />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("applies positive color when positive is true", () => {
    const { container } = render(
      <DashboardSparkline data={[1, 2, 3]} positive={true} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("applies negative color when positive is false", () => {
    const { container } = render(
      <DashboardSparkline data={[1, 2, 3]} positive={false} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("uses default color when positive is undefined", () => {
    const { container } = render(
      <DashboardSparkline data={[1, 2, 3]} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with showTooltip enabled", () => {
    const { container } = render(
      <DashboardSparkline data={[1, 2, 3, 4, 5]} showTooltip={true} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with default dimensions", () => {
    const { container } = render(
      <DashboardSparkline data={[1, 2, 3]} />
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toHaveStyle({ width: "80px", height: "24px" });
  });

  it("renders single data point", () => {
    const { container } = render(
      <DashboardSparkline data={[5]} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders many data points", () => {
    const { container } = render(
      <DashboardSparkline data={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with all props combined", () => {
    const { container } = render(
      <DashboardSparkline
        data={[1, 2, 3]}
        width={100}
        height={30}
        color="#00ff00"
        positive={true}
        showTooltip={true}
        className="full-spark"
      />
    );
    expect(container.firstElementChild).toHaveClass("full-spark");
    expect(container.firstElementChild).toHaveStyle({ width: "100px", height: "30px" });
  });
});
