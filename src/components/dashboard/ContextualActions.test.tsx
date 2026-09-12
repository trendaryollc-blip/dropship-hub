import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ContextualActions from "./ContextualActions";
import type { ContextualAction } from "@/types/dashboard";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

const mockActions: ContextualAction[] = [
  {
    id: "a1",
    message: "Stock running low for Wireless Earbuds",
    action: "Reorder Now",
    href: "/suppliers?restock=a1",
    type: "urgent",
    icon: "AlertTriangle",
  },
  {
    id: "a2",
    message: "Bluetooth Speaker trending +45% this week",
    action: "View Trend",
    href: "/products?trend=bt-speaker",
    type: "suggestion",
    icon: "TrendingUp",
  },
  {
    id: "a3",
    message: "New supplier verified: TechDrop Co.",
    action: "View Supplier",
    href: "/suppliers/techdrop",
    type: "info",
    icon: "Info",
  },
];

describe("ContextualActions", () => {
  it("renders all actions", () => {
    render(<ContextualActions actions={mockActions} />);
    expect(screen.getByText(/Stock running low/)).toBeInTheDocument();
    expect(screen.getByText(/Bluetooth Speaker trending/)).toBeInTheDocument();
    expect(screen.getByText(/New supplier verified/)).toBeInTheDocument();
  });

  it("renders action buttons with correct links", () => {
    render(<ContextualActions actions={mockActions} />);
    const reorderBtn = screen.getByText("Reorder Now").closest("a");
    expect(reorderBtn).toHaveAttribute("href", "/suppliers?restock=a1");

    const trendBtn = screen.getByText("View Trend").closest("a");
    expect(trendBtn).toHaveAttribute("href", "/products?trend=bt-speaker");

    const supplierBtn = screen.getByText("View Supplier").closest("a");
    expect(supplierBtn).toHaveAttribute("href", "/suppliers/techdrop");
  });

  it("renders nothing when no actions", () => {
    const { container } = render(<ContextualActions actions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("dismisses an action when dismiss button clicked", () => {
    render(<ContextualActions actions={mockActions} />);
    const dismissButtons = screen.getAllByRole("button");
    fireEvent.click(dismissButtons[0]);
    expect(screen.queryByText(/Stock running low/)).toBeNull();
    expect(screen.getByText(/Bluetooth Speaker trending/)).toBeInTheDocument();
  });

  it("dismisses multiple actions independently", () => {
    render(<ContextualActions actions={mockActions} />);
    const dismissButtons = screen.getAllByRole("button");
    fireEvent.click(dismissButtons[0]);
    expect(screen.queryByText(/Stock running low/)).toBeNull();
    expect(screen.getByText(/Bluetooth Speaker trending/)).toBeInTheDocument();
  });

  it("renders urgent type with correct border color", () => {
    const { container } = render(<ContextualActions actions={[mockActions[0]]} />);
    const chip = container.querySelector(".border-l-red-400");
    expect(chip).toBeInTheDocument();
  });

  it("renders suggestion type with correct border color", () => {
    const { container } = render(<ContextualActions actions={[mockActions[1]]} />);
    const chip = container.querySelector(".border-l-emerald-400");
    expect(chip).toBeInTheDocument();
  });

  it("renders info type with correct border color", () => {
    const { container } = render(<ContextualActions actions={[mockActions[2]]} />);
    const chip = container.querySelector(".border-l-blue-400");
    expect(chip).toBeInTheDocument();
  });

  it("renders action chip message text", () => {
    render(<ContextualActions actions={[mockActions[0]]} />);
    expect(screen.getByText("Stock running low for Wireless Earbuds")).toBeInTheDocument();
  });

  it("renders arrow icon in action link", () => {
    const { container } = render(<ContextualActions actions={[mockActions[0]]} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });
});
