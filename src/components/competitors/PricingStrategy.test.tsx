import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PricingStrategy from "./PricingStrategy";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("lucide-react", () => ({
  Check: () => <div data-testid="check" />,
  Sparkles: () => <div data-testid="sparkles" />,
}));

const mockOptions = [
  {
    label: "Budget",
    icon: "💸",
    price: 12.99,
    margin: 20,
    description: "Low price, high volume",
    tradeoff: "Thin margins",
    isRecommended: false,
    color: "blue",
  },
  {
    label: "Premium",
    icon: "💎",
    price: 29.99,
    margin: 45,
    description: "Best value proposition",
    tradeoff: "May reduce volume slightly",
    isRecommended: true,
    color: "emerald",
  },
  {
    label: "Luxury",
    icon: "👑",
    price: 49.99,
    margin: 60,
    description: "Maximum profit per sale",
    tradeoff: "Lower sales volume",
    isRecommended: false,
    color: "purple",
  },
];

describe("PricingStrategy", () => {
  it("renders heading", () => {
    render(<PricingStrategy options={mockOptions} />);
    expect(screen.getByText("Pricing Strategy")).toBeInTheDocument();
  });

  it("renders all pricing option labels", () => {
    render(<PricingStrategy options={mockOptions} />);
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("Premium")).toBeInTheDocument();
    expect(screen.getByText("Luxury")).toBeInTheDocument();
  });

  it("displays prices for each option", () => {
    render(<PricingStrategy options={mockOptions} />);
    expect(screen.getByText("$12.99")).toBeInTheDocument();
    expect(screen.getByText("$29.99")).toBeInTheDocument();
    expect(screen.getByText("$49.99")).toBeInTheDocument();
  });

  it("shows recommended badge for recommended option", () => {
    render(<PricingStrategy options={mockOptions} />);
    expect(screen.getByText("SWEET SPOT")).toBeInTheDocument();
    expect(screen.getByText("45% margin")).toBeInTheDocument();
  });

  it("copies price to clipboard on button click", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<PricingStrategy options={mockOptions} />);
    const buttons = screen.getAllByText("Use This Price");
    fireEvent.click(buttons[0]);
    expect(writeText).toHaveBeenCalledWith("$12.99");
  });
});
