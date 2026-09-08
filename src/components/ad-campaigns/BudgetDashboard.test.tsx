import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BudgetDashboard from "./BudgetDashboard";

vi.mock("@/hooks/useAPI", () => ({
  useAPI: vi.fn(() => ({ data: undefined, isLoading: true })),
  useMutation: vi.fn(() => ({ trigger: vi.fn(), isMutating: false })),
  revalidate: vi.fn(),
}));

vi.mock("@/components/ad-campaigns/BudgetRecommendation", () => ({
  default: ({ rec }: any) => <div data-testid="budget-rec">{rec.campaignName}</div>,
}));

vi.mock("lucide-react", () => ({
  Zap: () => <div />,
  Loader2: () => <div />,
  TrendingUp: () => <div />,
  DollarSign: () => <div />,
  Target: () => <div />,
}));

import { useAPI, useMutation } from "@/hooks/useAPI";

describe("BudgetDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading skeleton", () => {
    (useAPI as any).mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<BudgetDashboard />);
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });

  it("renders empty state when no recommendations", () => {
    (useAPI as any).mockReturnValue({ data: { recommendations: [] }, isLoading: false });
    render(<BudgetDashboard />);
    expect(screen.getByText("No recommendations yet")).toBeDefined();
  });

  it("renders recommendations", () => {
    (useAPI as any).mockReturnValue({
      data: {
        recommendations: [
          {
            id: "r1",
            type: "increase",
            campaignId: "c1",
            campaignName: "Summer Sale",
            currentBudget: 50,
            recommendedBudget: 100,
            reason: "High ROAS",
            expectedImpact: { roasChange: 0.5, revenueChange: 200, confidence: 0.85 },
            status: "pending",
            expiresAt: "2025-12-31",
            createdAt: "2025-01-01",
          },
        ],
      },
      isLoading: false,
    });
    render(<BudgetDashboard />);
    expect(screen.getByText("Pending Recommendations (1)")).toBeDefined();
    expect(screen.getByText("Summer Sale")).toBeDefined();
  });

  it("renders run optimizer button", () => {
    (useAPI as any).mockReturnValue({ data: { recommendations: [] }, isLoading: false });
    render(<BudgetDashboard />);
    expect(screen.getByText("Run Optimizer")).toBeDefined();
  });
});
