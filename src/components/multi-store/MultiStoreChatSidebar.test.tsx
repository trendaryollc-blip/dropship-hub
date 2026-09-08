import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MultiStoreChatSidebar from "./MultiStoreChatSidebar";

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn(() => Promise.resolve({})),
}));

describe("MultiStoreChatSidebar", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renders chat toggle button", () => {
    render(
      <MultiStoreChatSidebar storeCount={2} totalOrders={50} totalRevenue={2000} storeNames={["Store A", "Store B"]} />
    );
    expect(screen.getByTitle("Multi-Store AI Assistant")).toBeInTheDocument();
  });

  it("opens sidebar when clicked", () => {
    render(
      <MultiStoreChatSidebar storeCount={2} totalOrders={50} totalRevenue={2000} storeNames={["Store A", "Store B"]} />
    );

    fireEvent.click(screen.getByTitle("Multi-Store AI Assistant"));

    expect(screen.getByText("Multi-Store AI")).toBeInTheDocument();
    expect(screen.getByText("Ask anything about your multi-store setup")).toBeInTheDocument();
  });

  it("displays store context info", () => {
    render(
      <MultiStoreChatSidebar storeCount={2} totalOrders={50} totalRevenue={2000} storeNames={["Store A", "Store B"]} />
    );

    fireEvent.click(screen.getByTitle("Multi-Store AI Assistant"));

    expect(screen.getByText(/2 stores/)).toBeInTheDocument();
    expect(screen.getByText(/\$2,000 revenue/)).toBeInTheDocument();
  });

  it("has message input", () => {
    render(
      <MultiStoreChatSidebar storeCount={2} totalOrders={50} totalRevenue={2000} storeNames={["Store A", "Store B"]} />
    );

    fireEvent.click(screen.getByTitle("Multi-Store AI Assistant"));

    expect(screen.getByPlaceholderText("Ask about your stores...")).toBeInTheDocument();
  });

  it("shows quick prompt buttons", () => {
    render(
      <MultiStoreChatSidebar storeCount={2} totalOrders={50} totalRevenue={2000} storeNames={["Store A", "Store B"]} />
    );

    fireEvent.click(screen.getByTitle("Multi-Store AI Assistant"));

    expect(screen.getByText("How are my stores performing overall?")).toBeInTheDocument();
    expect(screen.getByText("Which store needs the most attention?")).toBeInTheDocument();
  });

  it("closes sidebar when X button clicked", () => {
    render(
      <MultiStoreChatSidebar storeCount={2} totalOrders={50} totalRevenue={2000} storeNames={["Store A", "Store B"]} />
    );

    fireEvent.click(screen.getByTitle("Multi-Store AI Assistant"));
    expect(screen.getByText("Multi-Store AI")).toBeInTheDocument();

    const closeButtons = screen.getAllByRole("button");
    const closeBtn = closeButtons.find((btn) => btn.querySelector("svg"));
    if (closeBtn) fireEvent.click(closeBtn);

    expect(screen.queryByText("Ask anything about your multi-store setup")).not.toBeInTheDocument();
  });
});
