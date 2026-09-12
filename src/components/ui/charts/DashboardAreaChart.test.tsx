import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DashboardAreaChart from "./DashboardAreaChart";

describe("DashboardAreaChart", () => {
  const sampleData = [
    { date: "2024-01-01", value: 100 },
    { date: "2024-01-02", value: 150 },
    { date: "2024-01-03", value: 120 },
  ];

  const predictedData = [
    { date: "2024-01-04", value: 180 },
    { date: "2024-01-05", value: 200 },
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

  it("renders chart container when data present", () => {
    const { container } = render(<DashboardAreaChart data={sampleData} />);
    expect(container.firstElementChild).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveTextContent("No data available");
  });

  it("renders with predicted data overlay", () => {
    const { container } = render(
      <DashboardAreaChart data={sampleData} predicted={predictedData} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveTextContent("No data available");
  });

  it("renders without grid when showGrid is false", () => {
    const { container } = render(
      <DashboardAreaChart data={sampleData} showGrid={false} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders without tooltip when showTooltip is false", () => {
    const { container } = render(
      <DashboardAreaChart data={sampleData} showTooltip={false} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders without axes when showAxis is false", () => {
    const { container } = render(
      <DashboardAreaChart data={sampleData} showAxis={false} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("applies custom color", () => {
    const { container } = render(
      <DashboardAreaChart data={sampleData} color="#ff0000" />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("applies custom gradientId", () => {
    const { container } = render(
      <DashboardAreaChart data={sampleData} gradientId="customGrad" />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("applies valuePrefix", () => {
    const { container } = render(
      <DashboardAreaChart data={sampleData} valuePrefix="$" />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("applies valueSuffix", () => {
    const { container } = render(
      <DashboardAreaChart data={sampleData} valueSuffix="%" />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with all props combined", () => {
    const { container } = render(
      <DashboardAreaChart
        data={sampleData}
        predicted={predictedData}
        color="#ff0000"
        gradientId="testGrad"
        height={250}
        showGrid={true}
        showTooltip={true}
        showAxis={true}
        valuePrefix="$"
        valueSuffix=""
        className="custom-class"
      />
    );
    expect(container.firstElementChild).toHaveClass("custom-class");
  });

  it("renders empty state with custom height", () => {
    render(<DashboardAreaChart data={[]} height={300} />);
    expect(screen.getByText("No data available")).toBeInTheDocument();
  });

  it("merges data and predicted by date", () => {
    const dataWithOverlap = [
      { date: "2024-01-01", value: 100 },
      { date: "2024-01-02", value: 150 },
    ];
    const predictedWithOverlap = [
      { date: "2024-01-02", value: 160 },
      { date: "2024-01-03", value: 180 },
    ];
    const { container } = render(
      <DashboardAreaChart data={dataWithOverlap} predicted={predictedWithOverlap} />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders axis ticks with formatted dates when data has dates", () => {
    const data = [
      { date: "2024-03-15", value: 100 },
      { date: "2024-06-20", value: 200 },
      { date: "2024-09-10", value: 150 },
    ];
    const { container } = render(<DashboardAreaChart data={data} />);
    expect(container.firstElementChild).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveTextContent("No data available");
  });

  it("renders tooltip with value formatting", () => {
    const { container } = render(
      <DashboardAreaChart
        data={sampleData}
        valuePrefix="$"
        valueSuffix=""
      />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders with predicted data and tooltips", () => {
    const { container } = render(
      <DashboardAreaChart
        data={sampleData}
        predicted={predictedData}
        valuePrefix="$"
        valueSuffix="k"
      />
    );
    expect(container.firstElementChild).toBeInTheDocument();
  });

  it("renders large values with k suffix in axis", () => {
    const largeData = [
      { date: "2024-01-01", value: 5000 },
      { date: "2024-01-02", value: 15000 },
      { date: "2024-01-03", value: 10000 },
    ];
    const { container } = render(
      <DashboardAreaChart data={largeData} valuePrefix="$" />
    );
    expect(container.firstElementChild).toBeInTheDocument();
    expect(container.firstElementChild).not.toHaveTextContent("No data available");
  });
});
