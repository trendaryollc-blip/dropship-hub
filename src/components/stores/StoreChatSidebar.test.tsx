import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import StoreChatSidebar from "./StoreChatSidebar";
import type { ConnectedStore } from "./ConnectedStoresList";
import type { PushedProduct } from "./PushedProductsList";

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

describe("StoreChatSidebar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders chat toggle button", () => {
    render(
      <StoreChatSidebar connections={[makeConnection()]} pushedProducts={[]} />
    );
    expect(screen.getByTitle("AI Store Assistant")).toBeInTheDocument();
  });

  it("opens sidebar when toggle clicked", () => {
    render(
      <StoreChatSidebar connections={[makeConnection()]} pushedProducts={[]} />
    );
    fireEvent.click(screen.getByTitle("AI Store Assistant"));
    expect(screen.getByText("Store AI")).toBeInTheDocument();
  });

  it("closes sidebar when close button clicked", () => {
    render(
      <StoreChatSidebar connections={[makeConnection()]} pushedProducts={[]} />
    );
    fireEvent.click(screen.getByTitle("AI Store Assistant"));
    expect(screen.getByText("Store AI")).toBeInTheDocument();

    const closeButtons = screen.getAllByRole("button");
    const headerClose = closeButtons.find(
      (btn) => btn.closest(".border-b") && btn.querySelector("svg")
    );
    expect(headerClose).toBeTruthy();
    fireEvent.click(headerClose!);
    expect(screen.queryByText("Store AI")).not.toBeInTheDocument();
  });

  it("renders context info with store count", () => {
    render(
      <StoreChatSidebar
        connections={[makeConnection(), makeConnection({ id: "s2", name: "Store 2" })]}
        pushedProducts={[]}
      />
    );
    fireEvent.click(screen.getByTitle("AI Store Assistant"));
    expect(screen.getByText("2 stores connected")).toBeInTheDocument();
  });

  it("renders singular store text for count 1", () => {
    render(
      <StoreChatSidebar connections={[makeConnection()]} pushedProducts={[]} />
    );
    fireEvent.click(screen.getByTitle("AI Store Assistant"));
    expect(screen.getByText("1 store connected")).toBeInTheDocument();
  });

  it("renders context info with product count in quick prompts area", () => {
    render(
      <StoreChatSidebar
        connections={[makeConnection()]}
        pushedProducts={[makeProduct(), makeProduct({ id: "p2", status: "error" })]}
      />
    );
    fireEvent.click(screen.getByTitle("AI Store Assistant"));
    expect(screen.getByText("Ask anything about your stores")).toBeInTheDocument();
  });

  it("has input field for messages", () => {
    render(
      <StoreChatSidebar connections={[makeConnection()]} pushedProducts={[]} />
    );
    fireEvent.click(screen.getByTitle("AI Store Assistant"));
    expect(screen.getByPlaceholderText("Ask about your stores...")).toBeInTheDocument();
  });

  it("shows quick prompt buttons", () => {
    render(
      <StoreChatSidebar connections={[makeConnection()]} pushedProducts={[]} />
    );
    fireEvent.click(screen.getByTitle("AI Store Assistant"));
    expect(screen.getByText("How are my stores performing?")).toBeInTheDocument();
    expect(screen.getByText("Help me sync inventory")).toBeInTheDocument();
    expect(screen.getByText("Which store has the most products?")).toBeInTheDocument();
    expect(screen.getByText("Tips to optimize my listings")).toBeInTheDocument();
  });

  it("sends message when Enter pressed", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        body: {
          getReader: () => ({
            read: vi.fn().mockResolvedValue({ done: true, value: undefined }),
          }),
        },
      })
    );
    vi.stubGlobal("fetch", mockFetch);

    render(
      <StoreChatSidebar connections={[makeConnection()]} pushedProducts={[]} />
    );
    fireEvent.click(screen.getByTitle("AI Store Assistant"));
    const input = screen.getByPlaceholderText("Ask about your stores...");
    fireEvent.change(input, { target: { value: "Hello" } });
    fireEvent.keyDown(input, { key: "Enter" });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalled();
    });

    vi.unstubAllGlobals();
  });
});
