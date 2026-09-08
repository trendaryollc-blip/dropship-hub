import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PlatformsTab from "./PlatformsTab";
import { Store, Package, ShoppingCart } from "lucide-react";
import type { PlatformConnector } from "./constants";

vi.mock("next/link", () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

const mockPlatforms: PlatformConnector[] = [
  {
    id: "aliexpress",
    name: "AliExpress",
    description: "Direct product search",
    envKey: "RAINFOREST_API_KEY",
    configured: true,
    icon: Store,
    apiEndpoint: "/api/platforms/aliexpress",
    features: ["Product search", "Price comparison"],
    href: "/products",
    hrefLabel: "Search Products",
  },
  {
    id: "cj",
    name: "CJ Dropshipping",
    description: "Official CJ API integration",
    envKey: "CJ_API_KEY",
    configured: false,
    icon: Package,
    apiEndpoint: "/api/platforms/cj",
    features: ["Product catalog"],
    href: "/suppliers",
    hrefLabel: "Find Suppliers",
  },
];

describe("PlatformsTab", () => {
  it("renders platform connectors", () => {
    render(<PlatformsTab platformConnectors={mockPlatforms} />);
    expect(screen.getByText("AliExpress")).toBeDefined();
    expect(screen.getByText("CJ Dropshipping")).toBeDefined();
  });

  it("shows configured status", () => {
    render(<PlatformsTab platformConnectors={mockPlatforms} />);
    const connected = screen.getAllByText("Connected");
    expect(connected.length).toBeGreaterThanOrEqual(1);
    const notConfigured = screen.getAllByText("Not Configured");
    expect(notConfigured.length).toBeGreaterThanOrEqual(1);
  });

  it("has link to store page", () => {
    render(<PlatformsTab platformConnectors={mockPlatforms} />);
    const storeLink = screen.getByText("Need to connect your store?").closest("a");
    expect(storeLink?.getAttribute("href")).toBe("/store");
  });

  it("renders platform features", () => {
    render(<PlatformsTab platformConnectors={mockPlatforms} />);
    expect(screen.getByText("Product search")).toBeDefined();
    expect(screen.getByText("Price comparison")).toBeDefined();
    expect(screen.getByText("Product catalog")).toBeDefined();
  });

  it("renders platform descriptions", () => {
    render(<PlatformsTab platformConnectors={mockPlatforms} />);
    expect(screen.getByText("Direct product search")).toBeDefined();
    expect(screen.getByText("Official CJ API integration")).toBeDefined();
  });

  it("renders platform integration header", () => {
    render(<PlatformsTab platformConnectors={mockPlatforms} />);
    expect(screen.getByText("Platform Integrations")).toBeDefined();
  });

  it("renders href labels for each platform", () => {
    render(<PlatformsTab platformConnectors={mockPlatforms} />);
    expect(screen.getByText("Search Products")).toBeDefined();
    expect(screen.getByText("Find Suppliers")).toBeDefined();
  });
});
