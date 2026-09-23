import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
function defaultUseAPIMock(url: string) {
  if (url.includes("type=stats")) {
    return {
      data: {
        stats: {
          totalGenerated: 12, totalSaved: 3, platformBreakdown: {}, contentTypeBreakdown: {},
          topPerformingPlatform: "tiktok", avgEngagementRate: 0, calendarEntries: 4, scheduledPosts: 2,
        },
      },
      mutate: mockMutate,
      isLoading: false,
      error: undefined,
    };
  }
  if (url.includes("type=calendar")) {
    return {
      data: {
        entries: [
          { id: "c1", date: "2026-09-20", platform: "tiktok", contentType: "caption", productTitle: "Earbuds", caption: "go", hashtags: [], status: "scheduled", createdAt: "" },
          { id: "c2", date: "2026-10-01", platform: "tiktok", contentType: "caption", productTitle: "Older", caption: "", hashtags: [], status: "posted", createdAt: "" },
        ],
      },
      mutate: mockMutate,
      isLoading: false,
      error: undefined,
    };
  }
  return {
    data: {
      contents: [
        { id: "s1", productTitle: "Earbuds", platform: "tiktok", contentType: "hook", content: "Stop scrolling!", hashtags: ["#gadgets"], cta: "Buy now", saved: false },
        { id: "s2", productTitle: "Mug", platform: "tiktok", contentType: "caption", content: "Best mug", hashtags: [], cta: "Buy", saved: true },
      ],
    },
    mutate: mockMutate,
    isLoading: false,
    error: undefined,
  };
}

const mockUseAPI = vi.fn(defaultUseAPIMock);

vi.mock("@/hooks/useAPI", () => ({ useAPI: (url: string) => mockUseAPI(url) }));

const mockToast = { success: vi.fn(), error: vi.fn() };
vi.mock("@/components/ui/Toast", () => ({ useToast: () => mockToast }));

const mockAuthJson = vi.fn();
vi.mock("@/lib/auth-headers", () => ({ authJson: (...args: unknown[]) => mockAuthJson(...args) }));

vi.mock("@/lib/clipboard", () => ({ copyToClipboard: vi.fn().mockResolvedValue(true) }));

import SocialContentPage from "./SocialContentPage";

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAPI.mockReset().mockImplementation(defaultUseAPIMock);
});

describe("SocialContentPage", () => {
  it("renders header, stats and all five tabs", () => {
    render(<SocialContentPage />);
    expect(screen.getByText("Content Engine")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy(); // totalGenerated
    expect(screen.getByText("Scheduled")).toBeTruthy();
    for (const tab of ["Generate", "UGC Scripts", "Content Ideas", "Library", "Calendar"]) {
      expect(screen.getByRole("button", { name: tab })).toBeTruthy();
    }
  });

  it("shows loading state while library is loading", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: undefined,
      mutate: mockMutate,
      isLoading: url.includes("type=list"),
      error: undefined,
    }));
    render(<SocialContentPage />);
    fireEvent.click(screen.getByText("Library"));
    expect(screen.getByText(/Loading your content library/)).toBeTruthy();
  });

  it("shows error state with retry on library failure", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: undefined,
      mutate: mockMutate,
      isLoading: false,
      error: url.includes("type=list") ? new Error("boom") : undefined,
    }));
    render(<SocialContentPage />);
    fireEvent.click(screen.getByText("Library"));
    expect(screen.getByText(/Couldn't load your content library/)).toBeTruthy();
    fireEvent.click(screen.getByText("Retry"));
    expect(mockMutate).toHaveBeenCalled();
  });

  it("shows empty library message", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: url.includes("type=list") ? { contents: [] } : undefined,
      mutate: mockMutate,
      isLoading: false,
      error: undefined,
    }));
    render(<SocialContentPage />);
    fireEvent.click(screen.getByText("Library"));
    expect(screen.getByText("No content generated yet")).toBeTruthy();
  });

  it("renders library items with save indicator", () => {
    render(<SocialContentPage />);
    fireEvent.click(screen.getByText("Library"));
    expect(screen.getByText("Stop scrolling!")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Remove from saved" })).toBeTruthy(); // saved item badge/state
  });

  it("disables generate button without product title", () => {
    render(<SocialContentPage />);
    expect((screen.getByText("Generate Content") as HTMLButtonElement).disabled).toBe(true);
  });

  it("saves a library item via API", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<SocialContentPage />);
    fireEvent.click(screen.getByText("Library"));
    fireEvent.click(screen.getByRole("button", { name: "Save to favorites" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/social-content", { action: "save", id: "s1", saved: true });
    });
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("surfaces save failure as error toast", async () => {
    mockAuthJson.mockRejectedValue(new Error("nope"));
    render(<SocialContentPage />);
    fireEvent.click(screen.getByText("Library"));
    fireEvent.click(screen.getByRole("button", { name: "Save to favorites" }));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalled();
    });
  });

  it("deletes a library item with authed DELETE", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<SocialContentPage />);
    fireEvent.click(screen.getByText("Library"));
    fireEvent.click(screen.getAllByRole("button", { name: "Delete content" })[0]);
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/social-content?id=s1", undefined, "DELETE");
    });
  });

  it("shows empty calendar message", () => {
    mockUseAPI.mockImplementation((url: string) => ({
      data: url.includes("type=calendar") ? { entries: [] } : undefined,
      mutate: mockMutate,
      isLoading: false,
      error: undefined,
    }));
    render(<SocialContentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(screen.getByText("Nothing scheduled yet")).toBeTruthy();
  });

  it("disables schedule button without title or date", () => {
    render(<SocialContentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect((screen.getByText("Schedule Post") as HTMLButtonElement).disabled).toBe(true);
  });

  it("marks a calendar post as posted", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<SocialContentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    fireEvent.click(screen.getByRole("button", { name: "Mark as posted" }));
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/social-content", { action: "calendar_status", id: "c1", status: "posted" });
    });
  });

  it("deletes a scheduled calendar entry", async () => {
    mockAuthJson.mockResolvedValue({ success: true });
    render(<SocialContentPage />);
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Delete scheduled post" })[0]);
    await waitFor(() => {
      expect(mockAuthJson).toHaveBeenCalledWith("/api/social-content?type=calendar&id=c1", undefined, "DELETE");
    });
  });
});
