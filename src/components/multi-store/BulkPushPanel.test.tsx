import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import BulkPushPanel from "./BulkPushPanel";
import type { ConnectedStore } from "@/components/stores/ConnectedStoresList";

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(() => Promise.resolve({})),
}));

const mockStores: ConnectedStore[] = [
  { id: "s1", platform: "shopify", name: "Store A", url: "https://a.com", status: "connected", connectedAt: "2025-01-01" },
  { id: "s2", platform: "woocommerce", name: "Store B", url: "https://b.com", status: "connected", connectedAt: "2025-01-01" },
  { id: "s3", platform: "etsy", name: "Store C", url: "https://c.com", status: "disconnected", connectedAt: "2025-01-01" },
];

describe("BulkPushPanel", () => {
  it("renders form inputs and store selector", () => {
    render(<BulkPushPanel stores={mockStores} pushedProducts={[]} onPushComplete={vi.fn()} />);
    expect(screen.getByPlaceholderText("Product title")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Price")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Image URL")).toBeInTheDocument();
    expect(screen.getByText("Store A")).toBeInTheDocument();
    expect(screen.getByText("Store B")).toBeInTheDocument();
  });

  it("does not show disconnected stores", () => {
    render(<BulkPushPanel stores={mockStores} pushedProducts={[]} onPushComplete={vi.fn()} />);
    expect(screen.queryByText("Store C")).not.toBeInTheDocument();
  });

  it("enables push button when title and stores selected", () => {
    render(<BulkPushPanel stores={mockStores} pushedProducts={[]} onPushComplete={vi.fn()} />);
    const btn = screen.getByRole("button", { name: /Push to 0 Stores/i });
    expect(btn).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText("Product title"), { target: { value: "Test Product" } });
    fireEvent.click(screen.getByText("Store A"));

    const enabledBtn = screen.getByRole("button", { name: /Push to 1 Store/i });
    expect(enabledBtn).not.toBeDisabled();
  });

  it("shows result after successful push with real response counts", async () => {
    const onPushComplete = vi.fn();
    const { safeFetch } = await import("@/lib/safe-fetch");
    (safeFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: true, status: "completed", totalPushed: 1, totalFailed: 0,
    });

    render(<BulkPushPanel stores={mockStores} pushedProducts={[]} onPushComplete={onPushComplete} />);

    fireEvent.change(screen.getByPlaceholderText("Product title"), { target: { value: "Test Product" } });
    fireEvent.click(screen.getByText("Store A"));

    fireEvent.click(screen.getByRole("button", { name: /Push to 1 Store/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pushed to 1 of 1 stores — all succeeded/i)).toBeInTheDocument();
    });
    expect(onPushComplete).toHaveBeenCalled();
  });

  it("reports partial failure from response counts instead of unqualified success", async () => {
    const { safeFetch } = await import("@/lib/safe-fetch");
    (safeFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: true, status: "partial", totalPushed: 1, totalFailed: 1,
    });

    render(<BulkPushPanel stores={mockStores} pushedProducts={[]} onPushComplete={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Product title"), { target: { value: "Test Product" } });
    fireEvent.click(screen.getByText("Store A"));
    fireEvent.click(screen.getByText("Store B"));
    fireEvent.click(screen.getByRole("button", { name: /Push to 2 Stores/i }));

    await waitFor(() => {
      expect(screen.getByText(/Pushed to 1 of 2 stores; 1 failed/i)).toBeInTheDocument();
    });
  });

  it("does not claim success when all stores fail", async () => {
    const { safeFetch } = await import("@/lib/safe-fetch");
    (safeFetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      success: true, status: "failed", totalPushed: 0, totalFailed: 1,
    });

    render(<BulkPushPanel stores={mockStores} pushedProducts={[]} onPushComplete={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Product title"), { target: { value: "Test Product" } });
    fireEvent.click(screen.getByText("Store A"));
    fireEvent.click(screen.getByRole("button", { name: /Push to 1 Store/i }));

    await waitFor(() => {
      expect(screen.getByText(/Push failed for all 1 stores/i)).toBeInTheDocument();
    });
  });

  it("shows error result on failed push", async () => {
    const { safeFetch } = await import("@/lib/safe-fetch");
    (safeFetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("fail"));

    render(<BulkPushPanel stores={mockStores} pushedProducts={[]} onPushComplete={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText("Product title"), { target: { value: "Test Product" } });
    fireEvent.click(screen.getByText("Store A"));
    fireEvent.click(screen.getByRole("button", { name: /Push to 1 Store/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed to create bulk push job")).toBeInTheDocument();
    });
  });
});
