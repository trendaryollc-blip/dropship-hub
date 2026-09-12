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

  it("renders chart container when data present", () => {
    const { container } = render(<DashboardRadarChart data={sampleData} />);
    expect(container.firstElementChild).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveTextContent("No data available");
  });

  it("renders with custom color", () => {
    const { container } = render(
      <DashboardRadarChart data={sampleData} color="#ff0000" />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with custom height", () => {
    const { container } = render(
      <DashboardRadarChart data={sampleData} height={300} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders without grid when showGrid is false", () => {
    const { container } = render(
      <DashboardRadarChart data={sampleData} showGrid={false} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders without tooltip when showTooltip is false", () => {
    const { container } = render(
      <DashboardRadarChart data={sampleData} showTooltip={false} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("applies custom maxValue", () => {
    const { container } = render(
      <DashboardRadarChart data={sampleData} maxValue={200} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with all props combined", () => {
    const { container } = render(
      <DashboardRadarChart
        data={sampleData}
        color="#ff0000"
        height={250}
        showGrid={true}
        showTooltip={true}
        maxValue={150}
        className="full-radar"
      />
    );
    expect(container.firstElementChild).toHaveClass("full-radar");
  });

  it("renders single axis data", () => {
    const singleData = [{ axis: "Demand", value: 80 }];
    const { container } = render(<DashboardRadarChart data={singleData} />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders empty state with custom height", () => {
    render(<DashboardRadarChart data={[]} height={300} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });
});
