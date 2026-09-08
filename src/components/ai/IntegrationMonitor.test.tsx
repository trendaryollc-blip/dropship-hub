import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import IntegrationMonitor from "./IntegrationMonitor";

const mockSafeFetch = vi.fn();
vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: (...args: any[]) => mockSafeFetch(...args),
}));

vi.mock("lucide-react", () => ({
  Plug: () => <div data-testid="icon" />,
  CheckCircle: () => <div data-testid="icon" />,
  AlertTriangle: () => <div data-testid="icon" />,
  XCircle: () => <div data-testid="icon" />,
  Shield: () => <div data-testid="icon" />,
  ChevronDown: () => <div data-testid="icon" />,
  ChevronUp: () => <div data-testid="icon" />,
}));

describe("IntegrationMonitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders title", () => {
    render(<IntegrationMonitor uid="user-1" />);
    expect(screen.getByText("Integration Monitor")).toBeInTheDocument();
  });

  it("renders Check All button", () => {
    render(<IntegrationMonitor uid="user-1" />);
    expect(screen.getByText("Check All")).toBeInTheDocument();
  });

  it("renders description when no data", () => {
    render(<IntegrationMonitor uid="user-1" />);
    expect(screen.getByText("Monitor health of all your connected services and APIs.")).toBeInTheDocument();
  });

  it("shows loading skeletons when checking", async () => {
    mockSafeFetch.mockReturnValue(new Promise(() => {}));
    render(<IntegrationMonitor uid="user-1" />);
    fireEvent.click(screen.getByText("Check All"));
    await waitFor(() => {
      expect(screen.getByText("Checking...")).toBeInTheDocument();
    });
    const skeletons = document.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("displays integrations after check", async () => {
    mockSafeFetch.mockResolvedValue({
      integrations: [
        { id: "s1", name: "Shopify", type: "store", status: "healthy", lastSync: "2025-01-15T10:00:00Z", issues: [], healthScore: 95 },
      ],
      summary: { total: 1, healthy: 1, warning: 0, error: 0, disconnected: 0 },
      insights: [],
    });
    render(<IntegrationMonitor uid="user-1" />);
    fireEvent.click(screen.getByText("Check All"));
    await waitFor(() => expect(screen.getByText("Shopify")).toBeInTheDocument());
  });

  it("displays healthy count", async () => {
    mockSafeFetch.mockResolvedValue({
      integrations: [],
      summary: { total: 3, healthy: 2, warning: 1, error: 0, disconnected: 0 },
      insights: [],
    });
    render(<IntegrationMonitor uid="user-1" />);
    fireEvent.click(screen.getByText("Check All"));
    await waitFor(() => expect(screen.getByText("2/3")).toBeInTheDocument());
  });

  it("displays insights", async () => {
    mockSafeFetch.mockResolvedValue({
      integrations: [],
      summary: { total: 0, healthy: 0, warning: 0, error: 0, disconnected: 0 },
      insights: ["All systems operational"],
    });
    render(<IntegrationMonitor uid="user-1" />);
    fireEvent.click(screen.getByText("Check All"));
    await waitFor(() => expect(screen.getByText("All systems operational")).toBeInTheDocument());
  });
});
