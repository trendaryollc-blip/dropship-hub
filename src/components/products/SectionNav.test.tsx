import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import SectionNav from "./SectionNav";

vi.mock("lucide-react", () => ({
  Eye: (props: any) => <div data-testid="icon-eye" {...props} />,
  ShieldCheck: (props: any) => <div data-testid="icon-shield-check" {...props} />,
  TrendingUp: (props: any) => <div data-testid="icon-trending" {...props} />,
  Calculator: (props: any) => <div data-testid="icon-calculator" {...props} />,
  BarChart3: (props: any) => <div data-testid="icon-chart" {...props} />,
  MessageSquare: (props: any) => <div data-testid="icon-message" {...props} />,
  Truck: (props: any) => <div data-testid="icon-truck" {...props} />,
  FileText: (props: any) => <div data-testid="icon-file-text" {...props} />,
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
    expect(screen.getAllByText("Overview").length).toBe(2);
    expect(screen.getAllByText("Verify").length).toBe(2);
    expect(screen.getAllByText("Market").length).toBe(2);
    expect(screen.getAllByText("Prices").length).toBe(2);
    expect(screen.getAllByText("Reviews").length).toBe(2);
    expect(screen.getAllByText("Suppliers").length).toBe(2);
    expect(screen.getAllByText("Profit").length).toBe(2);
    expect(screen.getAllByText("Listing").length).toBe(2);
    expect(screen.getAllByText("Alternatives").length).toBe(2);
    expect(screen.getAllByText("Searches").length).toBe(2);
  });

  it("renders 20 buttons total (10 desktop + 10 mobile)", () => {
    render(<SectionNav />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(20);
  });
});
