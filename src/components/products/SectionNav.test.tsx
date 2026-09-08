import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SectionNav from "./SectionNav";

vi.mock("lucide-react", () => ({
  TrendingUp: (props: any) => <div data-testid="icon-trending" {...props} />,
  Calculator: (props: any) => <div data-testid="icon-calculator" {...props} />,
  BarChart3: (props: any) => <div data-testid="icon-chart" {...props} />,
  MessageSquare: (props: any) => <div data-testid="icon-message" {...props} />,
  Truck: (props: any) => <div data-testid="icon-truck" {...props} />,
  Lightbulb: (props: any) => <div data-testid="icon-lightbulb" {...props} />,
  Package: (props: any) => <div data-testid="icon-package" {...props} />,
  Search: (props: any) => <div data-testid="icon-search" {...props} />,
}));

describe("SectionNav", () => {
  it("renders desktop nav", () => {
    const { container } = render(<SectionNav />);
    const desktopNav = container.querySelector("nav.hidden.xl\\:block");
    expect(desktopNav).toBeTruthy();
  });

  it("renders mobile nav", () => {
    const { container } = render(<SectionNav />);
    const mobileNav = container.querySelector("nav.xl\\:hidden");
    expect(mobileNav).toBeTruthy();
  });

  it("renders all section buttons", () => {
    render(<SectionNav />);
    expect(screen.getAllByText("Price").length).toBe(2);
    expect(screen.getAllByText("Calculator").length).toBe(2);
    expect(screen.getAllByText("Intelligence").length).toBe(2);
    expect(screen.getAllByText("Reviews").length).toBe(2);
    expect(screen.getAllByText("Suppliers").length).toBe(2);
    expect(screen.getAllByText("Listings").length).toBe(2);
    expect(screen.getAllByText("Similar").length).toBe(2);
    expect(screen.getAllByText("Searches").length).toBe(2);
  });

  it("renders 16 buttons total (8 desktop + 8 mobile)", () => {
    render(<SectionNav />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(16);
  });
});
