import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AlertCard from "./AlertCard";

describe("AlertCard", () => {
  const baseProps = {
    type: "opportunity" as const,
    title: "New opportunity found",
    description: "Product X has high margin potential",
  };

  it("renders the title and description", () => {
    render(<AlertCard {...baseProps} />);
    expect(screen.getByText("New opportunity found")).toBeInTheDocument();
    expect(screen.getByText("Product X has high margin potential")).toBeInTheDocument();
  });

  it("renders the type badge", () => {
    render(<AlertCard {...baseProps} />);
    expect(screen.getByText("Opportunity")).toBeInTheDocument();
  });

  it("renders confidence when provided", () => {
    render(<AlertCard {...baseProps} confidence={92} />);
    expect(screen.getByText("92% confidence")).toBeInTheDocument();
  });

  it("renders action link when provided", () => {
    render(<AlertCard {...baseProps} action="View details" actionHref="/products/123" />);
    const link = screen.getByText("View details");
    expect(link).toHaveAttribute("href", "/products/123");
  });

  it("renders expand button when aiAnalysis is provided", () => {
    render(<AlertCard {...baseProps} aiAnalysis="AI says this is good" />);
    expect(screen.getByLabelText("Expand analysis")).toBeInTheDocument();
  });

  it("expands and shows aiAnalysis on click", () => {
    render(<AlertCard {...baseProps} aiAnalysis="AI analysis text" />);
    fireEvent.click(screen.getByLabelText("Expand analysis"));
    expect(screen.getByText("AI analysis text")).toBeInTheDocument();
  });

  it("calls onRead when mark read is clicked", () => {
    const onRead = vi.fn();
    render(<AlertCard {...baseProps} onRead={onRead} />);
    fireEvent.click(screen.getByText("Mark read"));
    expect(onRead).toHaveBeenCalledOnce();
  });

  it("applies opacity when read is true", () => {
    const { container } = render(<AlertCard {...baseProps} read={true} />);
    const card = container.firstElementChild;
    expect(card).toHaveClass("opacity-60");
  });

  it("applies correct border color for risk type", () => {
    const { container } = render(<AlertCard {...baseProps} type="risk" />);
    const card = container.firstElementChild;
    expect(card).toHaveClass("border-l-rose-400");
  });

  it("applies correct border color for warning type", () => {
    const { container } = render(<AlertCard {...baseProps} type="warning" />);
    const card = container.firstElementChild;
    expect(card).toHaveClass("border-l-amber-400");
  });
});
