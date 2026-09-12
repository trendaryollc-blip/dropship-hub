import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardBarChart from "./DashboardBarChart";

describe("DashboardBarChart", () => {
  const sampleData = [
    { label: "Category A", value: 100 },
    { label: "Category B", value: 200 },
    { label: "Category C", value: 150 },
  ];

  it("renders a chart container", () => {
    const { container } = render(<DashboardBarChart data={sampleData} />);
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("shows no data message when data is empty", () => {
    render(<DashboardBarChart data={[]} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(
      <DashboardBarChart data={sampleData} className="my-bars" />
    );
    expect(container.firstElementChild).toHaveClass("my-bars");
  });

  it("renders chart container when data present", () => {
    const { container } = render(<DashboardBarChart data={sampleData} />);
    expect(container.firstElementChild).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveTextContent("No data available");
  });

  it("renders with custom color", () => {
    const { container } = render(
      <DashboardBarChart data={sampleData} color="#ff0000" />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with custom height", () => {
    const { container } = render(
      <DashboardBarChart data={sampleData} height={200} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders without grid when showGrid is false", () => {
    const { container } = render(
      <DashboardBarChart data={sampleData} showGrid={false} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders without tooltip when showTooltip is false", () => {
    const { container } = render(
      <DashboardBarChart data={sampleData} showTooltip={false} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders without axes when showAxis is false", () => {
    const { container } = render(
      <DashboardBarChart data={sampleData} showAxis={false} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with vertical layout", () => {
    const { container } = render(
      <DashboardBarChart data={sampleData} layout="vertical" />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with horizontal layout", () => {
    const { container } = render(
      <DashboardBarChart data={sampleData} layout="horizontal" />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with per-bar custom colors", () => {
    const dataWithColors = [
      { label: "A", value: 100, color: "#ff0000" },
      { label: "B", value: 200, color: "#00ff00" },
      { label: "C", value: 150 },
    ];
    const { container } = render(
      <DashboardBarChart data={dataWithColors} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders empty state with custom height", () => {
    render(<DashboardBarChart data={[]} height={200} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("renders with all props combined", () => {
    const { container } = render(
      <DashboardBarChart
        data={sampleData}
        color="#ff0000"
        height={200}
        showGrid={true}
        showTooltip={true}
        showAxis={true}
        layout="horizontal"
        className="full-test"
      />
    );
    expect(container.firstElementChild).toHaveClass("full-test");
  });

  it("renders single data point", () => {
    const singleData = [{ label: "Only", value: 50 }];
    const { container } = render(<DashboardBarChart data={singleData} />);
    expect(container.firstElementChild).toBeInTheDocument();
  });
});
