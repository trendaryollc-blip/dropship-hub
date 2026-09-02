import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}));

vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => {
    const { src, alt, ...rest } = props;
    return <img src={src as string} alt={alt as string} {...rest} />;
  },
}));

import QuickCompareBar from "./QuickCompareBar";

const makeItems = () => [
  { name: "Product A", price: 12.99, margin: 45, image: "https://placehold.co/60x60" },
  { name: "Product B", price: 8.50, margin: 32, image: "https://placehold.co/60x60" },
];

describe("QuickCompareBar", () => {
  it("renders nothing when items is empty", () => {
    const { container } = render(<QuickCompareBar items={[]} onRemove={vi.fn()} onClear={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders compare label with item count", () => {
    render(<QuickCompareBar items={makeItems()} onRemove={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getAllByText("Compare").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("2/4")).toBeInTheDocument();
  });

  it("renders product names", () => {
    render(<QuickCompareBar items={makeItems()} onRemove={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText("Product A")).toBeInTheDocument();
    expect(screen.getByText("Product B")).toBeInTheDocument();
  });

  it("renders prices and margins", () => {
    render(<QuickCompareBar items={makeItems()} onRemove={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText("$12.99 · 45%")).toBeInTheDocument();
    expect(screen.getByText("$8.5 · 32%")).toBeInTheDocument();
  });

  it("calls onRemove when remove button clicked", () => {
    const onRemove = vi.fn();
    render(<QuickCompareBar items={makeItems()} onRemove={onRemove} onClear={vi.fn()} />);
    const removeButtons = screen.getAllByRole("button").filter((b) => b.querySelector("svg"));
    fireEvent.click(removeButtons[0]);
    expect(onRemove).toHaveBeenCalledWith("Product A");
  });

  it("calls onClear when clear button clicked", () => {
    const onClear = vi.fn();
    render(<QuickCompareBar items={makeItems()} onRemove={vi.fn()} onClear={onClear} />);
    const clearBtn = screen.getAllByRole("button").find((b) => b.getAttribute("title") === "Clear all");
    expect(clearBtn).toBeTruthy();
    fireEvent.click(clearBtn!);
    expect(onClear).toHaveBeenCalled();
  });

  it("shows Add product link when less than 4 items", () => {
    render(<QuickCompareBar items={makeItems()} onRemove={vi.fn()} onClear={vi.fn()} />);
    expect(screen.getByText("+ Add product")).toBeInTheDocument();
  });

  it("hides Add product link when 4 items", () => {
    const items = Array.from({ length: 4 }, (_, i) => ({
      name: `P${i}`,
      price: 10,
      margin: 20,
      image: "https://placehold.co/60x60",
    }));
    render(<QuickCompareBar items={items} onRemove={vi.fn()} onClear={vi.fn()} />);
    expect(screen.queryByText("+ Add product")).not.toBeInTheDocument();
  });
});
