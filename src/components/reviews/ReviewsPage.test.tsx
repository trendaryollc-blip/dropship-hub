import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
const mockReview = {
  id: "r1", productId: "p1", productTitle: "Earbuds", source: "aliexpress",
  author: "John D.", rating: 5, title: "Amazing", content: "Great product", images: [],
  verified: true, helpful: 12, syncStatus: "pending", createdAt: "2026-09-20T00:00:00Z",
};

function defaultUseAPIMock(url: string) {
  if (url.includes("type=stats")) {
    return {
      data: {
        stats: {
          totalReviews: 20, averageRating: 4.5,
          ratingDistribution: { 1: 0, 2: 0, 3: 1, 4: 7, 5: 12 },
          sourceBreakdown: {}, syncStats: { synced: 4, pending: 16, failed: 0 },
          withImages: 6, verifiedCount: 18, recentImports: 5,
        },
      },
      mutate: mockMutate,
      isLoading: false,
      error: undefined,
    };
  }
  if (url.includes("type=jobs")) {
    return {
      data: {
        jobs: [
          { id: "j1", productTitle: "Earbuds", productUrl: "", source: "aliexpress", status: "completed", totalFound: 8, imported: 8, skipped: 0, failed: 0, errors: [], startedAt: "2026-09-20T10:00:00Z", createdAt: "" },
        ],
      },
      mutate: mockMutate,
      isLoading: false,
      error: undefined,
    };
  }
  return { data: { reviews: [mockReview] }, mutate: mockMutate, isLoading: false, error: undefined };
}

const mockUseAPI = vi.fn(defaultUseAPIMock);

vi.mock("@/hooks/useAPI", () => ({ useAPI: (url: string) => mockUseAPI(url) }));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({ useToast: () => mockToast }));

const mockAuthJson = vi.fn();
vi.mock("@/lib/auth-headers", () => ({
  authJson: (...args: unknown[]) => mockAuthJson(...args),
  getAuthHeaders: vi.fn(async () => ({})),
}));

const mockSafeFetch = vi.fn();
vi.mock("@/lib/safe-fetch", () => ({ safeFetch: (...args: unknown[]) => mockSafeFetch(...args) }));

vi.mock("@/lib/clipboard", () => ({ copyToClipboard: vi.fn().mockResolvedValue(true) }));

import ReviewsPage from "./ReviewsPage";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAPI.mockReset().mockImplementation(defaultUseAPIMock);
});

