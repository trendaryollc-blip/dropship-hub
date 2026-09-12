import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import FulfillmentPipeline from "./FulfillmentPipeline";
import type { FulfillmentPipelineData } from "@/types/dashboard";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAnimatedCounter", () => ({
  useAnimatedCounter: (value: number) => value,
}));

const mockData: FulfillmentPipelineData = {
  pending: 5,
  processing: 3,
  shipped: 8,
  delivered: 12,
  totalRevenue: 4500,
  totalProfit: 1800,
  recentOrders: [
    { id: "o1", customer: "Alice Johnson", product: "Wireless Earbuds", status: "pending", amount: 49.99, time: "2m ago" },
    { id: "o2", customer: "Bob Smith", product: "Phone Case", status: "in_progress", amount: 19.99, time: "5m ago" },
    { id: "o3", customer: "Carol White", product: "USB Cable", status: "shipped", amount: 12.99, time: "10m ago" },
    { id: "o4", customer: "Dave Brown", product: "Screen Protector", status: "delivered", amount: 8.99, time: "1h ago" },
  ],
};

describe("FulfillmentPipeline", () => {
  it("renders heading", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("Fulfillment Pipeline")).toBeInTheDocument();
  });

  it("renders total orders count", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("28 total orders")).toBeInTheDocument();
  });

  it("renders pipeline bar labels", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("Fulfillment Pipeline")).toBeInTheDocument();
  });

  it("renders pipeline bar counts", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders pipeline bar counts", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders View All link", () => {
    render(<FulfillmentPipeline data={mockData} />);
    const link = screen.getByText("View All").closest("a");
    expect(link).toHaveAttribute("href", "/fulfillment");
  });

  it("renders recent orders header", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("Recent Orders")).toBeInTheDocument();
  });

  it("renders up to 3 recent orders", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("Carol White")).toBeInTheDocument();
    expect(screen.queryByText("Dave Brown")).toBeNull();
  });

  it("renders order products", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("Wireless Earbuds")).toBeInTheDocument();
    expect(screen.getByText("Phone Case")).toBeInTheDocument();
    expect(screen.getByText("USB Cable")).toBeInTheDocument();
  });

  it("renders order amounts", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("$49.99")).toBeInTheDocument();
    expect(screen.getByText("$19.99")).toBeInTheDocument();
    expect(screen.getByText("$12.99")).toBeInTheDocument();
  });

  it("renders order status labels", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("Carol White")).toBeInTheDocument();
  });

  it("renders order timestamps", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("2m ago")).toBeInTheDocument();
    expect(screen.getByText("5m ago")).toBeInTheDocument();
    expect(screen.getByText("10m ago")).toBeInTheDocument();
  });

  it("renders revenue", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("$4,500")).toBeInTheDocument();
  });

  it("renders profit", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("Profit")).toBeInTheDocument();
    expect(screen.getByText("$1,800")).toBeInTheDocument();
  });

  it("renders margin percentage", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("Margin")).toBeInTheDocument();
    expect(screen.getByText("40%")).toBeInTheDocument();
  });

  it("renders empty recent orders message", () => {
    const emptyData = { ...mockData, recentOrders: [] };
    render(<FulfillmentPipeline data={emptyData} />);
    expect(screen.getByText("No recent orders")).toBeInTheDocument();
  });

  it("calculates margin correctly for zero revenue", () => {
    const zeroRevenueData = { ...mockData, totalRevenue: 0, totalProfit: 0 };
    render(<FulfillmentPipeline data={zeroRevenueData} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders all 4 recent orders when exactly 4 provided", () => {
    render(<FulfillmentPipeline data={mockData} />);
    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("Bob Smith")).toBeInTheDocument();
    expect(screen.getByText("Carol White")).toBeInTheDocument();
  });
});
