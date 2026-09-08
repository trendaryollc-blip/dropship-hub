import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import BudgetRecommendation from "./BudgetRecommendation";

vi.mock("@/hooks/useAPI", () => ({
  useMutation: vi.fn(() => ({ trigger: vi.fn(), isMutating: false })),
}));

const mockRec = {
  id: "r1",
  type: "scale_up",
  campaignId: "c1",
  campaignName: "Summer Sale",
  currentBudget: 50,
  recommendedBudget: 75,
  reason: "ROAS is above 3x for 7 days",
  expectedImpact: { roasChange: 0.5, revenueChange: 200, confidence: 0.85 },
  status: "pending",
  expiresAt: "2025-02-01",
  createdAt: "2025-01-15",
};

const acceptedRec = { ...mockRec, id: "r2", status: "accepted" };
const rejectedRec = { ...mockRec, id: "r3", status: "rejected" };

describe("BudgetRecommendation", () => {
  it("renders campaign name and reason", () => {
    render(<BudgetRecommendation rec={mockRec} />);
    expect(screen.getByText("Summer Sale")).toBeDefined();
    expect(screen.getByText("ROAS is above 3x for 7 days")).toBeDefined();
  });

  it("renders recommendation type label", () => {
    render(<BudgetRecommendation rec={mockRec} />);
    expect(screen.getByText("Scale Up")).toBeDefined();
  });

  it("renders budget change percentage", () => {
    render(<BudgetRecommendation rec={mockRec} />);
    expect(screen.getByText(/50/)).toBeDefined();
  });

  it("renders confidence percentage", () => {
    render(<BudgetRecommendation rec={mockRec} />);
    expect(screen.getByText(/85/)).toBeDefined();
  });

  it("renders accept/reject buttons for pending recommendations", () => {
    render(<BudgetRecommendation rec={mockRec} />);
    expect(screen.getByText("Accept")).toBeDefined();
    expect(screen.getByText("Reject")).toBeDefined();
  });

  it("renders accepted status for accepted recommendations", () => {
    render(<BudgetRecommendation rec={acceptedRec} />);
    expect(screen.getByText("Accepted")).toBeDefined();
  });

  it("renders rejected status for rejected recommendations", () => {
    render(<BudgetRecommendation rec={rejectedRec} />);
    expect(screen.getByText("Rejected")).toBeDefined();
  });

  it("does not render action buttons for non-pending recommendations", () => {
    render(<BudgetRecommendation rec={acceptedRec} />);
    expect(screen.queryByText("Accept")).toBeNull();
    expect(screen.queryByText("Reject")).toBeNull();
  });
});
