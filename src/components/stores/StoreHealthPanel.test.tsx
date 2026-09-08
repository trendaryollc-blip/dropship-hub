import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import StoreHealthPanel from "./StoreHealthPanel";
import type { ConnectedStore } from "./ConnectedStoresList";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: { uid: "test-uid", email: "test@test.com" } }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(() => Promise.resolve({})),
}));

const makeConnection = (overrides: Partial<ConnectedStore> = {}): ConnectedStore => ({
  id: "s1",
  platform: "shopify",
  name: "My Store",
  url: "https://store.myshopify.com",
  status: "connected",
  connectedAt: "2024-01-01",
  lastSyncAt: new Date(Date.now() - 86400000).toISOString(),
  productCount: 5,
  ...overrides,
});

describe("StoreHealthPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders health status for connected stores", async () => {
    render(
      <StoreHealthPanel
        connections={[makeConnection()]}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("My Store")).toBeInTheDocument();
    });
    expect(screen.getByText("Store Health")).toBeInTheDocument();
    expect(screen.getByText("healthy")).toBeInTheDocument();
  });

  it("shows warning for stores with no sync", async () => {
    render(
      <StoreHealthPanel
        connections={[makeConnection({ lastSyncAt: undefined })]}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("My Store")).toBeInTheDocument();
    });
    expect(screen.getByText("warning")).toBeInTheDocument();
    expect(screen.getByText("Never synced")).toBeInTheDocument();
  });

  it("shows warning for old sync", async () => {
    const oldDate = new Date(Date.now() - 10 * 86400000).toISOString();
    render(
      <StoreHealthPanel
        connections={[makeConnection({ lastSyncAt: oldDate })]}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("My Store")).toBeInTheDocument();
    });
    expect(screen.getByText("warning")).toBeInTheDocument();
    expect(screen.getByText("Synced over 7 days ago")).toBeInTheDocument();
  });

  it("shows error status for stores with error status", async () => {
    render(
      <StoreHealthPanel
        connections={[makeConnection({ status: "error" })]}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("My Store")).toBeInTheDocument();
    });
    expect(screen.getByText("error")).toBeInTheDocument();
    expect(screen.getByText("Connection has errors")).toBeInTheDocument();
  });

  it("shows warning for zero product count", async () => {
    render(
      <StoreHealthPanel
        connections={[makeConnection({ productCount: 0 })]}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("My Store")).toBeInTheDocument();
    });
    expect(screen.getByText("warning")).toBeInTheDocument();
    expect(screen.getByText("No products pushed")).toBeInTheDocument();
  });

  it("renders empty state when no connections", async () => {
    const { container } = render(
      <StoreHealthPanel connections={[]} />
    );
    await waitFor(() => {
      expect(screen.getByText("Store Health")).toBeInTheDocument();
    });
    expect(screen.queryByText("healthy")).not.toBeInTheDocument();
  });

  it("shows health panel header", async () => {
    render(<StoreHealthPanel connections={[makeConnection()]} />);
    await waitFor(() => {
      expect(screen.getByText("Store Health")).toBeInTheDocument();
    });
  });

  it("shows multiple health statuses", async () => {
    render(
      <StoreHealthPanel
        connections={[
          makeConnection({ id: "s1", name: "Store 1", status: "connected" }),
          makeConnection({ id: "s2", name: "Store 2", status: "error", lastSyncAt: undefined, productCount: 0 }),
        ]}
      />
    );
    await waitFor(() => {
      expect(screen.getByText("Store 1")).toBeInTheDocument();
    });
    expect(screen.getByText("Store 2")).toBeInTheDocument();
  });
});
