import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: { current: null }, isInView: true }),
}));

vi.mock("@/hooks/useAPI", () => ({
  useAPI: () => ({ data: null, isLoading: true }),
  useMutation: () => ({ trigger: vi.fn(), isMutating: false }),
  revalidate: vi.fn(),
}));

vi.mock("lucide-react", () => ({
  Star: (p: any) => <div data-testid="icon-star" />,
  ThumbsUp: (p: any) => <div data-testid="icon-thumbs" />,
  Filter: (p: any) => <div data-testid="icon-filter" />,
  Plus: (p: any) => <div data-testid="icon-plus" />,
  Loader2: (p: any) => <div data-testid="icon-loader" />,
  Shield: (p: any) => <div data-testid="icon-shield" />,
}));

import CommunityReviews from "./CommunityReviews";

describe("CommunityReviews", () => {
  it("renders the community reviews heading", () => {
    render(<CommunityReviews supplierId="sup1" />);
    expect(screen.getByText("Community Reviews")).toBeInTheDocument();
  });

  it("renders review button", () => {
    render(<CommunityReviews supplierId="sup1" />);
    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("renders sort dropdown", () => {
    render(<CommunityReviews supplierId="sup1" />);
    expect(screen.getByText("Most Recent")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    render(<CommunityReviews supplierId="sup1" />);
    expect(screen.getByText("Community Reviews")).toBeInTheDocument();
  });
});
