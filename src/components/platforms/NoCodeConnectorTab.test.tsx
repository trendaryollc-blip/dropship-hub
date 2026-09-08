import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import NoCodeConnectorTab from "./NoCodeConnectorTab";

vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({
    user: { uid: "test-uid", email: "test@test.com", getIdToken: vi.fn().mockResolvedValue("token") },
  }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({}),
}));

vi.mock("lucide-react", () => ({
  Loader2: () => <div />,
  MousePointer2: () => <div />,
  Eye: () => <div />,
  ArrowRight: () => <div />,
}));

describe("NoCodeConnectorTab", () => {
  it("renders form fields", () => {
    render(<NoCodeConnectorTab onCreated={vi.fn()} />);
    expect(screen.getByText("No-Code Connector")).toBeDefined();
    expect(screen.getByText("Platform Name")).toBeDefined();
    expect(screen.getByText("Search URL Template")).toBeDefined();
    expect(screen.getByText("Product Link Regex")).toBeDefined();
  });

  it("URL validation", () => {
    render(<NoCodeConnectorTab onCreated={vi.fn()} />);
    const urlInput = screen.getByPlaceholderText(/example.com\/search/);
    fireEvent.change(urlInput, { target: { value: "https://example.com/search" } });
    expect(screen.getByText(/must contain/)).toBeDefined();
  });

  it("help section", () => {
    render(<NoCodeConnectorTab onCreated={vi.fn()} />);
    expect(screen.getByText("How to find field selectors")).toBeDefined();
  });

  it("submit button", () => {
    render(<NoCodeConnectorTab onCreated={vi.fn()} />);
    const btn = screen.getByText("Create Connector").closest("button");
    expect(btn).toBeDisabled();
  });
});
