import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ConnectedStoresList from "./ConnectedStoresList";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: null }),
}));

vi.mock("@/lib/store-catalog", () => ({
  STORE_CATALOG: [],
}));

describe("ConnectedStoresList", () => {
  it("renders connected stores", () => {
    render(
      <ConnectedStoresList
        stores={[
          {
            id: "s1",
            platform: "shopify",
            name: "My Shopify Store",
            url: "https://store.myshopify.com",
            status: "connected",
            connectedAt: "2024-01-01",
          },
        ]}
        syncing={null}
        onRefresh={vi.fn()}
        onSync={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByText("My Shopify Store")).toBeInTheDocument();
  });

  it("renders empty state when no stores", () => {
    const { container } = render(
      <ConnectedStoresList stores={[]} syncing={null} onRefresh={vi.fn()} onSync={vi.fn()} onDisconnect={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders connected status badge", () => {
    render(
      <ConnectedStoresList
        stores={[
          {
            id: "s1",
            platform: "shopify",
            name: "My Store",
            url: "https://store.myshopify.com",
            status: "connected",
            connectedAt: "2024-01-01",
          },
        ]}
        syncing={null}
        onRefresh={vi.fn()}
        onSync={vi.fn()}
        onDisconnect={vi.fn()}
      />
    );
    expect(screen.getByText("Connected")).toBeInTheDocument();
  });
});
