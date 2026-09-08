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
}));

const mockRecommendations = [
  { id: "1", title: "Winning Product A", reason: "High demand", query: "product a", confidence: 92, category: "electronics" },
  { id: "2", title: "Winning Product B", reason: "Low competition", query: "product b", confidence: 87, category: "home" },
];

beforeEach(() => {
  vi.mocked(AuthProvider.useAuth).mockReturnValue({ user: { uid: "user-1" } } as any);
  vi.mocked(SafeFetch.safeFetch).mockResolvedValue({ recommendations: [] });
});

describe("PersonalizedRecommendations", () => {
  it("shows loading state initially", () => {
    vi.mocked(SafeFetch.safeFetch).mockReturnValue(new Promise(() => {}));
    render(<PersonalizedRecommendations />);
    expect(screen.getByText("AI is analyzing your portfolio...")).toBeInTheDocument();
  });

  it("renders recommendations after load", async () => {
    vi.mocked(SafeFetch.safeFetch).mockResolvedValue({ recommendations: mockRecommendations });
    render(<PersonalizedRecommendations />);
    expect(await screen.findByText("Winning Product A")).toBeInTheDocument();
    expect(screen.getByText("Winning Product B")).toBeInTheDocument();
  });

  it("renders section heading", () => {
    render(<PersonalizedRecommendations />);
    expect(screen.getByText("Recommended for You")).toBeInTheDocument();
  });

  it("refresh button triggers fetch", async () => {
    vi.mocked(SafeFetch.safeFetch).mockResolvedValue({ recommendations: mockRecommendations });
    render(<PersonalizedRecommendations />);
    await screen.findByText("Winning Product A");
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
