import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StoreConnectModal from "./StoreConnectModal";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "test@test.com" },
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
});
