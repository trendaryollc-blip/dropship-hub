import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StoreCuratedTab from "./StoreCuratedTab";

vi.mock("@/lib/store-catalog", () => ({
  STORE_CATALOG: [
    {
      id: "trendaryo",
      name: "Trendaryo",
      category: "E-commerce Platform",
      description: "Your store platform",
      color: "#e11d48",
      bg: "#fff1f2",
      fields: [],
      keyUrl: "https://trendaryo.com",
      setupGuide: [{ text: "Step 1" }],
    },
    {
      id: "shopify",
      name: "Shopify",
      category: "E-commerce Platform",
      description: "Popular e-commerce platform",
      color: "#96bf48",
      bg: "#f0fdf4",
      fields: [],
      keyUrl: "https://shopify.com",
      setupGuide: [{ text: "Step 1" }],
    },
  ],
  STORE_CATEGORIES: ["E-commerce Platform", "Marketplace", "Custom"],
}));

vi.mock("@/components/stores/StoreConnectModal", () => ({
  default: () => <div data-testid="store-connect-modal" />,
}));

vi.mock("lucide-react", () => ({
  Loader2: () => <div />,
  ExternalLink: () => <div />,
  ChevronDown: () => <div />,
  ChevronUp: () => <div />,
  Store: () => <div />,
  ShoppingCart: () => <div />,
  Puzzle: () => <div />,
}));

describe("StoreCuratedTab", () => {
  it("renders platform grid", () => {
    render(<StoreCuratedTab onConnected={vi.fn()} />);
    expect(screen.getByText("Connect Your Store")).toBeDefined();
    expect(screen.getByText("Shopify")).toBeDefined();
  });

  it("renders category filters", () => {
    render(<StoreCuratedTab onConnected={vi.fn()} />);
    expect(screen.getByText("All")).toBeDefined();
    expect(screen.getAllByText("E-commerce Platform").length).toBeGreaterThanOrEqual(1);
  });

  it("featured platform", () => {
    render(<StoreCuratedTab onConnected={vi.fn()} />);
    expect(screen.getByText("Trendaryo")).toBeDefined();
    expect(screen.getByText("Your Store")).toBeDefined();
  });

  it("connect modal opens", () => {
    render(<StoreCuratedTab onConnected={vi.fn()} />);
    const connectBtns = screen.getAllByText("Connect Store");
    fireEvent.click(connectBtns[0]);
    expect(screen.getByTestId("store-connect-modal")).toBeDefined();
  });
});
