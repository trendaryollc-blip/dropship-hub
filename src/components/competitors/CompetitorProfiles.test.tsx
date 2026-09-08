import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CompetitorProfiles from "./CompetitorProfiles";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("lucide-react", () => ({
  ChevronDown: () => <div data-testid="chevron-down" />,
  Star: () => <div data-testid="star" />,
  Shield: () => <div data-testid="shield" />,
  ShoppingCart: () => <div data-testid="shopping-cart" />,
  Clock: () => <div data-testid="clock" />,
  RotateCcw: () => <div data-testid="rotate-ccw" />,
  ExternalLink: () => <div data-testid="external-link" />,
  Store: () => <div data-testid="store" />,
}));

const mockSellers = [
  {
    name: "TopDrop Co",
    platform: "Amazon",
    rating: 4.8,
    totalProducts: 1200,
    price: 15.99,
    threatLevel: "high" as const,
    isDropshipper: true,
    otherProducts: [
      { name: "Wireless Mouse", price: 12.99 },
      { name: "USB Cable", price: 5.99 },
    ],
    responseTime: "2h",
    returnPolicy: "30 days",
  },
  {
    name: "ValueMart",
    platform: "eBay",
    rating: 4.2,
    totalProducts: 800,
    price: 18.5,
    threatLevel: "low" as const,
    isDropshipper: false,
    otherProducts: [{ name: "Phone Case", price: 8.99 }],
    responseTime: "6h",
    returnPolicy: "14 days",
  },
];

describe("CompetitorProfiles", () => {
  it("renders seller names and count", () => {
    render(<CompetitorProfiles sellers={mockSellers} />);
    expect(screen.getByText("TopDrop Co")).toBeInTheDocument();
    expect(screen.getByText("ValueMart")).toBeInTheDocument();
    expect(screen.getByText("(2 sellers)")).toBeInTheDocument();
  });

  it("displays threat level labels", () => {
    render(<CompetitorProfiles sellers={mockSellers} />);
    expect(screen.getByText("High Threat")).toBeInTheDocument();
    expect(screen.getByText("Low Threat")).toBeInTheDocument();
  });

  it("shows dropshipper badge for dropshippers", () => {
    render(<CompetitorProfiles sellers={mockSellers} />);
    expect(screen.getByText("DROPSHIPPER")).toBeInTheDocument();
  });

  it("expands seller details on click", () => {
    render(<CompetitorProfiles sellers={mockSellers} />);
    fireEvent.click(screen.getByText("TopDrop Co"));
    expect(screen.getByText("Rating")).toBeInTheDocument();
    expect(screen.getByText("Response")).toBeInTheDocument();
    expect(screen.getByText("Returns")).toBeInTheDocument();
    expect(screen.getByText("Other Products They Sell")).toBeInTheDocument();
    expect(screen.getByText("Wireless Mouse")).toBeInTheDocument();
    expect(screen.getByText("USB Cable")).toBeInTheDocument();
  });

  it("collapses seller details on second click", () => {
    render(<CompetitorProfiles sellers={mockSellers} />);
    fireEvent.click(screen.getByText("TopDrop Co"));
    expect(screen.getByText("Rating")).toBeInTheDocument();
    fireEvent.click(screen.getByText("TopDrop Co"));
    expect(screen.queryByText("Other Products They Sell")).not.toBeInTheDocument();
  });
});
