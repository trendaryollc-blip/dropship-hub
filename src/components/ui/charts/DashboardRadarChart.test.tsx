import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardRadarChart from "./DashboardRadarChart";

describe("DashboardRadarChart", () => {
  const sampleData = [
    { axis: "Demand", value: 80 },
    { axis: "Profit", value: 70 },
    { axis: "Competition", value: 40 },
    { axis: "Trend", value: 90 },
    { axis: "Seasonality", value: 60 },
  ];

  it("renders a chart container", () => {
    const { container } = render(<DashboardRadarChart data={sampleData} />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("shows no data message when data is empty", () => {
    render(<DashboardRadarChart data={[]} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <DashboardRadarChart data={sampleData} className="my-radar" />
    );
    expect(container.firstElementChild).toHaveClass("my-radar");
  });
});
