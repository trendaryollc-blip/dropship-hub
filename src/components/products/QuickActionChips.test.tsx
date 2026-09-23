import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuickActionChips from "./QuickActionChips";

const routerState = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: routerState.push,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("lucide-react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("lucide-react")>();
  return { ...actual };
});

const selectedProduct = {
  id: "prod-1",
  title: "Wireless Earbuds Pro",
  price: 29.99,
  image: "https://example.com/earbuds.jpg",
  link: "https://amazon.com/dp/B0EAR",
  source: "amazon",
  rating: 4.5,
  reviews: 1200,
  brand: "SoundCore",
  estimatedMargin: 40,
};

beforeEach(() => {
  routerState.push.mockClear();
  sessionStorage.clear();
});

describe("QuickActionChips", () => {
  it("returns null when no query", () => {
    const { container } = render(<QuickActionChips query="" onAction={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders all 6 navigation action buttons", () => {
    render(<QuickActionChips query="wireless earbuds" onAction={vi.fn()} />);
    expect(screen.getByText("Validate Products")).toBeInTheDocument();
    expect(screen.getByText("Find Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Generate Listings")).toBeInTheDocument();
    expect(screen.getByText("Analyze Competitors")).toBeInTheDocument();
    expect(screen.getByText("Find Similar")).toBeInTheDocument();
    expect(screen.getByText("Calculate Profit")).toBeInTheDocument();
  });

  it("renders section label", () => {
    render(<QuickActionChips query="wireless earbuds" onAction={vi.fn()} />);
    expect(screen.getByText("Quick AI Actions")).toBeInTheDocument();
  });

  it("disables buttons when disabled prop is true", () => {
    render(<QuickActionChips query="wireless earbuds" onAction={vi.fn()} disabled />);
    screen.getAllByRole("button").forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("hides Compare and Alert chips without results", () => {
    render(<QuickActionChips query="wireless earbuds" onAction={vi.fn()} hasResults={false} />);
    expect(screen.queryByText("Compare Products")).not.toBeInTheDocument();
    expect(screen.queryByText("Create Alert")).not.toBeInTheDocument();
    expect(screen.getByText("Validate Products")).toBeInTheDocument();
  });

  it("toggles compare mode and shows the exit label", () => {
    const toggleCompareMode = vi.fn();
    const { rerender } = render(
      <QuickActionChips query="earbuds" onAction={vi.fn()} hasResults toggleCompareMode={toggleCompareMode} />
    );

    fireEvent.click(screen.getByText("Compare Products"));
    expect(toggleCompareMode).toHaveBeenCalledTimes(1);

    rerender(
      <QuickActionChips query="earbuds" onAction={vi.fn()} hasResults compareMode toggleCompareMode={toggleCompareMode} />
    );
    expect(screen.getByText("Exit Compare")).toBeInTheDocument();
  });

  it("calls onCreateAlert from the Create Alert chip", () => {
    const onCreateAlert = vi.fn();
    render(<QuickActionChips query="earbuds" onAction={vi.fn()} hasResults onCreateAlert={onCreateAlert} />);
    fireEvent.click(screen.getByText("Create Alert"));
    expect(onCreateAlert).toHaveBeenCalledTimes(1);
  });

  it("calls onAction with the selected product title for Ask AI", () => {
    const onAction = vi.fn();
    render(
      <QuickActionChips query="earbuds" onAction={onAction} hasResults selectedProduct={selectedProduct} />
    );
    fireEvent.click(screen.getByText("Ask AI"));
    expect(onAction).toHaveBeenCalledWith(
      'Analyze "Wireless Earbuds Pro" for dropshipping potential, margins, and competition'
    );
  });

  it("falls back to the query for Ask AI when no product is selected", () => {
    const onAction = vi.fn();
    render(<QuickActionChips query="phone cases" onAction={onAction} />);
    fireEvent.click(screen.getByText("Ask AI"));
    expect(onAction).toHaveBeenCalledWith(
      'Analyze "phone cases" for dropshipping potential, margins, and competition'
    );
  });

  it("disables navigation actions without a selected product and shows helper text", () => {
    render(<QuickActionChips query="earbuds" onAction={vi.fn()} hasResults />);

    screen.getAllByRole("button").forEach((button) => {
      if (button.textContent && /Validate|Supplier|Listings|Competitors|Similar|Profit/.test(button.textContent || "")) {
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute("title", "Select a product first");
      }
    });
    expect(
      screen.getByText("Select a product card to enable actions")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("Validate Products"));
    expect(routerState.push).not.toHaveBeenCalled();
  });

  it("shows the selected product helper text", () => {
    render(
      <QuickActionChips query="earbuds" onAction={vi.fn()} hasResults selectedProduct={selectedProduct} />
    );
    expect(screen.getByText("for \u201CWireless Earbuds Pro\u201D")).toBeInTheDocument();
  });

  it("navigates to product-validation with serialized params", () => {
    render(
      <QuickActionChips query="earbuds" onAction={vi.fn()} hasResults selectedProduct={selectedProduct} />
    );
    fireEvent.click(screen.getByText("Validate Products"));

    const url = routerState.push.mock.calls[0][0] as string;
    expect(url.startsWith("/product-validation?")).toBe(true);
    expect(url).toContain("productTitle=Wireless+Earbuds+Pro");
    expect(url).toContain("currentPrice=29.99");
    expect(url).toContain("category=amazon");
    expect(url).toContain("brand=SoundCore");
    expect(url).toContain("estimatedMargin=40");
  });

  it("stores the competitor product then navigates to competitors", () => {
    render(
      <QuickActionChips query="earbuds" onAction={vi.fn()} hasResults selectedProduct={selectedProduct} />
    );
    fireEvent.click(screen.getByText("Analyze Competitors"));

    expect(routerState.push).toHaveBeenCalledWith("/competitors?q=Wireless+Earbuds+Pro");
    expect(JSON.parse(sessionStorage.getItem("competitorProduct") || "{}").id).toBe("prod-1");
  });

  it("navigates to find-similar and calculator with params", () => {
    render(
      <QuickActionChips query="earbuds" onAction={vi.fn()} hasResults selectedProduct={selectedProduct} />
    );
    fireEvent.click(screen.getByText("Find Similar"));
    expect(routerState.push).toHaveBeenCalledWith("/products?q=Wireless+Earbuds+Pro");

    fireEvent.click(screen.getByText("Calculate Profit"));
    expect(routerState.push).toHaveBeenCalledWith("/calculator?title=Wireless+Earbuds+Pro&cost=29.99");
  });
});