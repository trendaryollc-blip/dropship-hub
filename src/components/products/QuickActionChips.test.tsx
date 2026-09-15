import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import QuickActionChips from "./QuickActionChips";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
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

describe("QuickActionChips", () => {
  it("returns null when no query", () => {
    const { container } = render(<QuickActionChips query="" onAction={vi.fn()} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders all 6 action buttons", () => {
    render(<QuickActionChips query="wireless earbuds" onAction={vi.fn()} />);
    expect(screen.getByText("Validate Products")).toBeInTheDocument();
    expect(screen.getByText("Find Suppliers")).toBeInTheDocument();
    expect(screen.getByText("Generate Listings")).toBeInTheDocument();
    expect(screen.getByText("Analyze Competitors")).toBeInTheDocument();
    expect(screen.getByText("Find Similar")).toBeInTheDocument();
    expect(screen.getByText("Calculate Profit")).toBeInTheDocument();
  });

  it("calls onAction with query interpolated", () => {
    const onAction = vi.fn();
    render(
      <QuickActionChips
        query="wireless earbuds"
        onAction={onAction}
        hasResults
        selectedProduct={{
          id: "1",
          title: "wireless earbuds",
          price: 29.99,
          image: null,
          link: "https://example.com",
          source: "aliexpress",
        }}
      />
    );
    fireEvent.click(screen.getByText("Validate Products"));
    expect(mockPush).toHaveBeenCalledWith(
      expect.stringContaining("wireless+earbuds")
    );
  });

  it("disables buttons when disabled prop is true", () => {
    render(<QuickActionChips query="wireless earbuds" onAction={vi.fn()} disabled />);
    const buttons = screen.getAllByRole("button");
    buttons.forEach((button) => {
      expect(button).toBeDisabled();
    });
  });

  it("renders section label", () => {
    render(<QuickActionChips query="wireless earbuds" onAction={vi.fn()} />);
    expect(screen.getByText("Quick AI Actions")).toBeInTheDocument();
  });
});
