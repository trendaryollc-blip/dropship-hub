import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import InventorySyncPanel from "./InventorySyncPanel";
import type { StoreInventoryItem } from "@/types/multi-store";

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(() => Promise.resolve({})),
}));

vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ error: vi.fn(), success: vi.fn() }),
}));

const mockInventory: StoreInventoryItem[] = [
  {
    id: "inv1",
    productId: "p1",
    title: "Wireless Earbuds",
    stores: [
      { storeId: "s1", storeName: "Store A", storePlatform: "shopify", stock: 50, price: 29.99, status: "in_stock", lastUpdated: "2025-01-15" },
    ],
    totalStock: 50,
    lastSyncedAt: "2025-01-15",
  },
  {
    id: "inv2",
    productId: "p2",
    title: "Phone Case",
    stores: [
      { storeId: "s1", storeName: "Store A", storePlatform: "shopify", stock: 10, price: 12.99, status: "low_stock", lastUpdated: "2025-01-15" },
      { storeId: "s2", storeName: "Store B", storePlatform: "woocommerce", stock: 25, price: 14.99, status: "in_stock", lastUpdated: "2025-01-15" },
    ],
    totalStock: 35,
    lastSyncedAt: "2025-01-15",
  },
];

describe("InventorySyncPanel", () => {
  it("renders inventory items", () => {
    render(<InventorySyncPanel inventory={mockInventory} />);
    expect(screen.getByText("Wireless Earbuds")).toBeInTheDocument();
    expect(screen.getByText("Phone Case")).toBeInTheDocument();
  });

  it("shows empty state when no inventory", () => {
    render(<InventorySyncPanel inventory={[]} />);
    expect(screen.getByText(/No inventory data yet/)).toBeInTheDocument();
  });

  it("displays store count and total stock", () => {
    render(<InventorySyncPanel inventory={mockInventory} />);
    expect(screen.getByText(/1 store · Total stock: 50/)).toBeInTheDocument();
    expect(screen.getByText(/2 stores · Total stock: 35/)).toBeInTheDocument();
  });

  it("sync button triggers handleSync", async () => {
    const { safeFetch } = await import("@/lib/safe-fetch");
    render(<InventorySyncPanel inventory={mockInventory} />);

    const syncButtons = screen.getAllByRole("button");
    fireEvent.click(syncButtons[0]);

    await waitFor(() => {
      expect(safeFetch).toHaveBeenCalledWith(
        "/api/multi-store/inventory",
        expect.objectContaining({ method: "POST" })
      );
    });
  });

  it("shows loading state while syncing", async () => {
    const { safeFetch } = await import("@/lib/safe-fetch");
    let resolvePromise: () => void;
    (safeFetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );

    render(<InventorySyncPanel inventory={mockInventory} />);
    const syncButtons = screen.getAllByRole("button");
    fireEvent.click(syncButtons[0]);

    await waitFor(() => {
      expect(screen.getAllByRole("button")[0]).toBeDisabled();
    });

    resolvePromise!();
  });
});
