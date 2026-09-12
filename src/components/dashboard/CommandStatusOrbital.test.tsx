import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import CommandStatusOrbital from "./CommandStatusOrbital";

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAnimatedCounter", () => ({
  useAnimatedCounter: (value: number) => value,
}));

const defaultProps = {
  username: "John",
  healthScore: 85,
  revenue: 12500,
  orders: 150,
  profit: 4200,
  revenueChange: 12,
  ordersChange: 8,
  profitChange: -3,
  storesConnected: 3,
  suppliersActive: 7,
  pendingOrders: 5,
  contextualActions: [],
};

describe("CommandStatusOrbital", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders greeting with username", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getByText(/John/)).toBeInTheDocument();
  });

  it("renders health score", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getByText("85")).toBeInTheDocument();
  });

  it("renders health label", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getByText("Health")).toBeInTheDocument();
  });

  it("renders revenue KPI", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
  });

  it("renders orders KPI", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getByText("Orders")).toBeInTheDocument();
  });

  it("renders profit KPI", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getByText("Profit")).toBeInTheDocument();
  });

  it("renders revenue change percentage", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });

  it("renders orders change percentage", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getByText("+8%")).toBeInTheDocument();
  });

  it("renders negative profit change", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getByText("-3%")).toBeInTheDocument();
  });

  it("renders quick action links", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getByText("Search Products")).toBeInTheDocument();
    expect(screen.getByText("Find Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Calculate Profit")).toBeInTheDocument();
    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
  });

  it("links Search Products to /products", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    const link = screen.getByText("Search Products").closest("a");
    expect(link).toHaveAttribute("href", "/products");
  });

  it("links Find Suppliers to /suppliers", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    const link = screen.getByText("Find Suppliers").closest("a");
    expect(link).toHaveAttribute("href", "/suppliers");
  });

  it("links Calculate Profit to /calculator", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    const link = screen.getByText("Calculate Profit").closest("a");
    expect(link).toHaveAttribute("href", "/calculator");
  });

  it("links AI Assistant to /ai", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    const link = screen.getByText("AI Assistant").closest("a");
    expect(link).toHaveAttribute("href", "/ai");
  });

  it("shows running strong for high health score", () => {
    render(<CommandStatusOrbital {...defaultProps} healthScore={85} />);
    expect(screen.getByText("running strong")).toBeInTheDocument();
  });

  it("shows needs attention for medium health score", () => {
    render(<CommandStatusOrbital {...defaultProps} healthScore={55} />);
    expect(screen.getByText("needs attention")).toBeInTheDocument();
  });

  it("shows critical for low health score", () => {
    render(<CommandStatusOrbital {...defaultProps} healthScore={30} />);
    expect(screen.getByText("critical")).toBeInTheDocument();
  });

  it("renders store status dot", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getAllByText("Stores").length).toBeGreaterThanOrEqual(1);
  });

  it("renders supplier status dot", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getAllByText("Suppliers").length).toBeGreaterThanOrEqual(1);
  });

  it("renders pending orders when > 0", () => {
    render(<CommandStatusOrbital {...defaultProps} pendingOrders={5} />);
    expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(1);
  });

  it("does not render pending orders when 0", () => {
    render(<CommandStatusOrbital {...defaultProps} pendingOrders={0} />);
    expect(screen.queryAllByText("Pending").length).toBe(0);
  });

  it("renders live indicator", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getAllByText("Live").length).toBeGreaterThanOrEqual(1);
  });

  it("links stores to /store", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    const links = screen.getAllByRole("link");
    const storeLink = links.find((l) => l.getAttribute("href") === "/store");
    expect(storeLink).toBeInTheDocument();
  });

  it("links suppliers to /suppliers", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    const links = screen.getAllByRole("link");
    const supplierLink = links.find((l) => l.getAttribute("href") === "/suppliers" && l.textContent?.includes("Suppliers"));
    expect(supplierLink).toBeInTheDocument();
  });

  it("links pending to /fulfillment", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    const links = screen.getAllByRole("link");
    const pendingLink = links.find((l) => l.getAttribute("href") === "/fulfillment");
    expect(pendingLink).toBeInTheDocument();
  });

  it("renders store count", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getAllByText("3").length).toBeGreaterThanOrEqual(1);
  });

  it("renders supplier count", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getAllByText("7").length).toBeGreaterThanOrEqual(1);
  });

  it("renders pending count", () => {
    render(<CommandStatusOrbital {...defaultProps} />);
    expect(screen.getAllByText("Pending").length).toBeGreaterThanOrEqual(1);
  });

  it("renders without optional change props", () => {
    const props = { ...defaultProps, revenueChange: undefined, ordersChange: undefined, profitChange: undefined };
    render(<CommandStatusOrbital {...props} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
  });

  it("does not render change when value is 0", () => {
    render(<CommandStatusOrbital {...defaultProps} revenueChange={0} />);
    expect(screen.queryByText("+0%")).toBeNull();
  });

  it("renders SVG health ring", () => {
    const { container } = render(<CommandStatusOrbital {...defaultProps} />);
    const svgs = container.querySelectorAll("svg");
    expect(svgs.length).toBeGreaterThan(0);
  });

  it("renders gradient background", () => {
    const { container } = render(<CommandStatusOrbital {...defaultProps} />);
    const gradientDiv = container.querySelector(".bg-gradient-to-br");
    expect(gradientDiv).toBeInTheDocument();
  });
});
