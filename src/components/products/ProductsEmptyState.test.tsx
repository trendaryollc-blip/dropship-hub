import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductsEmptyState from "./ProductsEmptyState";

describe("ProductsEmptyState", () => {
  it("explains that no products were found", () => {
    render(<ProductsEmptyState />);
    expect(screen.getByRole("heading", { name: "No products found" })).toBeInTheDocument();
    expect(
      screen.getByText("Try a different search query or enable more platforms")
    ).toBeInTheDocument();
  });

  it("offers suggestion links that run a search", () => {
    render(<ProductsEmptyState />);
    const suggestion = screen.getByRole("link", { name: "wireless earbuds" });
    expect(suggestion).toHaveAttribute("href", "/products?q=wireless%20earbuds");
    expect(screen.getByRole("link", { name: "pet supplies" })).toHaveAttribute(
      "href",
      "/products?q=pet%20supplies"
    );
  });

  it("runs the smart-search prompt when provided", () => {
    const onAskAI = vi.fn();
    render(<ProductsEmptyState onAskAI={onAskAI} />);

    fireEvent.click(screen.getByRole("button", { name: /Smart search/i }));
    expect(onAskAI).toHaveBeenCalledWith("Help me find winning products for my store");
  });

  it("hides the smart-search button when no handler is provided", () => {
    render(<ProductsEmptyState />);
    expect(screen.queryByRole("button", { name: /Smart search/i })).not.toBeInTheDocument();
  });
});
