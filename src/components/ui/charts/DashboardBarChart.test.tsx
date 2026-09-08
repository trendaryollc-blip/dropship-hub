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
});