describe("ReviewsPage", () => {
  it("renders header, stats and import form", () => {
    render(<ReviewsPage />);
    expect(screen.getByText("Review Importer")).toBeTruthy();
    expect(screen.getByText("Import reviews from a connected supplier source.")).toBeTruthy();
    expect(screen.queryByTestId("coming-soon")).toBeNull();
    expect(screen.getByText("AliExpress import not connected yet")).toBeTruthy();
    expect(screen.getByText(/No AliExpress review source is set up yet/)).toBeTruthy();
    expect(screen.getByText("Total Reviews")).toBeTruthy();
    expect(screen.getByText("4.5★")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Import Reviews" })).toBeTruthy();
  });

  it("disables import button without product name", () => {
    render(<ReviewsPage />);
    expect((screen.getByRole("button", { name: "Import Reviews" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("imports reviews with clamped maxReviews (garbage input → 10)", async () => {
    mockAuthJson.mockResolvedValue({ imported: 8 });
    render(<ReviewsPage />);
    fireEvent.change(screen.getByLabelText("Product Name *"), { target: { value: "Earbuds" } });
    fireEvent.change(screen.getByLabelText("Max Reviews (1–50)"), { target: { value: "abc" } });
    fireEvent.click(screen.getByRole("button", { name: "Import Reviews" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/reviews", {
        action: "import", productTitle: "Earbuds", productUrl: "", source: "aliexpress", maxReviews: 10,
      });
    });
    expect(mockToast.success).toHaveBeenCalled();
    // stats, reviews and jobs all refreshed
    expect(mockMutate).toHaveBeenCalledTimes(3);
  });

  it("clamps maxReviews to 1 when below range", async () => {
    mockAuthJson.mockResolvedValue({ imported: 1 });
    render(<ReviewsPage />);
    fireEvent.change(screen.getByLabelText("Product Name *"), { target: { value: "Earbuds" } });
    fireEvent.change(screen.getByLabelText("Max Reviews (1–50)"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: "Import Reviews" }));
    await waitFor(() => {
      const call = mockAuthJson.mock.calls.find((c) => c[0] === "/api/reviews");
      expect((call?.[1] as { maxReviews: number }).maxReviews).toBe(1);
    });
  });

  it("shows the server's import error message as error toast", async () => {
    mockAuthJson.mockRejectedValue(
      new Error("Review import needs a supplier review source (AliExpress/CJ API), which is not connected yet.")
    );
    render(<ReviewsPage />);
    fireEvent.change(screen.getByLabelText("Product Name *"), { target: { value: "Earbuds" } });
    fireEvent.click(screen.getByRole("button", { name: "Import Reviews" }));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        "Review import needs a supplier review source (AliExpress/CJ API), which is not connected yet."
      );
    });
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("renders reviews without verified badge or helpful counts", () => {
    render(<ReviewsPage />);
    expect(screen.getByText("by John D.")).toBeTruthy();
    expect(screen.queryByText("Verified")).toBeNull();
    expect(screen.queryByText(/found helpful/)).toBeNull();
    expect(screen.getByText("pending")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Suggested reply" })).toBeTruthy();
  });

  it("shows review error state with retry", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: undefined,
      mutate: mockMutate,
      isLoading: false,
      error: url.includes("type=list") ? new Error("boom") : undefined,
    }));
    render(<ReviewsPage />);
    expect(screen.getByText(/Couldn't load your reviews/)).toBeTruthy();
    fireEvent.click(screen.getByText("Retry"));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("deletes a review and refreshes lists", async () => {
    mockSafeFetch.mockResolvedValue({ success: true });
    render(<ReviewsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Delete review" }));
    await waitFor(() => {
      expect(mockSafeFetch).toHaveBeenCalledWith("/api/reviews?id=r1", { method: "DELETE", headers: {} });
    });
    expect(mockToast.success).toHaveBeenCalledWith("Review deleted");
    expect(mockMutate).toHaveBeenCalledTimes(2);
  });

  it("shows delete failure as error toast (no fake success)", async () => {
    mockSafeFetch.mockRejectedValue(new Error("Delete denied"));
    render(<ReviewsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Delete review" }));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Delete denied");
    });
    expect(mockToast.success).not.toHaveBeenCalledWith("Review deleted");
  });

  it("generates a suggested reply from the template and displays it", async () => {
    mockAuthJson.mockResolvedValue({ response: "Thanks for the review!" });
    render(<ReviewsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Suggested reply" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/reviews", expect.objectContaining({ action: "respond", reviewId: "r1" }));
      expect(screen.getByText("Reply template")).toBeTruthy();
      expect(screen.getByText("Thanks for the review!")).toBeTruthy();
    });
  });

  it("renders import history with job status", () => {
    render(<ReviewsPage />);
    expect(screen.getByText("Import History")).toBeTruthy();
    expect(screen.getByText("Earbuds")).toBeTruthy();
    expect(screen.getByText("completed")).toBeTruthy();
    expect(screen.getByText("8/8 imported")).toBeTruthy();
  });

  it("hides import history when there are no import jobs", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: url.includes("type=jobs") ? { jobs: [] } : defaultUseAPIMock(url).data,
      mutate: mockMutate,
      isLoading: false,
      error: undefined,
    }));
    render(<ReviewsPage />);
    expect(screen.queryByText("Import History")).toBeNull();
    expect(screen.getByText("by John D.")).toBeTruthy();
  });

  it("shows empty state when no reviews", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: url.includes("type=list") ? { reviews: [] } : undefined,
      mutate: mockMutate,
      isLoading: false,
      error: undefined,
    }));
    render(<ReviewsPage />);
    expect(screen.getByText("No reviews imported yet")).toBeTruthy();
  });

  it("switches to CSV source, shows the file input, and imports the file contents", async () => {
    mockAuthJson.mockResolvedValue({ imported: 2, skipped: 1 });
    render(<ReviewsPage />);

    fireEvent.click(screen.getByRole("button", { name: "Import from CSV" }));
    expect(screen.queryByText("AliExpress import not connected yet")).toBeNull();
    const fileInput = screen.getByLabelText(/CSV file/) as HTMLInputElement;
    const file = new File(["rating,author,content\n5,Jane,Great product"], "reviews.csv", {
      type: "text/csv",
    });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText("reviews.csv loaded")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Product Name *"), { target: { value: "Earbuds" } });
    fireEvent.click(screen.getByRole("button", { name: "Import Reviews" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/reviews", {
        action: "import",
        productTitle: "Earbuds",
        productUrl: "",
        source: "csv",
        maxReviews: 10,
        csv: "rating,author,content\n5,Jane,Great product",
      });
    });
    expect(mockToast.success).toHaveBeenCalledWith(
      "Imported 2 reviews from CSV, 1 row skipped"
    );
    expect(mockMutate).toHaveBeenCalledTimes(3);
  });

  it("blocks CSV import without a selected file", () => {
    render(<ReviewsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Import from CSV" }));
    fireEvent.change(screen.getByLabelText("Product Name *"), { target: { value: "Earbuds" } });
    const importButton = screen.getByRole("button", { name: "Import Reviews" }) as HTMLButtonElement;
    expect(importButton.disabled).toBe(true);
    fireEvent.click(importButton);
    expect(mockAuthJson).not.toHaveBeenCalled();
  });

  it("blocks Amazon import without a product URL", () => {
    render(<ReviewsPage />);
    fireEvent.click(screen.getByRole("button", { name: "Import from Amazon" }));
    expect(screen.getByText(/Paste the full Amazon product page URL/)).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Product Name *"), { target: { value: "Earbuds" } });
    const importButton = screen.getByRole("button", { name: "Import Reviews" }) as HTMLButtonElement;
    expect(importButton.disabled).toBe(true);
    fireEvent.click(importButton);
    expect(mockAuthJson).not.toHaveBeenCalled();
  });

  it("keeps the 501 honest-error toast for unconnected sources", async () => {
    mockAuthJson.mockRejectedValue(
      new Error("AliExpress review import is not connected yet — no AliExpress review source is set up, so nothing was imported.")
    );
    render(<ReviewsPage />);
    fireEvent.change(screen.getByLabelText("Product Name *"), { target: { value: "Earbuds" } });
    fireEvent.click(screen.getByRole("button", { name: "Import Reviews" }));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining("not connected yet")
      );
    });
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
