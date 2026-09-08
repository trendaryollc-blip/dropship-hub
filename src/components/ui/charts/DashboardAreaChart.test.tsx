import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardAreaChart from "./DashboardAreaChart";

describe("DashboardAreaChart", () => {
  const sampleData = [
    { date: "2024-01-01", value: 100 },
    { date: "2024-01-02", value: 150 },
    { date: "2024-01-03", value: 120 },
  ];

  it("renders a chart container", () => {
    const { container } = render(<DashboardAreaChart data={sampleData} />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("shows no data message when data is empty", () => {
    render(<DashboardAreaChart data={[]} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("applies custom height", () => {
    const { container } = render(
      <DashboardAreaChart data={sampleData} height={300} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <DashboardAreaChart data={sampleData} className="my-chart" />
    );
    expect(container.firstElementChild).toHaveClass("my-chart");
  });
});
