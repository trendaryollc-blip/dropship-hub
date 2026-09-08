import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchAlertModal from "./SearchAlertModal";

vi.mock("lucide-react", () => ({
  Bell: (props: any) => <div data-testid="icon-bell" {...props} />,
  X: (props: any) => <div data-testid="icon-x" {...props} />,
  Loader2: (props: any) => <div data-testid="icon-loader" {...props} />,
  Check: (props: any) => <div data-testid="icon-check" {...props} />,
}));

describe("SearchAlertModal", () => {
  it("renders nothing when not open", () => {
    const { container } = render(
      <SearchAlertModal query="test" isOpen={false} onClose={vi.fn()} onCreateAlert={vi.fn()} />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders modal when open", () => {
    render(
      <SearchAlertModal query="wireless earbuds" isOpen={true} onClose={vi.fn()} onCreateAlert={vi.fn()} />
    );
    expect(screen.getByText("Create Search Alert")).toBeInTheDocument();
    expect(screen.getByText("wireless earbuds")).toBeInTheDocument();
  });

  it("calls onClose when X clicked", () => {
    const onClose = vi.fn();
    render(
      <SearchAlertModal query="test" isOpen={true} onClose={onClose} onCreateAlert={vi.fn()} />
    );
    fireEvent.click(screen.getByTestId("icon-x").closest("button")!);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(
      <SearchAlertModal query="test" isOpen={true} onClose={onClose} onCreateAlert={vi.fn()} />
    );
    fireEvent.click(screen.getByRole("dialog"));
    expect(onClose).toHaveBeenCalled();
  });

  it("toggles platform selection", () => {
    render(
      <SearchAlertModal query="test" isOpen={true} onClose={vi.fn()} onCreateAlert={vi.fn()} />
    );
    const walmartBtn = screen.getByText("Walmart");
    fireEvent.click(walmartBtn);
    expect(walmartBtn.className).toContain("bg-accent");
    fireEvent.click(walmartBtn);
    expect(walmartBtn.className).not.toContain("bg-accent");
  });

  it("shows platform options", () => {
    render(
      <SearchAlertModal query="test" isOpen={true} onClose={vi.fn()} onCreateAlert={vi.fn()} />
    );
    expect(screen.getByText("Amazon")).toBeInTheDocument();
    expect(screen.getByText("eBay")).toBeInTheDocument();
    expect(screen.getByText("AliExpress")).toBeInTheDocument();
  });

  it("shows notification type options", () => {
    render(
      <SearchAlertModal query="test" isOpen={true} onClose={vi.fn()} onCreateAlert={vi.fn()} />
    );
    expect(screen.getByText("Any match")).toBeInTheDocument();
    expect(screen.getByText("New product")).toBeInTheDocument();
    expect(screen.getByText("Price drop")).toBeInTheDocument();
  });

  it("shows price drop threshold when price_drop selected", () => {
    render(
      <SearchAlertModal query="test" isOpen={true} onClose={vi.fn()} onCreateAlert={vi.fn()} />
    );
    fireEvent.click(screen.getByText("Price drop"));
    expect(screen.getByText("Min price drop (%)")).toBeInTheDocument();
  });

  it("calls onCreateAlert with correct data", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <SearchAlertModal query="earbuds" isOpen={true} onClose={vi.fn()} onCreateAlert={onCreate} />
    );
    fireEvent.click(screen.getByText("Create Alert"));
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        query: "earbuds",
        platforms: expect.arrayContaining(["amazon", "ebay", "aliexpress"]),
        notifyOn: "any",
      })
    );
  });

  it("renders price inputs", () => {
    render(
      <SearchAlertModal query="test" isOpen={true} onClose={vi.fn()} onCreateAlert={vi.fn()} />
    );
    expect(screen.getByPlaceholderText("0")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("100")).toBeInTheDocument();
  });

  it("renders rating dropdown", () => {
    render(
      <SearchAlertModal query="test" isOpen={true} onClose={vi.fn()} onCreateAlert={vi.fn()} />
    );
    expect(screen.getByText("Any rating")).toBeInTheDocument();
    expect(screen.getByText("4+ stars")).toBeInTheDocument();
  });
});
