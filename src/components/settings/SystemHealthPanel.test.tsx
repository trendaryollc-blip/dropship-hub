import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SystemHealthPanel from "./SystemHealthPanel";
import type { AIProvider, PlatformConnector } from "./constants";
import { Store, Package, ShoppingCart } from "lucide-react";

const mockProviders: AIProvider[] = [
  {
    id: "groq", name: "Groq", description: "Fast", envKey: "GROQ_API_KEY",
    configured: true, active: true, features: ["Speed"], freeTier: "14K/day",
    priority: 1, website: "https://groq.com", usedFor: "Price optimization", href: "/ai",
  },
  {
    id: "openai", name: "OpenAI", description: "GPT", envKey: "OPENAI_API_KEY",
    configured: false, active: true, features: ["Reasoning"], freeTier: "Pay per use",
    priority: 2, website: "https://openai.com", usedFor: "Analysis", href: "/ai",
  },
];

const mockStores = [
  { id: "1", name: "Store 1", platform: "shopify", status: "connected" },
  { id: "2", name: "Store 2", platform: "woocommerce", status: "disconnected" },
];

const mockPlatforms: PlatformConnector[] = [
  {
    id: "aliexpress", name: "AliExpress", description: "Search", envKey: "RAINFOREST_API_KEY",
    configured: true, icon: Store, apiEndpoint: "/api/aliexpress",
    features: ["Search"], href: "/products", hrefLabel: "Search",
  },
  {
    id: "cj", name: "CJ", description: "CJ API", envKey: "CJ_API_KEY",
    configured: false, icon: Package, apiEndpoint: "/api/cj",
    features: ["Catalog"], href: "/suppliers", hrefLabel: "Find",
  },
];

describe("SystemHealthPanel", () => {
  it("shows provider count (configured/total)", () => {
    render(<SystemHealthPanel providers={mockProviders} stores={mockStores} platformConnectors={mockPlatforms} />);
    expect(screen.getAllByText("1/2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Providers")).toBeDefined();
  });

  it("shows store count", () => {
    render(<SystemHealthPanel providers={mockProviders} stores={mockStores} platformConnectors={mockPlatforms} />);
    expect(screen.getAllByText("1/2").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Stores")).toBeDefined();
  });

  it("shows health indicator as healthy when all configured", () => {
    const allConfiguredProviders: AIProvider[] = [
      { ...mockProviders[0], configured: true },
      { ...mockProviders[1], configured: true },
    ];
    const allConnectedStores = [
      { ...mockStores[0], status: "connected" },
      { ...mockStores[1], status: "connected" },
    ];
    render(<SystemHealthPanel providers={allConfiguredProviders} stores={allConnectedStores} platformConnectors={mockPlatforms} />);
    expect(screen.getByText("All Systems Operational")).toBeDefined();
  });

  it("shows health indicator as unconfigured when nothing configured", () => {
    const noConfigProviders = mockProviders.map((p) => ({ ...p, configured: false }));
    const noConnectedStores = mockStores.map((s) => ({ ...s, status: "disconnected" }));
    render(<SystemHealthPanel providers={noConfigProviders} stores={noConnectedStores} platformConnectors={mockPlatforms} />);
    expect(screen.getByText("Not Configured")).toBeDefined();
  });

  it("shows platform count", () => {
    render(<SystemHealthPanel providers={mockProviders} stores={mockStores} platformConnectors={mockPlatforms} />);
    expect(screen.getByText("Platforms")).toBeDefined();
  });

  it("shows active providers progress", () => {
    render(<SystemHealthPanel providers={mockProviders} stores={mockStores} platformConnectors={mockPlatforms} />);
    expect(screen.getByText(/Active providers: 2\/2/)).toBeDefined();
  });

  it("renders system health header", () => {
    render(<SystemHealthPanel providers={mockProviders} stores={mockStores} platformConnectors={mockPlatforms} />);
    expect(screen.getByText("System Health")).toBeDefined();
  });

  it("handles empty providers list", () => {
    render(<SystemHealthPanel providers={[]} stores={[]} platformConnectors={[]} />);
    expect(screen.getAllByText("0/0").length).toBeGreaterThanOrEqual(1);
  });
});
