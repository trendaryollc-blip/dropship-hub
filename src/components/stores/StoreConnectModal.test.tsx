import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StoreConnectModal from "./StoreConnectModal";

const mockGetIdToken = vi.fn().mockResolvedValue("mock_id_token");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "test@test.com", getIdToken: mockGetIdToken },
  }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({}),
}));

vi.mock("lucide-react", () => ({
  X: () => <div />,
  Loader2: () => <div />,
  CheckCircle2: () => <div />,
  XCircle: () => <div />,
  ExternalLink: () => <div />,
  ChevronDown: () => <div />,
  ChevronUp: () => <div />,
  Store: () => <div />,
  Globe: () => <div />,
  AlertCircle: () => <div />,
}));

const mockPlatform = {
  id: "shopify",
  name: "Shopify",
  category: "E-commerce Platform",
  description: "Connect your Shopify store",
  color: "#96bf48",
  bg: "#f0fdf4",
  fields: [
    { key: "url", label: "Store URL", placeholder: "https://mystore.myshopify.com", type: "url" as const, required: true },
  ],
  keyUrl: "https://shopify.com",
  setupGuide: [{ text: "Go to Shopify Admin" }],
};

const mockOAuthPlatform = {
  ...mockPlatform,
  authType: "oauth" as const,
  oauthFields: [
    { key: "shop", label: "Shop URL", placeholder: "your-store.myshopify.com", type: "url" as const, required: true },
  ],
};

describe("StoreConnectModal", () => {
  it("renders form fields", () => {
    render(<StoreConnectModal platform={mockPlatform} onClose={vi.fn()} onConnected={vi.fn()} />);
    expect(screen.getByText("Connect Shopify")).toBeDefined();
    expect(screen.getByText("Store URL")).toBeDefined();
    expect(screen.getByText("Store Name")).toBeDefined();
  });

  it("close button calls onClose", () => {
    const onClose = vi.fn();
    render(<StoreConnectModal platform={mockPlatform} onClose={onClose} onConnected={vi.fn()} />);
    const closeBtn = screen.getAllByRole("button").find((b) => !b.textContent?.trim());
    if (closeBtn) fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("connect button disabled until valid", () => {
    render(<StoreConnectModal platform={mockPlatform} onClose={vi.fn()} onConnected={vi.fn()} />);
    const connectBtn = screen.getByText("Connect Store").closest("button");
    expect(connectBtn).toBeDisabled();
  });

  it("shows One-Click Connect card for OAuth platforms", () => {
    render(<StoreConnectModal platform={mockOAuthPlatform} onClose={vi.fn()} onConnected={vi.fn()} />);
    expect(screen.getByText("Recommended: One-Click Connect")).toBeDefined();
    expect(screen.getByText(/securely connect via Shopify OAuth/)).toBeDefined();
  });

  it("shows Connect with Shopify button for OAuth platforms", () => {
    render(<StoreConnectModal platform={mockOAuthPlatform} onClose={vi.fn()} onConnected={vi.fn()} />);
    expect(screen.getByText(/Connect with Shopify/)).toBeDefined();
  });

  it("does not show Store Name field in OAuth mode", () => {
    render(<StoreConnectModal platform={mockOAuthPlatform} onClose={vi.fn()} onConnected={vi.fn()} />);
    expect(screen.queryByText("Store Name")).toBeNull();
  });

  it("shows Shop URL field from oauthFields in OAuth mode", () => {
    render(<StoreConnectModal platform={mockOAuthPlatform} onClose={vi.fn()} onConnected={vi.fn()} />);
    expect(screen.getByText("Shop URL")).toBeDefined();
  });

  it("OAuth connect button disabled until shop field filled", () => {
    render(<StoreConnectModal platform={mockOAuthPlatform} onClose={vi.fn()} onConnected={vi.fn()} />);
    const oauthBtn = screen.getByText(/Connect with Shopify/).closest("button");
    expect(oauthBtn).toBeDisabled();
  });
});
