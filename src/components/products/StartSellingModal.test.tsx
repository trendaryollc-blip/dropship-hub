import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StartSellingModal from "./StartSellingModal";
import * as SafeFetch from "@/lib/safe-fetch";

vi.mock("@/lib/safe-fetch");

vi.mock("lucide-react", () => ({
  Rocket: (props: any) => <div data-testid="icon-rocket" {...props} />,
  Loader2: (props: any) => <div data-testid="icon-loader" {...props} />,
  Check: (props: any) => <div data-testid="icon-check" {...props} />,
  Store: (props: any) => <div data-testid="icon-store" {...props} />,
}));

const defaultProps = {
  productTitle: "Test Product",
  productPrice: 49.99,
  ordering: false,
  success: false,
  onClose: vi.fn(),
  onStartSelling: vi.fn(),
};

beforeEach(() => {
  vi.mocked(SafeFetch.safeFetch).mockResolvedValue({ connections: [] });
});

describe("StartSellingModal", () => {
  it("renders form with product info", async () => {
    render(<StartSellingModal {...defaultProps} />);
    expect(screen.getByText("Start Selling")).toBeInTheDocument();
    expect(screen.getByText("Test Product")).toBeInTheDocument();
    expect(screen.getByText("Sell at $49.99")).toBeInTheDocument();
  });

  it("shows loading stores state", () => {
    vi.mocked(SafeFetch.safeFetch).mockReturnValue(new Promise(() => {}));
    render(<StartSellingModal {...defaultProps} />);
    expect(screen.getAllByTestId("icon-loader").length).toBeGreaterThan(0);
  });

  it("shows no stores message when empty", async () => {
    vi.mocked(SafeFetch.safeFetch).mockResolvedValue({ connections: [] });
    render(<StartSellingModal {...defaultProps} />);
    expect(await screen.findByText("No stores connected yet.")).toBeInTheDocument();
    expect(screen.getByText("Connect a store →")).toBeInTheDocument();
  });

  it("shows success state", () => {
    render(<StartSellingModal {...defaultProps} success={true} />);
    expect(screen.getByText("Product Listed!")).toBeInTheDocument();
    expect(screen.getByText("Product has been pushed to your store.")).toBeInTheDocument();
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    render(<StartSellingModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders store list when stores available", async () => {
    vi.mocked(SafeFetch.safeFetch).mockResolvedValue({
      connections: [
        { id: "s1", name: "My Shopify Store", platform: "shopify" },
        { id: "s2", name: "My eBay Store", platform: "ebay" },
      ],
    });
    render(<StartSellingModal {...defaultProps} />);
    expect(await screen.findByText("My Shopify Store")).toBeInTheDocument();
    expect(screen.getByText("My eBay Store")).toBeInTheDocument();
  });
});
