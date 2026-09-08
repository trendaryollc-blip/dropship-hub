import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SavedChatSidebar from "./SavedChatSidebar";

vi.mock("lucide-react", () => ({
  MessageSquare: () => <div data-testid="icon-chat" />,
  Send: () => <div data-testid="icon-send" />,
  X: () => <div data-testid="icon-x" />,
  Sparkles: () => <div data-testid="icon-sparkles" />,
  Loader2: () => <div data-testid="icon-loader" />,
}));

const mockUseSavedProducts = vi.fn();
vi.mock("./SavedProductsProvider", () => ({
  useSavedProducts: () => mockUseSavedProducts(),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({}),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe("SavedChatSidebar", () => {
  beforeEach(() => {
    mockUseSavedProducts.mockReturnValue({
      savedProducts: [],
    });
  });

  it("renders toggle button", () => {
    render(<SavedChatSidebar />);
    expect(screen.getByTitle("AI Chat about saved products")).toBeInTheDocument();
  });

  it("opens chat panel on button click", () => {
    render(<SavedChatSidebar />);
    fireEvent.click(screen.getByTitle("AI Chat about saved products"));
    expect(screen.getByText("Saved Products AI")).toBeInTheDocument();
  });

  it("shows quick prompts when opened with no messages", () => {
    render(<SavedChatSidebar />);
    fireEvent.click(screen.getByTitle("AI Chat about saved products"));
    expect(screen.getByText("Which has the highest margin potential?")).toBeInTheDocument();
    expect(screen.getByText("Which products should I drop?")).toBeInTheDocument();
    expect(screen.getByText("Suggest pricing for all")).toBeInTheDocument();
    expect(screen.getByText("Find suppliers for top 3")).toBeInTheDocument();
  });

  it("renders message input when opened", () => {
    render(<SavedChatSidebar />);
    fireEvent.click(screen.getByTitle("AI Chat about saved products"));
    expect(screen.getByPlaceholderText("Ask about saved products...")).toBeInTheDocument();
  });

  it("displays product count in header", () => {
    mockUseSavedProducts.mockReturnValue({
      savedProducts: [{ id: "1" }, { id: "2" }],
    });
    render(<SavedChatSidebar />);
    fireEvent.click(screen.getByTitle("AI Chat about saved products"));
    expect(screen.getByText("2 products loaded")).toBeInTheDocument();
  });
});
