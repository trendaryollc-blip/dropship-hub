import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PersonalizedRecommendations from "./PersonalizedRecommendations";
import * as AuthProvider from "@/components/auth/AuthProvider";
import * as SafeFetch from "@/lib/safe-fetch";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/components/auth/AuthProvider");

vi.mock("@/lib/safe-fetch");

vi.mock("next/link", () => ({
  default: ({ children, href, ...props }: any) => <a href={href} {...props}>{children}</a>,
}));

vi.mock("lucide-react", () => ({
  Sparkles: (props: any) => <div data-testid="icon-sparkles" {...props} />,
  ArrowRight: (props: any) => <div data-testid="icon-arrow" {...props} />,
  Package: (props: any) => <div data-testid="icon-package" {...props} />,
  Loader2: (props: any) => <div data-testid="icon-loader" {...props} />,
  RefreshCw: (props: any) => <div data-testid="icon-refresh" {...props} />,
  Search: (props: any) => <div data-testid="icon-search" {...props} />,
  Construction: (props: any) => <div data-testid="icon-construction" {...props} />,
  Database: (props: any) => <div data-testid="icon-database" {...props} />,
  Radio: (props: any) => <div data-testid="icon-radio" {...props} />,
  User: (props: any) => <div data-testid="icon-user" {...props} />,
}));

const mockRecommendations = [
  { id: "1", title: "Saved Widget", reason: "You saved this product", query: "saved widget", matchType: "saved", category: "Saved" },
  { id: "2", title: "fitness accessories", reason: "Run this search again", query: "fitness accessories", matchType: "recent-search", category: "Recent search" },
];

beforeEach(() => {
  vi.mocked(AuthProvider.useAuth).mockReturnValue({
    user: { uid: "user-1", getIdToken: vi.fn().mockResolvedValue("test-token") },
  } as any);
  vi.mocked(SafeFetch.safeFetch).mockResolvedValue({ recommendations: [] });
});

describe("PersonalizedRecommendations", () => {
  it("shows loading state initially", () => {
    vi.mocked(SafeFetch.safeFetch).mockReturnValue(new Promise(() => {}));
    render(<PersonalizedRecommendations />);
    expect(screen.getByText("Loading your saved products and searches...")).toBeInTheDocument();
  });

  it("renders recommendations after load", async () => {
    vi.mocked(SafeFetch.safeFetch).mockResolvedValue({ recommendations: mockRecommendations });
    render(<PersonalizedRecommendations />);
    expect(await screen.findByText("Saved Widget")).toBeInTheDocument();
    expect(screen.getByText("fitness accessories")).toBeInTheDocument();
  });

  it("renders section heading", () => {
    render(<PersonalizedRecommendations />);
    expect(screen.getByText("Recommended for You")).toBeInTheDocument();
  });

  it("does not claim AI analysis", async () => {
    vi.mocked(SafeFetch.safeFetch).mockResolvedValue({ recommendations: mockRecommendations });
    render(<PersonalizedRecommendations />);
    await screen.findByText("Saved Widget");
    expect(screen.queryByText(/AI is analyzing/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/AI analyzes/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+%$/)).not.toBeInTheDocument();
  });

  it("shows honest empty state when no history", async () => {
    vi.mocked(SafeFetch.safeFetch).mockResolvedValue({ recommendations: [] });
    render(<PersonalizedRecommendations />);
    expect(await screen.findByText("No history yet")).toBeInTheDocument();
    expect(screen.getByTestId("coming-soon")).toBeInTheDocument();
  });

  it("refresh button triggers fetch", async () => {
    vi.mocked(SafeFetch.safeFetch).mockResolvedValue({ recommendations: mockRecommendations });
    render(<PersonalizedRecommendations />);
    await screen.findByText("Saved Widget");
    const refreshButtons = screen.getAllByTestId("icon-refresh");
    fireEvent.click(refreshButtons[0].parentElement!);
    expect(SafeFetch.safeFetch).toHaveBeenCalled();
  });

  it("renders nothing when no user", () => {
    vi.mocked(AuthProvider.useAuth).mockReturnValue({ user: null } as any);
    const { container } = render(<PersonalizedRecommendations />);
    expect(container.innerHTML).toBe("");
  });
});
