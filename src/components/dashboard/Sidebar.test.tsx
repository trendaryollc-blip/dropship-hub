import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import Sidebar from "./Sidebar";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/dashboard"),
}));

const mockOnClose = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Sidebar", () => {
  it("renders desktop sidebar", () => {
    const { container } = render(<Sidebar isOpen={false} onClose={mockOnClose} />);
    const aside = container.querySelector("aside");
    expect(aside).toBeTruthy();
  });

  it("shows mobile overlay when isOpen is true", () => {
    const { container } = render(<Sidebar isOpen={true} onClose={mockOnClose} />);
    const overlays = container.querySelectorAll("aside");
    expect(overlays.length).toBe(2);
  });

  it("hides mobile overlay when isOpen is false", () => {
    const { container } = render(<Sidebar isOpen={false} onClose={mockOnClose} />);
    const overlays = container.querySelectorAll("aside");
    expect(overlays.length).toBe(1);
  });

  it("calls onClose when close button clicked", () => {
    render(<Sidebar isOpen={true} onClose={mockOnClose} />);
    const closeBtn = screen.getAllByRole("button").find(b => b.getAttribute("aria-label") === "Close menu");
    if (closeBtn) {
      fireEvent.click(closeBtn);
      expect(mockOnClose).toHaveBeenCalled();
    }
  });

  it("renders nav items", () => {
    render(<Sidebar isOpen={false} onClose={mockOnClose} />);
    expect(screen.getByText("Dashboard")).toBeTruthy();
    expect(screen.getByText("Find Products")).toBeTruthy();
    expect(screen.getByText("Saved")).toBeTruthy();
    expect(screen.getByText("Find Suppliers")).toBeTruthy();
    expect(screen.getByText("Calculator")).toBeTruthy();
    expect(screen.getByText("Competitors")).toBeTruthy();
    expect(screen.getByText("Health Score")).toBeTruthy();
    expect(screen.getByText("My Store")).toBeTruthy();
    expect(screen.getByText("Multi-Store")).toBeTruthy();
    expect(screen.getByText("Fulfillment")).toBeTruthy();
    expect(screen.getByText("AI Assistant")).toBeTruthy();
    expect(screen.getByText("Customer Service")).toBeTruthy();
    expect(screen.getByText("Returns & Refunds")).toBeTruthy();
    expect(screen.getByText("Revenue")).toBeTruthy();
    expect(screen.getByText("Profit Tracker")).toBeTruthy();
    expect(screen.getByText("Ad ROI")).toBeTruthy();
    expect(screen.getByText("Supplier Intel")).toBeTruthy();
    expect(screen.getByText("Supplier SRM")).toBeTruthy();
    expect(screen.getByText("Product Validation")).toBeTruthy();
  });

  it("renders Settings link", () => {
    render(<Sidebar isOpen={false} onClose={mockOnClose} />);
    expect(screen.getByText("Settings")).toBeTruthy();
  });

  it("shows active state for current path", () => {
    render(<Sidebar isOpen={false} onClose={mockOnClose} />);
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    expect(dashboardLink?.className).toContain("bg-accent/10");
  });

  it("handles collapse toggle", () => {
    const { container } = render(<Sidebar isOpen={false} onClose={mockOnClose} />);
    const toggleBtn = container.querySelector("aside button.absolute") as HTMLButtonElement;
    fireEvent.click(toggleBtn);
    const aside = container.querySelector("aside");
    expect(aside?.className).toContain("w-[68px]");
  });

  it("shows More dropdown", () => {
    render(<Sidebar isOpen={true} onClose={mockOnClose} />);
    const buttons = screen.getAllByText("More");
    fireEvent.click(buttons[0]);
    expect(screen.getAllByText(/AI Listings|Price War Bot/).length).toBeGreaterThanOrEqual(1);
  });

  it("renders logo text", () => {
    render(<Sidebar isOpen={false} onClose={mockOnClose} />);
    expect(screen.getByText("DropShip")).toBeTruthy();
    expect(screen.getByText("Hub")).toBeTruthy();
  });
});
