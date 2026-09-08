import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ComparePanel from "./ComparePanel";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("lucide-react", () => ({
  X: (props: any) => <div data-testid="icon-x" {...props} />,
  GitCompare: (props: any) => <div data-testid="icon-compare" {...props} />,
  Loader2: (props: any) => <div data-testid="icon-loader" {...props} />,
  Sparkles: (props: any) => <div data-testid="icon-sparkles" {...props} />,
  Star: (props: any) => <div data-testid="icon-star" {...props} />,
  Package: (props: any) => <div data-testid="icon-package" {...props} />,
  ArrowRight: (props: any) => <div data-testid="icon-arrow" {...props} />,
  Check: (props: any) => <div data-testid="icon-check" {...props} />,
  ChevronDown: (props: any) => <div data-testid="icon-chevron" {...props} />,
}));

const mockProducts = [
  { id: "1", title: "Product A", price: 29.99, image: null, link: "", source: "amazon", rating: 4.5, reviews: 100 },
  { id: "2", title: "Product B", price: 39.99, image: null, link: "", source: "ebay", rating: 4.2, reviews: 50 },
];

describe("ComparePanel", () => {
  it("returns null when empty", () => {
    const { container } = render(
      <ComparePanel selectedProducts={[]} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders selected products", () => {
    render(
      <ComparePanel selectedProducts={mockProducts} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(screen.getByText("Product A")).toBeInTheDocument();
    expect(screen.getByText("Product B")).toBeInTheDocument();
  });

  it("displays count correctly", () => {
    render(
      <ComparePanel selectedProducts={mockProducts} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(screen.getByText("Compare (2/4)")).toBeInTheDocument();
  });

  it("calls onClearAll when clear button clicked", () => {
    const onClearAll = vi.fn();
    render(
      <ComparePanel selectedProducts={mockProducts} onRemove={vi.fn()} onClearAll={onClearAll} />
    );
    fireEvent.click(screen.getByText("Clear all"));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it("calls onRemove when remove button clicked", () => {
    const onRemove = vi.fn();
    render(
      <ComparePanel selectedProducts={mockProducts} onRemove={onRemove} onClearAll={vi.fn()} />
    );
    const removeButtons = screen.getAllByTestId("icon-x");
    fireEvent.click(removeButtons[0].parentElement!);
    expect(onRemove).toHaveBeenCalledWith("1");
  });

  it("shows AI compare button with 2+ products", () => {
    render(
      <ComparePanel selectedProducts={mockProducts} onRemove={vi.fn()} onClearAll={vi.fn()} onAICompare={vi.fn()} />
    );
    expect(screen.getByText("AI Compare Products")).toBeInTheDocument();
  });

  it("does not show AI compare button with <2 products", () => {
    render(
      <ComparePanel selectedProducts={[mockProducts[0]]} onRemove={vi.fn()} onClearAll={vi.fn()} onAICompare={vi.fn()} />
    );
    expect(screen.queryByText("AI Compare Products")).not.toBeInTheDocument();
  });

  it("calls onAICompare when button clicked", () => {
    const onAICompare = vi.fn();
    render(
      <ComparePanel selectedProducts={mockProducts} onRemove={vi.fn()} onClearAll={vi.fn()} onAICompare={onAICompare} />
    );
    fireEvent.click(screen.getByText("AI Compare Products"));
    expect(onAICompare).toHaveBeenCalledWith(mockProducts);
  });
});
