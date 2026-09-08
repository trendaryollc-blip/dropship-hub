import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StoreStatsBar from "./StoreStatsBar";
import type { ConnectedStore } from "./ConnectedStoresList";
import type { PushedProduct } from "./PushedProductsList";

const makeConnection = (overrides: Partial<ConnectedStore> = {}): ConnectedStore => ({
  id: "s1",
  platform: "shopify",
  name: "My Store",
  url: "https://store.myshopify.com",
  status: "connected",
  connectedAt: "2024-01-01",
  lastSyncAt: new Date(Date.now() - 3600000).toISOString(),
  productCount: 5,
  ...overrides,
});

const makeProduct = (overrides: Partial<PushedProduct> = {}): PushedProduct => ({
  id: "p1",
  storeId: "s1",
  storeName: "My Store",
  productTitle: "Test Product",
  productImage: "",
  productPrice: 10,
  productUrl: "https://example.com",
  status: "live",
  pushedAt: "2024-01-01",
  ...overrides,
});

describe("StoreStatsBar", () => {
  it("renders null when no connections", () => {
    const { container } = render(
      <StoreStatsBar connections={[]} pushedProducts={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders stats with connections and pushed products", () => {
    render(
      <StoreStatsBar
        connections={[makeConnection()]}
        pushedProducts={[makeProduct({ status: "live" }), makeProduct({ id: "p2", status: "pushed" })]}
      />
    );
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Products Live")).toBeInTheDocument();
    expect(screen.getByText("Last Sync")).toBeInTheDocument();
    expect(screen.getByText("Errors")).toBeInTheDocument();
  });

  it("shows correct connected count", () => {
    render(
      <StoreStatsBar
        connections={[makeConnection(), makeConnection({ id: "s2", name: "Store 2" })]}
        pushedProducts={[]}
      />
    );
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows correct live product count", () => {
    render(
      <StoreStatsBar
        connections={[makeConnection()]}
        pushedProducts={[
          makeProduct({ status: "live" }),
          makeProduct({ id: "p2", status: "pushed" }),
          makeProduct({ id: "p3", status: "error" }),
        ]}
      />
    );
    const liveLabel = screen.getByText("Products Live").parentElement!;
    expect(liveLabel).toHaveTextContent("2");
  });

  it("shows correct error count", () => {
    render(
      <StoreStatsBar
        connections={[makeConnection()]}
        pushedProducts={[
          makeProduct({ status: "error" }),
          makeProduct({ id: "p2", status: "error" }),
        ]}
      />
    );
    const errorsLabel = screen.getByText("Errors").parentElement!;
    expect(errorsLabel).toHaveTextContent("2");
  });

  it("renders zero state for errors when no error products", () => {
    render(
      <StoreStatsBar
        connections={[makeConnection()]}
        pushedProducts={[makeProduct({ status: "live" })]}
      />
    );
    const errorsLabel = screen.getByText("Errors").parentElement!;
    expect(errorsLabel).toHaveTextContent("0");
  });

  it("shows Never when no connections have lastSyncAt", () => {
    render(
      <StoreStatsBar
        connections={[makeConnection({ lastSyncAt: undefined })]}
        pushedProducts={[]}
      />
    );
    const syncLabel = screen.getByText("Last Sync").parentElement!;
    expect(syncLabel).toHaveTextContent("Never");
  });
});
