import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import StoresTab from "./StoresTab";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const mockStores = [
  { id: "1", name: "My Shopify Store", platform: "shopify", status: "connected", url: "myshop.myshopify.com" },
  { id: "2", name: "Woo Store", platform: "woocommerce", status: "disconnected", url: "" },
];

describe("StoresTab", () => {
  it("renders connected stores", () => {
    render(<StoresTab stores={mockStores} />);
    expect(screen.getByText("My Shopify Store")).toBeDefined();
    expect(screen.getByText("Woo Store")).toBeDefined();
  });

  it("shows empty state with connect button when no stores", () => {
    render(<StoresTab stores={[]} />);
    expect(screen.getByText("No stores connected yet")).toBeDefined();
    const connectBtn = screen.getByText("Connect a Store");
    expect(connectBtn).toBeDefined();
    expect(connectBtn.closest("a")?.getAttribute("href")).toBe("/store");
  });

  it("shows connection status for stores", () => {
    render(<StoresTab stores={mockStores} />);
    const connectedLabels = screen.getAllByText("Connected");
    expect(connectedLabels.length).toBeGreaterThanOrEqual(1);
    const disconnectedLabels = screen.getAllByText("Disconnected");
    expect(disconnectedLabels.length).toBeGreaterThanOrEqual(1);
  });

  it("shows store platform and url", () => {
    render(<StoresTab stores={mockStores} />);
    expect(screen.getByText(/shopify/)).toBeDefined();
    expect(screen.getByText(/myshop.myshopify.com/)).toBeDefined();
  });

  it("shows manage link for each store", () => {
    render(<StoresTab stores={mockStores} />);
    const manageLinks = screen.getAllByText("Manage");
    expect(manageLinks.length).toBe(2);
    expect(manageLinks[0].closest("a")?.getAttribute("href")).toBe("/store");
  });

  it("renders the store connections header", () => {
    render(<StoresTab stores={mockStores} />);
    expect(screen.getByText("Store Connections")).toBeDefined();
  });

  it("shows 'No URL' when store url is empty", () => {
    render(<StoresTab stores={mockStores} />);
    expect(screen.getByText(/No URL/)).toBeDefined();
  });
});
