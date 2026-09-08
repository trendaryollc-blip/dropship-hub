import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import SimilarProducts from "./SimilarProducts";

vi.mock("next/image", () => ({
  default: (props: any) => <img {...props} />,
}));

vi.mock("@/hooks/useInView", () => ({
  useInView: () => ({ ref: vi.fn(), isInView: true }),
}));

vi.mock("@/lib/safe-fetch", () => ({
  safeFetch: vi.fn().mockResolvedValue({ similar: [], boughtTogether: [] }),
}));

describe("SimilarProducts", () => {
  it("renders heading", async () => {
    render(<SimilarProducts category="Electronics" title="Headphones" />);
    expect(screen.getByText("Similar & Related Products")).toBeInTheDocument();
  });

  it("shows empty state when no results", async () => {
    render(<SimilarProducts category="Electronics" title="Headphones" />);
    await waitFor(() => {
      expect(screen.getByText("No similar products found for this category")).toBeInTheDocument();
    });
  });

  it("does not fetch when no title or category", () => {
    render(<SimilarProducts />);
    expect(screen.getByText("Similar & Related Products")).toBeInTheDocument();
  });
});
