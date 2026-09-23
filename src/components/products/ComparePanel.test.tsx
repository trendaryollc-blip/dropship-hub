import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ComparePanel from "./ComparePanel";

vi.mock("next/image", () => ({
  default: (props: { src?: string; alt?: string; [k: string]: unknown }) => <img src={props.src} alt={props.alt} />,
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

  it("shows the ready-to-compare status for two products", () => {
    render(
      <ComparePanel selectedProducts={mockProducts} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(screen.getByText("Ready to compare")).toBeInTheDocument();
  });

  it("asks for more products when fewer than two are selected", () => {
    render(
      <ComparePanel selectedProducts={[mockProducts[0]]} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(screen.getByText("Select at least 2 products to compare")).toBeInTheDocument();
  });

  it("shows product price, rating, and source", () => {
    render(
      <ComparePanel selectedProducts={mockProducts} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(screen.getByText("$29.99")).toBeInTheDocument();
    expect(screen.getByText("$39.99")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText(/amazon/)).toBeInTheDocument();
    expect(screen.getByText(/ebay/)).toBeInTheDocument();
  });

  it("shows the Add product placeholder while under four selections", () => {
    render(
      <ComparePanel selectedProducts={mockProducts} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(screen.getByText("Add product")).toBeInTheDocument();
  });

  it("hides the Add product placeholder at four selections", () => {
    const four = [
      ...mockProducts,
      { id: "3", title: "Product C", price: 10, image: null, link: "", source: "amazon" },
      { id: "4", title: "Product D", price: 20, image: null, link: "", source: "ebay" },
    ];
    render(
      <ComparePanel selectedProducts={four} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(screen.queryByText("Add product")).not.toBeInTheDocument();
  });

  it("collapses and re-expands the panel", () => {
    const { rerender } = render(
      <ComparePanel selectedProducts={mockProducts} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    const toggle = screen.getByRole("button", { name: /Compare \(2\/4\)/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(toggle);
    rerender(
      <ComparePanel selectedProducts={mockProducts} onRemove={vi.fn()} onClearAll={vi.fn()} />
    );
    expect(screen.getByRole("button", { name: /Compare \(2\/4\)/ })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText("Product A")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Compare \(2\/4\)/ }));
    expect(screen.getByText("Product A")).toBeInTheDocument();
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

  it("calls onAICompare with the selected products", () => {
    const onAICompare = vi.fn();
    render(
      <ComparePanel selectedProducts={mockProducts} onRemove={vi.fn()} onClearAll={vi.fn()} onAICompare={onAICompare} />
    );
    fireEvent.click(screen.getByText("AI Compare Products"));
    expect(onAICompare).toHaveBeenCalledWith(mockProducts);
  });

  it("shows the loading state while an AI compare is running", () => {
    let resolveCompare: () => void = () => {};
    const onAICompare = vi.fn(() => new Promise<void>((resolve) => { resolveCompare = resolve; }));
    render(
      <ComparePanel selectedProducts={mockProducts} onRemove={vi.fn()} onClearAll={vi.fn()} onAICompare={onAICompare} />
    );

    fireEvent.click(screen.getByText("AI Compare Products"));
    expect(screen.getByText("AI is comparing...")).toBeInTheDocument();

    const button = screen.getByRole("button", { name: /AI is comparing/ });
    expect(button).toBeDisabled();

    resolveCompare();
  });

  it("does not show AI compare button with <2 products", () => {
    render(
      <ComparePanel selectedProducts={[mockProducts[0]]} onRemove={vi.fn()} onClearAll={vi.fn()} onAICompare={vi.fn()} />
    );
    expect(screen.queryByText("AI Compare Products")).not.toBeInTheDocument();
  });
});