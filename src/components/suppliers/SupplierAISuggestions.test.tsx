import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

let mockUser: any = { uid: "test-uid" };
let mockSuggestions: any[] = [];
let mockFetchResolved = true;

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));
vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} {...props}>{children}</a>
  ),
}));
vi.mock("@/components/auth/AuthProvider", () => ({
  useAuth: () => ({ user: mockUser }),
}));
vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockImplementation(() => {
    if (!mockFetchResolved) return Promise.reject(new Error("fetch failed"));
    return Promise.resolve({ suggestions: mockSuggestions });
  }),
}));
vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: null, isLoading: false }),
  useMutation: () => ({ trigger: vi.fn(), isMutating: false }),
  revalidate: vi.fn(),
}));
vi.mock("lucide-react", () => ({
  Sparkles: (p: any) => <div data-testid="icon-sparkles" />,
  ArrowRight: (p: any) => <div data-testid="icon-arrow-right" />,
  Shield: (p: any) => <div data-testid="icon-shield" />,
  Loader2: (p: any) => <div data-testid="icon-loader" />,
  RefreshCw: (p: any) => <div data-testid="icon-refresh" />,
}));

import SupplierAISuggestions from "./SupplierAISuggestions";

describe("SupplierAISuggestions", () => {
  it("renders nothing when no user", () => {
    mockUser = null;
    const { container } = render(<SupplierAISuggestions />);
    expect(container.innerHTML).toBe("");
    mockUser = { uid: "test-uid" };
  });

  it("shows loading state before fetch completes", () => {
    mockSuggestions = [];
    mockFetchResolved = true;
    render(<SupplierAISuggestions />);
    expect(screen.getByText("AI is analyzing your supplier needs...")).toBeInTheDocument();
  });

  it("shows the AI recommended heading", () => {
    render(<SupplierAISuggestions />);
    expect(screen.getByText("AI Recommended Suppliers")).toBeInTheDocument();
  });

  it("renders the Get AI-recommended button after loading completes", async () => {
    mockSuggestions = [];
    mockFetchResolved = true;
    render(<SupplierAISuggestions />);
    await waitFor(() => {
      expect(screen.getByText(/Get AI-recommended suppliers for your products/)).toBeInTheDocument();
    });
  });

  it("renders refresh button after loading completes", async () => {
    mockSuggestions = [];
    mockFetchResolved = true;
    render(<SupplierAISuggestions />);
    await waitFor(() => {
      expect(screen.getByTestId("icon-refresh")).toBeInTheDocument();
    });
  });

  it("renders suggestion cards when suggestions are returned", async () => {
    mockSuggestions = [
      { id: "s1", name: "Alpha Supplier", reason: "Great for electronics", reliabilityScore: 92, matchScore: 88, badge: "gold" },
    ];
    mockFetchResolved = true;
    render(<SupplierAISuggestions />);
    await waitFor(() => {
      expect(screen.getByText("Alpha Supplier")).toBeInTheDocument();
      expect(screen.getByText("Great for electronics")).toBeInTheDocument();
    });
  });

  it("renders badge for each suggestion", async () => {
    mockSuggestions = [
      { id: "s1", name: "Alpha Supplier", reason: "Great", reliabilityScore: 92, matchScore: 88, badge: "gold" },
    ];
    mockFetchResolved = true;
    render(<SupplierAISuggestions />);
    await waitFor(() => {
      expect(screen.getByText("gold")).toBeInTheDocument();
    });
  });

  it("renders score ring for each suggestion", async () => {
    mockSuggestions = [
      { id: "s1", name: "Alpha Supplier", reason: "Great", reliabilityScore: 92, matchScore: 88, badge: "gold" },
    ];
    mockFetchResolved = true;
    render(<SupplierAISuggestions />);
    await waitFor(() => {
      expect(screen.getByText("92")).toBeInTheDocument();
    });
  });

  it("renders link to supplier detail page", async () => {
    mockSuggestions = [
      { id: "s1", name: "Alpha Supplier", reason: "Great", reliabilityScore: 92, matchScore: 88, badge: "gold" },
    ];
    mockFetchResolved = true;
    render(<SupplierAISuggestions />);
    await waitFor(() => {
      const link = screen.getByText("Alpha Supplier").closest("a");
      expect(link).toHaveAttribute("href", "/suppliers/s1");
    });
  });

  it("renders multiple suggestions", async () => {
    mockSuggestions = [
      { id: "s1", name: "Alpha Supplier", reason: "Great", reliabilityScore: 92, matchScore: 88, badge: "gold" },
      { id: "s2", name: "Beta Supplier", reason: "Good", reliabilityScore: 85, matchScore: 80, badge: "silver" },
    ];
    mockFetchResolved = true;
    render(<SupplierAISuggestions />);
    await waitFor(() => {
      expect(screen.getByText("Alpha Supplier")).toBeInTheDocument();
      expect(screen.getByText("Beta Supplier")).toBeInTheDocument();
    });
  });

  it("shows AI subtitle text", async () => {
    mockSuggestions = [];
    mockFetchResolved = true;
    render(<SupplierAISuggestions />);
    await waitFor(() => {
      expect(screen.getByText(/Based on your product portfolio/)).toBeInTheDocument();
    });
  });

  it("shows description under Get AI-recommended button", async () => {
    mockSuggestions = [];
    mockFetchResolved = true;
    render(<SupplierAISuggestions />);
    await waitFor(() => {
      expect(screen.getByText(/AI matches suppliers to your portfolio/)).toBeInTheDocument();
    });
  });
});
